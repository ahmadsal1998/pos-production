import React from 'react';
import { Link } from 'react-router-dom';
import { AR_LABELS } from '@/shared/constants';
import { SalesReportsContent } from '@/pages/sales/SalesReportsPage';

/**
 * Central Reports module - accessible from the main sidebar.
 * Renders Sales reports (and can be extended with Purchase, Inventory, etc.).
 */
export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6 flex items-center gap-4">
          <Link
            to="/"
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          >
            ← {AR_LABELS.dashboard}
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{AR_LABELS.reports}</h1>
        </div>
        <SalesReportsContent />
      </div>
    </div>
  );
}
