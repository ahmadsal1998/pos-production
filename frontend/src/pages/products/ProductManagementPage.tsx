import React, { useState, useMemo } from 'react';
import { AR_LABELS } from '@/shared/constants';
import { Product, Category, Brand } from '@/shared/types';
import { MetricCard } from '@/shared/components/ui/MetricCard';
import ProductListPage from './ProductListPage';
import CategoryManagementPage from './CategoryManagementPage';
import BrandManagementPage from './BrandManagementPage';
import AddMultiUnitProductPage from './AddMultiUnitProductPage';

// --- MOCK DATA FOR METRICS ---
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

const mockProducts: Product[] = [
  { id: 1, name: 'لابتوب Dell XPS 15', category: 'إلكترونيات', price: 1200.00, costPrice: 950.00, stock: 50, barcode: 'DELL-XPS15-12345', expiryDate: '2025-12-31', createdAt: '2023-01-15' },
  { id: 2, name: 'هاتف Samsung Galaxy S23', category: 'إلكترونيات', price: 899.99, costPrice: 700.00, stock: 120, barcode: 'SAM-S23-67890', expiryDate: '2026-06-30', createdAt: new Date().toISOString() },
  { id: 3, name: 'طاولة قهوة خشبية', category: 'أثاث', price: 150.50, costPrice: 100.00, stock: 30, barcode: 'FURN-CT-11223', expiryDate: '2099-12-31', createdAt: '2023-11-10' },
  { id: 4, name: 'سماعات رأس Sony WH-1000XM5', category: 'إلكترونيات', price: 349.00, costPrice: 250.00, stock: 8, barcode: 'SONY-WH-44556', expiryDate: '2027-01-01', createdAt: '2023-09-01' },
  { id: 5, name: 'حليب طازج', category: 'مشروبات', price: 5.50, costPrice: 3.50, stock: 20, barcode: 'MILK-FRESH-555', expiryDate: '2024-01-01', createdAt: '2023-12-25' },
  { id: 6, name: 'كرسي مكتب مريح', category: 'أثاث', price: 299.00, costPrice: 180.00, stock: 25, barcode: 'FURN-OC-77889', expiryDate: '2099-12-31', createdAt: sevenDaysAgo.toISOString() },
];

const mockCategories: Category[] = [
  { id: '1', nameAr: 'مشروبات', parentId: null, status: 'Active', createdAt: '2023-10-26T10:00:00Z', productCount: 150 },
  { id: '2', nameAr: 'وجبات خفيفة', parentId: null, status: 'Active', createdAt: '2023-09-15T09:00:00Z', productCount: 200 },
  { id: '3', nameAr: 'إلكترونيات', parentId: null, status: 'Inactive', createdAt: '2022-01-20T14:00:00Z', productCount: 0 },
];
const mockBrands: Brand[] = [
    { id: '1', nameAr: 'كوكا كولا', status: 'Active', createdAt: '2023-01-15T10:00:00Z', productCount: 25 },
    { id: '2', nameAr: 'سامسونج', status: 'Active', createdAt: '2022-11-20T14:30:00Z', productCount: 150 },
];
// --- END MOCK DATA ---

interface ProductManagementPageProps {}

const TabButton: React.FC<{ label: string, isActive: boolean, onClick: () => void }> = ({ label, isActive, onClick }) => (
    <button 
      onClick={onClick} 
      className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 whitespace-nowrap ${
        isActive 
          ? 'bg-orange-500 text-white shadow-md' 
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
        {label}
    </button>
);

const ProductManagementPage: React.FC<ProductManagementPageProps> = () => {
    const [activeTab, setActiveTab] = useState('products'); // 'products', 'categories', 'brands', 'add-product'

    const metrics = useMemo(() => {
        const lowStockCount = mockProducts.filter(p => p.stock < 10).length;
        const today = new Date();
        const expiredCount = mockProducts.filter(p => new Date(p.expiryDate) < today).length;

        return [
            { id: 1, title: AR_LABELS.totalProducts, value: mockProducts.length.toString(), icon: <div/>, bgColor: 'bg-purple-100', valueColor: 'text-purple-600' },
            { id: 2, title: AR_LABELS.lowStockProducts, value: lowStockCount.toString(), icon: <div/>, bgColor: 'bg-red-100', valueColor: 'text-red-600' },
            { id: 3, title: AR_LABELS.expiredProducts, value: expiredCount.toString(), icon: <div/>, bgColor: 'bg-yellow-100', valueColor: 'text-yellow-600' },
            { id: 4, title: AR_LABELS.numberOfCategories, value: mockCategories.length.toString(), icon: <div/>, bgColor: 'bg-blue-100', valueColor: 'text-blue-600' },
            { id: 5, title: AR_LABELS.numberOfBrands, value: mockBrands.length.toString(), icon: <div/>, bgColor: 'bg-indigo-100', valueColor: 'text-indigo-600' },
        ];
    }, []);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{AR_LABELS.productManagement}</h1>
                <p className="text-gray-600 dark:text-gray-400">{AR_LABELS.productManagementDescription}</p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {metrics.map(metric => <MetricCard key={metric.id} {...metric} />)}
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm dark:shadow-gray-900/20 border border-gray-200 dark:border-gray-700">
                <nav className="w-full overflow-x-auto scroll-smooth horizontal-nav-scroll">
                    <div className="flex gap-2 min-w-max pb-2">
                        <TabButton label={AR_LABELS.productListing} isActive={activeTab === 'products'} onClick={() => setActiveTab('products')} />
                        <TabButton label={AR_LABELS.categoryManagement} isActive={activeTab === 'categories'} onClick={() => setActiveTab('categories')} />
                        <TabButton label={AR_LABELS.brandManagement} isActive={activeTab === 'brands'} onClick={() => setActiveTab('brands')} />
                        <TabButton label="إضافة منتج متعدد الوحدات" isActive={activeTab === 'add-product'} onClick={() => setActiveTab('add-product')} />
                    </div>
                </nav>
            </div>
            
            {/* Content */}
            <div>
                {activeTab === 'products' && <ProductListPage />}
                {activeTab === 'categories' && <CategoryManagementPage />}
                {activeTab === 'brands' && <BrandManagementPage />}
                {activeTab === 'add-product' && <AddMultiUnitProductPage />}
            </div>
        </div>
    );
};

export default ProductManagementPage;