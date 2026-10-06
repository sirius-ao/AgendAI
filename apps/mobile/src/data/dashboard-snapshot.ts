import type { ApiDashboardSnapshot, DashboardRow, DashboardSnapshot } from '@/types/api';

/** Keep dashboard records used by the website, including when legacy lists are empty. */
export function normalizeDashboardSnapshot(raw: ApiDashboardSnapshot): DashboardSnapshot {
  const data: DashboardSnapshot['data'] = Object.fromEntries(
    Object.entries(raw.data || {}).map(([collection, rows]) => [
      collection,
      rows.map((row) => ({
        recordId: row.recordId || row.id || String(row.payload?.id || ''),
        payload: row.payload || {},
        updatedAt: row.updatedAt,
      })),
    ]),
  );
  for (const collection of ['classes', 'students'] as const) {
    const records = new Map<string, DashboardRow>();
    for (const item of raw[collection] || []) {
      records.set(item.id, { recordId: item.id, payload: item });
    }
    // The dashboard payload is authoritative for IDs present in both formats.
    for (const row of data[collection] || []) records.set(row.recordId, row);
    data[collection] = [...records.values()];
  }
  return { school: raw.school, data };
}
