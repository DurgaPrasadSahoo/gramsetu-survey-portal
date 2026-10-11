import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

function slug(value) {
  const cleaned = (value || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, '');
  return cleaned || 'all';
}

function pad(n) {
  return String(n).padStart(2, '0');
}

// type-district-panchayat-village-ddmmyyyy-hh-mm-ss (no extension — caller appends it)
export function buildExportFilename(type, { district, panchayat, village }) {
  const now = new Date();
  const date = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}`;
  const time = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  return `${type}-${slug(district)}-${slug(panchayat)}-${slug(village)}-${date}-${time}`;
}

const COLUMNS = [
  { header: 'SL No.', key: 'sl' },
  { header: 'Survey ID', key: 'unique_id' },
  { header: 'Owner Name', key: 'full_name' },
  { header: 'Added By', key: 'created_by_name' },
  { header: 'District', key: 'district' },
  { header: 'Panchayat', key: 'panchayat' },
  { header: 'Village', key: 'village_town' },
];

export function exportSurveyAnalysis({ rows, filters, format }) {
  const filename = buildExportFilename('survey', filters);
  const numbered = rows.map((r, i) => ({ ...r, sl: i + 1 }));

  if (format === 'pdf') {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(13);
    doc.text('GramSetu — Survey Analysis', 14, 14);
    autoTable(doc, {
      startY: 20,
      head: [COLUMNS.map((c) => c.header)],
      body: numbered.map((r) => COLUMNS.map((c) => r[c.key] ?? '')),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [11, 61, 102] },
    });
    doc.save(`${filename}.pdf`);
  } else {
    const data = numbered.map((r) => Object.fromEntries(COLUMNS.map((c) => [c.header, r[c.key] ?? ''])));
    const sheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Survey Analysis');
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  }
}
