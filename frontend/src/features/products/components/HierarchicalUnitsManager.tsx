import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ProductUnit } from '@/features/products/types/product.types';
import { formatQuantityForDisplay } from '@/shared/utils';

interface AvailableUnit {
  id: string;
  nameAr: string;
}

interface HierarchicalUnitsManagerProps {
  units: ProductUnit[];
  onChange: (units: ProductUnit[]) => void;
  errors?: Record<string, string>;
  initialQuantity?: number; // Number of boxes (largest unit)
  availableUnits?: AvailableUnit[];
  mainUnitName?: string; // Name of the main unit from mainUnitId selection (for first level unit)
  mainUnitBarcode?: string; // Barcode to inherit for the main unit (from product primaryBarcode)
  mainUnitSellingPrice?: number; // Selling price to inherit for the main unit (from product retailSellingPrice)
}

const HierarchicalUnitsManager: React.FC<HierarchicalUnitsManagerProps> = ({
  units: initialUnits,
  onChange,
  errors = {},
  initialQuantity = 0,
  availableUnits = [],
  mainUnitName,
  mainUnitBarcode,
  mainUnitSellingPrice,
}) => {
  const [units, setUnits] = useState<ProductUnit[]>(initialUnits || []);
  const prevInitialUnitsRef = useRef<string>('');
  const prevInitialQuantityRef = useRef<number>(0);
  const isInternalUpdateRef = useRef<boolean>(false);
  const onChangeRef = useRef(onChange);

  // Store the latest onChange callback
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Sync with parent component when initialUnits changes (only if change came from outside)
  useEffect(() => {
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return; // Skip if the change came from within this component
    }

    const initialUnitsJson = JSON.stringify(initialUnits || []);
    if (prevInitialUnitsRef.current !== initialUnitsJson) {
      prevInitialUnitsRef.current = initialUnitsJson;
      setUnits(initialUnits || []);
    }
  }, [initialUnits]);

  // Update first unit data when mainUnitName, mainUnitBarcode, or mainUnitSellingPrice changes
  useEffect(() => {
    if (mainUnitName && units.length > 0) {
      const firstUnit = units[0];
      let needsUpdate = false;
      const updates: Partial<ProductUnit> = {};
      
      // Check if name needs update
      if (firstUnit && firstUnit.unitName !== mainUnitName) {
        updates.unitName = mainUnitName;
        needsUpdate = true;
      }
      
      // Check if barcode needs update (only if provided and different)
      if (mainUnitBarcode !== undefined && firstUnit && firstUnit.barcode !== mainUnitBarcode) {
        updates.barcode = mainUnitBarcode;
        needsUpdate = true;
      }
      
      // Check if selling price needs update (only if provided and different)
      if (mainUnitSellingPrice !== undefined && firstUnit && firstUnit.sellingPrice !== mainUnitSellingPrice) {
        updates.sellingPrice = mainUnitSellingPrice;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        const updatedUnits = units.map((unit, index) => {
          if (index === 0) {
            return { ...unit, ...updates };
          }
          return unit;
        });
        setUnits(updatedUnits);
        // Mark as internal update and notify parent
        isInternalUpdateRef.current = true;
        onChangeRef.current(updatedUnits);
        setTimeout(() => {
          isInternalUpdateRef.current = false;
        }, 100);
      }
    }
  }, [mainUnitName, mainUnitBarcode, mainUnitSellingPrice, units]);

  // Remove the automatic onChange useEffect - we'll call it manually in handlers
  // This prevents infinite loops by only notifying when user makes changes

  // Calculate total quantity for a specific unit level
  const calculateTotalQuantityAtLevel = useCallback((unitIndex: number): number => {
    if (unitIndex === 0) {
      // First unit (largest) - total is the initial quantity
      return initialQuantity || 0;
    }

    // For sub-units, multiply initialQuantity by all unitsInPrevious values up to this level
    // unitsInPrevious is stored on the current unit and tells us how many of this unit are in the previous unit
    let total = initialQuantity || 0;
    for (let i = 1; i <= unitIndex; i++) {
      const currentUnit = units[i]; // Get the current unit (not i-1)
      if (!currentUnit) break;
      
      const unitsInPrev = (currentUnit as any).unitsInPrevious || 1;
      if (unitsInPrev > 0) {
        total = total * unitsInPrev;
      }
    }
    
    return total;
  }, [initialQuantity, units]);

  const handleAddUnit = () => {
    const newOrder = units.length;
    const newUnit: ProductUnit = {
      unitName: '',
      barcode: '',
      sellingPrice: 0,
      multiplier: 1,
      order: newOrder,
      unitsInPrevious: 1,
    } as any;

    const newUnits = [...units, newUnit];
    setUnits(newUnits);
    // Mark as internal update and notify parent
    isInternalUpdateRef.current = true;
    onChangeRef.current(newUnits);
    // Reset flag after a short delay to allow parent update to complete
    setTimeout(() => {
      isInternalUpdateRef.current = false;
    }, 100);
  };

  const handleRemoveUnit = (index: number) => {
    const newUnits = units.filter((_, i) => i !== index).map((unit, i) => ({
      ...unit,
      order: i,
    }));
    setUnits(newUnits);
    // Mark as internal update and notify parent
    isInternalUpdateRef.current = true;
    onChangeRef.current(newUnits);
    // Reset flag after a short delay to allow parent update to complete
    setTimeout(() => {
      isInternalUpdateRef.current = false;
    }, 100);
  };

  const handleUnitChange = (index: number, field: keyof ProductUnit | 'unitsInPrevious', value: string | number) => {
    // Prevent editing the first unit's name, barcode, or selling price if main unit data is provided
    if (index === 0) {
      if (field === 'unitName' && mainUnitName) {
        // Don't allow changing the first unit name - it's read-only
        return;
      }
      if (field === 'barcode' && mainUnitBarcode !== undefined) {
        // Don't allow changing the first unit barcode - it's read-only (inherited)
        return;
      }
      if (field === 'sellingPrice' && mainUnitSellingPrice !== undefined) {
        // Don't allow changing the first unit selling price - it's read-only (inherited)
        return;
      }
    }

    const newUnits = units.map((unit, i) => {
      if (i === index) {
        if (field === 'unitsInPrevious') {
          return {
            ...unit,
            unitsInPrevious: Math.max(1, value as number),
          } as any;
        } else {
          return {
            ...unit,
            [field]: value,
          };
        }
      }
      return unit;
    });
    setUnits(newUnits);
    // Mark as internal update and notify parent
    isInternalUpdateRef.current = true;
    onChangeRef.current(newUnits);
    // Reset flag after a short delay to allow parent update to complete
    setTimeout(() => {
      isInternalUpdateRef.current = false;
    }, 100);
  };

  // Recalculate totals when initialQuantity changes
  useEffect(() => {
    if (prevInitialQuantityRef.current !== initialQuantity) {
      prevInitialQuantityRef.current = initialQuantity;
      // Totals are calculated dynamically, no need to update state
    }
  }, [initialQuantity]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          إدارة الوحدات الهرمية
        </h3>
        <button
          type="button"
          onClick={handleAddUnit}
          className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
        >
          + إضافة وحدة
        </button>
      </div>

      {units.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>لا توجد وحدات مضافة. اضغط "إضافة وحدة" لبدء إضافة الوحدات.</p>
        </div>
      )}

      {units.map((unit, index) => {
        const displayIndex = index; // Units are already sorted by order
        const totalQuantity = calculateTotalQuantityAtLevel(displayIndex);
        const previousUnit = index > 0 ? units[index - 1] : null;

        return (
          <div
            key={index}
            className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800"
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  المستوى {index + 1} {index === 0 ? '(أكبر وحدة)' : ''}
                </span>
              </div>
              <div className="flex gap-2">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (index > 0) {
                        const newUnits = [...units];
                        [newUnits[index - 1], newUnits[index]] = [newUnits[index], newUnits[index - 1]];
                        setUnits(newUnits.map((u, i) => ({ ...u, order: i })));
                      }
                    }}
                    className="px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    ↑
                  </button>
                )}
                {index < units.length - 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (index < units.length - 1) {
                        const newUnits = [...units];
                        [newUnits[index], newUnits[index + 1]] = [newUnits[index + 1], newUnits[index]];
                        setUnits(newUnits.map((u, i) => ({ ...u, order: i })));
                      }
                    }}
                    className="px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    ↓
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveUnit(index)}
                  className="px-2 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                >
                  حذف
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {/* Unit Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  اسم الوحدة <span className="text-red-500">*</span>
                </label>
                {index === 0 && mainUnitName ? (
                  // First level unit: read-only, taken from mainUnitId selection
                  <input
                    type="text"
                    value={mainUnitName}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                    title="اسم الوحدة الرئيسية (غير قابل للتعديل)"
                  />
                ) : availableUnits.length > 0 ? (
                  <select
                    value={unit.unitName || ''}
                    onChange={(e) => handleUnitChange(index, 'unitName', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                  >
                    <option value="">-- اختر الوحدة --</option>
                    {availableUnits.map((avUnit) => (
                      <option key={avUnit.id} value={avUnit.nameAr}>
                        {avUnit.nameAr}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={unit.unitName || ''}
                    onChange={(e) => handleUnitChange(index, 'unitName', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                    placeholder="مثال: صندوق، كرتون، قطعة"
                  />
                )}
                {index === 0 && mainUnitName && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    اسم الوحدة الرئيسية مأخوذ من اختيار الوحدة الرئيسية أعلاه
                  </p>
                )}
              </div>

              {/* For first unit (largest), just show the initial quantity */}
              {index === 0 && (
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                    ✓ إجمالي {unit.unitName || 'الوحدة'}: <span className="font-bold">{formatQuantityForDisplay(initialQuantity || 0)}</span>
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                    هذا هو عدد {unit.unitName || 'الوحدة'} التي تم إدخالها
                  </p>
                </div>
              )}

              {/* For units after the first one, ask how many of current unit are in previous unit */}
              {index > 0 && previousUnit && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    كم {unit.unitName || 'وحدة'} في {previousUnit.unitName || 'الوحدة السابقة'}؟ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={(unit as any).unitsInPrevious || 1}
                    onFocus={(e) => {
                      e.target.select();
                      handleUnitChange(index, 'unitsInPrevious', '');
                    }}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        handleUnitChange(index, 'unitsInPrevious', '');
                      } else {
                        const numValue = parseInt(value);
                        if (!isNaN(numValue) && numValue >= 1) {
                          handleUnitChange(index, 'unitsInPrevious', numValue);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value;
                      if (value === '' || parseInt(value) < 1) {
                        handleUnitChange(index, 'unitsInPrevious', 1);
                      }
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                    placeholder="مثال: 6 (يعني 6 كراتين في الصندوق)"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    سيتم حساب إجمالي {unit.unitName || 'الوحدة'} تلقائياً
                  </p>
                  
                  {/* Display calculated total quantity for this unit level */}
                  {initialQuantity > 0 && previousUnit && (() => {
                    const totalQty = calculateTotalQuantityAtLevel(index);
                    const prevUnitName = previousUnit.unitName || 'الوحدة السابقة';
                    const currentUnitName = unit.unitName || 'الوحدة';
                    const unitsInPrev = (unit as any).unitsInPrevious || 1;
                    
                    // Calculate the previous unit's total to show correct formula
                    const prevTotal = index > 1 ? calculateTotalQuantityAtLevel(index - 1) : initialQuantity;
                    
                    return (
                      <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                        <p className="text-xs font-medium text-green-700 dark:text-green-400">
                          ✓ إجمالي {currentUnitName}: <span className="font-bold">{formatQuantityForDisplay(totalQty)}</span> (محسوب تلقائياً)
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                          {formatQuantityForDisplay(prevTotal)} {prevUnitName} × {unitsInPrev} {currentUnitName} = {formatQuantityForDisplay(totalQty)} {currentUnitName}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Barcode */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  الباركود
                </label>
                {index === 0 && mainUnitBarcode !== undefined ? (
                  // First level unit: read-only, inherited from product primaryBarcode
                  <input
                    type="text"
                    value={mainUnitBarcode}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                    title="باركود الوحدة الرئيسية (موروث من باركود المنتج)"
                  />
                ) : (
                  <input
                    type="text"
                    value={unit.barcode || ''}
                    onChange={(e) => handleUnitChange(index, 'barcode', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                    placeholder="باركود فريد للوحدة"
                  />
                )}
                {index === 0 && mainUnitBarcode !== undefined && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    باركود الوحدة الرئيسية مأخوذ من باركود المنتج
                  </p>
                )}
              </div>

              {/* Selling Price */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  سعر البيع <span className="text-red-500">*</span>
                </label>
                {index === 0 && mainUnitSellingPrice !== undefined ? (
                  // First level unit: read-only, inherited from product retailSellingPrice
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={mainUnitSellingPrice}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                    title="سعر بيع الوحدة الرئيسية (موروث من سعر بيع المنتج)"
                  />
                ) : (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={unit.sellingPrice || 0}
                    onChange={(e) => handleUnitChange(index, 'sellingPrice', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                    placeholder="0.00"
                  />
                )}
                {index === 0 && mainUnitSellingPrice !== undefined && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    سعر بيع الوحدة الرئيسية مأخوذ من سعر بيع المنتج
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Show summary for smallest unit */}
      {units.length > 1 && initialQuantity > 0 && (() => {
        const smallestUnit = units[units.length - 1];
        const totalSmallest = calculateTotalQuantityAtLevel(units.length - 1);
        
        return (
          <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-300 mb-2">
              ملخص الحسابات
            </h4>
            <p className="text-xs text-purple-700 dark:text-purple-400">
              إجمالي {smallestUnit?.unitName || 'أصغر وحدة'}: <span className="font-bold">{formatQuantityForDisplay(totalSmallest)}</span>
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-500 mt-1">
              هذا هو الرقم المرجعي المستخدم في جميع العمليات (المبيعات، المخزون، إلخ)
            </p>
          </div>
        );
      })()}
    </div>
  );
};

export default HierarchicalUnitsManager;
