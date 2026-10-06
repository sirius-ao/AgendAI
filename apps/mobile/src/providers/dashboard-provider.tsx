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
  readSnapshot,
  removeQueuedOperation,
  updateCachedRecord,
  writeSnapshot,
} from '@/data/dashboard-repository';
import type { ApiDashboardSnapshot, DashboardSnapshot, QueuedOperation } from '@/types/api';

export type SyncState = 'loading' | 'synced' | 'pending' | 'offline' | 'error';
interface DashboardContextValue {
  snapshot: DashboardSnapshot | null;
  schoolId: string;
  syncState: SyncState;
  pendingCount: number;
  online: boolean;
  message: string;
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
  const snapshotRef = useRef<DashboardSnapshot | null>(null);
  const schoolRef = useRef('');

  const publishSnapshot = useCallback(
    async (next: DashboardSnapshot, id: string) => {
      snapshotRef.current = next;
      setSnapshot(next);
      await writeSnapshot(db, id, next);
    },
    [db],
  );

  const flushQueue = useCallback(
    async (id: string) => {
      const operations = await getQueue(db, id);
      for (const operation of operations) {
        const path = `/schools/${encodeURIComponent(id)}/data/${encodeURIComponent(operation.collection)}/${encodeURIComponent(operation.recordId)}`;
        await request(
          path,
          operation.method === 'DELETE'
            ? { method: 'DELETE' }
            : {
                method: 'PUT',
                body: JSON.stringify({ id: operation.recordId, payload: operation.payload }),
              },
        );
        await removeQueuedOperation(db, operation.id);
      }
      setPendingCount(await queueSize(db, id));
    },
    [db, request],
  );

  const loadFromServer = useCallback(
    async (id: string) => {
      const raw = await request<ApiDashboardSnapshot>(
        `/schools/${encodeURIComponent(id)}/dashboard`,
      );
      const data: DashboardSnapshot['data'] = Object.fromEntries(
        Object.entries(raw.data || {}).map(([collection, rows]) => [
          collection,
          rows.map((row) => ({
            recordId: row.recordId || row.id || '',
            payload: row.payload || {},
            updatedAt: row.updatedAt,
          })),
        ]),
      );
      if (raw.classes)
        data.classes = raw.classes.map((item) => ({ recordId: item.id, payload: item }));
      if (raw.students)
        data.students = raw.students.map((item) => ({ recordId: item.id, payload: item }));
      const serverSnapshot: DashboardSnapshot = { school: raw.school, data };
      const pending = await getQueue(db, id);
      const merged = applyQueue(serverSnapshot, pending);
      await publishSnapshot(merged, id);
      return merged;
    },
    [db, publishSnapshot, request],
  );

  const refresh = useCallback(async () => {
    const id = schoolRef.current;
    if (!id || !online) {
      setSyncState('offline');
      return;
    }
    setSyncState('loading');
    setMessage('');
    try {
      await flushQueue(id);
      await loadFromServer(id);
      setPendingCount(await queueSize(db, id));
      setSyncState((await queueSize(db, id)) ? 'pending' : 'synced');
    } catch (cause) {
      const count = await queueSize(db, id);
      setPendingCount(count);
      setMessage(cause instanceof Error ? cause.message : 'Não foi possível sincronizar agora.');
      setSyncState(online ? 'error' : count ? 'pending' : 'offline');
    }
  }, [db, flushQueue, loadFromServer, online]);

  useEffect(() => {
    let active = true;
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = Boolean(state.isConnected && state.isInternetReachable !== false);
      setOnline(connected);
      if (connected && schoolRef.current) void refresh();
      else if (!connected) setSyncState((current) => (current === 'loading' ? 'offline' : current));
    });
    const start = async () => {
      if (!authenticated || !user) {
        setSnapshot(null);
        setSyncState('loading');
        return;
      }
      const id = user.schools[0]?.id;
      if (!id) {
        setMessage('A sua conta ainda não pertence a uma escola.');
        setSyncState('error');
        return;
      }
      schoolRef.current = id;
      setSchoolId(id);
      const [cached, queue] = await Promise.all([readSnapshot(db, id), getQueue(db, id)]);
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
        await flushQueue(id);
        await loadFromServer(id);
        if (!active) return;
        const remaining = await queueSize(db, id);
        setPendingCount(remaining);
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
    };
  }, [authenticated, db, flushQueue, loadFromServer, refresh, user]);

  const saveRecord = useCallback(
    async (collection: string, recordId: string, payload: Record<string, unknown>) => {
      const id = schoolRef.current;
      const current = snapshotRef.current;
      if (!id || !current)
        throw new Error('Os dados da escola ainda não foram carregados neste dispositivo.');
      const next = updateCachedRecord(current, collection, recordId, payload);
      const operation: QueuedOperation = {
        id: makeOperationId(),
        schoolId: id,
        collection,
        recordId,
        method: 'PUT',
        payload,
        createdAt: new Date().toISOString(),
      };
      await publishSnapshot(next, id);
      await enqueueOperation(db, operation);
      const count = await queueSize(db, id);
      setPendingCount(count);
      setSyncState(online ? 'pending' : 'offline');
      setMessage('');
      if (online) void refresh();
    },
    [db, online, publishSnapshot, refresh],
  );

  const value = useMemo<DashboardContextValue>(
    () => ({
      snapshot,
      schoolId,
      syncState,
      pendingCount,
      online,
      message,
      saveRecord,
      syncNow: refresh,
      refresh,
    }),
    [message, online, pendingCount, refresh, saveRecord, schoolId, snapshot, syncState],
  );
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) throw new Error('useDashboard deve ser utilizado dentro de DashboardProvider');
  return context;
}
