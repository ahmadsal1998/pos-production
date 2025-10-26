import React, { useState, useMemo, useEffect } from 'react';
import { AR_LABELS } from '../../../../shared/constants';
import { Product } from '../../../../shared/types';
import CustomDropdown from '../../../../shared/components/ui/CustomDropdown';

// --- MOCK DATA FOR THIS COMPONENT ---
const MOCK_PRODUCTS_WITH_COST: Product[] = [
  {
    id: 1,
    name: 'لابتوب Dell XPS 15',
    category: 'إلكترونيات',
    price: 1200.0,
    costPrice: 950.0,
    stock: 50,
    barcode: 'DELL-XPS15-12345',
    expiryDate: '2025-12-31',
    createdAt: '2023-01-15',
  },
  {
    id: 2,
    name: 'هاتف Samsung Galaxy S23',
    category: 'إلكترونيات',
    price: 899.99,
    costPrice: 700.0,
    stock: 120,
    barcode: 'SAM-S23-67890',
    expiryDate: '2026-06-30',
    createdAt: '2023-03-01',
  },
  {
    id: 3,
    name: 'طاولة قهوة خشبية',
    category: 'أثاث',
    price: 150.5,
    costPrice: 100.0,
    stock: 30,
    barcode: 'FURN-CT-11223',
    expiryDate: '2099-12-31',
    createdAt: '2023-11-10',
  },
  {
    id: 4,
    name: 'سماعات رأس Sony WH-1000XM5',
    category: 'إلكترونيات',
    price: 349.0,
    costPrice: 250.0,
    stock: 8,
    barcode: 'SONY-WH-44556',
    expiryDate: '2027-01-01',
    createdAt: '2023-09-01',
  },
  {
    id: 5,
    name: 'كوكا كولا',
    category: 'مشروبات',
    price: 2.5,
    costPrice: 1.5,
    stock: 200,
    barcode: 'COKE-CAN',
    expiryDate: '2024-12-01',
    createdAt: '2023-12-01',
  },
  {
    id: 6,
    name: 'ماء (صغير)',
    category: 'مشروبات',
    price: 1.0,
    costPrice: 0.5,
    stock: 500,
    barcode: 'WATER-S',
    expiryDate: '2025-01-01',
    createdAt: '2023-11-01',
  },
];

const MOCK_SALES_HISTORY = Array.from({ length: 200 }).map((_, i) => {
  const product =
    MOCK_PRODUCTS_WITH_COST[Math.floor(Math.random() * MOCK_PRODUCTS_WITH_COST.length)];
  const quantity = Math.floor(Math.random() * 5) + 1;
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * 365));
  return {
    saleId: `SALE-${i}`,
    date: date.toISOString(),
    items: [
      {
        productId: product.id,
        productName: product.name,
        category: product.category,
        quantity: quantity,
        unitPrice: product.price,
        total: quantity * product.price,
      },
    ],
  };
});
// --- END MOCK DATA ---

type TimeFilter = 'today' | 'this_week' | 'this_month' | 'last_3_months' | 'this_year';
type SortBy =
  | 'best_selling'
  | 'least_selling'
  | 'most_profitable'
  | 'least_profitable'
  | 'most_demanded';
type ChartView = 'count' | 'value';

const ProductPerformanceCard = () => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('this_month');
  const [sortBy, setSortBy] = useState<SortBy>('best_selling');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [chartView, setChartView] = useState<ChartView>('value');

  const analyticsData = useMemo(() => {
    const now = new Date();
    let startDate = new Date();

    switch (timeFilter) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'this_week':
        startDate.setDate(now.getDate() - now.getDay());
        break;
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last_3_months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    const filteredSales = MOCK_SALES_HISTORY.filter(sale => {
      const saleDate = new Date(sale.date);
      const matchesCategory =
        categoryFilter === 'all' || sale.items.some(item => item.category === categoryFilter);
      return saleDate >= startDate && matchesCategory;
    });

    const productStats: Record<
      number,
      { name: string; salesCount: number; revenue: number; profit: number }
    > = {};

    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        if (!productStats[item.productId]) {
          productStats[item.productId] = {
            name: item.productName,
            salesCount: 0,
            revenue: 0,
            profit: 0,
          };
        }
        productStats[item.productId].salesCount += item.quantity;
        productStats[item.productId].revenue += item.total;
      });
    });

    const rankedProducts = Object.entries(productStats).map(([productId, stats]) => {
      const product = MOCK_PRODUCTS_WITH_COST.find(p => p.id === parseInt(productId));
      const cost = (product?.costPrice || 0) * stats.salesCount;
      const profit = stats.revenue - cost;
      const profitMargin = stats.revenue > 0 ? (profit / stats.revenue) * 100 : 0;
      return {
        ...stats,
        profit,
        profitMargin,
      };
    });

    rankedProducts.sort((a, b) => {
      switch (sortBy) {
        case 'best_selling':
          return b.revenue - a.revenue;
        case 'least_selling':
          return a.revenue - b.revenue;
        case 'most_profitable':
          return b.profit - a.profit;
        case 'least_profitable':
          return a.profit - b.profit;
        case 'most_demanded':
          return b.salesCount - a.salesCount;
        default:
          return 0;
      }
    });

    const totalSales = rankedProducts.reduce((sum, p) => sum + p.revenue, 0);
    const totalItemsSold = rankedProducts.reduce((sum, p) => sum + p.salesCount, 0);

    // Chart Data
    const chartData = filteredSales.reduce(
      (acc, sale) => {
        const date = new Date(sale.date).toLocaleDateString('ar-SA', {
          month: 'short',
          day: 'numeric',
        });
        if (!acc[date]) acc[date] = { count: 0, value: 0 };
        acc[date].count += sale.items.reduce((s, i) => s + i.quantity, 0);
        acc[date].value += sale.items.reduce((s, i) => s + i.total, 0);
        return acc;
      },
      {} as Record<string, { count: number; value: number }>
    );

    const chartLabels = Object.keys(chartData);
    const chartValues = chartLabels.map(label => chartData[label][chartView]);
    const maxChartValue = Math.max(...chartValues, 1);

    // Insights
    const insights = [];
    if (rankedProducts.length > 0) {
      insights.push(
        `المنتج الأكثر مبيعًا هو "${rankedProducts[0].name}" بإيرادات ${rankedProducts[0].revenue.toFixed(2)} ر.س.`
      );
      const mostProfitable = [...rankedProducts].sort((a, b) => b.profit - a.profit)[0];
      insights.push(
        `"${mostProfitable.name}" هو الأكثر ربحية بهامش ربح ${mostProfitable.profitMargin.toFixed(1)}%.`
      );
    } else {
      insights.push('لا توجد بيانات مبيعات كافية لتوليد رؤى.');
    }

    return {
      totalSales,
      totalItemsSold,
      avgSellingPrice: totalItemsSold > 0 ? totalSales / totalItemsSold : 0,
      bestSellingProduct: rankedProducts[0]?.name || '-',
      leastSellingProduct: rankedProducts[rankedProducts.length - 1]?.name || '-',
      rankedProducts: rankedProducts.slice(0, 5), // Top 5
      chart: { labels: chartLabels, values: chartValues, max: maxChartValue },
      insights,
    };
  }, [timeFilter, sortBy, categoryFilter, chartView]);

  const categories = ['all', ...Array.from(new Set(MOCK_PRODUCTS_WITH_COST.map(p => p.category)))];

  return (
    <div className="space-y-8">
      {/* Ultra Modern Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-2xl font-bold tracking-tight text-transparent dark:from-white dark:via-gray-100 dark:to-white">
            {AR_LABELS.productPerformanceInsights}
          </h2>
          <div className="h-1 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
        </div>
        <div className="hidden sm:flex items-center space-x-2 space-x-reverse rounded-full bg-gradient-to-r from-green-500/10 to-emerald-500/10 px-4 py-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium text-green-600 dark:text-green-400">تحليل مباشر</span>
        </div>
      </div>

      {/* Ultra Modern Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="group relative">
          <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 blur transition-all duration-300 group-hover:opacity-100" />
          <CustomDropdown
            value={timeFilter}
            onChange={(value) => setTimeFilter(value as TimeFilter)}
            options={[
              { value: 'today', label: AR_LABELS.today },
              { value: 'this_week', label: AR_LABELS.thisWeek },
              { value: 'this_month', label: AR_LABELS.thisMonth },
              { value: 'last_3_months', label: AR_LABELS.last3Months },
              { value: 'this_year', label: AR_LABELS.thisYear },
            ]}
            placeholder="اختر الفترة الزمنية"
            className="relative"
          />
        </div>
        
        <div className="group relative">
          <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-orange-500/20 to-pink-500/20 opacity-0 blur transition-all duration-300 group-hover:opacity-100" />
          <CustomDropdown
            value={sortBy}
            onChange={(value) => setSortBy(value as SortBy)}
            options={[
              { value: 'best_selling', label: AR_LABELS.bestSelling },
              { value: 'least_selling', label: AR_LABELS.leastSelling },
              { value: 'most_profitable', label: AR_LABELS.mostProfitable },
              { value: 'least_profitable', label: AR_LABELS.leastProfitable },
              { value: 'most_demanded', label: AR_LABELS.mostDemanded },
            ]}
            placeholder="اختر طريقة الترتيب"
            className="relative"
          />
        </div>
        
        <div className="group relative">
          <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-green-500/20 to-teal-500/20 opacity-0 blur transition-all duration-300 group-hover:opacity-100" />
          <CustomDropdown
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={categories.map(c => ({
              value: c,
              label: c === 'all' ? AR_LABELS.allCategories : c
            }))}
            placeholder="اختر الفئة"
            className="relative"
          />
        </div>
      </div>

      {/* Ultra Modern KPIs */}
      <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-5">
        {[
          { label: AR_LABELS.totalSales, value: analyticsData.totalSales.toFixed(2), color: 'from-green-400 to-emerald-500', textColor: 'text-green-600' },
          { label: AR_LABELS.totalItemsSold, value: analyticsData.totalItemsSold, color: 'from-blue-400 to-cyan-500', textColor: 'text-blue-600' },
          { label: AR_LABELS.avgSellingPrice, value: analyticsData.avgSellingPrice.toFixed(2), color: 'from-purple-400 to-violet-500', textColor: 'text-purple-600' },
          { label: AR_LABELS.bestSellingProduct, value: analyticsData.bestSellingProduct, color: 'from-orange-400 to-red-500', textColor: 'text-orange-600' },
          { label: AR_LABELS.leastSellingProduct, value: analyticsData.leastSellingProduct, color: 'from-gray-400 to-slate-500', textColor: 'text-gray-600' }
        ].map((kpi, index) => (
          <div
            key={index}
            className="group relative"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={`absolute -inset-0.5 rounded-2xl bg-gradient-to-r ${kpi.color} opacity-0 blur transition-all duration-500 group-hover:opacity-100`} />
            <div className="relative overflow-hidden rounded-2xl bg-white/90 p-6 shadow-lg backdrop-blur-xl transition-all duration-500 hover:shadow-2xl dark:bg-gray-900/90">
              <div className="text-center space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {kpi.label}
                </p>
                <p className={`text-2xl font-bold ${kpi.textColor} transition-all duration-300 group-hover:scale-105`}>
                  {kpi.value}
                </p>
                <div className="flex items-center justify-center space-x-2 space-x-reverse">
                  <div className={`h-1 w-6 rounded-full bg-gradient-to-r ${kpi.color}`} />
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">+8.2%</span>
                </div>
              </div>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </div>
          </div>
        ))}
      </div>

      {/* Ultra Modern Table and Chart */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Modern Table */}
        <div className="group relative">
          <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 blur transition-all duration-500 group-hover:opacity-100" />
          <div className="relative overflow-hidden rounded-3xl bg-white/90 shadow-xl backdrop-blur-xl dark:bg-gray-900/90">
            <div className="border-b border-gray-200/50 bg-gradient-to-r from-gray-50/50 to-gray-100/50 px-6 py-4 dark:border-gray-700/50 dark:from-gray-800/50 dark:to-gray-700/50">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">أفضل المنتجات</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-right text-sm">
                <thead className="bg-gradient-to-r from-gray-50/80 to-gray-100/80 dark:from-gray-800/80 dark:to-gray-700/80">
                  <tr>
                    <th className="px-6 py-4 font-bold text-gray-600 dark:text-gray-300">#</th>
                    <th className="px-6 py-4 font-bold text-gray-600 dark:text-gray-300">{AR_LABELS.productName}</th>
                    <th className="px-6 py-4 font-bold text-gray-600 dark:text-gray-300">{AR_LABELS.salesCount}</th>
                    <th className="px-6 py-4 font-bold text-gray-600 dark:text-gray-300">{AR_LABELS.revenue}</th>
                    <th className="px-6 py-4 font-bold text-gray-600 dark:text-gray-300">{AR_LABELS.profitMargin}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
                  {analyticsData.rankedProducts.map((p, i) => (
                    <tr
                      key={p.name}
                      className="group/row transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20"
                    >
                      <td className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">{i + 1}</td>
                      <td className="max-w-xs truncate px-6 py-4 font-semibold text-gray-900 dark:text-white">{p.name}</td>
                      <td className="px-6 py-4 text-center font-medium text-gray-700 dark:text-gray-300">{p.salesCount}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{p.revenue.toFixed(2)}</td>
                      <td className={`px-6 py-4 font-bold ${p.profitMargin > 20 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                        {p.profitMargin.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Ultra Modern Chart */}
        <div className="group relative">
          <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-orange-500/20 to-pink-500/20 opacity-0 blur transition-all duration-500 group-hover:opacity-100" />
          <div className="relative overflow-hidden rounded-3xl bg-white/90 p-6 shadow-xl backdrop-blur-xl dark:bg-gray-900/90">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{AR_LABELS.salesTrend}</h3>
              <div className="flex rounded-xl bg-gray-100/80 p-1 backdrop-blur-xl dark:bg-gray-800/80">
                <button
                  onClick={() => setChartView('value')}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-300 ${
                    chartView === 'value' 
                      ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg' 
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  {AR_LABELS.salesValue}
                </button>
                <button
                  onClick={() => setChartView('count')}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-300 ${
                    chartView === 'count' 
                      ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg' 
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  {AR_LABELS.salesCount}
                </button>
              </div>
            </div>
            
            <div className="flex h-64 items-end gap-3 rounded-2xl bg-gradient-to-t from-gray-50/50 to-transparent p-6 dark:from-gray-800/50">
              {analyticsData.chart.values.map((val, i) => (
                <div
                  key={i}
                  className="group/bar relative flex-1 rounded-t-2xl bg-gradient-to-t from-blue-500 to-cyan-400 transition-all duration-500 hover:from-blue-600 hover:to-cyan-500 hover:shadow-lg"
                  style={{ height: `${(val / analyticsData.chart.max) * 100}%` }}
                >
                  <div className="absolute inset-0 rounded-t-2xl bg-gradient-to-t from-transparent via-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover/bar:opacity-100" />
                  <span className="absolute bottom-full left-1/2 mb-2 w-max -translate-x-1/2 rounded-xl bg-gray-900 px-3 py-1 text-xs font-medium text-white opacity-0 transition-all duration-300 group-hover/bar:opacity-100">
                    {analyticsData.chart.labels[i]}: {val.toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Ultra Modern Insights */}
      <div className="group relative">
        <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 opacity-0 blur transition-all duration-500 group-hover:opacity-100" />
        <div className="relative overflow-hidden rounded-3xl bg-white/90 p-8 shadow-xl backdrop-blur-xl dark:bg-gray-900/90">
          <div className="mb-6 flex items-center space-x-3 space-x-reverse">
            <div className="rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 p-3">
              <span className="text-2xl">💡</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{AR_LABELS.insights}</h3>
          </div>
          
          <div className="space-y-4">
            {analyticsData.insights.map((insight, i) => (
              <div
                key={i}
                className="group/insight flex items-start space-x-4 space-x-reverse rounded-2xl bg-gradient-to-r from-yellow-50/50 to-orange-50/50 p-4 transition-all duration-300 hover:from-yellow-100/50 hover:to-orange-100/50 dark:from-yellow-900/20 dark:to-orange-900/20 dark:hover:from-yellow-800/30 dark:hover:to-orange-800/30"
              >
                <div className="mt-1 h-2 w-2 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-300 group-hover/insight:scale-150" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed">
                  {insight}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPerformanceCard;
