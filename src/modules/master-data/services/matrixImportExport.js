import { normalizeDigitsToLatin } from '@/utils/helpers';

const UTF8_BOM = '\uFEFF';
const PROCESS_ALIASES = new Map([
  ['raw', 'raw'],
  ['خام', 'raw'],
  ['فلوت', 'raw'],
  ['sekurit', 'sekurit'],
  ['سکوریت', 'sekurit'],
  ['سکوريت', 'sekurit'],
  ['tempered', 'sekurit'],
]);

const normalizeProcess = (value) => {
  const key = String(value || '').trim().toLowerCase();
  if (PROCESS_ALIASES.has(key)) return PROCESS_ALIASES.get(key);
  return key === 'sekurit' ? 'sekurit' : 'raw';
};

const stripUtf8Bom = (value = '') => (value.charCodeAt(0) === 0xFEFF ? value.slice(1) : value);

const toStrictPositiveInt = (value) => {
  const normalized = normalizeDigitsToLatin(String(value ?? ''))
    .replace(/[ ,\u066C\u060C\s]/g, '')
    .replace(/[^\d-]/g, '');
  if (!normalized) return null;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const toStrictNonNegativeInt = (value) => {
  const normalized = normalizeDigitsToLatin(String(value ?? ''))
    .replace(/[ ,\u066C\u060C\s]/g, '')
    .replace(/[^\d]/g, '');
  if (!normalized) return null;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const parseThicknessValue = (value) => {
  const normalized = normalizeDigitsToLatin(String(value ?? ''));
  const match = normalized.match(/\d+/);
  if (!match) return null;
  return toStrictPositiveInt(match[0]);
};

const dedupeAndSortThicknesses = (values) => (
  [...new Set(values.map(parseThicknessValue).filter((item) => item !== null))].sort((a, b) => a - b)
);

const escapeCsvCell = (value) => {
  const raw = String(value ?? '');
  if (!/[",\r\n]/.test(raw)) return raw;
  return `"${raw.replace(/"/g, '""')}"`;
};

const xmlEscape = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const detectDelimiter = (headerLine = '') => {
  const options = [',', ';', '\t'];
  let best = ',';
  let bestCount = -1;
  for (const delimiter of options) {
    const parts = headerLine.split(delimiter).length;
    if (parts > bestCount) {
      best = delimiter;
      bestCount = parts;
    }
  }
  return best;
};

const parseDelimitedRows = (text, delimiter) => {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(cell);
      cell = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
};

const buildRowsFromSpreadsheetXml = (xmlText) => {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(xmlText, 'application/xml');
  if (documentNode.getElementsByTagName('parsererror').length > 0) {
    throw new Error('فایل Excel معتبر نیست.');
  }

  const rowNodes = Array.from(documentNode.getElementsByTagName('Row'));
  if (rowNodes.length === 0) throw new Error('داده‌ای برای ایمپورت در فایل Excel پیدا نشد.');

  return rowNodes.map((rowNode) => {
    const cells = [];
    let cursor = 0;
    const cellNodes = Array.from(rowNode.childNodes)
      .filter((node) => node.nodeType === 1 && node.localName === 'Cell');

    for (const cellNode of cellNodes) {
      const indexAttr = cellNode.getAttribute('ss:Index') || cellNode.getAttribute('Index');
      if (indexAttr) {
        const nextIndex = toStrictPositiveInt(indexAttr);
        if (nextIndex !== null) cursor = nextIndex - 1;
      }

      const dataNode = Array.from(cellNode.childNodes)
        .find((node) => node.nodeType === 1 && node.localName === 'Data');
      cells[cursor] = dataNode?.textContent ?? '';
      cursor += 1;
    }

    return cells;
  });
};

const materializeMatrixFromRows = (rows) => {
  if (!Array.isArray(rows) || rows.length < 2) {
    throw new Error('فایل ایمپورت باید شامل هدر و حداقل یک ردیف باشد.');
  }

  const thicknesses = dedupeAndSortThicknesses((rows[0] || []).slice(2));
  if (thicknesses.length === 0) throw new Error('ستون‌های ضخامت در فایل پیدا نشد.');

  const idBase = Date.now();
  const glasses = rows.slice(1).map((row, index) => {
    const title = String(row?.[0] ?? '').trim();
    const process = normalizeProcess(row?.[1]);
    const prices = {};

    for (let i = 0; i < thicknesses.length; i += 1) {
      const thickness = thicknesses[i];
      const cellValue = toStrictNonNegativeInt(row?.[i + 2]);
      if (cellValue !== null) prices[thickness] = cellValue;
    }

    if (!title && Object.keys(prices).length === 0) return null;
    return { id: `import-${idBase}-${index + 1}`, title, process, prices };
  }).filter(Boolean);

  if (glasses.length === 0) throw new Error('هیچ ردیف معتبری برای ایمپورت پیدا نشد.');
  return { thicknesses, glasses };
};

const resolveThicknessesForExport = (thicknesses, glasses) => {
  const fromCatalog = dedupeAndSortThicknesses(Array.isArray(thicknesses) ? thicknesses : []);
  if (fromCatalog.length > 0) return fromCatalog;
  const fromRows = (Array.isArray(glasses) ? glasses : []).flatMap((row) => Object.keys(row?.prices || {}));
  return dedupeAndSortThicknesses(fromRows);
};

export const serializeMatrixCsv = ({ thicknesses = [], glasses = [] } = {}) => {
  const safeThicknesses = resolveThicknessesForExport(thicknesses, glasses);
  if (safeThicknesses.length === 0) throw new Error('هیچ ضخامت معتبری برای خروجی گرفتن وجود ندارد.');

  const header = ['title', 'process', ...safeThicknesses.map(String)];
  const lines = [header.map(escapeCsvCell).join(',')];

  for (const row of glasses) {
    const csvRow = [
      row?.title ?? '',
      normalizeProcess(row?.process),
      ...safeThicknesses.map((thickness) => {
        const value = toStrictNonNegativeInt(row?.prices?.[thickness]);
        return value === null ? '' : String(value);
      }),
    ];
    lines.push(csvRow.map(escapeCsvCell).join(','));
  }

  return `${UTF8_BOM}${lines.join('\r\n')}`;
};

export const serializeMatrixExcelXml = ({ thicknesses = [], glasses = [] } = {}) => {
  const safeThicknesses = resolveThicknessesForExport(thicknesses, glasses);
  if (safeThicknesses.length === 0) throw new Error('هیچ ضخامت معتبری برای خروجی گرفتن وجود ندارد.');

  const headerCells = ['نوع شیشه', 'فرآیند', ...safeThicknesses.map((item) => `${item} میل`)]
    .map((cell) => `<Cell ss:StyleID="sHeader"><Data ss:Type="String">${xmlEscape(cell)}</Data></Cell>`)
    .join('');

  const bodyRows = glasses.map((row) => {
    const priceCells = safeThicknesses.map((thickness) => {
      const value = toStrictNonNegativeInt(row?.prices?.[thickness]);
      return value === null
        ? '<Cell ss:StyleID="sText"></Cell>'
        : `<Cell ss:StyleID="sNum"><Data ss:Type="Number">${value}</Data></Cell>`;
    }).join('');

    return '<Row>'
      + `<Cell ss:StyleID="sText"><Data ss:Type="String">${xmlEscape(row?.title ?? '')}</Data></Cell>`
      + `<Cell ss:StyleID="sText"><Data ss:Type="String">${xmlEscape(normalizeProcess(row?.process) === 'sekurit' ? 'سکوریت' : 'خام')}</Data></Cell>`
      + priceCells
      + '</Row>';
  }).join('');

  return [
    '<?xml version="1.0"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"',
    ' xmlns:o="urn:schemas-microsoft-com:office:office"',
    ' xmlns:x="urn:schemas-microsoft-com:office:excel"',
    ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"',
    ' xmlns:html="http://www.w3.org/TR/REC-html40">',
    ' <Styles>',
    '  <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Font ss:FontName="Tahoma" ss:Size="10"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>',
    '  <Style ss:ID="sHeader"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Font ss:FontName="Tahoma" ss:Size="10" ss:Bold="1"/><Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/></Style>',
    '  <Style ss:ID="sText"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/></Style>',
    '  <Style ss:ID="sNum"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><NumberFormat ss:Format="#,##0"/></Style>',
    ' </Styles>',
    ' <Worksheet ss:Name="GlassMatrix">',
    '  <Table>',
    '   <Column ss:Width="140"/>',
    '   <Column ss:Width="90"/>',
    `   <Row>${headerCells}</Row>`,
    `   ${bodyRows}`,
    '  </Table>',
    '  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><DisplayRightToLeft/></WorksheetOptions>',
    ' </Worksheet>',
    '</Workbook>',
  ].join('\n');
};

export const parseMatrixCsvText = (text) => {
  const normalizedText = stripUtf8Bom(String(text || ''));
  if (!normalizedText.trim()) throw new Error('فایل CSV خالی است.');
  const firstLine = normalizedText.split(/\r?\n/u, 1)[0] || '';
  const rows = parseDelimitedRows(normalizedText, detectDelimiter(firstLine));
  return materializeMatrixFromRows(rows);
};

export const parseMatrixExcelXmlText = (text) => {
  const normalizedText = stripUtf8Bom(String(text || ''));
  if (!normalizedText.trim()) throw new Error('فایل Excel خالی است.');
  return materializeMatrixFromRows(buildRowsFromSpreadsheetXml(normalizedText));
};

export const parseMatrixImportText = (text, extensionHint = '') => {
  const extension = String(extensionHint || '').toLowerCase().replace(/^\./, '');
  const content = stripUtf8Bom(String(text || ''));
  if (!content.trim()) throw new Error('فایل انتخاب شده خالی است.');

  if (extension === 'xml' || extension === 'xls') return parseMatrixExcelXmlText(content);
  if (extension === 'csv' || extension === 'txt' || extension === 'tsv') return parseMatrixCsvText(content);

  const trimmed = content.trimStart();
  return (trimmed.startsWith('<?xml') || trimmed.startsWith('<Workbook'))
    ? parseMatrixExcelXmlText(content)
    : parseMatrixCsvText(content);
};

export const buildMatrixExportFileName = (extension = 'csv') => {
  const datePart = new Date().toISOString().slice(0, 10);
  return `glass-matrix-${datePart}.${extension}`;
};
