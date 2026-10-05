export type DashboardValueRow = {
  path: string;
  parentPath: string | null;
  propertyKey: string | null;
  position: number | null;
  kind: 'OBJECT' | 'ARRAY' | 'STRING' | 'NUMBER' | 'BOOLEAN' | 'NULL';
  stringValue: string | null;
  numberValue: number | null;
  booleanValue: boolean | null;
};

type FlatValue = DashboardValueRow & { recordDbId: string };

/** Converts nested application data into one typed relational row per node. */
export function flattenDashboardValue(recordDbId: string, root: unknown): FlatValue[] {
  const rows: FlatValue[] = [];
  const visit = (value: unknown, path: string[], parentPath: string | null, propertyKey: string | null, position: number | null) => {
    const currentPath = JSON.stringify(path);
    const common = { recordDbId, path: currentPath, parentPath, propertyKey, position };
    if (value === null || value === undefined) rows.push({ ...common, kind: 'NULL', stringValue: null, numberValue: null, booleanValue: null });
    else if (Array.isArray(value)) {
      rows.push({ ...common, kind: 'ARRAY', stringValue: null, numberValue: null, booleanValue: null });
      value.forEach((child, index) => visit(child, [...path, String(index)], currentPath, null, index));
    } else if (typeof value === 'object') {
      rows.push({ ...common, kind: 'OBJECT', stringValue: null, numberValue: null, booleanValue: null });
      Object.entries(value).forEach(([key, child], index) => visit(child, [...path, key], currentPath, key, index));
    } else if (typeof value === 'string') rows.push({ ...common, kind: 'STRING', stringValue: value, numberValue: null, booleanValue: null });
    else if (typeof value === 'number' && Number.isFinite(value)) rows.push({ ...common, kind: 'NUMBER', stringValue: null, numberValue: value, booleanValue: null });
    else if (typeof value === 'boolean') rows.push({ ...common, kind: 'BOOLEAN', stringValue: null, numberValue: null, booleanValue: value });
    else rows.push({ ...common, kind: 'NULL', stringValue: null, numberValue: null, booleanValue: null });
  };
  visit(root, [], null, null, null);
  return rows;
}

/** Rebuilds the public payload shape from the normalized relational tree. */
export function expandDashboardValue(rows: DashboardValueRow[]): unknown {
  const nodes = new Map<string, unknown>();
  const ordered = [...rows].sort((a, b) => JSON.parse(a.path).length - JSON.parse(b.path).length || (a.position ?? -1) - (b.position ?? -1));
  for (const row of ordered) {
    let value: unknown;
    switch (row.kind) {
      case 'OBJECT': value = {}; break;
      case 'ARRAY': value = []; break;
      case 'STRING': value = row.stringValue ?? ''; break;
      case 'NUMBER': value = row.numberValue ?? 0; break;
      case 'BOOLEAN': value = row.booleanValue ?? false; break;
      case 'NULL': value = null; break;
    }
    nodes.set(row.path, value);
    if (row.parentPath === null) continue;
    const parent = nodes.get(row.parentPath);
    if (Array.isArray(parent) && row.position !== null) parent[row.position] = value;
    else if (parent && typeof parent === 'object' && row.propertyKey !== null) (parent as Record<string, unknown>)[row.propertyKey] = value;
  }
  return nodes.get('[]');
}
