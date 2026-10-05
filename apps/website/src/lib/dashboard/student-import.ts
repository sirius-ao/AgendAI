export type StudentImportRecord = {
  line: number;
  name: string;
  contact: string;
};

function splitDelimited(text: string) {
  const source = text.replace(/^\uFEFF/, '');
  const firstLine = source.split(/\r?\n/, 1)[0] || '';
  const delimiters = [',', ';', '\t'];
  const delimiter = delimiters
    .map((candidate) => ({
      candidate,
      count: firstLine.split(candidate).length - 1,
    }))
    .sort((left, right) => right.count - left.count)[0]?.candidate || ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function columnIndex(reference: string) {
  const letters = reference.match(/^[A-Z]+/i)?.[0]?.toUpperCase() || 'A';
  return [...letters].reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function readZipEntries(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocdSignature = 0x06054b50;
  let eocd = -1;
  for (let offset = Math.max(0, bytes.length - 65_557); offset <= bytes.length - 22; offset += 1) {
    if (view.getUint32(offset, true) === eocdSignature) eocd = offset;
  }
  if (eocd < 0) throw new Error('O ficheiro Excel está danificado ou não é um .xlsx válido.');

  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const entries = new Map<string, { method: number; size: number; localOffset: number }>();
  const decoder = new TextDecoder();

  for (let index = 0; index < count; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error('Não foi possível ler a estrutura do ficheiro Excel.');
    const method = view.getUint16(offset + 10, true);
    const size = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    entries.set(name, { method, size, localOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }

  const read = async (path: string) => {
    const entry = entries.get(path);
    if (!entry) return null;
    const local = entry.localOffset;
    if (view.getUint32(local, true) !== 0x04034b50) throw new Error('Não foi possível ler uma folha do ficheiro Excel.');
    const nameLength = view.getUint16(local + 26, true);
    const extraLength = view.getUint16(local + 28, true);
    const start = local + 30 + nameLength + extraLength;
    const compressed = bytes.slice(start, start + entry.size);
    if (entry.method === 0) return decoder.decode(compressed);
    if (entry.method !== 8 || typeof DecompressionStream === 'undefined') {
      throw new Error('Este navegador não consegue abrir este ficheiro Excel. Guarde-o como CSV e tente novamente.');
    }
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(stream).text();
  };

  return { entries, read };
}

function parseXml(source: string, label: string) {
  const document = new DOMParser().parseFromString(source, 'application/xml');
  if (document.getElementsByTagName('parsererror').length) throw new Error(`Não foi possível ler ${label} no ficheiro Excel.`);
  return document;
}

function elementsByLocalName(parent: ParentNode, name: string) {
  return [...parent.querySelectorAll('*')].filter((element) => element.localName === name);
}

async function readXlsx(file: File) {
  if (file.size > 5 * 1024 * 1024) throw new Error('O ficheiro deve ter menos de 5 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const zip = readZipEntries(bytes);
  const [workbookXml, relationshipsXml, sharedStringsXml] = await Promise.all([
    zip.read('xl/workbook.xml'),
    zip.read('xl/_rels/workbook.xml.rels'),
    zip.read('xl/sharedStrings.xml'),
  ]);
  if (!workbookXml || !relationshipsXml) throw new Error('O ficheiro não contém um livro Excel válido.');
  const workbook = parseXml(workbookXml, 'o livro');
  const relationships = parseXml(relationshipsXml, 'as folhas');
  const firstSheet = elementsByLocalName(workbook, 'sheet')[0];
  const relationshipId = firstSheet?.getAttribute('r:id');
  if (!relationshipId) throw new Error('O ficheiro Excel não contém folhas com dados.');
  const relationship = elementsByLocalName(relationships, 'Relationship').find((item) => item.getAttribute('Id') === relationshipId);
  const target = relationship?.getAttribute('Target');
  if (!target) throw new Error('Não foi possível localizar a primeira folha do ficheiro Excel.');
  const sheetPath = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
  const sheetXml = await zip.read(sheetPath);
  if (!sheetXml) throw new Error('A primeira folha do ficheiro Excel está vazia ou inacessível.');

  const shared = sharedStringsXml
    ? elementsByLocalName(parseXml(sharedStringsXml, 'os nomes das células'), 'si').map((item) => elementsByLocalName(item, 't').map((part) => part.textContent || '').join(''))
    : [];
  const sheet = parseXml(sheetXml, 'a primeira folha');
  return elementsByLocalName(sheet, 'row').map((row) => {
    const values: string[] = [];
    for (const cell of elementsByLocalName(row, 'c')) {
      const index = columnIndex(cell.getAttribute('r') || 'A');
      const type = cell.getAttribute('t');
      const value = elementsByLocalName(cell, 'v')[0]?.textContent || '';
      values[index] = type === 's' ? shared[Number(value)] || '' : type === 'inlineStr' ? elementsByLocalName(cell, 't').map((part) => part.textContent || '').join('') : value;
    }
    return values;
  }).filter((row) => row.some((value) => value?.trim()));
}

export function recordsFromRows(rows: string[][], allowNameOnly = false): StudentImportRecord[] {
  if (!rows.length) throw new Error('Não encontrámos linhas com dados no ficheiro.');
  const header = rows[0].map((value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
  const nameIndex = header.findIndex((value) => ['nome', 'nomecompleto', 'aluno', 'estudante'].includes(value));
  const contactIndex = header.findIndex((value) => ['contacto', 'contato', 'telefone', 'telemovel', 'email'].includes(value));
  if (nameIndex < 0 && !allowNameOnly) throw new Error('A primeira linha deve ter uma coluna “Nome”. Descarregue o modelo para ver o formato esperado.');
  const data = nameIndex >= 0 ? rows.slice(1).map((row) => ({ name: row[nameIndex] || '', contact: contactIndex >= 0 ? row[contactIndex] || '' : '' })) : rows.map((row) => ({ name: row[0] || '', contact: '' }));
  if (data.length > 2000) throw new Error('Pode importar até 2.000 alunos de cada vez. Divida a lista em vários ficheiros.');
  if (!data.length) throw new Error('O ficheiro tem cabeçalhos, mas não tem alunos para importar.');
  return data.map((record, index) => ({ line: index + (nameIndex >= 0 ? 2 : 1), ...record }));
}

export async function parseStudentImportFile(file: File) {
  if (file.size > 5 * 1024 * 1024) throw new Error('O ficheiro deve ter menos de 5 MB.');
  const extension = file.name.toLowerCase().split('.').pop();
  if (!['csv', 'tsv', 'xlsx'].includes(extension || '')) throw new Error('Escolha um ficheiro CSV, TSV ou Excel (.xlsx).');
  const rows = extension === 'xlsx' ? await readXlsx(file) : splitDelimited(await file.text());
  return recordsFromRows(rows, false);
}

export function parsePastedStudentList(text: string) {
  const rows = splitDelimited(text);
  if (!rows.length) throw new Error('Escreva ou cole pelo menos um aluno.');
  const firstRow = rows[0].map((value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
  const hasHeader = firstRow.some((value) => ['nome', 'nomecompleto', 'aluno', 'estudante'].includes(value));
  return recordsFromRows(rows, !hasHeader);
}
