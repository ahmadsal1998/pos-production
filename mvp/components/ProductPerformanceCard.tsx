import React, { useState, useMemo, useEffect } from 'react';
import { AR_LABELS } from '../constants';
import { Product } from '../types';

// --- MOCK DATA FOR THIS COMPONENT ---
const MOCK_PRODUCTS_WITH_COST: Product[] = [
  { id: 1, name: 'لابتوب Dell XPS 15', category: 'إلكترونيات', price: 1200.00, costPrice: 950.00, stock: 50, barcode: 'DELL-XPS15-12345', expiryDate: '2025-12-31', createdAt: '2023-01-15' },
  { id: 2, name: 'هاتف Samsung Galaxy S23', category: 'إلكترونيات', price: 899.99, costPrice: 700.00, stock: 120, barcode: 'SAM-S23-67890', expiryDate: '2026-06-30', createdAt: '2023-03-01' },
  { id: 3, name: 'طاولة قهوة خشبية', category: 'أثاث', price: 150.50, costPrice: 100.00, stock: 30, barcode: 'FURN-CT-11223', expiryDate: '2099-12-31', createdAt: '2023-11-10' },
  { id: 4, name: 'سماعات رأس Sony WH-1000XM5', category: 'إلكترونيات', price: 349.00, costPrice: 250.00, stock: 8, barcode: 'SONY-WH-44556', expiryDate: '2027-01-01', createdAt: '2023-09-01' },
  { id: 5, name: 'كوكا كولا', category: 'مشروبات', price: 2.50, costPrice: 1.50, stock: 200, barcode: 'COKE-CAN', expiryDate: '2024-12-01', createdAt: '2023-12-01' },
  { id: 6, name: 'ماء (صغير)', category: 'مشروبات', price: 1.00, costPrice: 0.50, stock: 500, barcode: 'WATER-S', expiryDate: '2025-01-01', createdAt: '2023-11-01' },
];

const MOCK_SALES_HISTORY = Array.from({ length: 200 }).map((_, i) => {
    const product = MOCK_PRODUCTS_WITH_COST[Math.floor(Math.random() * MOCK_PRODUCTS_WITH_COST.length)];
    const quantity = Math.floor(Math.random() * 5) + 1;
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 365));
    return {
        saleId: `SALE-${i}`,
        date: date.toISOString(),
        items: [{
            productId: product.id,
            productName: product.name,
            category: product.category,
            quantity: quantity,
            unitPrice: product.price,
            total: quantity * product.price
        }]
    };
});
// --- END MOCK DATA ---

type TimeFilter = 'today' | 'this_week' | 'this_month' | 'last_3_months' | 'this_year';
type SortBy = 'best_selling' | 'least_selling' | 'most_profitable' | 'least_profitable' | 'most_demanded';
type ChartView = 'count' | 'value';

const ProductPerformanceCard: React.FC = () => {
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('this_month');
    const [sortBy, setSortBy] = useState<SortBy>('best_selling');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [chartView, setChartView] = useState<ChartView>('value');
    
    const analyticsData = useMemo(() => {
        const now = new Date();
        let startDate = new Date();

        switch(timeFilter) {
            case 'today': startDate.setHours(0, 0, 0, 0); break;
            case 'this_week': startDate.setDate(now.getDate() - now.getDay()); break;
            case 'this_month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
            case 'last_3_months': startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1); break;
            case 'this_year': startDate = new Date(now.getFullYear(), 0, 1); break;
        }

        const filteredSales = MOCK_SALES_HISTORY.filter(sale => {
            const saleDate = new Date(sale.date);
            const matchesCategory = categoryFilter === 'all' || sale.items.some(item => item.category === categoryFilter);
            return saleDate >= startDate && matchesCategory;
        });

        const productStats: Record<number, { name: string; salesCount: number; revenue: number; profit: number; }> = {};
        
        filteredSales.forEach(sale => {
            sale.items.forEach(item => {
                if (!productStats[item.productId]) {
                    productStats[item.productId] = { name: item.productName, salesCount: 0, revenue: 0, profit: 0 };
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
                profitMargin
            };
        });

        rankedProducts.sort((a, b) => {
            switch(sortBy) {
                case 'best_selling': return b.revenue - a.revenue;
                case 'least_selling': return a.revenue - b.revenue;
                case 'most_profitable': return b.profit - a.profit;
                case 'least_profitable': return a.profit - b.profit;
                case 'most_demanded': return b.salesCount - a.salesCount;
                default: return 0;
            }
        });

        const totalSales = rankedProducts.reduce((sum, p) => sum + p.revenue, 0);
        const totalItemsSold = rankedProducts.reduce((sum, p) => sum + p.salesCount, 0);

        // Chart Data
        const chartData = filteredSales.reduce((acc, sale) => {
            const date = new Date(sale.date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
            if (!acc[date]) acc[date] = { count: 0, value: 0 };
            acc[date].count += sale.items.reduce((s, i) => s + i.quantity, 0);
            acc[date].value += sale.items.reduce((s, i) => s + i.total, 0);
            return acc;
        }, {} as Record<string, { count: number; value: number }>);
        
        const chartLabels = Object.keys(chartData);
        const chartValues = chartLabels.map(label => chartData[label][chartView]);
        const maxChartValue = Math.max(...chartValues, 1);

        // Insights
        const insights = [];
        if (rankedProducts.length > 0) {
            insights.push(`المنتج الأكثر مبيعًا هو "${rankedProducts[0].name}" بإيرادات ${rankedProducts[0].revenue.toFixed(2)} ر.س.`);
            const mostProfitable = [...rankedProducts].sort((a,b) => b.profit - a.profit)[0];
            insights.push(`"${mostProfitable.name}" هو الأكثر ربحية بهامش ربح ${mostProfitable.profitMargin.toFixed(1)}%.`);
        } else {
            insights.push('لا توجد بيانات مبيعات كافية لتوليد رؤى.');
        }

        return {
            totalSales,
            totalItemsSold,
            avgSellingPrice: totalItemsSold > 0 ? totalSales / totalItemsSold : 0,
            bestSellingProduct: rankedProducts[0]?.name || '-',
            leastSellingProduct: rankedProducts[rankedProducts.length-1]?.name || '-',
            rankedProducts: rankedProducts.slice(0, 5), // Top 5
            chart: { labels: chartLabels, values: chartValues, max: maxChartValue },
            insights
        };

    }, [timeFilter, sortBy, categoryFilter, chartView]);
    
    const categories = ['all', ...Array.from(new Set(MOCK_PRODUCTS_WITH_COST.map(p => p.category)))];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{AR_LABELS.productPerformanceInsights}</h2>
            
            {/* Filters */}
            <div className="flex flex-wrap gap-4 text-sm">
                <select value={timeFilter} onChange={e => setTimeFilter(e.target.value as TimeFilter)} className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
                    <option value="today">{AR_LABELS.today}</option>
                    <option value="this_week">{AR_LABELS.thisWeek}</option>
                    <option value="this_month">{AR_LABELS.thisMonth}</option>
                    <option value="last_3_months">{AR_LABELS.last3Months}</option>
                    <option value="this_year">{AR_LABELS.thisYear}</option>
                </select>
                 <select value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)} className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
                    <option value="best_selling">{AR_LABELS.bestSelling}</option>
                    <option value="least_selling">{AR_LABELS.leastSelling}</option>
                    <option value="most_profitable">{AR_LABELS.mostProfitable}</option>
                    <option value="least_profitable">{AR_LABELS.leastProfitable}</option>
                    <option value="most_demanded">{AR_LABELS.mostDemanded}</option>
                </select>
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
                    {categories.map(c => <option key={c} value={c}>{c === 'all' ? AR_LABELS.allCategories : c}</option>)}
                </select>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"><p className="text-xs text-gray-500 dark:text-gray-400">{AR_LABELS.totalSales}</p><p className="font-bold text-green-600 text-lg">{analyticsData.totalSales.toFixed(2)}</p></div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"><p className="text-xs text-gray-500 dark:text-gray-400">{AR_LABELS.totalItemsSold}</p><p className="font-bold text-blue-600 text-lg">{analyticsData.totalItemsSold}</p></div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"><p className="text-xs text-gray-500 dark:text-gray-400">{AR_LABELS.avgSellingPrice}</p><p className="font-bold text-purple-600 text-lg">{analyticsData.avgSellingPrice.toFixed(2)}</p></div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"><p className="text-xs text-gray-500 dark:text-gray-400">{AR_LABELS.bestSellingProduct}</p><p className="font-bold text-orange-600 text-sm truncate">{analyticsData.bestSellingProduct}</p></div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"><p className="text-xs text-gray-500 dark:text-gray-400">{AR_LABELS.leastSellingProduct}</p><p className="font-bold text-gray-500 text-sm truncate">{analyticsData.leastSellingProduct}</p></div>
            </div>

            {/* Table and Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full text-right text-sm">
                         <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="p-2 font-semibold">#</th>
                                <th className="p-2 font-semibold">{AR_LABELS.productName}</th>
                                <th className="p-2 font-semibold">{AR_LABELS.salesCount}</th>
                                <th className="p-2 font-semibold">{AR_LABELS.revenue}</th>
                                <th className="p-2 font-semibold">{AR_LABELS.profitMargin}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {analyticsData.rankedProducts.map((p, i) => (
                                <tr key={p.name} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="p-2">{i+1}</td>
                                    <td className="p-2 font-medium truncate max-w-xs">{p.name}</td>
                                    <td className="p-2 text-center">{p.salesCount}</td>
                                    <td className="p-2">{p.revenue.toFixed(2)}</td>
                                    <td className={`p-2 font-semibold ${p.profitMargin > 20 ? 'text-green-600' : 'text-yellow-600'}`}>{p.profitMargin.toFixed(1)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Chart */}
                <div>
                     <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold">{AR_LABELS.salesTrend}</h3>
                        <div className="flex text-xs border dark:border-gray-600 rounded-md p-0.5">
                            <button onClick={() => setChartView('value')} className={`px-2 py-1 rounded ${chartView === 'value' ? 'bg-orange-500 text-white' : ''}`}>{AR_LABELS.salesValue}</button>
                            <button onClick={() => setChartView('count')} className={`px-2 py-1 rounded ${chartView === 'count' ? 'bg-orange-500 text-white' : ''}`}>{AR_LABELS.salesCount}</button>
                        </div>
                    </div>
                    <div className="flex items-end h-48 border-b-2 border-r-2 dark:border-gray-600 p-2 gap-2">
                        {analyticsData.chart.values.map((val, i) => (
                           <div key={i} className="flex-1 bg-blue-400 dark:bg-blue-500 hover:bg-blue-500 dark:hover:bg-blue-400 group relative" style={{ height: `${(val / analyticsData.chart.max) * 100}%`}}>
                                <span className="absolute bottom-full mb-1 w-max bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1/2 left-1/2">
                                    {analyticsData.chart.labels[i]}: {val.toFixed(0)}
                                </span>
                           </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Insights */}
            <div>
                 <h3 className="font-bold mb-2">{AR_LABELS.insights}</h3>
                 <div className="space-y-2 text-sm bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    {analyticsData.insights.map((insight, i) => (
                        <p key={i} className="flex items-center"><span className="ml-2 text-orange-500">💡</span> {insight}</p>
                    ))}
                 </div>
            </div>
        </div>
    );
};

export default ProductPerformanceCard;