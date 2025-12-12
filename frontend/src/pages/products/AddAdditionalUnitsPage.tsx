import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AR_LABELS, PlusIcon, MinusIcon, GenerateBarcodeIcon, CancelIcon } from '@/shared/constants';
import { apiClient } from '@/lib/api';

interface UnitInput {
  id: string;
  unitName: string;
  barcode: string;
  conversionFactor: number; // Number of this unit in the main unit (largest unit)
  calculatedPrice: number; // Automatically calculated
}

interface Product {
  id: string;
  name: string;
  category: string;
  mainUnitId?: string; // ID of the main unit
  units: Array<{
    unitName: string;
    barcode: string;
    sellingPrice: number;
    conversionFactor: number;
  }>;
  wholesalePrice: number;
}

const AddAdditionalUnitsPage: React.FC = () => {
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<UnitInput[]>([]);
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const response = await apiClient.get(`/api/products/${productId}`);
      if (response.data.success) {
        setProduct(response.data.data.product);
      } else {
        alert('فشل تحميل المنتج');
        navigate('/products');
      }
    } catch (error: any) {
      console.error('Error fetching product:', error);
      alert('فشل تحميل المنتج: ' + (error.response?.data?.message || error.message));
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const getMainUnit = () => {
    if (!product) return null;
    // The main unit is determined by mainUnitId stored in the product
    // If mainUnitId is not set, fall back to finding unit with conversionFactor = 1 (for backward compatibility)
    if (product.mainUnitId) {
      // We'll need to fetch the unit name from the units API or store it in product
      // For now, we'll use the first unit with conversionFactor = 1 as fallback
      return product.units.find((u) => u.conversionFactor === 1) || product.units[0];
    }
    return product.units.find((u) => u.conversionFactor === 1) || product.units[0];
  };

  const getSmallestUnit = () => {
    if (!product || !product.units || product.units.length === 0) return null;
    // Find the smallest unit (highest conversionFactor)
    const sortedUnits = [...product.units].sort((a, b) => b.conversionFactor - a.conversionFactor);
    return sortedUnits[0] || null;
  };

  const calculatePrice = (conversionFactor: number): number => {
    const mainUnit = getMainUnit();
    if (!mainUnit || !product) return 0;
    
    // For secondary units: conversionFactor = how many secondary units are in 1 main unit
    // Price = main unit wholesale price ÷ conversionFactor
    // Example: If main unit (Carton) cost is 17 and there are 12 bottles in 1 carton, bottle cost = 17 ÷ 12 = 1.42
    const calculated = product.wholesalePrice / conversionFactor;
    return parseFloat(calculated.toFixed(2));
  };

  const addUnit = () => {
    const newUnit: UnitInput = {
      id: `unit-${Date.now()}-${Math.random()}`,
      unitName: '',
      barcode: '',
      conversionFactor: 1, // Default to 1
      calculatedPrice: 0,
    };
    setUnits([...units, newUnit]);
  };

  const removeUnit = (id: string) => {
    setUnits(units.filter((u) => u.id !== id));
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[id];
      return newErrors;
    });
  };

  const updateUnit = (id: string, field: keyof UnitInput, value: string | number | boolean) => {
    setUnits((prevUnits) => {
      const updatedUnits = prevUnits.map((unit) => {
        if (unit.id === id) {
          const updated = { ...unit, [field]: value };
          
          // Recalculate price when conversion factor changes
          if (field === 'conversionFactor' && typeof value === 'number' && value > 0) {
            updated.calculatedPrice = calculatePrice(value);
          }
          
          return updated;
        }
        return unit;
      });
      return updatedUnits;
    });

    // Clear error when user starts typing
    if (errors[id]?.[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        if (newErrors[id]) {
          delete newErrors[id][field];
          if (Object.keys(newErrors[id]).length === 0) {
            delete newErrors[id];
          }
        }
        return newErrors;
      });
    }
  };

  const generateBarcode = (unitId: string) => {
    const newBarcode = `BARCODE-${Math.floor(100000000 + Math.random() * 900000000)}`;
    updateUnit(unitId, 'barcode', newBarcode);
  };

  const validateForm = () => {
    const newErrors: Record<string, Record<string, string>> = {};
    const unitNames = new Set<string>();
    const barcodes = new Set<string>();

    // Get existing unit names and barcodes from product
    if (product?.units) {
      product.units.forEach((u) => {
        unitNames.add(u.unitName.toLowerCase());
        if (u.barcode) barcodes.add(u.barcode);
      });
    }

    units.forEach((unit) => {
      const unitErrors: Record<string, string> = {};

      if (!unit.unitName.trim()) {
        unitErrors.unitName = 'اسم الوحدة مطلوب.';
      } else if (unitNames.has(unit.unitName.trim().toLowerCase())) {
        unitErrors.unitName = 'اسم الوحدة مستخدم بالفعل.';
      } else {
        unitNames.add(unit.unitName.trim().toLowerCase());
      }

      if (!unit.barcode.trim()) {
        unitErrors.barcode = 'الباركود مطلوب.';
      } else if (barcodes.has(unit.barcode.trim())) {
        unitErrors.barcode = 'الباركود مستخدم بالفعل.';
      } else {
        barcodes.add(unit.barcode.trim());
      }

      // Validate conversionFactor for all units
      if (unit.conversionFactor <= 0) {
        unitErrors.conversionFactor = 'يجب أن يكون عدد الوحدات الثانوية في الوحدة الرئيسية أكبر من صفر.';
      }

      if (Object.keys(unitErrors).length > 0) {
        newErrors[unit.id] = unitErrors;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveUnits = async (e: React.FormEvent) => {
    e.preventDefault();

    if (units.length === 0) {
      alert('يرجى إضافة وحدة واحدة على الأقل.');
      return;
    }

    if (!validateForm()) {
      alert('الرجاء تصحيح الأخطاء في النموذج قبل الحفظ.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare new units to add
      // The system works with: main unit (largest/wholesale) has conversionFactor = 1
      // All other units have conversionFactor = how many of this unit are in the main unit
      // Price calculation: price = main unit wholesale price ÷ conversionFactor
      // Example: If main unit (Carton) price is 17 and 12 bottles = 1 carton, bottle price = 17 ÷ 12 = 1.42
      
      const newUnits = units.map((unit) => {
        return {
          unitName: unit.unitName.trim(),
          barcode: unit.barcode.trim(),
          sellingPrice: unit.calculatedPrice, // Automatically calculated
          conversionFactor: unit.conversionFactor, // How many of this unit in the main unit
        };
      });

      // Get existing units from product
      const existingUnits = product?.units || [];

      // Combine existing and new units
      const allUnits = [...existingUnits, ...newUnits];

      // Update product with all units
      const response = await apiClient.put(`/api/products/${productId}`, {
        units: allUnits,
      });

      if (response.data.success) {
        alert('تم إضافة الوحدات بنجاح!');
        navigate('/products');
      } else {
        alert('فشل حفظ الوحدات: ' + (response.data.message || 'خطأ غير معروف'));
      }
    } catch (error: any) {
      console.error('Error saving units:', error);
      const errorMessage = error.response?.data?.message || error.message || 'فشل حفظ الوحدات';
      alert('فشل حفظ الوحدات: ' + errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const mainUnit = getMainUnit();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">جاري التحميل...</p>
        </div>
      </div>
    );
  }

    if (!product || !mainUnit) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">لم يتم العثور على المنتج أو الوحدة الأكبر.</p>
        <button
          onClick={() => navigate('/products')}
          className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
        >
          العودة إلى قائمة المنتجات
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          إضافة وحدات إضافية
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          إضافة وحدات أصغر للمنتج: <strong>{product.name}</strong>
        </p>
      </div>

      {/* Product Info Card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border-r-4 border-blue-400 text-blue-700 dark:text-blue-300 p-4 rounded-md">
        <p className="font-bold mb-2">معلومات المنتج:</p>
        <p className="text-sm">
          <strong>الاسم:</strong> {product.name} <br />
          <strong>الوحدة الرئيسية:</strong> {mainUnit.unitName} <br />
          <strong>سعر الجملة:</strong> {product.wholesalePrice} ر.س
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
        <form onSubmit={handleSaveUnits}>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-200 mb-4 border-b pb-2 border-gray-100 dark:border-gray-700">
            الوحدات الإضافية
          </h2>

          {units.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>لم يتم إضافة أي وحدات بعد.</p>
              <p className="text-sm mt-2">انقر على "إضافة وحدة" للبدء.</p>
            </div>
          )}

          {units.map((unit, index) => (
            <div
              key={unit.id}
              className="relative bg-gray-50 dark:bg-gray-800/50 p-4 rounded-md mb-6 border border-gray-200 dark:border-gray-700"
            >
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-300 mb-4">
                وحدة {index + 1}
                <button
                  type="button"
                  onClick={() => removeUnit(unit.id)}
                  className="absolute top-4 left-4 p-1 text-red-600 hover:text-red-800 rounded-full hover:bg-red-100 dark:hover:bg-gray-700 transition-colors duration-200"
                  aria-label="إزالة الوحدة"
                >
                  <MinusIcon />
                </button>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Unit Name */}
                <div>
                  <label
                    htmlFor={`unitName-${unit.id}`}
                    className="block text-sm font-medium text-black dark:text-gray-300 text-right mb-1"
                  >
                    {AR_LABELS.unitName} (مثال: كرتون، زجاجة)
                  </label>
                  <input
                    type="text"
                    id={`unitName-${unit.id}`}
                    value={unit.unitName}
                    onChange={(e) => updateUnit(unit.id, 'unitName', e.target.value)}
                    className={`mt-1 block w-full h-10 border ${
                      errors[unit.id]?.unitName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } rounded-md shadow-sm py-2.5 px-3.5 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-black dark:text-gray-200 text-right placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-800`}
                    required
                    placeholder="مثال: كرتون"
                  />
                  {errors[unit.id]?.unitName && (
                    <p className="text-red-500 text-sm mt-1">{errors[unit.id].unitName}</p>
                  )}
                </div>

                {/* Conversion Factor - Always shown for all units */}
                {(
                  <div>
                    <label
                      htmlFor={`conversionFactor-${unit.id}`}
                      className="block text-sm font-medium text-black dark:text-gray-300 text-right mb-1"
                    >
                      كم {unit.unitName || 'وحدة ثانوية'} في {getMainUnit()?.unitName || 'الوحدة الرئيسية'} الواحد؟
                    </label>
                    <input
                      type="number"
                      id={`conversionFactor-${unit.id}`}
                      value={unit.conversionFactor || ''}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        updateUnit(unit.id, 'conversionFactor', value);
                      }}
                      min="1"
                      step="1"
                      className={`mt-1 block w-full h-10 border ${
                        errors[unit.id]?.conversionFactor ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      } rounded-md shadow-sm py-2.5 px-3.5 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-black dark:text-gray-200 text-right placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-800`}
                      required
                      placeholder="مثال: 12"
                    />
                    {errors[unit.id]?.conversionFactor && (
                      <p className="text-red-500 text-sm mt-1">{errors[unit.id].conversionFactor}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      مثال: إذا كان 1 {getMainUnit()?.unitName || 'الوحدة الرئيسية'} = 12 {unit.unitName || 'وحدة ثانوية'}، أدخل 12
                    </p>
                  </div>
                )}

                {/* Barcode */}
                <div>
                  <label
                    htmlFor={`barcode-${unit.id}`}
                    className="block text-sm font-medium text-black dark:text-gray-300 text-right mb-1"
                  >
                    {AR_LABELS.barcode}
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      id={`barcode-${unit.id}`}
                      value={unit.barcode}
                      onChange={(e) => updateUnit(unit.id, 'barcode', e.target.value)}
                      className={`mt-1 block w-full h-10 border ${
                        errors[unit.id]?.barcode ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      } rounded-md shadow-sm py-2.5 px-3.5 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-black dark:text-gray-200 text-right placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-800`}
                      required
                      placeholder="الباركود"
                    />
                    <button
                      type="button"
                      onClick={() => generateBarcode(unit.id)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors duration-200"
                      aria-label={AR_LABELS.generateBarcode}
                    >
                      <GenerateBarcodeIcon />
                    </button>
                  </div>
                  {errors[unit.id]?.barcode && (
                    <p className="text-red-500 text-sm mt-1">{errors[unit.id].barcode}</p>
                  )}
                </div>

                {/* Calculated Price (Read-only) - Always shown */}
                {(
                  <div>
                    <label
                      htmlFor={`calculatedPrice-${unit.id}`}
                      className="block text-sm font-medium text-black dark:text-gray-300 text-right mb-1"
                    >
                      سعر البيع (محسوب تلقائياً)
                    </label>
                    <input
                      type="text"
                      id={`calculatedPrice-${unit.id}`}
                      value={unit.calculatedPrice > 0 ? unit.calculatedPrice.toFixed(2) : '0.00'}
                      readOnly
                      className="mt-1 block w-full h-10 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 rounded-md shadow-sm py-2.5 px-3.5 text-gray-800 dark:text-gray-300 text-right cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {product.wholesalePrice} ÷ {unit.conversionFactor || '?'} = {unit.calculatedPrice.toFixed(2)} ر.س
                    </p>
                  </div>
                )}
                
                {/* Calculated Price (Read-only) - Show for both base and non-base units */}
                <div>
                  <label
                    htmlFor={`calculatedPrice-${unit.id}`}
                    className="block text-sm font-medium text-black dark:text-gray-300 text-right mb-1"
                  >
                    سعر البيع (محسوب تلقائياً)
                  </label>
                  <input
                    type="text"
                    id={`calculatedPrice-${unit.id}`}
                    value={unit.calculatedPrice > 0 ? unit.calculatedPrice.toFixed(2) : '0.00'}
                    readOnly
                    className="mt-1 block w-full h-10 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 rounded-md shadow-sm py-2.5 px-3.5 text-gray-800 dark:text-gray-300 text-right cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    سعر {getMainUnit()?.unitName || 'الوحدة الرئيسية'} ({product.wholesalePrice} ر.س) ÷ {unit.conversionFactor || '?'} {unit.unitName || 'وحدة'} = {unit.calculatedPrice.toFixed(2)} ر.س
                  </p>
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-start mb-8">
            <button
              type="button"
              onClick={addUnit}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 ml-2" />
              <span>إضافة وحدة</span>
            </button>
          </div>

          {units.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border-r-4 border-green-400 text-green-700 dark:text-green-300 p-4 rounded-md mb-6">
              <p className="text-sm">
                <strong>ملاحظة:</strong>
                <ul className="list-disc pr-5 mt-2 space-y-1">
                  <li>جميع الوحدات: يتم حساب سعر البيع تلقائياً بناءً على سعر الوحدة الرئيسية (أكبر وحدة) وعدد الوحدات الثانوية فيها.</li>
                  <li>جميع الوحدات: سيتم حساب سعرها تلقائياً بناءً على سعر الجملة للوحدة الرئيسية ({product.wholesalePrice} ر.س) مقسوماً على عدد الوحدات الثانوية.</li>
                  <li>للوحدات الثانوية: أدخل عدد الوحدات الثانوية الموجودة في الوحدة الرئيسية الواحدة.</li>
                </ul>
              </p>
            </div>
          )}

          <div className="flex justify-start space-x-4 space-x-reverse">
            <button
              type="submit"
              disabled={isSubmitting || units.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="mr-2">{isSubmitting ? 'جاري الحفظ...' : 'حفظ الوحدات'}</span>
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

export default AddAdditionalUnitsPage;

