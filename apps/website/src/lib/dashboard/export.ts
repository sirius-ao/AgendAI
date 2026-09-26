const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
export function downloadText(name: string, text: string, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportCSV(name: string, rows: (string | number)[][]) {
  downloadText(
    name,
    '\ufeff' +
      rows
        .map((row) =>
          row
            .map((v) => {
              let text = String(v);
              if (/^[=+@-]/.test(text)) text = "'" + text;
              return `"${text.replace(/"/g, '""')}"`;
            })
            .join(';'),
        )
        .join('\r\n'),
    'text/csv;charset=utf-8',
  );
}
export function printDocument(title: string, headers: string[], rows: (string | number)[][]) {
  const win = window.open('', '_blank', 'width=1100,height=800');
  if (!win) return false;
  win.opener = null;
  win.document.write(
    `<!doctype html><html lang="pt"><head><title>${escape(title)}</title><style>body{font:14px Arial,sans-serif;padding:35px;color:#102018}h1{font-size:25px}small{color:#57675e}table{border-collapse:collapse;width:100%;margin-top:24px}td,th{border:1px solid #d9e1dc;padding:10px;text-align:left}th{background:#e9f8ed}</style></head><body><h1>AgendAI · ${escape(title)}</h1><small>Dados de demonstração · Planear hoje. Ensinar melhor.</small><table><thead><tr>${headers.map((h) => `<th>${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((v) => `<td>${escape(String(v))}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`,
  );
  win.document.close();
  win.print();
  return true;
}
