import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Expense } from '@/contexts/expense/types';

const STATUS_LABELS: Record<string, string> = {
  pending: 'ממתין',
  approved: 'מאושר',
  rejected: 'נדחה',
  paid: 'שולם',
};

/**
 * Export expenses to CSV format
 */
export function exportExpensesToCSV(expenses: Expense[], filename?: string): void {
  const headers = ['תאריך', 'סכום (₪)', 'תיאור', 'קטגוריה', 'ילד', 'משלם', 'סטטוס', 'משותף'];
  const rows = expenses.map((exp) => [
    exp.date,
    exp.amount.toFixed(2),
    exp.description,
    exp.category || '',
    exp.childName || '',
    exp.paidByName || '',
    STATUS_LABELS[exp.status] || exp.status,
    exp.splitEqually ? 'כן' : 'לא',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const BOM = '\uFEFF'; // UTF-8 BOM for Excel
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export expenses to PDF format
 */
export function exportExpensesToPDF(expenses: Expense[], filename?: string): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  doc.setFont('helvetica');
  doc.setFontSize(18);
  doc.text('דוח הוצאות - מחציות פלוס', 105, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`נוצר בתאריך: ${new Date().toLocaleDateString('he-IL')}`, 105, 22, { align: 'center' });

  const tableData = expenses.map((exp) => [
    exp.date,
    exp.amount.toFixed(2),
    exp.description || '',
    exp.category || '',
    exp.childName || '',
    exp.paidByName || '',
    STATUS_LABELS[exp.status] || exp.status,
    exp.splitEqually ? 'כן' : 'לא',
  ]);

  autoTable(doc, {
    head: [['תאריך', 'סכום (₪)', 'תיאור', 'קטגוריה', 'ילד', 'משלם', 'סטטוס', 'משותף']],
    body: tableData,
    startY: 28,
    styles: { font: 'helvetica', fontSize: 8 },
    headStyles: { fillColor: [66, 139, 202] },
    margin: { left: 10, right: 10 },
  });

  const finalY = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 40;
  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  doc.setFontSize(11);
  doc.text(`סה"כ: ₪${total.toFixed(2)}`, 105, finalY + 15, { align: 'center' });

  doc.save(filename || `expenses-${new Date().toISOString().slice(0, 10)}.pdf`);
}
