const encoder = new TextEncoder();

const columns = [
  'Created', 'Month', 'Client Name', 'Client Segmentation', 'IP/Radius', 'Service No',
  'Revenue type', 'Mode of service', 'Billing Date', 'Done', 'Current Plan',
  'New Downgrade', 'Current Price', 'Downgrade Price', 'Currency', 'Price Difference',
  'Account Manager', 'Created By', 'Modified By'
];

const excelColumn = index => {
  let value = index + 1;
  let label = '';
  while (value) {
    value--;
    label = String.fromCharCode(65 + value % 26) + label;
    value = Math.floor(value / 26);
  }
  return label;
};

function excelDate(value, includeTime = false) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!match) return null;
  const [, year, month, day, hour = '0', minute = '0'] = match;
  const timestamp = Date.UTC(+year, +month - 1, +day, +hour, +minute);
  return (timestamp - Date.UTC(1899, 11, 30)) / 86400000;
}

function actorEmail(id, fallback, users) {
  return users.find(user => user.id === id)?.email || fallback || '';
}

function exportRows(requests, users) {
  return requests.map(request => {
    const lastAction = request.history?.at(-1);
    const difference = request.price_difference ?? (
      request.current_price !== undefined && request.new_price !== undefined && request.current_price !== '' && request.new_price !== ''
        ? Math.round((Number(request.new_price) - Number(request.current_price)) * 100) / 100
        : ''
    );
    return [
      request.created_at || '', request.month || '', request.customer_name || '', request.client_segment || '',
      request.ip_radius || '', request.service_no || request.customer_id || '', request.revenue_type || '',
      request.mode_of_service || '', request.effective_date || '',
      request.status === 'Completed' ? 'Done' : request.status?.startsWith('Pending') ? 'Submitted' : request.status || '',
      request.current_capacity || '', request.new_capacity || '', request.current_price ?? '', request.new_price ?? '',
      request.currency || 'TZS', difference,
      request.account_manager || '', actorEmail(request.created_by, request.created_by_name, users),
      actorEmail(lastAction?.actor_id, lastAction?.actor_name || request.created_by_name, users)
    ];
  });
}

function xmlEscape(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function cellXml(value, reference, style = 0, numeric = false) {
  if (value === '' || value === null || value === undefined) return `<c r="${reference}" s="${style}"/>`;
  if (numeric && Number.isFinite(Number(value))) return `<c r="${reference}" s="${style}"><v>${Number(value)}</v></c>`;
  return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
}

function worksheetXml(requests, users) {
  const dataRows = exportRows(requests, users);
  const allRows = [columns, ...dataRows];
  const rows = allRows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      const ref = `${excelColumn(columnIndex)}${rowIndex + 1}`;
      if (rowIndex === 0) return cellXml(value, ref, 1);
      if (columnIndex === 0) {
        const date = excelDate(value, true);
        return date === null ? cellXml(value, ref) : cellXml(date, ref, 3, true);
      }
      if (columnIndex === 8) {
        const date = excelDate(value);
        return date === null ? cellXml(value, ref) : cellXml(date, ref, 2, true);
      }
      if ([12, 13, 15].includes(columnIndex) && value !== '') return cellXml(value, ref, 4, true);
      return cellXml(value, ref);
    }).join('');
    return `<row r="${rowIndex + 1}"${rowIndex === 0 ? ' ht="28" customHeight="1"' : ''}>${cells}</row>`;
  }).join('');
  const widths = [21, 14, 34, 22, 17, 24, 18, 19, 15, 22, 22, 23, 16, 19, 13, 18, 38, 38, 38];
  const cols = widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('');
  const lastRow = allRows.length;
  const lastCol = excelColumn(columns.length - 1);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="20"/><cols>${cols}</cols><sheetData>${rows}</sheetData><autoFilter ref="A1:${lastCol}${lastRow}"/></worksheet>`;
}

const workbookFiles = (requests, users) => [
  ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
  ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
  ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Requests" sheetId="1" r:id="rId1"/></sheets></workbook>`],
  ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
  ['xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="yyyy-mm-dd hh:mm"/><numFmt numFmtId="165" formatCode="yyyy-mm-dd"/></numFmts><fonts count="2"><font><sz val="10"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0D3556"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FFD9E2EC"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/><xf numFmtId="4" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`],
  ['xl/worksheets/sheet1.xml', worksheetXml(requests, users)]
];

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let value = n;
    for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[n] = value >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function zipStore(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const writeHeader = (size, fields) => {
    const bytes = new Uint8Array(size);
    const view = new DataView(bytes.buffer);
    for (const [position, value, width] of fields) width === 4 ? view.setUint32(position, value, true) : view.setUint16(position, value, true);
    return bytes;
  };
  for (const [path, content] of files) {
    const name = encoder.encode(path);
    const data = encoder.encode(content);
    const checksum = crc32(data);
    const local = writeHeader(30, [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, 0, 2], [12, 0x0021, 2], [14, checksum, 4], [18, data.length, 4], [22, data.length, 4], [26, name.length, 2], [28, 0, 2]]);
    localParts.push(local, name, data);
    const central = writeHeader(46, [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, 0, 2], [14, 0x0021, 2], [16, checksum, 4], [20, data.length, 4], [24, data.length, 4], [28, name.length, 2], [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, offset, 4]]);
    centralParts.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = writeHeader(22, [[0, 0x06054b50, 4], [4, 0, 2], [6, 0, 2], [8, files.length, 2], [10, files.length, 2], [12, centralSize, 4], [16, offset, 4], [20, 0, 2]]);
  return new Blob([...localParts, ...centralParts, end], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}

export function downloadRequestsExcel(requests, users) {
  const blob = zipStore(workbookFiles(requests, users));
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ZanLink-Requests-${new Date().toISOString().slice(0, 10)}.xlsx`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
