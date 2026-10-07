import { normalizeDashboardSnapshot } from '@/data/dashboard-snapshot';
import { AppState } from 'react-native';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { useSQLiteContext } from 'expo-sqlite';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { useAuth } from '@/providers/auth-provider';
import {
  applyQueue,
  enqueueOperation,
  getQueue,
  queueSize,
  clearQueueFailure,
  getQueueFailures,
  markQueueFailure,
  readSnapshot,
  removeQueuedOperation,
  updateCachedRecord,
  writeSnapshot,
} from '@/data/dashboard-repository';
import type { ApiDashboardSnapshot, DashboardSnapshot, QueuedOperation } from '@/types/api';
import { ApiError } from '@/data/api';

export type SyncState = 'loading' | 'synced' | 'pending' | 'offline' | 'error';
interface DashboardContextValue {
  snapshot: DashboardSnapshot | null;
  schoolId: string;
  selectSchool(id: string): Promise<void>;
  syncState: SyncState;
  pendingCount: number;
  online: boolean;
  message: string;
  failedOperations: Array<{
    operationId: string;
    message: string;
    recordId: string;
    collection: string;
  }>;
  retryFailedOperation(operationId: string): Promise<void>;
  discardFailedOperation(operationId: string): Promise<void>;
  saveRecord(collection: string, recordId: string, payload: Record<string, unknown>): Promise<void>;
  syncNow(): Promise<void>;
  refresh(): Promise<void>;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);
const makeOperationId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export function DashboardProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const { user, authenticated, request } = useAuth();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [schoolId, setSchoolId] = useState('');
  const [syncState, setSyncState] = useState<SyncState>('loading');
  const [pendingCount, setPendingCount] = useState(0);
  const [online, setOnline] = useState(true);
  const [message, setMessage] = useState('');
  const [failedOperations, setFailedOperations] = useState<
    DashboardContextValue['failedOperations']
  >([]);
  const snapshotRef = useRef<DashboardSnapshot | null>(null);
  const schoolRef = useRef('');
  const accountRef = useRef('');
  const refreshPromise = useRef<Promise<void> | null>(null);
  const refreshAgain = useRef(false);

  const publishSnapshot = useCallback(
    async (next: DashboardSnapshot, accountId: string, id: string) => {
      await writeSnapshot(db, accountId, id, next);
      if (accountRef.current === accountId && schoolRef.current === id) {
        snapshotRef.current = next;
        setSnapshot(next);
      }
    },
    [db],
  );

  const flushQueue = useCallback(
    async (accountId: string, id: string) => {
      const operations = await getQueue(db, accountId, id, false);
      for (const operation of operations) {
        const path = `/schools/${encodeURIComponent(id)}/data/${encodeURIComponent(operation.collection)}/${encodeURIComponent(operation.recordId)}`;
        try {
          await request(
            path,
            operation.method === 'DELETE'
              ? { method: 'DELETE' }
              : {
                  method: 'PUT',
                  body: JSON.stringify({ id: operation.recordId, payload: operation.payload }),
                },
          );
          await removeQueuedOperation(db, accountId, operation.id);
        } catch (error) {
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            await markQueueFailure(db, accountId, id, operation.id, error.message);
            continue;
          }
          throw error;
        }
      }
      setPendingCount(await queueSize(db, accountId, id));
      setFailedOperations(
        (await getQueueFailures(db, accountId, id)).map((failure) => ({
          operationId: failure.operation_id,
          message: failure.message,
          recordId: failure.record_id,
          collection: failure.collection,
        })),
      );
    },
    [db, request],
  );

  const loadFromServer = useCallback(
    async (accountId: string, id: string) => {
      const raw = await request<ApiDashboardSnapshot>(
        `/schools/${encodeURIComponent(id)}/dashboard`,
      );
      const serverSnapshot = normalizeDashboardSnapshot(raw);
      const pending = await getQueue(db, accountId, id);
      const merged = applyQueue(serverSnapshot, pending);
      await publishSnapshot(merged, accountId, id);
      return merged;
    },
    [db, publishSnapshot, request],
  );

  const refresh = useCallback(async () => {
    if (refreshPromise.current) {
      refreshAgain.current = true;
      return refreshPromise.current;
    }
    if (!schoolRef.current || !accountRef.current || !online) {
      setSyncState('offline');
      return;
    }
    refreshPromise.current = (async () => {
      do {
        refreshAgain.current = false;
        const id = schoolRef.current;
        const accountId = accountRef.current;
        if (!id || !accountId || !online) break;
        setSyncState('loading');
        setMessage('');
        try {
          let queueError: unknown;
          try {
            await flushQueue(accountId, id);
          } catch (cause) {
            queueError = cause;
          }
          await loadFromServer(accountId, id);
          if (queueError) throw queueError;
          const count = await queueSize(db, accountId, id);
          setPendingCount(count);
          const failures = await getQueueFailures(db, accountId, id);
          setFailedOperations(
            failures.map((failure) => ({
              operationId: failure.operation_id,
              message: failure.message,
              recordId: failure.record_id,
              collection: failure.collection,
            })),
          );
          setMessage(
            failures.length
              ? `${failures.length} alteração(ões) precisam de atenção; as restantes continuam a sincronizar.`
              : '',
          );
          setSyncState(count ? 'pending' : 'synced');
        } catch (cause) {
          const count = await queueSize(db, accountId, id);
          setPendingCount(count);
          setMessage(
            cause instanceof Error ? cause.message : 'Não foi possível sincronizar agora.',
          );
          setSyncState(online ? 'error' : count ? 'pending' : 'offline');
        }
      } while (refreshAgain.current && online);
    })().finally(() => {
      refreshPromise.current = null;
    });
    return refreshPromise.current;
  }, [db, flushQueue, loadFromServer, online]);

  useEffect(() => {
    let active = true;
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = Boolean(state.isConnected && state.isInternetReachable !== false);
      setOnline(connected);
      if (connected && schoolRef.current) void refresh();
      else if (!connected) setSyncState((current) => (current === 'loading' ? 'offline' : current));
    });
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    const start = async () => {
      if (!authenticated || !user) {
        accountRef.current = '';
        schoolRef.current = '';
        snapshotRef.current = null;
        setSnapshot(null);
        setSchoolId('');
        setPendingCount(0);
        setMessage('');
        setSyncState('loading');
        return;
      }
      if (accountRef.current && accountRef.current !== user.id) {
        snapshotRef.current = null;
        setSnapshot(null);
        setSchoolId('');
        setPendingCount(0);
      }
      accountRef.current = user.id;
      const id =
        user.schools.find((school) => school.id === schoolRef.current)?.id || user.schools[0]?.id;
      if (!id) {
        setMessage('A sua conta ainda não pertence a uma escola.');
        setSyncState('error');
        return;
      }
      schoolRef.current = id;
      setSchoolId(id);
      const [cached, queue] = await Promise.all([
        readSnapshot(db, user.id, id),
        getQueue(db, user.id, id),
      ]);
      const failuresAtStart = await getQueueFailures(db, user.id, id);
      setFailedOperations(
        failuresAtStart.map((failure) => ({
          operationId: failure.operation_id,
          message: failure.message,
          recordId: failure.record_id,
          collection: failure.collection,
        })),
      );
      if (!active) return;
      setPendingCount(queue.length);
      if (cached) {
        const merged = applyQueue(cached, queue);
        snapshotRef.current = merged;
        setSnapshot(merged);
        setSyncState(queue.length ? 'pending' : 'offline');
      }
      const network = await NetInfo.fetch();
      const connected = Boolean(network.isConnected && network.isInternetReachable !== false);
      setOnline(connected);
      if (!connected) {
        setSyncState(queue.length ? 'pending' : 'offline');
        return;
      }
      try {
        let queueError: unknown;
        try {
          await flushQueue(user.id, id);
        } catch (cause) {
          queueError = cause;
        }
        await loadFromServer(user.id, id);
        if (queueError) throw queueError;
        if (!active) return;
        const remaining = await queueSize(db, user.id, id);
        setPendingCount(remaining);
        const failures = await getQueueFailures(db, user.id, id);
        setFailedOperations(
          failures.map((failure) => ({
            operationId: failure.operation_id,
            message: failure.message,
            recordId: failure.record_id,
            collection: failure.collection,
          })),
        );
        setMessage(
          failures.length
            ? `${failures.length} alteração(ões) precisam de atenção; as restantes continuam a sincronizar.`
            : '',
        );
        setSyncState(remaining ? 'pending' : 'synced');
      } catch (cause) {
        if (!active) return;
        setMessage(
          cause instanceof Error
            ? cause.message
            : 'Sem ligação. Os dados guardados neste dispositivo continuam disponíveis.',
        );
        setSyncState(queue.length ? 'pending' : cached ? 'offline' : 'error');
      }
    };
    void start();
    return () => {
      active = false;
      unsubscribe();
      appStateSubscription.remove();
    };
  }, [authenticated, db, flushQueue, loadFromServer, refresh, user]);

  const selectSchool = useCallback(
    async (id: string) => {
      if (!user?.schools.some((school) => school.id === id)) throw new Error('Escola inválida.');
      schoolRef.current = id;
      setSchoolId(id);
      setMessage('');
      const [cached, queue] = await Promise.all([
        readSnapshot(db, user.id, id),
        getQueue(db, user.id, id),
      ]);
      const next = cached ? applyQueue(cached, queue) : null;
      snapshotRef.current = next;
      setSnapshot(next);
      setPendingCount(queue.length);
      setSyncState(queue.length ? 'pending' : next ? 'offline' : 'loading');
      if (online) await refresh();
    },
    [db, online, refresh, user],
  );

  const saveRecord = useCallback(
    async (collection: string, recordId: string, payload: Record<string, unknown>) => {
      const id = schoolRef.current;
      const accountId = accountRef.current;
      const current = snapshotRef.current;
      if (!id || !accountId || !current)
        throw new Error('Os dados da escola ainda não foram carregados neste dispositivo.');
      const next = updateCachedRecord(current, collection, recordId, payload);
      const operation: QueuedOperation = {
        id: makeOperationId(),
        accountId,
        schoolId: id,
        collection,
        recordId,
        method: 'PUT',
        payload,
        createdAt: new Date().toISOString(),
      };
      await enqueueOperation(db, operation);
      await publishSnapshot(next, accountId, id);
      const count = await queueSize(db, accountId, id);
      setPendingCount(count);
      setSyncState(online ? 'pending' : 'offline');
      setMessage('');
      if (online) void refresh();
    },
    [db, online, publishSnapshot, refresh],
  );

  const retryFailedOperation = useCallback(
    async (operationId: string) => {
      const accountId = accountRef.current;
      const id = schoolRef.current;
      if (!accountId || !id) return;
      await clearQueueFailure(db, accountId, id, operationId);
      await refresh();
    },
    [db, refresh],
  );
  const discardFailedOperation = useCallback(
    async (operationId: string) => {
      const accountId = accountRef.current;
      const id = schoolRef.current;
      if (!accountId || !id) return;
      await removeQueuedOperation(db, accountId, operationId);
      const failures = await getQueueFailures(db, accountId, id);
      setFailedOperations(
        failures.map((failure) => ({
          operationId: failure.operation_id,
          message: failure.message,
          recordId: failure.record_id,
          collection: failure.collection,
        })),
      );
      await refresh();
    },
    [db, refresh],
  );

  const value = useMemo<DashboardContextValue>(
    () => ({
      snapshot,
      schoolId,
      selectSchool,
      syncState,
      pendingCount,
      online,
      message,
      failedOperations,
      retryFailedOperation,
      discardFailedOperation,
      saveRecord,
      syncNow: refresh,
      refresh,
    }),
    [
      message,
      failedOperations,
      online,
      pendingCount,
      refresh,
      retryFailedOperation,
      discardFailedOperation,
      saveRecord,
      schoolId,
      selectSchool,
      snapshot,
      syncState,
    ],
  );
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) throw new Error('useDashboard deve ser utilizado dentro de DashboardProvider');
  return context;
}
