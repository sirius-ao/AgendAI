import type { SQLiteDatabase } from 'expo-sqlite';
import type { DashboardSnapshot, QueuedOperation } from '@/types/api';

export async function readSnapshot(db: SQLiteDatabase, schoolId: string) {
  const row = await db.getFirstAsync<{ snapshot: string }>(
    'SELECT snapshot FROM dashboard_cache WHERE school_id = ?',
    schoolId,
  );
  return row ? (JSON.parse(row.snapshot) as DashboardSnapshot) : null;
}

export async function writeSnapshot(
  db: SQLiteDatabase,
  schoolId: string,
  snapshot: DashboardSnapshot,
) {
  await db.runAsync(
    'INSERT INTO dashboard_cache (school_id, snapshot, updated_at) VALUES (?, ?, ?) ON CONFLICT(school_id) DO UPDATE SET snapshot = excluded.snapshot, updated_at = excluded.updated_at',
    schoolId,
    JSON.stringify(snapshot),
    new Date().toISOString(),
  );
}

export async function enqueueOperation(db: SQLiteDatabase, operation: QueuedOperation) {
  await db.runAsync(
    'INSERT INTO sync_queue (id, school_id, collection, record_id, method, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(school_id, collection, record_id) DO UPDATE SET id = excluded.id, method = excluded.method, payload = excluded.payload, created_at = excluded.created_at',
    operation.id,
    operation.schoolId,
    operation.collection,
    operation.recordId,
    operation.method,
    operation.payload ? JSON.stringify(operation.payload) : null,
    operation.createdAt,
  );
}

export async function getQueue(db: SQLiteDatabase, schoolId: string): Promise<QueuedOperation[]> {
  const rows = await db.getAllAsync<{
    id: string;
    school_id: string;
    collection: string;
    record_id: string;
    method: string;
    payload: string | null;
    created_at: string;
  }>(
    'SELECT id, school_id, collection, record_id, method, payload, created_at FROM sync_queue WHERE school_id = ? ORDER BY created_at ASC',
    schoolId,
  );
  return rows.map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    collection: row.collection,
    recordId: row.record_id,
    method: row.method as QueuedOperation['method'],
    payload: row.payload ? (JSON.parse(row.payload) as Record<string, unknown>) : undefined,
    createdAt: row.created_at,
  }));
}

export async function removeQueuedOperation(db: SQLiteDatabase, id: string) {
  await db.runAsync('DELETE FROM sync_queue WHERE id = ?', id);
}

export async function queueSize(db: SQLiteDatabase, schoolId: string) {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM sync_queue WHERE school_id = ?',
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
