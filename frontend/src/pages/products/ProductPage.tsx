import React, { useState, useMemo } from 'react';
import { AR_LABELS, EditIcon, DeleteIcon, SearchIcon } from '@/shared/constants';
import { Product } from '@/shared/types';
import { formatDate } from '@/shared/utils';

interface ProductPageProps {}

const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

// FIX: Added missing 'costPrice' property to all products to match the 'Product' type.
const initialMockProducts: Product[] = [
  { id: 1, name: 'لابتوب Dell XPS 15', category: 'إلكترونيات', price: 1200.00, costPrice: 950.00, stock: 50, barcode: 'DELL-XPS15-12345', expiryDate: '2025-12-31', createdAt: '2023-01-15' },
  { id: 2, name: 'هاتف Samsung Galaxy S23', category: 'إلكترونيات', price: 899.99, costPrice: 700.00, stock: 120, barcode: 'SAM-S23-67890', expiryDate: '2026-06-30', createdAt: new Date().toISOString() },
  { id: 3, name: 'طاولة قهوة خشبية', category: 'أثاث', price: 150.50, costPrice: 100.00, stock: 30, barcode: 'FURN-CT-11223', expiryDate: '2099-12-31', createdAt: '2023-11-10' },
  { id: 4, name: 'سماعات رأس Sony WH-1000XM5', category: 'إلكترونيات', price: 349.00, costPrice: 250.00, stock: 8, barcode: 'SONY-WH-44556', expiryDate: '2027-01-01', createdAt: '2023-09-01' },
  { id: 5, name: 'حليب طازج', category: 'مشروبات', price: 5.50, costPrice: 3.50, stock: 20, barcode: 'MILK-FRESH-555', expiryDate: '2024-01-01', createdAt: '2023-12-25' },
  { id: 6, name: 'كرسي مكتب مريح', category: 'أثاث', price: 299.00, costPrice: 180.00, stock: 25, barcode: 'FURN-OC-77889', expiryDate: '2099-12-31', createdAt: sevenDaysAgo.toISOString() },
];

const ProductPage: React.FC<ProductPageProps> = () => {
  const [products, setProducts] = useState<Product[]>(initialMockProducts);
  const [searchTerm, setSearchTerm] = useState('');

  const LOW_STOCK_THRESHOLD = 10;

  const filteredProducts = useMemo(() => {
    // Apply search term filter
    if (!searchTerm) {
      return products;
    }

    const lowercasedSearchTerm = searchTerm.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(lowercasedSearchTerm) ||
      product.barcode.toLowerCase().includes(lowercasedSearchTerm) ||
      product.category.toLowerCase().includes(lowercasedSearchTerm)
    );

  }, [searchTerm, products]);

  const handleEditProduct = (productId: number) => {
    alert(AR_LABELS.edit + ` product ${productId}!`);
  };

  const handleDeleteProduct = (productId: number) => {
    if (window.confirm(AR_LABELS.delete + ` product with ID ${productId}?`)) {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    }
  };

  return (
    <div className="space-y-8">
      {/* Product Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{AR_LABELS.productListing}</h1>
        <p className="text-gray-600 dark:text-gray-400">{AR_LABELS.productListingDescription}</p>
      </div>

      {/* Control Bar: Search */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
        <div className="flex justify-start items-center">
          {/* Search Bar */}
          <div className="relative w-full md:w-1/2 lg:w-1/3">
            <input
              type="text"
              placeholder={AR_LABELS.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-10 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-right"
            />
            <SearchIcon className="absolute top-1/2 left-3 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-right">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{AR_LABELS.productName}</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{AR_LABELS.barcode}</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{AR_LABELS.categoryName}</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{AR_LABELS.price}</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{AR_LABELS.stock}</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{AR_LABELS.expiryDate}</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">{AR_LABELS.actions}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredProducts.length > 0 ? filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900 dark:text-gray-100">{product.name}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-700 dark:text-gray-300">{product.barcode}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-700 dark:text-gray-300">{product.category}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-700 dark:text-gray-300">{product.price.toFixed(2)} ر.س</div></td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-semibold ${product.stock < LOW_STOCK_THRESHOLD ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-700 dark:text-gray-300">{formatDate(product.expiryDate)}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <button onClick={() => handleEditProduct(product.id)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 ml-4 p-2 rounded-full hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors duration-200" aria-label={`${AR_LABELS.edit} ${product.name}`}><EditIcon /></button>
                    <button onClick={() => handleDeleteProduct(product.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-full hover:bg-red-50 dark:hover:bg-gray-700 transition-colors duration-200" aria-label={`${AR_LABELS.delete} ${product.name}`}><DeleteIcon /></button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">{AR_LABELS.noSalesFound}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
