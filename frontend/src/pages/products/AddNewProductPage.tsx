import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AR_LABELS, PRODUCT_CATEGORIES, AddProductIcon, CancelIcon, GenerateBarcodeIcon } from '@/shared/constants';
import { apiClient } from '@/lib/api';

interface AddNewProductPageProps {}

const AddNewProductPage: React.FC<AddNewProductPageProps> = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    productName: '',
    category: PRODUCT_CATEGORIES[0] || '',
    largestUnitName: '',
    wholesalePrice: 0,
    barcode: '',
    description: '',
    brandId: '',
    warehouseId: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const parsedValue = type === 'number' ? parseFloat(value) : value;

    setFormData((prev) => ({
      ...prev,
      [name]: parsedValue,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const generateBarcode = () => {
    const newBarcode = `BARCODE-${Math.floor(100000000 + Math.random() * 900000000)}`;
    setFormData((prev) => ({ ...prev, barcode: newBarcode }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.productName.trim()) {
      newErrors.productName = 'اسم المنتج مطلوب.';
    }
    if (!formData.category) {
      newErrors.category = 'الفئة مطلوبة.';
    }
    if (!formData.largestUnitName.trim()) {
      newErrors.largestUnitName = 'اسم الوحدة الأكبر مطلوب.';
    }
    if (formData.wholesalePrice <= 0) {
      newErrors.wholesalePrice = 'يجب أن يكون سعر الجملة أكبر من صفر.';
    }
    if (!formData.barcode.trim()) {
      newErrors.barcode = 'الباركود مطلوب.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Create product with the largest unit
      const productData = {
        name: formData.productName.trim(),
        categoryId: formData.category,
        barcode: formData.barcode.trim(),
        costPrice: formData.wholesalePrice, // Using wholesale price as cost price for now
        price: formData.wholesalePrice, // Initial price is wholesale price
        wholesalePrice: formData.wholesalePrice,
        stock: 0,
        units: [
          {
            unitName: formData.largestUnitName.trim(),
            barcode: formData.barcode.trim(),
            sellingPrice: formData.wholesalePrice,
            conversionFactor: 1, // Largest unit has conversion factor of 1
          },
        ],
        description: formData.description.trim() || undefined,
        brandId: formData.brandId || undefined,
        warehouseId: formData.warehouseId || undefined,
        status: 'active',
      };

      const response = await apiClient.post('/api/products', productData);

      if (response.data.success) {
        // Navigate to Add Additional Units page with product ID
        const productId = response.data.data.product.id || response.data.data.product._id;
        navigate(`/products/${productId}/add-units`);
      } else {
        alert('فشل حفظ المنتج: ' + (response.data.message || 'خطأ غير معروف'));
      }
    } catch (error: any) {
      console.error('Error creating product:', error);
      const errorMessage = error.response?.data?.message || error.message || 'فشل حفظ المنتج';
      alert('فشل حفظ المنتج: ' + errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {AR_LABELS.addNewProduct}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          أدخل المعلومات الأساسية للمنتج والوحدة الأكبر
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
        <form onSubmit={handleSaveProduct}>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-200 mb-4 border-b pb-2 border-gray-100 dark:border-gray-700">
            {AR_LABELS.basicInformation}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Product Name */}
            <div>
              <label
                htmlFor="productName"
                className="block text-sm font-medium text-black dark:text-gray-300 text-right mb-1"
              >
                {AR_LABELS.productName}
              </label>
              <input
                type="text"
                id="productName"
                name="productName"
                value={formData.productName}
                onChange={handleChange}
                className={`mt-1 block w-full h-10 border ${
                  errors.productName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } rounded-md shadow-sm py-2.5 px-3.5 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-black dark:text-gray-200 text-right placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-800`}
                required
                placeholder="مثال: كوكا كولا"
              />
              {errors.productName && <p className="text-red-500 text-sm mt-1">{errors.productName}</p>}
            </div>

            {/* Category */}
            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium text-black dark:text-gray-300 text-right mb-1"
              >
                {AR_LABELS.categoryName}
              </label>
              <div className="relative">
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={`mt-1 block w-full h-10 border ${
                    errors.category ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } rounded-md shadow-sm py-2.5 px-3.5 pr-10 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-black dark:text-gray-200 text-right appearance-none bg-white dark:bg-gray-800`}
                  required
                >
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <svg
                  className="absolute top-1/2 left-3 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
            </div>

            {/* Largest Unit Name */}
            <div>
              <label
                htmlFor="largestUnitName"
                className="block text-sm font-medium text-black dark:text-gray-300 text-right mb-1"
              >
                اسم الوحدة الأكبر (مثال: صندوق)
              </label>
              <input
                type="text"
                id="largestUnitName"
                name="largestUnitName"
                value={formData.largestUnitName}
                onChange={handleChange}
                className={`mt-1 block w-full h-10 border ${
                  errors.largestUnitName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } rounded-md shadow-sm py-2.5 px-3.5 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-black dark:text-gray-200 text-right placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-800`}
                required
                placeholder="مثال: صندوق"
              />
              {errors.largestUnitName && <p className="text-red-500 text-sm mt-1">{errors.largestUnitName}</p>}
            </div>

            {/* Wholesale Price */}
            <div>
              <label
                htmlFor="wholesalePrice"
                className="block text-sm font-medium text-black dark:text-gray-300 text-right mb-1"
              >
                سعر الجملة للوحدة الأكبر (ر.س)
              </label>
              <input
                type="number"
                id="wholesalePrice"
                name="wholesalePrice"
                value={formData.wholesalePrice}
                onChange={handleChange}
                min="0"
                step="0.01"
                className={`mt-1 block w-full h-10 border ${
                  errors.wholesalePrice ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } rounded-md shadow-sm py-2.5 px-3.5 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-black dark:text-gray-200 text-right placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-800`}
                required
                placeholder="مثال: 17"
              />
              {errors.wholesalePrice && <p className="text-red-500 text-sm mt-1">{errors.wholesalePrice}</p>}
            </div>

            {/* Barcode */}
            <div>
              <label
                htmlFor="barcode"
                className="block text-sm font-medium text-black dark:text-gray-300 text-right mb-1"
              >
                {AR_LABELS.barcode}
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  id="barcode"
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleChange}
                  className={`mt-1 block w-full h-10 border ${
                    errors.barcode ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } rounded-md shadow-sm py-2.5 px-3.5 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-black dark:text-gray-200 text-right placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-800`}
                  required
                  placeholder="الباركود"
                />
                <button
                  type="button"
                  onClick={generateBarcode}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors duration-200"
                  aria-label={AR_LABELS.generateBarcode}
                >
                  <GenerateBarcodeIcon />
                </button>
              </div>
              {errors.barcode && <p className="text-red-500 text-sm mt-1">{errors.barcode}</p>}
            </div>

            {/* Description (Optional) */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-black dark:text-gray-300 text-right mb-1"
              >
                {AR_LABELS.description} (اختياري)
              </label>
              <input
                type="text"
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="mt-1 block w-full h-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2.5 px-3.5 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-black dark:text-gray-200 text-right placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-800"
                placeholder="وصف المنتج"
              />
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border-r-4 border-blue-400 text-blue-700 dark:text-blue-300 p-4 rounded-md mb-6">
            <p className="text-sm">
              <strong>ملاحظة:</strong> بعد حفظ المنتج، يمكنك إضافة وحدات أصغر (مثل: كرتون، زجاجة) وسيتم حساب أسعارها تلقائياً بناءً على سعر الجملة للوحدة الأكبر.
            </p>
          </div>

          <div className="flex justify-start space-x-4 space-x-reverse">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <AddProductIcon />
              <span className="mr-2">{isSubmitting ? 'جاري الحفظ...' : AR_LABELS.saveProduct}</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <CancelIcon className="h-5 w-5" />
              <span className="mr-2">{AR_LABELS.cancel}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddNewProductPage;

