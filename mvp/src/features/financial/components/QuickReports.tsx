import React from 'react';

interface QuickReportsProps {
  onGenerateReport: (reportType: string) => void;
}

const QuickReports: React.FC<QuickReportsProps> = ({ onGenerateReport }) => {
  const reportTypes = [
    { id: 'supplier-balances', label: 'تقرير أرصدة الموردين', color: 'bg-blue-500 hover:bg-blue-600' },
    { id: 'outstanding-payments', label: 'تقرير المدفوعات المستحقة', color: 'bg-red-500 hover:bg-red-600' },
    { id: 'purchase-summary', label: 'ملخص المشتريات', color: 'bg-green-500 hover:bg-green-600' },
    { id: 'payment-history', label: 'سجل المدفوعات', color: 'bg-purple-500 hover:bg-purple-600' },
    { id: 'supplier-performance', label: 'أداء الموردين', color: 'bg-indigo-500 hover:bg-indigo-600' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">التقارير السريعة</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {reportTypes.map((report) => (
          <button
            key={report.id}
            onClick={() => onGenerateReport(report.id)}
            className={`flex items-center justify-center p-4 rounded-lg transition-all duration-200 text-white ${report.color} hover:shadow-lg hover:scale-105`}
          >
            <span className="text-sm font-medium text-center">{report.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickReports;

