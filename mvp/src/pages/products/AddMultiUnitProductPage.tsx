import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AR_LABELS,
  PRODUCT_CATEGORIES,
  AddProductIcon,
  CancelIcon,
  GenerateBarcodeIcon,
  PlusIcon,
  MinusIcon,
  UUID,
} from '@/shared/constants';
import {
  MultiUnitProductFormInput,
  MultiUnitProductCalculatedFields,
  MultiUnitProduct,
  CustomUnitInput,
} from '@/shared/types';

interface AddMultiUnitProductPageProps {}

// Mock database for barcode uniqueness check
const MOCK_EXISTING_BARCODES = new Set(['123456000001', 'BARCODE007']);

const AddMultiUnitProductPage: React.FC<AddMultiUnitProductPageProps> = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<MultiUnitProductFormInput>({
    productName: '',
    category: PRODUCT_CATEGORIES[0] || '',
    initialQuantityHighestUnit: 0,
    totalPurchasePrice: 0,
    unitLevels: [
      { id: UUID(), unitName: 'صندوق', barcode: '', subUnitsPerThisUnit: 0, sellingPrice: 0 },
    ],
  });

  const [calculated, setCalculated] = useState<MultiUnitProductCalculatedFields>({});

  const [errors, setErrors] = useState<
    Partial<Record<keyof MultiUnitProductFormInput | string, string>>
  >({});
  const [unitErrors, setUnitErrors] = useState<
    Record<string, Partial<Record<keyof CustomUnitInput, string>>>
  >({});
  const [barcodeErrors, setBarcodeErrors] = useState<Record<string, string>>({});
  const [showSummary, setShowSummary] = useState(false);

  const calculateValues = useCallback(() => {
    const newCalculated: MultiUnitProductCalculatedFields = {};
    let currentTotalQuantity = formData.initialQuantityHighestUnit;
    let currentCost = formData.totalPurchasePrice;

    formData.unitLevels.forEach((unit, index) => {
      // For the first unit, calculate based on initial quantity and total purchase price
      if (index === 0) {
        const costPerUnit =
          formData.initialQuantityHighestUnit > 0
            ? currentCost / formData.initialQuantityHighestUnit
            : 0;
        newCalculated[unit.id] = {
          totalQuantity: parseFloat(currentTotalQuantity.toFixed(2)),
          costPerUnit: parseFloat(costPerUnit.toFixed(2)),
        };
      } else {
        // For subsequent units, calculate based on the previous unit's values and conversion factor
        const prevUnit = formData.unitLevels[index - 1];
        const prevCalculated = newCalculated[prevUnit.id];

        if (prevCalculated && prevUnit.subUnitsPerThisUnit > 0) {
          currentTotalQuantity = prevCalculated.totalQuantity * prevUnit.subUnitsPerThisUnit;
          const costPerUnit = prevCalculated.costPerUnit / prevUnit.subUnitsPerThisUnit;

          newCalculated[unit.id] = {
            totalQuantity: parseFloat(currentTotalQuantity.toFixed(2)),
            costPerUnit: parseFloat(costPerUnit.toFixed(2)),
          };
        } else {
          // If conversion factor is 0 or previous calculated data is missing, reset
          newCalculated[unit.id] = { totalQuantity: 0, costPerUnit: 0 };
        }
      }
    });
    setCalculated(newCalculated);
  }, [formData]);

  useEffect(() => {
    calculateValues();
  }, [calculateValues]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    unitId?: string,
    field?: keyof CustomUnitInput
  ) => {
    const { name, value, type } = e.target;
    const parsedValue = type === 'number' ? parseFloat(value) : value;

    if (unitId && field) {
      setFormData((prev) => ({
        ...prev,
        unitLevels: prev.unitLevels.map((unit) =>
          unit.id === unitId ? { ...unit, [field]: parsedValue } : unit
        ),
      }));
      setUnitErrors((prev) => {
        const newErrors = { ...prev };
        if (newErrors[unitId]) {
          delete newErrors[unitId][field];
          if (Object.keys(newErrors[unitId]).length === 0) {
            delete newErrors[unitId];
          }
        }
        return newErrors;
      });
      setBarcodeErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[unitId];
        return newErrors;
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: parsedValue,
      }));
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof MultiUnitProductFormInput];
        return newErrors;
      });
    }
    setShowSummary(false); // Hide summary on any input change
  };

  const addUnitLevel = () => {
    setFormData((prev) => ({
      ...prev,
      unitLevels: [
        ...prev.unitLevels,
        { id: UUID(), unitName: '', barcode: '', subUnitsPerThisUnit: 0, sellingPrice: 0 },
      ],
    }));
  };

  const removeUnitLevel = (idToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      unitLevels: prev.unitLevels.filter((unit) => unit.id !== idToRemove),
    }));
    setUnitErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[idToRemove];
      return newErrors;
    });
    setBarcodeErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[idToRemove];
      return newErrors;
    });
  };

  const generateBarcode = (unitId: string, field: keyof CustomUnitInput) => {
    let newBarcode = '';
    const existingBarcodesInForm = new Set(
      formData.unitLevels.map((u) => u.barcode).filter(Boolean)
    );

    do {
      newBarcode = `BARCODE-${Math.floor(100000000 + Math.random() * 900000000)}`;
    } while (MOCK_EXISTING_BARCODES.has(newBarcode) || existingBarcodesInForm.has(newBarcode));

    setFormData((prev) => ({
      ...prev,
      unitLevels: prev.unitLevels.map((unit) =>
        unit.id === unitId ? { ...unit, [field]: newBarcode } : unit
      ),
    }));
    setBarcodeErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[unitId];
      return newErrors;
    });
  };

  const validateForm = () => {
    const newErrors: Partial<Record<keyof MultiUnitProductFormInput | string, string>> = {};
    const newUnitErrors: Record<string, Partial<Record<keyof CustomUnitInput, string>>> = {};
    const newBarcodeErrors: Record<string, string> = {};

    // Basic Information
    if (!formData.productName.trim()) {
      newErrors.productName = 'اسم المنتج مطلوب.';
    }
    if (!formData.category) {
      newErrors.category = 'الفئة مطلوبة.';
    }
    if (formData.initialQuantityHighestUnit <= 0) {
      newErrors.initialQuantityHighestUnit = 'يجب أن تكون الكمية الأولية أكبر من صفر.';
    }
    if (formData.totalPurchasePrice <= 0) {
      newErrors.totalPurchasePrice = 'يجب أن يكون إجمالي سعر الشراء أكبر من صفر.';
    }

    // Unit Levels Validation
    const allFormBarcodes: string[] = [];
    const unitNames = new Set<string>();

    formData.unitLevels.forEach((unit, index) => {
      const currentUnitErrors: Partial<Record<keyof CustomUnitInput, string>> = {};

      if (!unit.unitName.trim()) {
        currentUnitErrors.unitName = 'اسم الوحدة مطلوب.';
      } else if (unitNames.has(unit.unitName.trim())) {
        currentUnitErrors.unitName = 'اسم الوحدة يجب أن يكون فريدًا.';
      } else {
        unitNames.add(unit.unitName.trim());
      }

      if (!unit.barcode.trim()) {
        currentUnitErrors.barcode = 'الباركود مطلوب.';
      } else {
        allFormBarcodes.push(unit.barcode.trim());
      }

      if (index > 0 && unit.subUnitsPerThisUnit <= 0) {
        currentUnitErrors.subUnitsPerThisUnit = 'عدد الوحدات الفرعية يجب أن يكون أكبر من صفر.';
      }

      if (unit.sellingPrice <= 0) {
        currentUnitErrors.sellingPrice = 'سعر البيع يجب أن يكون أكبر من صفر.';
      }

      if (Object.keys(currentUnitErrors).length > 0) {
        newUnitErrors[unit.id] = currentUnitErrors;
      }
    });

    // Barcode uniqueness check (across all units in form and mock DB)
    const seenBarcodes = new Set<string>();
    const duplicateBarcodes = new Set<string>();

    allFormBarcodes.forEach((barcode) => {
      if (seenBarcodes.has(barcode)) {
        duplicateBarcodes.add(barcode);
      }
      seenBarcodes.add(barcode);
      if (MOCK_EXISTING_BARCODES.has(barcode)) {
        duplicateBarcodes.add(barcode); // Also mark if exists in mock DB
      }
    });

    formData.unitLevels.forEach((unit) => {
      if (duplicateBarcodes.has(unit.barcode.trim())) {
        newBarcodeErrors[unit.id] =
          'هذا الباركود مكرر في وحدات أخرى أو موجود بالفعل في النظام.';
      }
    });

    setErrors(newErrors);
    setUnitErrors(newUnitErrors);
    setBarcodeErrors(newBarcodeErrors);

    return (
      Object.keys(newErrors).length === 0 &&
      Object.keys(newUnitErrors).length === 0 &&
      Object.keys(newBarcodeErrors).length === 0
    );
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      alert('الرجاء تصحيح الأخطاء في النموذج قبل الحفظ.');
      return;
    }

    // Add new barcodes to mock existing ones
    formData.unitLevels.forEach((unit) => {
      MOCK_EXISTING_BARCODES.add(unit.barcode);
    });

    const newProduct: MultiUnitProduct = {
      name: formData.productName,
      category: formData.category,
      purchaseTotal: parseFloat(formData.totalPurchasePrice.toFixed(2)),
      unitLevels: formData.unitLevels.map((unit) => ({
        id: unit.id,
        unitName: unit.unitName,
        barcode: unit.barcode,
        totalQuantity: calculated[unit.id]?.totalQuantity || 0,
        costPerUnit: calculated[unit.id]?.costPerUnit || 0,
        sellingPricePerUnit: parseFloat(unit.sellingPrice.toFixed(2)),
        subUnitsPerThisUnit: unit.subUnitsPerThisUnit > 0 ? unit.subUnitsPerThisUnit : undefined,
      })),
      stock: formData.unitLevels.reduce((acc, unit) => {
        acc[unit.unitName] = calculated[unit.id]?.totalQuantity || 0;
        return acc;
      }, {} as Record<string, number>),
      createdAt: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    };

    console.log('Product to be saved:', newProduct);
    alert('تم حفظ المنتج بنجاح!');
    navigate('/products'); // Navigate back to product listing
  };

  const renderInputField = (
    label: string,
    name: keyof MultiUnitProductFormInput | keyof CustomUnitInput,
    type: 'text' | 'number',
    value: string | number,
    min?: number,
    step?: string,
    isUnitField = false,
    unitId?: string,
    showBarcodeGenerator = false,
    readOnly = false,
    placeholder?: string
  ) => {
    const fieldError = isUnitField
      ? unitErrors[unitId!]?.[name as keyof CustomUnitInput] || barcodeErrors[unitId!]
      : errors[name as keyof MultiUnitProductFormInput];
    const isBarcodeField = isUnitField && (name === 'barcode');

    return (
      <div>
        <label
          htmlFor={unitId ? `${unitId}-${String(name)}` : String(name)}
          className="block text-sm font-medium text-black dark:text-gray-300 text-right mb-1"
        >
          {label}
        </label>
        <div className="relative flex items-center">
          <input
            type={type}
            id={unitId ? `${unitId}-${String(name)}` : String(name)}
            name={String(name)}
            value={value}
            onChange={(e) =>
              isUnitField ? handleChange(e, unitId, name as keyof CustomUnitInput) : handleChange(e)
            }
            min={min}
            step={step}
            className={`mt-1 block w-full h-10 border ${
              fieldError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            } rounded-md shadow-sm py-2.5 px-3.5 focus:outline-none ${!readOnly ? 'focus:ring-orange-500 focus:border-orange-500' : ''} text-black dark:text-gray-200 text-right placeholder-gray-400 dark:placeholder-gray-500 ${readOnly ? 'bg-gray-50 dark:bg-gray-700 cursor-not-allowed' : 'bg-white dark:bg-gray-800'}`}
            required={!readOnly}
            readOnly={readOnly}
            placeholder={placeholder}
          />
          {showBarcodeGenerator && (
            <button
              type="button"
              onClick={() => generateBarcode(unitId!, name as keyof CustomUnitInput)}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors duration-200"
              aria-label={AR_LABELS.generateBarcode}
            >
              <GenerateBarcodeIcon />
            </button>
          )}
        </div>
        {fieldError && <p className="text-red-500 text-sm mt-1">{fieldError}</p>}
      </div>
    );
  };

  const renderCalculatedField = (label: string, value: number) => (
    <div>
      <label className="block text-sm font-medium text-black dark:text-gray-300 text-right mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value.toLocaleString('ar-EG', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} // Format to Arabic locale
        className="mt-1 block w-full h-10 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 rounded-md shadow-sm py-2.5 px-3.5 text-gray-800 dark:text-gray-300 text-right cursor-not-allowed"
        readOnly
        aria-live="polite"
        aria-atomic="true"
      />
    </div>
  );

  const confirmationSummary = (
    <div className="bg-orange-50 dark:bg-orange-900/20 border-r-4 border-orange-400 text-orange-700 dark:text-orange-300 p-4 rounded-md mb-6" role="alert">
      <p className="font-bold mb-2">{AR_LABELS.productName}: {formData.productName}</p>
      <p className="text-sm">
        {AR_LABELS.categoryName}: {formData.category} <br />
        {AR_LABELS.initialQuantityHighestUnit}: {formData.initialQuantityHighestUnit} <br />
        {AR_LABELS.totalPurchasePrice}: {formData.totalPurchasePrice.toFixed(2)} ر.س
      </p>
      <p className="font-bold mt-3 mb-1">{AR_LABELS.unitInformation}:</p>
      <ul className="text-sm list-disc pr-5">
        {formData.unitLevels.map((unit, index) => (
          <li key={unit.id}>
            {unit.unitName} (باركود: {unit.barcode}, سعر بيع: {unit.sellingPrice.toFixed(2)} ر.س, تكلفة: {calculated[unit.id]?.costPerUnit.toFixed(2)} ر.س, إجمالي: {calculated[unit.id]?.totalQuantity})
            {index < formData.unitLevels.length - 1 && ` - (${unit.subUnitsPerThisUnit} ${AR_LABELS.subUnitsPerThisUnit})`}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {AR_LABELS.addNewProduct}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {AR_LABELS.productListingDescription} ({AR_LABELS.multiUnitProduct})
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
        <form onSubmit={handleSaveProduct}>
          {/* Basic Information Section */}
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-200 mb-4 border-b pb-2 border-gray-100 dark:border-gray-700">
            {AR_LABELS.basicInformation}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {renderInputField(AR_LABELS.productName, 'productName', 'text', formData.productName)}
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
                <svg className="absolute top-1/2 left-3 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
              </div>
              {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
            </div>
            {renderInputField(AR_LABELS.initialQuantityHighestUnit, 'initialQuantityHighestUnit', 'number', formData.initialQuantityHighestUnit, 0, '1', false)}
            {renderInputField(AR_LABELS.totalPurchasePrice, 'totalPurchasePrice', 'number', formData.totalPurchasePrice, 0, '0.01', false)}
          </div>

          {/* Dynamic Unit Information Section */}
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-200 mb-4 border-b pb-2 border-gray-100 dark:border-gray-700">
            {AR_LABELS.unitInformation}
          </h2>
          {formData.unitLevels.map((unit, index) => (
            <div key={unit.id} className="relative bg-gray-50 dark:bg-gray-800/50 p-4 rounded-md mb-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-300 mb-4">
                وحدة المستوى {index + 1}
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => removeUnitLevel(unit.id)}
                    className="absolute top-4 left-4 p-1 text-red-600 hover:text-red-800 rounded-full hover:bg-red-100 dark:hover:bg-gray-700 transition-colors duration-200"
                    aria-label={AR_LABELS.remove + ' ' + unit.unitName}
                  >
                    <MinusIcon />
                  </button>
                )}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderInputField(AR_LABELS.unitName, 'unitName', 'text', unit.unitName, undefined, undefined, true, unit.id, false, false, `مثال: ${index === 0 ? 'صندوق' : 'كرتون'}`)}
                {renderInputField(AR_LABELS.barcode, 'barcode', 'text', unit.barcode, undefined, undefined, true, unit.id, true)}
                {index > 0 && renderInputField(`${AR_LABELS.subUnitsPerThisUnit} (${formData.unitLevels[index-1].unitName} -> ${unit.unitName})`, 'subUnitsPerThisUnit', 'number', unit.subUnitsPerThisUnit, 0, '1', true, unit.id)}
                {renderInputField(AR_LABELS.sellingPrice, 'sellingPrice', 'number', unit.sellingPrice, 0, '0.01', true, unit.id)}
              </div>
            </div>
          ))}

          <div className="flex justify-start mb-8">
            <button
              type="button"
              onClick={addUnitLevel}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {/* FIX: Added size classes to PlusIcon to prevent visual regression after component update. */}
              <PlusIcon className="h-4 w-4 ml-2" />
              <span>{AR_LABELS.addUnitLevel}</span>
            </button>
          </div>

          {/* Auto Calculations Section */}
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-200 mb-4 border-b pb-2 border-gray-100 dark:border-gray-700">
            {AR_LABELS.autoCalculations}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {formData.unitLevels.map((unit) => (
              <React.Fragment key={unit.id}>
                {renderCalculatedField(`${AR_LABELS.totalQuantity} (${unit.unitName})`, calculated[unit.id]?.totalQuantity || 0)}
                {renderCalculatedField(`${AR_LABELS.costPerUnit} (${unit.unitName})`, calculated[unit.id]?.costPerUnit || 0)}
              </React.Fragment>
            ))}
          </div>

          {showSummary && confirmationSummary}

          <div className="flex justify-start space-x-4 space-x-reverse">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              <AddProductIcon />
              <span className="mr-2">{AR_LABELS.saveProduct}</span>
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

export default AddMultiUnitProductPage;
