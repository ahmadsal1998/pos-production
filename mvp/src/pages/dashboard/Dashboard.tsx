import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AR_LABELS, METRIC_CARDS_DATA, QUICK_ACTIONS_DATA } from '@/shared/constants';
import { MetricCard } from '@/shared/components/ui/MetricCard';
import { QuickActionCard } from '@/shared/components/ui/QuickActionCard';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const handleQuickAction = (path: string) => {
    navigate(path);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Modern Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-100/30 dark:from-slate-950 dark:via-blue-950/20 dark:to-indigo-950/30" />
      
      {/* Subtle Floating Orbs */}
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-400/15 to-cyan-400/15 blur-3xl animate-pulse" />
      <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-indigo-400/15 to-purple-400/15 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-slate-400/10 to-blue-400/10 blur-2xl animate-pulse" style={{ animationDelay: '4s' }} />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Modern Professional Header */}
        <div className="mb-12">
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="inline-flex items-center rounded-full bg-gradient-to-r from-blue-500/10 to-indigo-500/10 px-4 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50">
                  <div className="mr-2 h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  لوحة القيادة المباشرة
                </div>
                <h1 className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-4xl font-bold tracking-tight text-transparent dark:from-white dark:via-slate-100 dark:to-white sm:text-5xl lg:text-6xl">
                  {AR_LABELS.dashboardTitle}
                </h1>
                <p className="max-w-2xl text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                  {AR_LABELS.dashboardDescription}
                </p>
              </div>
            </div>
            
            {/* Modern Status Card */}
            <div className="group relative">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 opacity-20 blur transition-all duration-300 group-hover:opacity-30" />
              <div className="relative rounded-2xl bg-white/90 p-6 shadow-xl backdrop-blur-xl dark:bg-slate-900/90 border border-slate-200/50 dark:border-slate-700/50">
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">اليوم</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                    {new Date().toLocaleDateString('ar-SA', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <div className="flex items-center justify-end space-x-2 space-x-reverse">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">نشط الآن</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Metric Cards */}
        <div className="mb-12">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {METRIC_CARDS_DATA.map((metric, index) => (
              <div
                key={metric.id}
                className="group relative"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-slate-200 to-slate-300 opacity-0 blur transition-all duration-500 group-hover:opacity-100 dark:from-slate-700 dark:to-slate-600" />
                <div className="relative overflow-hidden rounded-2xl bg-white/95 p-6 shadow-lg backdrop-blur-xl transition-all duration-500 hover:shadow-xl dark:bg-slate-900/95 border border-slate-200/50 dark:border-slate-700/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {metric.title}
                      </p>
                      <p className={`text-2xl font-bold ${metric.valueColor} transition-all duration-300 group-hover:scale-105`}>
                        {metric.value}
                      </p>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <div className="h-1 w-6 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" />
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">+12.5%</span>
                      </div>
                    </div>
                    <div className={`relative rounded-xl p-3 ${metric.bgColor} transition-all duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                      <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      {metric.icon}
                    </div>
                  </div>
                  
                  {/* Subtle animated border */}
                  <div className="absolute inset-0 rounded-2xl border border-transparent bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modern Quick Actions */}
        <div className="mb-12">
          <div className="mb-8 flex items-center justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {AR_LABELS.quickActions}
              </h2>
              <div className="h-1 w-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center space-x-2 space-x-reverse rounded-full bg-white/90 px-4 py-2 shadow-lg backdrop-blur-xl dark:bg-slate-900/90 border border-slate-200/50 dark:border-slate-700/50">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">متاح</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_ACTIONS_DATA.map((action, index) => (
              <div
                key={action.id}
                className="group relative"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-blue-500/30 to-indigo-500/30 opacity-0 blur transition-all duration-500 group-hover:opacity-100" />
                <div className="relative overflow-hidden rounded-2xl bg-white/95 p-6 shadow-lg backdrop-blur-xl transition-all duration-500 hover:shadow-xl dark:bg-slate-900/95 border border-slate-200/50 dark:border-slate-700/50">
                  <button
                    onClick={() => navigate(action.path)}
                    className="flex h-full w-full flex-col items-center justify-center space-y-4 text-center transition-all duration-500 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <div className={`relative rounded-2xl p-4 ${action.colorClass} transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-lg`}>
                      <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      <div className="relative">{action.icon}</div>
                    </div>
                    <span className="text-base font-semibold text-slate-700 dark:text-slate-200 transition-colors duration-300 group-hover:text-slate-900 dark:group-hover:text-white">
                      {action.title}
                    </span>
                  </button>
                  
                  {/* Subtle animated border */}
                  <div className="absolute inset-0 rounded-2xl border border-transparent bg-gradient-to-r from-transparent via-blue-500/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modern Top-Selling Products Section */}
        <div className="relative">
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-blue-500/20 to-indigo-500/20 opacity-0 blur transition-all duration-500 hover:opacity-100" />
          <div className="relative overflow-hidden rounded-2xl bg-white/95 p-8 shadow-xl backdrop-blur-xl transition-all duration-500 hover:shadow-2xl dark:bg-slate-900/95 border border-slate-200/50 dark:border-slate-700/50">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 transition-opacity duration-500 hover:opacity-100" />
            <div className="relative">
              <TopSellingProductsSection onRowClick={() => navigate('/products')} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

// ---------------- Local Section Component ----------------
type TimeFilter = 'today' | 'week' | 'month' | 'year';

interface SaleItem {
  productId: number;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
}

interface SaleRecord {
  date: string;
  items: SaleItem[];
}

interface ProductRef {
  id: number;
  name: string;
  category: string;
  imageUrl?: string;
}

const MOCK_PRODUCTS: ProductRef[] = [
  { id: 1, name: 'لابتوب Dell XPS 15', category: 'إلكترونيات' },
  { id: 2, name: 'هاتف Samsung Galaxy S23', category: 'إلكترونيات' },
  { id: 3, name: 'طاولة قهوة خشبية', category: 'أثاث' },
  { id: 4, name: 'سماعات Sony WH-1000XM5', category: 'إلكترونيات' },
  { id: 5, name: 'كوكا كولا', category: 'مشروبات' },
  { id: 6, name: 'ماء (صغير)', category: 'مشروبات' },
  { id: 7, name: 'كرسي مكتب', category: 'أثاث' },
  { id: 8, name: 'ميكرويف', category: 'مطبخ' },
  { id: 9, name: 'كتاب تعليمي', category: 'كتب' },
  { id: 10, name: 'حذاء رياضي', category: 'أحذية' },
];

// generate lightweight mock sales across last 365 days
const MOCK_SALES: SaleRecord[] = Array.from({ length: 220 }).map((_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * 365));
  const itemsCount = Math.floor(Math.random() * 3) + 1;
  const items: SaleItem[] = Array.from({ length: itemsCount }).map(() => {
    const p = MOCK_PRODUCTS[Math.floor(Math.random() * MOCK_PRODUCTS.length)];
    const quantity = Math.floor(Math.random() * 5) + 1;
    const unitPrice = 20 + Math.floor(Math.random() * 1200);
    return { productId: p.id, productName: p.name, category: p.category, quantity, unitPrice };
  });
  return { date: date.toISOString(), items };
});

const TopSellingProductsSection: React.FC<{ onRowClick: (productId: number) => void } & { onRowClick?: (path?: any) => void }> = ({ onRowClick = () => {} }) => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
  const [category, setCategory] = useState<string>('all');
  const categories = useMemo(() => ['all', ...Array.from(new Set(MOCK_PRODUCTS.map(p => p.category)))], []);

  const { ranked, totalRevenue } = useMemo(() => {
    const now = new Date();
    let start = new Date();
    switch (timeFilter) {
      case 'today': start.setHours(0, 0, 0, 0); break;
      case 'week': start.setDate(now.getDate() - 7); break;
      case 'month': start = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case 'year': start = new Date(now.getFullYear(), 0, 1); break;
    }

    const filtered = MOCK_SALES.filter(s => {
      const d = new Date(s.date);
      if (d < start) return false;
      if (category === 'all') return true;
      return s.items.some(it => it.category === category);
    });

    const stats: Record<number, { name: string; category: string; qty: number; revenue: number } > = {};
    filtered.forEach(s => {
      s.items.forEach(it => {
        if (!stats[it.productId]) {
          stats[it.productId] = { name: it.productName, category: it.category, qty: 0, revenue: 0 };
        }
        stats[it.productId].qty += it.quantity;
        stats[it.productId].revenue += it.quantity * it.unitPrice;
      });
    });

    const rankedArr = Object.entries(stats)
      .map(([id, v]) => ({ id: Number(id), ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const sumRevenue = rankedArr.reduce((s, r) => s + r.revenue, 0);
    return { ranked: rankedArr, totalRevenue: sumRevenue };
  }, [timeFilter, category]);

  const chartData = useMemo(() => {
    const top = ranked.slice(0, 5);
    const max = Math.max(...top.map(t => t.revenue), 1);
    return { top, max };
  }, [ranked]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">المنتجات الأعلى مبيعًا</h2>
          <div className="h-1 w-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" />
        </div>
        <div className="flex gap-3">
          <select 
            value={timeFilter} 
            onChange={e => setTimeFilter(e.target.value as TimeFilter)} 
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm hover:shadow-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <option value="today">{AR_LABELS.today}</option>
            <option value="week">{AR_LABELS.thisWeek}</option>
            <option value="month">{AR_LABELS.thisMonth}</option>
            <option value="year">{AR_LABELS.thisYear}</option>
          </select>
          <select 
            value={category} 
            onChange={e => setCategory(e.target.value)} 
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm hover:shadow-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c === 'all' ? AR_LABELS.allCategories : c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Table/List */}
        <div className="overflow-x-auto rounded-xl border border-slate-200/50 dark:border-slate-700/50">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">#</th>
                <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{AR_LABELS.productName}</th>
                <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{AR_LABELS.salesCount}</th>
                <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{AR_LABELS.revenue}</th>
                <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {ranked.map((p, i) => {
                const pct = totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0;
                const productMeta = MOCK_PRODUCTS.find(mp => mp.id === p.id);
                return (
                  <tr 
                    key={p.id} 
                    className="transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 dark:hover:from-blue-950/20 dark:hover:to-indigo-950/20 cursor-pointer group" 
                    onClick={() => onRowClick(p.id)}
                  >
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-medium">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold shadow-md group-hover:scale-110 transition-transform duration-300">
                          {productMeta?.name?.slice(0, 1) || '•'}
                        </div>
                        <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[160px]" title={p.name}>{p.name}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300 font-medium">{p.qty}</td>
                    <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">{p.revenue.toFixed(2)}</td>
                    <td className="px-4 py-3 w-40">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500" style={{ width: `${pct.toFixed(0)}%` }}></div>
                        </div>
                        <span className="text-xs tabular-nums font-semibold text-slate-600 dark:text-slate-300">{pct.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {ranked.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500 dark:text-slate-400" colSpan={5}>{AR_LABELS.noSalesFound}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Simple Bar Chart for Top 5 */}
        <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-800 dark:to-blue-900/20 rounded-xl p-6 border border-slate-200/50 dark:border-slate-700/50">
          <div className="space-y-2 mb-4">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">أفضل 5 منتجات (إيرادات)</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">الأداء المالي للإنتاج</p>
          </div>
          <div className="space-y-4">
            {chartData.top.map((t) => (
              <div key={t.id} className="group">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="truncate max-w-[60%] font-semibold text-slate-700 dark:text-slate-200" title={t.name}>{t.name}</span>
                  <span className="tabular-nums font-bold text-emerald-600 dark:text-emerald-400">{t.revenue.toFixed(2)}</span>
                </div>
                <div className="h-3 bg-white dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                  <div className="h-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500 group-hover:from-emerald-400 group-hover:to-teal-400" style={{ width: `${(t.revenue / chartData.max) * 100}%` }}></div>
                </div>
              </div>
            ))}
            {chartData.top.length === 0 && (
              <div className="text-center text-slate-500 dark:text-slate-400 py-10">{AR_LABELS.noSalesFound}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};