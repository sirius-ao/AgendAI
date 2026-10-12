import type { SQLiteDatabase } from 'expo-sqlite';
import type { DashboardSnapshot, QueuedOperation } from '@/types/api';

export async function readSnapshot(db: SQLiteDatabase, accountId: string, schoolId: string) {
  const row = await db.getFirstAsync<{ snapshot: string }>(
    'SELECT snapshot FROM dashboard_cache_v2 WHERE account_id = ? AND school_id = ?',
    accountId,
    schoolId,
  );
  return row ? (JSON.parse(row.snapshot) as DashboardSnapshot) : null;
}

export async function writeSnapshot(
  db: SQLiteDatabase,
  accountId: string,
  schoolId: string,
  snapshot: DashboardSnapshot,
) {
  await db.runAsync(
    'INSERT INTO dashboard_cache_v2 (account_id, school_id, snapshot, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(account_id, school_id) DO UPDATE SET snapshot = excluded.snapshot, updated_at = excluded.updated_at',
    accountId,
    schoolId,
    JSON.stringify(snapshot),
    new Date().toISOString(),
  );
}

export async function enqueueOperation(db: SQLiteDatabase, operation: QueuedOperation) {
  await db.runAsync(
    'DELETE FROM sync_failures_v1 WHERE account_id = ? AND school_id = ? AND operation_id IN (SELECT id FROM sync_queue_v2 WHERE account_id = ? AND school_id = ? AND collection = ? AND record_id = ?)',
    operation.accountId,
    operation.schoolId,
    operation.accountId,
    operation.schoolId,
    operation.collection,
    operation.recordId,
  );
  await db.runAsync(
    'INSERT INTO sync_queue_v2 (id, account_id, school_id, collection, record_id, method, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(account_id, school_id, collection, record_id) DO UPDATE SET id = excluded.id, method = excluded.method, payload = excluded.payload, created_at = excluded.created_at',
    operation.id,
    operation.accountId,
    operation.schoolId,
    operation.collection,
    operation.recordId,
    operation.method,
    operation.payload ? JSON.stringify(operation.payload) : null,
    operation.createdAt,
  );
}

export async function getQueue(
  db: SQLiteDatabase,
  accountId: string,
  schoolId: string,
  includeFailed = true,
): Promise<QueuedOperation[]> {
  const rows = await db.getAllAsync<{
    id: string;
    account_id: string;
    school_id: string;
    collection: string;
    record_id: string;
    method: string;
    payload: string | null;
    created_at: string;
  }>(
    `SELECT q.id, q.account_id, q.school_id, q.collection, q.record_id, q.method, q.payload, q.created_at FROM sync_queue_v2 q WHERE q.account_id = ? AND q.school_id = ? ${includeFailed ? '' : 'AND NOT EXISTS (SELECT 1 FROM sync_failures_v1 f WHERE f.account_id = q.account_id AND f.school_id = q.school_id AND f.operation_id = q.id)'} ORDER BY q.created_at ASC`,
    accountId,
    schoolId,
  );
  return rows.map((row) => ({
    id: row.id,
    accountId: row.account_id,
    schoolId: row.school_id,
    collection: row.collection,
    recordId: row.record_id,
    method: row.method as QueuedOperation['method'],
    payload: row.payload ? (JSON.parse(row.payload) as Record<string, unknown>) : undefined,
    createdAt: row.created_at,
  }));
}

export async function removeQueuedOperation(db: SQLiteDatabase, accountId: string, id: string) {
  await db.runAsync(
    'DELETE FROM sync_failures_v1 WHERE account_id = ? AND operation_id = ?',
    accountId,
    id,
  );
  await db.runAsync('DELETE FROM sync_queue_v2 WHERE account_id = ? AND id = ?', accountId, id);
}

export async function markQueueFailure(
  db: SQLiteDatabase,
  accountId: string,
  schoolId: string,
  operationId: string,
  message: string,
) {
  await db.runAsync(
    'INSERT INTO sync_failures_v1 (account_id, school_id, operation_id, message, failed_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(account_id, school_id, operation_id) DO UPDATE SET message = excluded.message, failed_at = excluded.failed_at',
    accountId,
    schoolId,
    operationId,
    message,
    new Date().toISOString(),
  );
}
export async function clearQueueFailure(
  db: SQLiteDatabase,
  accountId: string,
  schoolId: string,
  operationId: string,
) {
  await db.runAsync(
    'DELETE FROM sync_failures_v1 WHERE account_id = ? AND school_id = ? AND operation_id = ?',
    accountId,
    schoolId,
    operationId,
  );
}
export async function getQueueFailures(db: SQLiteDatabase, accountId: string, schoolId: string) {
  return db.getAllAsync<{
    operation_id: string;
    message: string;
    record_id: string;
    collection: string;
  }>(
    'SELECT f.operation_id, f.message, q.record_id, q.collection FROM sync_failures_v1 f JOIN sync_queue_v2 q ON q.account_id = f.account_id AND q.school_id = f.school_id AND q.id = f.operation_id WHERE f.account_id = ? AND f.school_id = ? ORDER BY f.failed_at DESC',
    accountId,
    schoolId,
  );
}

export async function queueSize(db: SQLiteDatabase, accountId: string, schoolId: string) {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM sync_queue_v2 WHERE account_id = ? AND school_id = ?',
    accountId,
    schoolId,
  );
  return row?.count ?? 0;
}

export function applyQueue(
  snapshot: DashboardSnapshot,
  operations: QueuedOperation[],
): DashboardSnapshot {
  const data = { ...snapshot.data };
  for (const operation of operations) {
    const rows = [...(data[operation.collection] || [])];
    const withoutRecord = rows.filter((row) => row.recordId !== operation.recordId);
    if (operation.method === 'PUT' && operation.payload) {
      withoutRecord.push({ recordId: operation.recordId, payload: operation.payload });
    }
    data[operation.collection] = withoutRecord;
  }
  return { ...snapshot, data };
}

export function updateCachedRecord(
  snapshot: DashboardSnapshot,
  collection: string,
  recordId: string,
  payload: Record<string, unknown>,
): DashboardSnapshot {
  const rows = [...(snapshot.data[collection] || [])];
  const index = rows.findIndex((row) => row.recordId === recordId);
  const next = { recordId, payload };
  if (index < 0) rows.push(next);
  else rows[index] = next;
  return { ...snapshot, data: { ...snapshot.data, [collection]: rows } };
}
