import React, { useRef } from 'react';
import { useCurrency } from '@/shared/contexts/CurrencyContext';
import { AR_LABELS, ExportIcon } from '@/shared/constants';
import * as XLSX from 'xlsx';

export interface ColumnDef {
  key: string;
  label: string;
  format?: 'currency' | 'number' | 'date';
  align?: 'left' | 'right' | 'center';
}

interface ReportDataGridProps {
  title?: string;
  columns: ColumnDef[];
  rows: Record<string, unknown>[];
  summary?: Record<string, unknown>;
  loading?: boolean;
  reportName?: string;
}

export function ReportDataGrid({ title, columns, rows, summary, loading, reportName = 'Report' }: ReportDataGridProps) {
  const tableRef = useRef<HTMLTableElement>(null);
  const { formatCurrency } = useCurrency();

  const formatValue = (value: unknown, col: ColumnDef): string => {
    if (value == null || value === '') return '';
    if (col.format === 'currency') return formatCurrency(Number(value));
    if (col.format === 'number') return Number(value).toLocaleString();
    if (col.format === 'date') return new Date(value as string).toLocaleDateString();
    return String(value);
  };

  const exportExcel = () => {
    const data = rows.map((row) => {
      const obj: Record<string, string | number> = {};
      columns.forEach((col) => {
        obj[col.label] = col.format === 'currency' ? Number(row[col.key] ?? 0) : (row[col.key] != null ? String(row[col.key]) : '');
      });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, reportName.slice(0, 31));
    XLSX.writeFile(wb, `${reportName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const table = tableRef.current;
    if (!table) return;
    printWindow.document.write(`
      <!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>${reportName}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
        th { background: #f5f5f5; }
      </style></head><body>
      <h2>${reportName}</h2>
      <p>${new Date().toLocaleString('ar')}</p>
      ${table.outerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        جاري تحميل التقرير...
      </div>
    );
  }

  if (!rows.length && !summary) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        لا توجد بيانات. اختر الفلاتر واضغط &quot;إنشاء التقرير&quot;.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {title && <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportExcel}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            <ExportIcon />
            {AR_LABELS.exportExcel}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-600 text-white rounded-lg hover:bg-slate-700"
          >
            {AR_LABELS.exportPDF} / طباعة
          </button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table ref={tableRef} className="min-w-full text-right text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {rows.map((row, i) => (
              <tr key={i} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-2 text-slate-900 dark:text-slate-200">
                    {formatValue(row[col.key], col)}
                  </td>
                ))}
              </tr>
            ))}
            {summary && (
              <tr className="bg-amber-50 dark:bg-amber-900/20 font-medium">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-2 text-slate-900 dark:text-slate-200">
                    {formatValue(summary[col.key], col)}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
