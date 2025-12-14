import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AR_LABELS, ChevronDownIcon, PlusIcon, MinusIcon, GenerateBarcodeIcon } from '@/shared/constants';
import { productsApi, categoriesApi, brandsApi, warehousesApi, unitsApi } from '@/lib/api/client';
import BrandFormModal from '@/features/products/components/brand-management/BrandFormModal';
import UnitFormModal from '@/features/products/components/unit-management/UnitFormModal';
import CategoryFormModal from '@/features/products/components/category-management/CategoryFormModal';
import { Brand, Unit, Category } from '@/shared/types';
import { ApiError } from '@/lib/api/client';
import { invalidateProductsCache, getStoreIdFromToken } from '@/lib/cache/productsCache';
import { productSync } from '@/lib/sync/productSync';

interface ProductFormData {
  // Basic Information
  name: string;
  primaryBarcode: string;
  costPrice: number;
  initialQuantity: number;
  retailSellingPrice: number;
  warehouseId: string;
  mainUnitId: string; // ID of the main unit selected from store units

  // Advanced Options
  units: Array<{
    unitName: string;
    barcode: string;
    sellingPrice: number;
    conversionFactor: number;
  }>;
  wholesalePrice: number;
  multiWarehouseDistribution: Array<{
    warehouseId: string;
    quantity: number;
  }>;
  brandId: string;
  brandName: string; // For creating new brand
  categoryId: string;
  description: string;
  images: File[];
  lowStockAlert: number;
  internalSKU: string;
  vatPercentage: number;
  vatInclusive: boolean;
  productionDate: string;
  expiryDate: string;
  batchNumber: string;
  discountRules: {
    enabled: boolean;
    percentage: number;
    minQuantity?: number;
  };
  status: 'active' | 'inactive' | 'hidden';
  showInQuickProducts: boolean;
}

const AddProductPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = !!id;
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [currentUnitIndex, setCurrentUnitIndex] = useState<number | null>(null);
  const [isAddingMainUnit, setIsAddingMainUnit] = useState(false);
  
  // Data for dropdowns
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [productLoaded, setProductLoaded] = useState(false);

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    primaryBarcode: '',
    costPrice: 0,
    initialQuantity: 0, // Set to 0 initially for new products
    retailSellingPrice: 0,
    warehouseId: '',
    mainUnitId: '', // Main unit selection
    units: [],
    wholesalePrice: 0,
    multiWarehouseDistribution: [],
    brandId: '',
    brandName: '',
    categoryId: '',
    description: '',
    images: [],
    lowStockAlert: 10,
    internalSKU: '',
    vatPercentage: 0,
    vatInclusive: false,
    productionDate: '',
    expiryDate: '',
    batchNumber: '',
    discountRules: {
      enabled: false,
      percentage: 0,
    },
    status: 'active',
    showInQuickProducts: false,
  });

  // State for "Add Stock" functionality
  const [showAddStockForm, setShowAddStockForm] = useState(false);
  const [showUnitSelection, setShowUnitSelection] = useState(false);
  const [selectedUnitForStock, setSelectedUnitForStock] = useState<string>('');
  const [newUnitForm, setNewUnitForm] = useState<{
    unitType: 'basic' | 'new';
    unitName: string;
    conversionFactor: number; // Number of previous units in this unit
    quantity: number; // Quantity in this unit
    barcode: string;
    sellingPrice: number;
    wholesalePrice: number;
    costPrice: number; // Calculated automatically
  }>({
    unitType: 'basic',
    unitName: '',
    conversionFactor: 1,
    quantity: 0,
    barcode: '',
    sellingPrice: 0,
    wholesalePrice: 0,
    costPrice: 0,
  });
  const [newUnitFormErrors, setNewUnitFormErrors] = useState<Record<string, string>>({});

  // Load dropdown data and product data (if editing)
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [categoriesRes, brandsRes, unitsRes, warehousesRes] = await Promise.all([
          categoriesApi.getCategories(),
          brandsApi.getBrands(),
          unitsApi.getUnits(),
          warehousesApi.getWarehouses(),
        ]);

        if (categoriesRes.success) {
          const categoriesData = (categoriesRes.data as any)?.categories || categoriesRes.data || [];
          setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        }
        if (brandsRes.success) {
          const brandsData = (brandsRes.data as any)?.brands || brandsRes.data || [];
          // Map backend brands to frontend format
          const mappedBrands = Array.isArray(brandsData) ? brandsData.map((brand: any) => ({
            id: brand.id || brand._id?.toString() || brand._id,
            nameAr: brand.name || brand.nameAr,
            description: brand.description || '',
            status: brand.status || 'Active',
            createdAt: brand.createdAt || new Date().toISOString(),
            productCount: brand.productCount || 0,
          })) : [];
          setBrands(mappedBrands);
        }
        if (unitsRes.success) {
          const backendResponse = unitsRes.data as any;
          
          // Try different possible response structures
          let unitsData = [];
          if (backendResponse?.units) {
            unitsData = backendResponse.units;
          } else if (backendResponse?.data?.units) {
            unitsData = backendResponse.data.units;
          } else if (Array.isArray(backendResponse)) {
            unitsData = backendResponse;
          } else if (Array.isArray(backendResponse?.data)) {
            unitsData = backendResponse.data;
          }
          
          // Map backend units to frontend format
          const mappedUnits = Array.isArray(unitsData) ? unitsData.map((unit: any) => {
            // Handle different ID formats
            const unitId = unit.id || unit._id?.toString() || unit._id;
            const unitName = unit.name || unit.nameAr;
            
            // Handle date formatting
            let createdAt = new Date().toISOString();
            if (unit.createdAt) {
              if (typeof unit.createdAt === 'string') {
                createdAt = unit.createdAt;
              } else if (unit.createdAt instanceof Date) {
                createdAt = unit.createdAt.toISOString();
              } else if (unit.createdAt.toISOString) {
                createdAt = unit.createdAt.toISOString();
              }
            }
            
            let updatedAt = createdAt;
            if (unit.updatedAt) {
              if (typeof unit.updatedAt === 'string') {
                updatedAt = unit.updatedAt;
              } else if (unit.updatedAt instanceof Date) {
                updatedAt = unit.updatedAt.toISOString();
              } else if (unit.updatedAt.toISOString) {
                updatedAt = unit.updatedAt.toISOString();
              }
            }
            
            return {
              id: unitId?.toString() || '',
              nameAr: unitName || '',
              description: unit.description || '',
              createdAt: createdAt,
              updatedAt: updatedAt,
            };
          }) : [];
          
          console.log('Loaded units in AddProductPage:', mappedUnits);
          setUnits(mappedUnits);
        }
        if (warehousesRes.success) {
          const warehousesData = (warehousesRes.data as any)?.warehouses || warehousesRes.data || [];
          setWarehouses(Array.isArray(warehousesData) ? warehousesData : []);
        }

        // If editing, fetch product data
        if (isEditMode && id) {
          try {
            console.log('Fetching product with ID:', id);
            const productRes = await productsApi.getProduct(id);
            console.log('Product API response:', productRes);
            
            // The API client wraps the backend response, so productRes.data is the backend response
            // Backend returns: { success: true, message: '...', data: { product: {...} } }
            const backendResponse = productRes.data as any;
            
            if (backendResponse?.success !== false) {
              // Handle different possible response structures
              let product = null;
              
              // Try the standard backend structure first: data.data.product
              if (backendResponse?.data?.product) {
                product = backendResponse.data.product;
              }
              // Fallback to data.product
              else if (backendResponse?.product) {
                product = backendResponse.product;
              }
              // Fallback to direct product object
              else if (backendResponse && typeof backendResponse === 'object' && 'name' in backendResponse) {
                product = backendResponse;
              }
              
              console.log('Extracted product data:', product);
              console.log('Product mainUnitId:', (product as any)?.mainUnitId);
              console.log('Available units:', units.map(u => ({ id: u.id, name: u.nameAr })));
              
              if (product) {
                // Extract and convert IDs to strings to ensure they match
                const productMainUnitId = (product as any).mainUnitId 
                  ? String((product as any).mainUnitId) 
                  : '';
                const productCategoryId = (product as any).categoryId 
                  ? String((product as any).categoryId) 
                  : '';
                
                // Verify mainUnitId exists in the units list
                const mainUnitExists = productMainUnitId && units.some(u => {
                  const unitId = String(u.id);
                  return unitId === productMainUnitId;
                });
                
                // Verify categoryId exists in the categories list
                const categoryExists = productCategoryId && categories.some(c => {
                  const categoryId = String(c.id);
                  return categoryId === productCategoryId;
                });
                
                if (productMainUnitId && !mainUnitExists) {
                  console.warn(`Main Unit ID ${productMainUnitId} from product not found in loaded units. Available unit IDs:`, units.map(u => String(u.id)));
                }
                
                if (productCategoryId && !categoryExists) {
                  console.warn(`Category ID ${productCategoryId} from product not found in loaded categories. Available category IDs:`, categories.map(c => String(c.id)));
                }
                
                // Pre-fill form with product data
                const formDataUpdate: ProductFormData = {
                  name: product.name || '',
                  primaryBarcode: product.barcode || '',
                  costPrice: product.costPrice || 0,
                  initialQuantity: product.stock || 0,
                  retailSellingPrice: product.price || 0,
                  warehouseId: product.warehouseId || '',
                  mainUnitId: productMainUnitId,
                  units: Array.isArray(product.units) ? product.units : [],
                  wholesalePrice: product.wholesalePrice || 0,
                  multiWarehouseDistribution: Array.isArray(product.multiWarehouseDistribution)
                    ? product.multiWarehouseDistribution
                    : [],
                  brandId: product.brandId || '',
                  brandName: '', // Keep for backward compatibility but won't be used
                  categoryId: productCategoryId,
                  description: product.description || '',
                  images: [],
                  lowStockAlert: product.lowStockAlert !== undefined ? product.lowStockAlert : 10,
                  internalSKU: product.internalSKU || '',
                  vatPercentage: product.vatPercentage || 0,
                  vatInclusive: product.vatInclusive === true,
                  productionDate: product.productionDate
                    ? new Date(product.productionDate).toISOString().split('T')[0]
                    : '',
                  expiryDate: product.expiryDate
                    ? new Date(product.expiryDate).toISOString().split('T')[0]
                    : '',
                  batchNumber: product.batchNumber || '',
                  discountRules: product.discountRules && typeof product.discountRules === 'object'
                    ? {
                        enabled: product.discountRules.enabled === true,
                        percentage: product.discountRules.percentage || 0,
                        minQuantity: product.discountRules.minQuantity,
                      }
                    : {
                        enabled: false,
                        percentage: 0,
                      },
                  status: product.status || 'active',
                  showInQuickProducts: product.showInQuickProducts === true,
                };
                
                console.log('Setting form data:', formDataUpdate);
                console.log('Form data mainUnitId:', formDataUpdate.mainUnitId);
                console.log('Form data categoryId:', formDataUpdate.categoryId);
                console.log('Available units for matching:', units.map(u => ({ id: String(u.id), name: u.nameAr })));
                console.log('Available categories for matching:', categories.map(c => ({ id: String(c.id), name: c.nameAr || c.name })));
                setFormData(formDataUpdate);
                setProductLoaded(true);

                // Open advanced options if any advanced fields have data
                if (
                  product.description ||
                  product.brandId ||
                  (Array.isArray(product.units) && product.units.length > 0) ||
                  product.wholesalePrice > 0 ||
                  (Array.isArray(product.multiWarehouseDistribution) &&
                    product.multiWarehouseDistribution.length > 0) ||
                  product.lowStockAlert ||
                  product.internalSKU ||
                  product.vatPercentage > 0 ||
                  product.productionDate ||
                  product.expiryDate ||
                  product.batchNumber ||
                  (product.discountRules && product.discountRules.enabled) ||
                  product.showInQuickProducts === true
                ) {
                  setIsAdvancedOpen(true);
                }
              } else {
                console.error('Product data not found in response. Full response:', backendResponse);
                alert('فشل تحميل بيانات المنتج: لم يتم العثور على البيانات');
                setProductLoaded(true); // Set to true even on error to allow form to render
              }
            } else {
              // Backend returned success: false
              console.error('Product API returned unsuccessful response:', backendResponse);
              const errorMessage = backendResponse?.message || productRes.message || 'خطأ غير معروف';
              alert('فشل تحميل بيانات المنتج: ' + errorMessage);
              setProductLoaded(true); // Set to true even on error to allow form to render
            }
          } catch (error: any) {
            console.error('Error loading product:', error);
            alert('فشل تحميل بيانات المنتج: ' + (error.message || 'خطأ غير معروف'));
            setProductLoaded(true); // Set to true even on error to allow form to render
          }
        } else {
          // Not in edit mode, so product is "loaded" (no product to load)
          setProductLoaded(true);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        // Only set loading to false after all data (including product data) is loaded
        setLoading(false);
      }
    };

    loadData();
  }, [id, isEditMode]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    // Handle brand selection - check if "Add Brand" option was selected
    if (name === 'brandId' && value === '__add_brand__') {
      setIsBrandModalOpen(true);
      return; // Don't update formData, just open modal
    }
    
    // Handle category selection - check if "Add Category" option was selected
    if (name === 'categoryId' && value === '__add_category__') {
      setIsCategoryModalOpen(true);
      return; // Don't update formData, just open modal
    }
    
    // Handle main unit selection - check if "Add Unit" option was selected
    if (name === 'mainUnitId' && value === '__add_unit__') {
      setIsAddingMainUnit(true);
      setIsUnitModalOpen(true);
      return; // Don't update formData, just open modal
    }
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      if (name === 'vatInclusive') {
        setFormData(prev => ({ ...prev, vatInclusive: checked }));
      } else if (name === 'discountRules.enabled') {
        setFormData(prev => ({
          ...prev,
          discountRules: { ...prev.discountRules, enabled: checked },
        }));
      }
    } else if (name.startsWith('discountRules.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        discountRules: {
          ...prev.discountRules,
          [field]: type === 'number' ? parseFloat(value) || 0 : value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseFloat(value) || 0 : value,
      }));
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleCategorySave = async (categoryDraft: { nameAr: string; description?: string; parentId?: string | null; status: 'Active' | 'Inactive'; id?: string }) => {
    try {
      const payload = {
        name: categoryDraft.nameAr.trim(),
        description: categoryDraft.description?.trim() || undefined,
        parentId: categoryDraft.parentId || undefined,
      };

      console.log('Creating category with payload:', payload);
      const response = await categoriesApi.createCategory(payload);
      console.log('Category creation response:', response);

      // The API client wraps the response, so response.data is the backend response
      // Backend returns: { success: true, message: '...', category: {...} }
      const backendResponse = response.data as any;
      
      // Check if the response was successful
      if (backendResponse?.success !== false) {
        // Try different possible response structures
        let createdCategory = null;
        
        if (backendResponse?.category) {
          createdCategory = backendResponse.category;
        } else if (backendResponse && typeof backendResponse === 'object' && 'name' in backendResponse) {
          // Direct category object
          createdCategory = backendResponse;
        }

        console.log('Extracted category data:', createdCategory);

        if (createdCategory) {
          // Map backend category to frontend format
          const categoryId = createdCategory.id || createdCategory._id?.toString() || createdCategory._id;
          const categoryName = createdCategory.name || createdCategory.nameAr;
          
          if (!categoryId) {
            console.error('Category ID not found in response:', createdCategory);
            throw new Error('فشل إنشاء الفئة: لم يتم العثور على معرف الفئة');
          }

          // Ensure we have a valid date string
          let createdAt = new Date().toISOString();
          if (createdCategory.createdAt) {
            if (typeof createdCategory.createdAt === 'string') {
              createdAt = createdCategory.createdAt;
            } else if (createdCategory.createdAt instanceof Date) {
              createdAt = createdCategory.createdAt.toISOString();
            } else if (createdCategory.createdAt.toISOString) {
              createdAt = createdCategory.createdAt.toISOString();
            }
          }

          const newCategory: Category = {
            id: categoryId.toString(),
            nameAr: categoryName,
            description: createdCategory.description || '',
            parentId: createdCategory.parentId || null,
            status: categoryDraft.status,
            createdAt: createdAt,
            productCount: 0,
          };

          console.log('Mapped new category:', newCategory);

          // Add to categories list (avoid duplicates)
          setCategories(prev => {
            // Check if category already exists
            const exists = prev.some(c => c.id === newCategory.id);
            if (exists) {
              console.log('Category already exists in list, updating instead');
              return prev.map(c => c.id === newCategory.id ? newCategory : c);
            }
            return [...prev, newCategory];
          });

          // Select the newly created category
          setFormData(prev => ({
            ...prev,
            categoryId: newCategory.id,
          }));

          // Close modal
          setIsCategoryModalOpen(false);
          
          console.log('Category created and selected successfully');
        } else {
          console.error('Category data not found in response. Full response:', backendResponse);
          throw new Error('فشل إنشاء الفئة: لم يتم العثور على بيانات الفئة في الاستجابة');
        }
      } else {
        const errorMessage = backendResponse?.message || 'فشل إنشاء الفئة';
        console.error('Category creation failed:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Failed to create category', apiError);
      const errorMessage = apiError?.message || 'تعذر إنشاء الفئة. يرجى المحاولة مرة أخرى.';
      window.alert(errorMessage);
      throw error;
    }
  };

  const handleBrandSave = async (brandDraft: { nameAr: string; description?: string; status: 'Active' | 'Inactive' }) => {
    try {
      const payload = {
        name: brandDraft.nameAr.trim(),
        description: brandDraft.description?.trim() || undefined,
      };

      console.log('Creating brand with payload:', payload);
      const response = await brandsApi.createBrand(payload);
      console.log('Brand creation response:', response);

      // The API client wraps the response, so response.data is the backend response
      // Backend returns: { success: true, message: '...', brand: {...} }
      const backendResponse = response.data as any;
      
      // Check if the response was successful
      if (backendResponse?.success !== false) {
        // Try different possible response structures
        let createdBrand = null;
        
        if (backendResponse?.brand) {
          createdBrand = backendResponse.brand;
        } else if (backendResponse && typeof backendResponse === 'object' && 'name' in backendResponse) {
          // Direct brand object
          createdBrand = backendResponse;
        }

        console.log('Extracted brand data:', createdBrand);

        if (createdBrand) {
          // Map backend brand to frontend format
          const brandId = createdBrand.id || createdBrand._id?.toString() || createdBrand._id;
          const brandName = createdBrand.name || createdBrand.nameAr;
          
          if (!brandId) {
            console.error('Brand ID not found in response:', createdBrand);
            throw new Error('فشل إنشاء العلامة التجارية: لم يتم العثور على معرف العلامة');
          }

          // Ensure we have a valid date string
          let createdAt = new Date().toISOString();
          if (createdBrand.createdAt) {
            if (typeof createdBrand.createdAt === 'string') {
              createdAt = createdBrand.createdAt;
            } else if (createdBrand.createdAt instanceof Date) {
              createdAt = createdBrand.createdAt.toISOString();
            } else if (createdBrand.createdAt.toISOString) {
              createdAt = createdBrand.createdAt.toISOString();
            }
          }

          const newBrand: Brand = {
            id: brandId.toString(),
            nameAr: brandName,
            description: createdBrand.description || '',
            status: brandDraft.status,
            createdAt: createdAt,
            productCount: 0,
          };

          console.log('Mapped new brand:', newBrand);

          // Add to brands list (avoid duplicates)
          setBrands(prev => {
            // Check if brand already exists
            const exists = prev.some(b => b.id === newBrand.id);
            if (exists) {
              console.log('Brand already exists in list, updating instead');
              return prev.map(b => b.id === newBrand.id ? newBrand : b);
            }
            return [...prev, newBrand];
          });

          // Select the newly created brand
          setFormData(prev => ({
            ...prev,
            brandId: newBrand.id,
          }));

          // Close modal
          setIsBrandModalOpen(false);
          
          console.log('Brand created and selected successfully');
        } else {
          console.error('Brand data not found in response. Full response:', backendResponse);
          throw new Error('فشل إنشاء العلامة التجارية: لم يتم العثور على بيانات العلامة في الاستجابة');
        }
      } else {
        const errorMessage = backendResponse?.message || 'فشل إنشاء العلامة التجارية';
        console.error('Brand creation failed:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Failed to create brand', apiError);
      const errorMessage = apiError?.message || 'تعذر إنشاء العلامة التجارية. يرجى المحاولة مرة أخرى.';
      window.alert(errorMessage);
      throw error;
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData(prev => ({
        ...prev,
        images: Array.from(e.target.files || []),
      }));
    }
  };

  // Calculate cost price for new unit based on main unit cost
  // For secondary units: Cost Price = Main Unit Cost ÷ Number of Secondary Units in Main Unit
  // Example: If main unit (Carton) cost is 17 and there are 12 bottles in 1 carton, bottle cost = 17 ÷ 12 = 1.42
  const calculateUnitCostPrice = useCallback((conversionFactor: number, unitType: 'basic' | 'new'): number => {
    if (unitType === 'basic') {
      // Main unit: cost price is entered directly
      return formData.costPrice;
    } else {
      // For secondary units: conversionFactor = how many secondary units are in 1 main unit
      // Cost Price = Main Unit Cost ÷ conversionFactor
      // Example: Main unit (Carton) cost = 17, conversionFactor = 12 (12 bottles in 1 carton) → 17 ÷ 12 = 1.42
      if (formData.units.length === 0) {
        // No previous units, use main unit cost price directly
        return formData.costPrice / conversionFactor;
      } else {
        // Use the main unit cost price (formData.costPrice is the main unit cost)
        return formData.costPrice / conversionFactor;
      }
    }
  }, [formData.costPrice, formData.units]);

  // Handle new unit form changes
  const handleNewUnitFormChange = (field: string, value: any) => {
    setNewUnitForm(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate cost price when conversion factor or unit type changes
      if (field === 'conversionFactor' || field === 'unitType') {
        const newConversionFactor = field === 'conversionFactor' ? value : updated.conversionFactor;
        const newUnitType = field === 'unitType' ? value : updated.unitType;
        updated.costPrice = calculateUnitCostPrice(newConversionFactor, newUnitType);
      }
      
      return updated;
    });
  };

  // Update cost price when formData changes (e.g., costPrice changes)
  useEffect(() => {
    if (showAddStockForm) {
      setNewUnitForm(prev => ({
        ...prev,
        costPrice: calculateUnitCostPrice(prev.conversionFactor, prev.unitType),
      }));
    }
  }, [formData.costPrice, formData.units, showAddStockForm, calculateUnitCostPrice]);

  // Calculate total conversion factor to basic unit for a given unit
  const calculateTotalConversionToBasic = (unitIndex: number): number => {
    if (unitIndex < 0) {
      return 1; // Basic unit
    }
    let totalFactor = 1;
    for (let i = 0; i <= unitIndex; i++) {
      totalFactor *= formData.units[i]?.conversionFactor || 1;
    }
    return totalFactor;
  };

  // Add new unit from the "Add Stock" form
  const handleAddStockUnit = () => {
    const formErrors: Record<string, string> = {};

    if (newUnitForm.unitType === 'new' && !newUnitForm.unitName.trim()) {
      formErrors.unitName = 'يرجى إدخال اسم الوحدة';
    }
    // Only validate conversion factor for secondary units
    if (newUnitForm.unitType !== 'basic' && newUnitForm.conversionFactor < 1) {
      formErrors.conversionFactor = 'عدد الوحدات الثانوية في الوحدة الرئيسية يجب أن يكون 1 أو أكثر';
    }
    // Validate quantity based on unit type
    if (newUnitForm.quantity < 0) {
      formErrors.quantity = 'الكمية لا يمكن أن تكون سالبة';
    }
    // For main units, require quantity > 0
    if (newUnitForm.unitType === 'basic' && newUnitForm.quantity <= 0) {
      formErrors.quantity = 'يرجى إدخال كمية أكبر من صفر للوحدة الرئيسية';
    }
    // For secondary units, allow zero (it means no additional units are added)
    // But validate that quantity doesn't exceed conversion factor (only if quantity > 0)
    if (newUnitForm.unitType !== 'basic' && newUnitForm.conversionFactor > 0 && newUnitForm.quantity > 0) {
      if (newUnitForm.quantity > newUnitForm.conversionFactor) {
        formErrors.quantity = `لا يمكن إضافة أكثر من ${newUnitForm.conversionFactor} ${newUnitForm.unitName || 'وحدة ثانوية'}. إذا كنت تريد إضافة المزيد، يرجى إضافة وحدة رئيسية كاملة أو إضافة الكمية على دفعات.`;
      }
    }
    if (newUnitForm.unitType === 'new' && newUnitForm.sellingPrice <= 0) {
      formErrors.sellingPrice = 'يرجى إدخال سعر بيع صحيح';
    }

    // If there are errors, set them and return
    if (Object.keys(formErrors).length > 0) {
      setNewUnitFormErrors(formErrors);
      return;
    }

    // Clear errors if validation passes
    setNewUnitFormErrors({});

    // Calculate quantity in main units
    let quantityInMainUnits = 0;

    if (newUnitForm.unitType === 'basic') {
      // For main unit, quantity is already in main units - enter directly
      quantityInMainUnits = newUnitForm.quantity;
    } else {
      // For sub-units, convert to main units using the conversion factor
      // conversionFactor = how many secondary units are in 1 main unit
      // Example: If 1 carton = 6 bottles, and we add 2 bottles
      // Then: 2 bottles ÷ 6 bottles per carton = 0.333 cartons
      // If quantity is 0, result is 0 (no additional units)
      // Formula: Additional main units = Additional secondary units ÷ Secondary units per main unit
      quantityInMainUnits = newUnitForm.quantity > 0 ? newUnitForm.quantity / newUnitForm.conversionFactor : 0;
    }

    // If basic unit, just update the initial quantity
    if (newUnitForm.unitType === 'basic') {
      setFormData(prev => ({
        ...prev,
        initialQuantity: prev.initialQuantity + quantityInMainUnits,
      }));
    } else {
      // Always save secondary unit, even if quantity is zero
      // This ensures the unit exists in the database for future management
      const newUnit = {
        unitName: newUnitForm.unitName,
        barcode: newUnitForm.barcode,
        sellingPrice: newUnitForm.sellingPrice,
        conversionFactor: newUnitForm.conversionFactor,
      };

      setFormData(prev => ({
        ...prev,
        units: [...prev.units, newUnit],
        // Update stock only if quantity > 0 (convert quantity to main units before adding)
        initialQuantity: newUnitForm.quantity > 0 
          ? prev.initialQuantity + quantityInMainUnits 
          : prev.initialQuantity,
        // Update wholesale price if provided (use the last unit's wholesale price)
        wholesalePrice: newUnitForm.wholesalePrice > 0 ? newUnitForm.wholesalePrice : prev.wholesalePrice,
      }));
    }

    // Reset form
    setNewUnitForm({
      unitType: 'new',
      unitName: '',
      conversionFactor: 1,
      quantity: 0,
      barcode: '',
      sellingPrice: 0,
      wholesalePrice: 0,
      costPrice: 0,
    });
    setNewUnitFormErrors({});
    setShowAddStockForm(false);
  };

  const handleAddUnit = () => {
    setFormData(prev => ({
      ...prev,
      units: [
        ...prev.units,
        {
          unitName: '',
          barcode: '',
          sellingPrice: 0,
          conversionFactor: 1,
        },
      ],
    }));
  };

  const handleRemoveUnit = (index: number) => {
    setFormData(prev => ({
      ...prev,
      units: prev.units.filter((_, i) => i !== index),
    }));
  };

  const handleUnitChange = (index: number, field: string, value: string | number) => {
    // Handle unit name selection - check if "Add Unit" option was selected
    if (field === 'unitName' && value === '__add_unit__') {
      setCurrentUnitIndex(index);
      setIsUnitModalOpen(true);
      return; // Don't update formData, just open modal
    }

    setFormData(prev => ({
      ...prev,
      units: prev.units.map((unit, i) =>
        i === index ? { ...unit, [field]: value } : unit
      ),
    }));
  };

  const handleUnitSave = async (unitDraft: { nameAr: string; description?: string }) => {
    try {
      const payload = {
        name: unitDraft.nameAr.trim(),
        description: unitDraft.description?.trim() || undefined,
      };

      console.log('Creating unit with payload:', payload);
      const response = await unitsApi.createUnit(payload);
      console.log('Unit creation response:', response);

      // The API client wraps the response, so response.data is the backend response
      const backendResponse = response.data as any;
      
      // Check if the response was successful
      if (backendResponse?.success !== false) {
        // Try different possible response structures
        let createdUnit = null;
        
        if (backendResponse?.unit) {
          createdUnit = backendResponse.unit;
        } else if (backendResponse && typeof backendResponse === 'object' && 'name' in backendResponse) {
          // Direct unit object
          createdUnit = backendResponse;
        }

        console.log('Extracted unit data:', createdUnit);

        if (createdUnit) {
          // Map backend unit to frontend format
          const unitId = createdUnit.id || createdUnit._id?.toString() || createdUnit._id;
          const unitName = createdUnit.name || createdUnit.nameAr;
          
          if (!unitId) {
            console.error('Unit ID not found in response:', createdUnit);
            throw new Error('فشل إنشاء الوحدة: لم يتم العثور على معرف الوحدة');
          }

          // Ensure we have a valid date string
          let createdAt = new Date().toISOString();
          if (createdUnit.createdAt) {
            if (typeof createdUnit.createdAt === 'string') {
              createdAt = createdUnit.createdAt;
            } else if (createdUnit.createdAt instanceof Date) {
              createdAt = createdUnit.createdAt.toISOString();
            } else if (createdUnit.createdAt.toISOString) {
              createdAt = createdUnit.createdAt.toISOString();
            }
          }

          const newUnit: Unit = {
            id: unitId.toString(),
            nameAr: unitName,
            description: createdUnit.description || '',
            createdAt: createdAt,
            updatedAt: createdUnit.updatedAt || createdAt,
          };

          console.log('Mapped new unit:', newUnit);

          // Add to units list (avoid duplicates)
          setUnits(prev => {
            // Check if unit already exists
            const exists = prev.some(u => u.id === newUnit.id);
            if (exists) {
              console.log('Unit already exists in list, updating instead');
              return prev.map(u => u.id === newUnit.id ? newUnit : u);
            }
            return [...prev, newUnit];
          });

          // Update the unit name in the form if we have a current unit index (for secondary units)
          if (currentUnitIndex !== null) {
            setFormData(prev => ({
              ...prev,
              units: prev.units.map((unit, i) =>
                i === currentUnitIndex ? { ...unit, unitName: newUnit.nameAr } : unit
              ),
            }));
          }

          // If we're adding a main unit, select it as the main unit
          if (isAddingMainUnit) {
            setFormData(prev => ({
              ...prev,
              mainUnitId: newUnit.id,
            }));
            setIsAddingMainUnit(false);
          }

          // Close modal
          setIsUnitModalOpen(false);
          setCurrentUnitIndex(null);
          
          console.log('Unit created and selected successfully');
        } else {
          console.error('Unit data not found in response. Full response:', backendResponse);
          throw new Error('فشل إنشاء الوحدة: لم يتم العثور على بيانات الوحدة في الاستجابة');
        }
      } else {
        const errorMessage = backendResponse?.message || 'فشل إنشاء الوحدة';
        console.error('Unit creation failed:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Failed to create unit', apiError);
      const errorMessage = apiError?.message || 'تعذر إنشاء الوحدة. يرجى المحاولة مرة أخرى.';
      window.alert(errorMessage);
      throw error;
    }
  };

  const handleAddWarehouseDistribution = () => {
    setFormData(prev => ({
      ...prev,
      multiWarehouseDistribution: [
        ...prev.multiWarehouseDistribution,
        { warehouseId: '', quantity: 0 },
      ],
    }));
  };

  const handleRemoveWarehouseDistribution = (index: number) => {
    setFormData(prev => ({
      ...prev,
      multiWarehouseDistribution: prev.multiWarehouseDistribution.filter((_, i) => i !== index),
    }));
  };

  const handleWarehouseDistributionChange = (
    index: number,
    field: string,
    value: string | number
  ) => {
    setFormData(prev => ({
      ...prev,
      multiWarehouseDistribution: prev.multiWarehouseDistribution.map((dist, i) =>
        i === index ? { ...dist, [field]: value } : dist
      ),
    }));
  };

  const generateBarcode = () => {
    const barcode = `PRD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setFormData(prev => ({ ...prev, primaryBarcode: barcode }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'اسم المنتج مطلوب';
    }
    if (!formData.primaryBarcode.trim()) {
      newErrors.primaryBarcode = 'الباركود الأساسي مطلوب';
    }
    if (!formData.mainUnitId) {
      newErrors.mainUnitId = 'يجب اختيار الوحدة الرئيسية';
    }
    if (formData.costPrice <= 0) {
      newErrors.costPrice = 'سعر التكلفة يجب أن يكون أكبر من صفر';
    }
    if (formData.retailSellingPrice <= 0) {
      newErrors.retailSellingPrice = 'سعر البيع يجب أن يكون أكبر من صفر';
    }
    // Warehouse selection is optional
    if (!formData.categoryId) {
      newErrors.categoryId = 'يجب اختيار فئة';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare product data for API
      // Ensure numeric fields are properly converted to numbers
      const costPrice = parseFloat(String(formData.costPrice)) || 0;
      const price = parseFloat(String(formData.retailSellingPrice)) || 0;
      const stock = parseInt(String(formData.initialQuantity)) || 0;
      
      // Ensure barcode is trimmed and not empty
      const barcode = formData.primaryBarcode?.trim() || '';
      
      if (!barcode) {
        alert('يجب إدخال الباركود');
        setIsSubmitting(false);
        return;
      }

      const productPayload: any = {
        name: formData.name.trim(),
        barcode: barcode,
        costPrice: costPrice,
        price: price,
        stock: stock,
      };

      // Add optional fields only if they have values
      if (formData.warehouseId) productPayload.warehouseId = formData.warehouseId.trim();
      if (formData.categoryId) productPayload.categoryId = formData.categoryId.trim();
      if (formData.mainUnitId) productPayload.mainUnitId = formData.mainUnitId.trim();
      if (formData.brandId) productPayload.brandId = formData.brandId.trim();
      if (formData.description?.trim()) productPayload.description = formData.description.trim();
      if (formData.lowStockAlert !== undefined) productPayload.lowStockAlert = parseInt(String(formData.lowStockAlert)) || 10;
      if (formData.internalSKU?.trim()) productPayload.internalSKU = formData.internalSKU.trim();
      if (formData.vatPercentage !== undefined) productPayload.vatPercentage = parseFloat(String(formData.vatPercentage)) || 0;
      if (formData.vatInclusive !== undefined) productPayload.vatInclusive = Boolean(formData.vatInclusive);
      if (formData.productionDate) productPayload.productionDate = formData.productionDate;
      if (formData.expiryDate) productPayload.expiryDate = formData.expiryDate;
      if (formData.batchNumber?.trim()) productPayload.batchNumber = formData.batchNumber.trim();
      if (formData.discountRules?.enabled) productPayload.discountRules = formData.discountRules;
      if (formData.status) productPayload.status = formData.status;
      if (formData.wholesalePrice > 0) productPayload.wholesalePrice = parseFloat(String(formData.wholesalePrice));
      if (formData.units && formData.units.length > 0) productPayload.units = formData.units;
      if (formData.multiWarehouseDistribution && formData.multiWarehouseDistribution.length > 0) {
        productPayload.multiWarehouseDistribution = formData.multiWarehouseDistribution;
      }
      if (formData.showInQuickProducts !== undefined) productPayload.showInQuickProducts = Boolean(formData.showInQuickProducts);

      // Debug: Log the payload being sent
      console.log('Product payload being sent:', JSON.stringify(productPayload, null, 2));

      // Create or update product
      let response;
      if (isEditMode && id) {
        response = await productsApi.updateProduct(id, productPayload);
      } else {
        response = await productsApi.createProduct(productPayload);
      }

      if (response.success) {
        // Get the product data from response
        const productData = (response.data as any)?.data?.product || 
                          (response.data as any)?.product;
        
        // Sync the product to IndexedDB immediately
        if (productData) {
          try {
            await productSync.syncAfterCreateOrUpdate(productData);
            console.log('[AddProductPage] Successfully synced product to IndexedDB');
          } catch (syncError) {
            console.error('[AddProductPage] Error syncing product to IndexedDB:', syncError);
            // Continue anyway - the product was created/updated successfully
          }
        }
        
        // Invalidate products cache to ensure fresh data on next load (backup)
        const storeId = getStoreIdFromToken();
        if (storeId) {
          invalidateProductsCache(storeId);
        }
        
        // Handle image uploads if any
        if (formData.images.length > 0) {
          // TODO: Implement image upload endpoint
          console.log('Images to upload:', formData.images);
        }

        alert(isEditMode ? 'تم تحديث المنتج بنجاح!' : 'تم إنشاء المنتج بنجاح!');
        navigate('/products');
      } else {
        // Extract error message from response
        let errorMessage = response.message || 'خطأ غير معروف';
        
        // If response has errors array (validation errors), format them
        if ((response as any).errors && Array.isArray((response as any).errors)) {
          const errorMessages = (response as any).errors.map((err: any) => err.msg || err.message || err).join('\n');
          errorMessage = errorMessages || errorMessage;
        }
        
        alert(
          (isEditMode ? 'فشل تحديث المنتج: ' : 'فشل إنشاء المنتج: ') + errorMessage
        );
      }
    } catch (error: any) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} product:`, error);
      
      // Extract error message from error object
      // The ApiClient interceptor wraps errors, so check both error.details and error.response
      let errorMessage = 'خطأ غير معروف';
      
      // Check if error has details (from ApiClient interceptor)
      if (error.details) {
        const errorData = error.details;
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.errors && Array.isArray(errorData.errors)) {
          errorMessage = errorData.errors.map((err: any) => err.msg || err.message || String(err)).join('\n');
        }
      }
      // Check if error has response.data (direct axios error)
      else if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.errors && Array.isArray(errorData.errors)) {
          errorMessage = errorData.errors.map((err: any) => err.msg || err.message || String(err)).join('\n');
        }
      }
      // Fallback to error.message
      else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(
        `حدث خطأ أثناء ${isEditMode ? 'تحديث' : 'إنشاء'} المنتج:\n${errorMessage}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while fetching data (dropdowns and product if editing)
  if (loading || (isEditMode && !productLoaded)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600 dark:text-gray-400">{AR_LABELS.loading}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {isEditMode ? 'تعديل المنتج' : AR_LABELS.addNewProduct}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {isEditMode
            ? 'تعديل معلومات المنتج المحدد'
            : AR_LABELS.productListingDescription}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Layout: 50/50 split on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side: Basic Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-200 mb-4 border-b pb-2 border-gray-200 dark:border-gray-700">
              {AR_LABELS.basicInformation}
            </h2>

            <div className="space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {AR_LABELS.productName} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    errors.name
                      ? 'border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200`}
                  placeholder="أدخل اسم المنتج"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                )}
              </div>

              {/* Primary Barcode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {AR_LABELS.barcode} <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="primaryBarcode"
                    value={formData.primaryBarcode}
                    onChange={handleInputChange}
                    className={`flex-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      errors.primaryBarcode
                        ? 'border-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200`}
                    placeholder="أدخل الباركود"
                  />
                  <button
                    type="button"
                    onClick={generateBarcode}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
                    title={AR_LABELS.generateBarcode}
                  >
                    <GenerateBarcodeIcon />
                  </button>
                </div>
                {errors.primaryBarcode && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.primaryBarcode}
                  </p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {AR_LABELS.categoryName} <span className="text-red-500">*</span>
                </label>
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    errors.categoryId
                      ? 'border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200`}
                >
                  <option value="">اختر فئة</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.nameAr || category.name}
                    </option>
                  ))}
                  <option value="__add_category__" className="text-orange-600 font-semibold">
                    + إضافة فئة جديدة
                  </option>
                </select>
                {errors.categoryId && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.categoryId}
                  </p>
                )}
              </div>

              {/* Cost Price, Selling Price, and Wholesale Selling Price - Same Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Cost Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    سعر التكلفة <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="costPrice"
                    value={formData.costPrice}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      errors.costPrice
                        ? 'border-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200`}
                    placeholder="0.00"
                  />
                  {errors.costPrice && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.costPrice}</p>
                  )}
                </div>

                {/* Retail Selling Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    سعر البيع بالتجزئة <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="retailSellingPrice"
                    value={formData.retailSellingPrice}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      errors.retailSellingPrice
                        ? 'border-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200`}
                    placeholder="0.00"
                  />
                  {errors.retailSellingPrice && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.retailSellingPrice}
                    </p>
                  )}
                </div>

                {/* Wholesale Selling Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    سعر البيع بالجملة
                  </label>
                  <input
                    type="number"
                    name="wholesalePrice"
                    value={formData.wholesalePrice}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      errors.wholesalePrice
                        ? 'border-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200`}
                    placeholder="0.00"
                  />
                  {errors.wholesalePrice && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.wholesalePrice}
                    </p>
                  )}
                </div>
              </div>

              {/* Main Unit Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  الوحدة الرئيسية <span className="text-red-500">*</span>
                </label>
                <select
                  name="mainUnitId"
                  value={formData.mainUnitId}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    errors.mainUnitId
                      ? 'border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200`}
                >
                  <option value="">اختر الوحدة الرئيسية</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.nameAr}
                    </option>
                  ))}
                  <option value="__add_unit__" className="text-orange-600 font-semibold">
                    + إضافة وحدة جديدة
                  </option>
                </select>
                {errors.mainUnitId && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.mainUnitId}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  اختر الوحدة الرئيسية للمنتج (مثل: صندوق، زجاجة، علبة). جميع الحسابات والوحدات الثانوية ستكون مرتبطة بهذه الوحدة.
                </p>
              </div>

              {/* Initial Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  الكمية 
                </label>
                <input
                  type="number"
                  name="initialQuantity"
                  value={formData.initialQuantity}
                  onChange={handleInputChange}
                  min="0"
                  step="1"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    errors.initialQuantity
                      ? 'border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200`}
                  placeholder="0"
                />
                {errors.initialQuantity && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.initialQuantity}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  يمكنك إدخال الكمية الأولية يدوياً أو تحديثها عند إضافة المخزون
                </p>
              </div>

              {/* Warehouse Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  المستودع (اختياري)
                </label>
                <select
                  name="warehouseId"
                  value={formData.warehouseId}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    errors.warehouseId
                      ? 'border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200`}
                >
                  <option value="">اختر مستودع</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.nameAr || warehouse.name}
                    </option>
                  ))}
                </select>
                {errors.warehouseId && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.warehouseId}
                  </p>
                )}
              </div>

              {/* Add Stock Button - Shows after basic info is filled */}
              {formData.name && formData.categoryId && formData.costPrice > 0 && formData.retailSellingPrice > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowUnitSelection(true)}
                    className="w-full px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-md shadow-sm font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <PlusIcon className="w-5 h-5" />
                    إضافة وحدات
                  </button>
                </div>
              )}

              {/* Unit Selection Modal - First step before Add Stock */}
              {showUnitSelection && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-200">
                        اختر الوحدة
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setShowUnitSelection(false);
                          setSelectedUnitForStock('');
                        }}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          اختر الوحدة لإضافة المخزون <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={selectedUnitForStock}
                          onChange={(e) => setSelectedUnitForStock(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                        >
                          <option value="">اختر وحدة</option>
                          {formData.mainUnitId && (() => {
                            const mainUnit = units.find(u => u.id === formData.mainUnitId);
                            return mainUnit ? (
                              <option value="main">{mainUnit.nameAr}</option>
                            ) : null;
                          })()}
                          {units.filter(unit => unit.id !== formData.mainUnitId).map((unit) => (
                            <option key={unit.id} value={unit.id}>
                              {unit.nameAr}
                            </option>
                          ))}
                          <option value="new">إضافة وحدة جديدة</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          اختر الوحدة التي تريد إضافة المخزون لها
                        </p>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedUnitForStock) {
                              alert('يرجى اختيار وحدة أولاً');
                              return;
                            }
                            // Set the unit type and name based on selection
                            if (selectedUnitForStock === 'main') {
                              // Selected the main unit
                              const mainUnit = units.find(u => u.id === formData.mainUnitId);
                              setNewUnitForm(prev => ({
                                ...prev,
                                unitType: 'basic',
                                unitName: mainUnit?.nameAr || '',
                                conversionFactor: 1,
                                quantity: 0,
                                barcode: '',
                                sellingPrice: 0,
                                wholesalePrice: 0,
                                costPrice: formData.costPrice, // Use main unit cost price
                              }));
                            } else if (selectedUnitForStock === 'new') {
                              setNewUnitForm(prev => ({
                                ...prev,
                                unitType: 'new',
                                unitName: '',
                                conversionFactor: 1,
                                quantity: 0,
                                barcode: '',
                                sellingPrice: 0,
                                wholesalePrice: 0,
                                costPrice: 0,
                              }));
                            } else {
                              // Selected an existing unit from the store by ID
                              const selectedUnit = units.find(u => u.id === selectedUnitForStock);
                              if (selectedUnit) {
                                const unitName = selectedUnit.nameAr;
                                // Check if this unit already exists in formData.units
                                const existingUnit = formData.units.find(u => u.unitName === unitName);
                                if (existingUnit) {
                                  // Unit already exists in product, use its data
                                  setNewUnitForm(prev => ({
                                    ...prev,
                                    unitType: 'new',
                                    unitName: unitName,
                                    conversionFactor: existingUnit.conversionFactor || 1,
                                    barcode: existingUnit.barcode || '',
                                    sellingPrice: existingUnit.sellingPrice || 0,
                                    quantity: 0,
                                    wholesalePrice: 0,
                                    costPrice: calculateUnitCostPrice(existingUnit.conversionFactor || 1, 'new'),
                                  }));
                                } else {
                                  // New unit from store units list, but not yet added to product
                                  setNewUnitForm(prev => ({
                                    ...prev,
                                    unitType: 'new',
                                    unitName: unitName,
                                    conversionFactor: 1, // Will be asked in the form
                                    quantity: 0,
                                    barcode: '',
                                    sellingPrice: 0,
                                    wholesalePrice: 0,
                                    costPrice: 0,
                                  }));
                                }
                              }
                            }
                            setShowUnitSelection(false);
                            setShowAddStockForm(true);
                          }}
                          className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md font-medium transition-colors"
                        >
                          التالي
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowUnitSelection(false);
                            setSelectedUnitForStock('');
                          }}
                          className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md font-medium transition-colors"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Add Stock Form Modal */}
              {showAddStockForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-200">
                        إضافة مخزون
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddStockForm(false);
                          setShowUnitSelection(false);
                          setSelectedUnitForStock('');
                          setNewUnitForm({
                            unitType: 'basic',
                            unitName: '',
                            conversionFactor: 1,
                            quantity: 0,
                            barcode: '',
                            sellingPrice: 0,
                            wholesalePrice: 0,
                            costPrice: 0,
                          });
                          setNewUnitFormErrors({});
                        }}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* Selected Unit Display (Read-only) */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 border-r-4 border-blue-400 text-blue-700 dark:text-blue-300 p-3 rounded-md">
                        <p className="text-sm font-medium">
                          الوحدة المختارة: <span className="font-bold">
                            {newUnitForm.unitType === 'basic' 
                              ? (() => {
                                  const mainUnit = units.find(u => u.id === formData.mainUnitId);
                                  return mainUnit ? mainUnit.nameAr : 'الوحدة الرئيسية';
                                })()
                              : newUnitForm.unitName || 'وحدة جديدة'
                            }
                          </span>
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddStockForm(false);
                            setShowUnitSelection(true);
                            setSelectedUnitForStock('');
                          }}
                          className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          تغيير الوحدة
                        </button>
                      </div>

                      {/* Unit Name - Only show for new units that need a name, hide for basic and existing units */}
                      {newUnitForm.unitType === 'new' && !newUnitForm.unitName && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            اسم الوحدة <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={newUnitForm.unitName}
                            onChange={(e) => {
                              handleNewUnitFormChange('unitName', e.target.value);
                              // Clear unit name error when user starts typing
                              if (newUnitFormErrors.unitName) {
                                setNewUnitFormErrors(prev => {
                                  const newErrors = { ...prev };
                                  delete newErrors.unitName;
                                  return newErrors;
                                });
                              }
                            }}
                            placeholder="مثال: كرتون، صندوق، علبة"
                            className={`w-full px-3 py-2 border ${
                              newUnitFormErrors.unitName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                            } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200`}
                          />
                          {newUnitFormErrors.unitName && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{newUnitFormErrors.unitName}</p>
                          )}
                        </div>
                      )}

                      {/* Conversion Factor - Only show for secondary units */}
                      {newUnitForm.unitType !== 'basic' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            كم {newUnitForm.unitName || 'وحدة ثانوية'} في الوحدة الرئيسية الواحدة؟ <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={newUnitForm.conversionFactor}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 1;
                              handleNewUnitFormChange('conversionFactor', value);
                              // Clear conversion factor error when user starts typing
                              if (newUnitFormErrors.conversionFactor) {
                                setNewUnitFormErrors(prev => {
                                  const newErrors = { ...prev };
                                  delete newErrors.conversionFactor;
                                  return newErrors;
                                });
                              }
                              // Also clear quantity error and reset quantity if it exceeds new conversion factor
                              if (newUnitForm.quantity > value) {
                                handleNewUnitFormChange('quantity', 0);
                                if (newUnitFormErrors.quantity) {
                                  setNewUnitFormErrors(prev => {
                                    const newErrors = { ...prev };
                                    delete newErrors.quantity;
                                    return newErrors;
                                  });
                                }
                              }
                            }}
                            min="1"
                            step="1"
                            className={`w-full px-3 py-2 border ${
                              newUnitFormErrors.conversionFactor ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                            } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200`}
                            placeholder="مثال: 12"
                            required
                          />
                          {newUnitFormErrors.conversionFactor && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{newUnitFormErrors.conversionFactor}</p>
                          )}
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            مثال: إذا كان 1 وحدة رئيسية = 12 {newUnitForm.unitName || 'وحدة ثانوية'}، أدخل 12
                          </p>
                        </div>
                      )}

                      {/* Quantity */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {newUnitForm.unitType === 'basic' 
                            ? 'الكمية (وحدات رئيسية)' 
                            : `الكمية (${newUnitForm.unitName || 'وحدة'})`} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={newUnitForm.quantity}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            handleNewUnitFormChange('quantity', value);
                            // Clear quantity error when user starts typing
                            if (newUnitFormErrors.quantity) {
                              setNewUnitFormErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.quantity;
                                return newErrors;
                              });
                            }
                          }}
                          max={newUnitForm.unitType !== 'basic' && newUnitForm.conversionFactor > 0 ? newUnitForm.conversionFactor : undefined}
                          min="0"
                          step="1"
                          className={`w-full px-3 py-2 border ${
                            newUnitFormErrors.quantity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                          } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200`}
                          placeholder={newUnitForm.unitType === 'basic' ? "مثال: 100" : `مثال: 1-${newUnitForm.conversionFactor || ''}`}
                          required
                        />
                        {newUnitFormErrors.quantity && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{newUnitFormErrors.quantity}</p>
                        )}
                        {newUnitForm.unitType !== 'basic' && newUnitForm.conversionFactor > 0 && !newUnitFormErrors.quantity && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            الحد الأقصى: {newUnitForm.conversionFactor} {newUnitForm.unitName || 'وحدة ثانوية'} (عدد الوحدات الثانوية في الوحدة الرئيسية الواحدة)
                          </p>
                        )}
                        {newUnitForm.quantity >= 0 && (
                          <p className="mt-2 text-sm text-orange-600 dark:text-orange-400 font-medium">
                            {newUnitForm.quantity === 0 ? (
                              <span className="text-gray-500 dark:text-gray-400">لا سيتم إضافة أي وحدات (الكمية = 0)</span>
                            ) : (
                              <>
                                سيتم إضافة: {(() => {
                                  if (newUnitForm.unitType === 'basic') {
                                    return `${newUnitForm.quantity} وحدة رئيسية`;
                                  } else {
                                    // For sub-units: conversionFactor = how many secondary units are in 1 main unit
                                    // Formula: Additional main units = Additional secondary units ÷ Secondary units per main unit
                                    // Example: If 1 carton = 6 bottles, and we add 2 bottles
                                    // Then: 2 bottles ÷ 6 bottles per carton = 0.333 cartons
                                    const totalMainUnits = newUnitForm.quantity / newUnitForm.conversionFactor;
                                    return `${totalMainUnits.toFixed(3)} وحدة رئيسية (${newUnitForm.quantity} ${newUnitForm.unitName || 'وحدة'} ÷ ${newUnitForm.conversionFactor})`;
                                  }
                                })()}
                              </>
                            )}
                          </p>
                        )}
                        {newUnitForm.unitType === 'basic' && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            أدخل الكمية مباشرة بالوحدات الرئيسية
                          </p>
                        )}
                      </div>

                      {/* Barcode - Only show for sub-units, not for main unit */}
                      {newUnitForm.unitType !== 'basic' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            الباركود
                          </label>
                          <input
                            type="text"
                            value={newUnitForm.barcode}
                            onChange={(e) => handleNewUnitFormChange('barcode', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                            placeholder="مثال: 1234"
                          />
                        </div>
                      )}

                      {/* Cost Price (Auto-calculated) */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          سعر التكلفة (محسوب تلقائياً)
                        </label>
                        <input
                          type="number"
                          value={newUnitForm.costPrice.toFixed(2)}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {newUnitForm.unitType === 'basic'
                            ? `سعر التكلفة للوحدة الرئيسية`
                            : `= سعر الوحدة الرئيسية (${formData.costPrice.toFixed(2)} ر.س) ÷ ${newUnitForm.conversionFactor} ${newUnitForm.unitName || 'وحدة'} = ${newUnitForm.costPrice.toFixed(2)} ر.س`}
                        </p>
                      </div>

                      {/* Selling Price */}
                      {newUnitForm.unitType === 'new' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            سعر البيع <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={newUnitForm.sellingPrice}
                            onChange={(e) => {
                              handleNewUnitFormChange('sellingPrice', parseFloat(e.target.value) || 0);
                              // Clear selling price error when user starts typing
                              if (newUnitFormErrors.sellingPrice) {
                                setNewUnitFormErrors(prev => {
                                  const newErrors = { ...prev };
                                  delete newErrors.sellingPrice;
                                  return newErrors;
                                });
                              }
                            }}
                            step="0.01"
                            min="0"
                            className={`w-full px-3 py-2 border ${
                              newUnitFormErrors.sellingPrice ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                            } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200`}
                            placeholder="0.00"
                          />
                          {newUnitFormErrors.sellingPrice && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{newUnitFormErrors.sellingPrice}</p>
                          )}
                        </div>
                      )}

                      {/* Optional Wholesale Price */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          سعر الجملة (اختياري)
                        </label>
                        <input
                          type="number"
                          value={newUnitForm.wholesalePrice}
                          onChange={(e) => handleNewUnitFormChange('wholesalePrice', parseFloat(e.target.value) || 0)}
                          step="0.01"
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                          placeholder="0.00"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-4">
                        <button
                          type="button"
                          onClick={handleAddStockUnit}
                          className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md font-medium transition-colors"
                        >
                          إضافة
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddStockForm(false);
                            setShowUnitSelection(false);
                            setSelectedUnitForStock('');
                            setNewUnitForm({
                              unitType: 'basic',
                              unitName: '',
                              conversionFactor: 1,
                              quantity: 0,
                              barcode: '',
                              sellingPrice: 0,
                              wholesalePrice: 0,
                              costPrice: 0,
                            });
                            setNewUnitFormErrors({});
                          }}
                          className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md font-medium transition-colors"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Advanced Options */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="w-full flex items-center justify-between text-xl font-semibold text-gray-900 dark:text-gray-200 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700 hover:text-orange-500 transition-colors"
            >
              <span>خيارات متقدمة</span>
              <ChevronDownIcon
                className={`w-5 h-5 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isAdvancedOpen && (
              <div className="space-y-6">
                {/* Brand Selection/Creation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {AR_LABELS.brandName}
                  </label>
                  <select
                    name="brandId"
                    value={formData.brandId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                  >
                    <option value="">اختر علامة تجارية</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.nameAr || brand.name}
                      </option>
                    ))}
                    <option value="__add_brand__" className="text-orange-600 font-semibold">
                      + إضافة علامة تجارية جديدة
                    </option>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {AR_LABELS.description}
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                    placeholder="أدخل وصف المنتج"
                  />
                </div>

                {/* Wholesale Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    سعر الجملة
                  </label>
                  <input
                    type="number"
                    name="wholesalePrice"
                    value={formData.wholesalePrice}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                    placeholder="0.00"
                  />
                </div>

                {/* Multi-Warehouse Distribution */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    توزيع متعدد المستودعات
                  </label>
                  {formData.multiWarehouseDistribution.map((dist, index) => (
                    <div key={index} className="mb-3 p-3 border border-gray-200 dark:border-gray-700 rounded-md space-y-2">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          توزيع {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveWarehouseDistribution(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <MinusIcon />
                        </button>
                      </div>
                      <select
                        value={dist.warehouseId}
                        onChange={(e) =>
                          handleWarehouseDistributionChange(index, 'warehouseId', e.target.value)
                        }
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                      >
                        <option value="">اختر مستودع</option>
                        {warehouses.map((warehouse) => (
                          <option key={warehouse.id} value={warehouse.id}>
                            {warehouse.nameAr || warehouse.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="الكمية"
                        value={dist.quantity}
                        onChange={(e) =>
                          handleWarehouseDistributionChange(
                            index,
                            'quantity',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        min="0"
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddWarehouseDistribution}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center gap-2"
                  >
                    <PlusIcon className="w-4 h-4" />
                    إضافة توزيع مستودع
                  </button>
                </div>

                {/* Product Images */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    صور المنتج
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                  />
                  {formData.images.length > 0 && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {formData.images.length} صورة محددة
                    </p>
                  )}
                </div>

                {/* Low Stock Alert */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    تنبيه المخزون المنخفض
                  </label>
                  <input
                    type="number"
                    name="lowStockAlert"
                    value={formData.lowStockAlert}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                    placeholder="10"
                  />
                </div>

                {/* Internal SKU */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    SKU الداخلي
                  </label>
                  <input
                    type="text"
                    name="internalSKU"
                    value={formData.internalSKU}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                    placeholder="SKU-001"
                  />
                </div>

                {/* VAT */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ضريبة القيمة المضافة (VAT)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      name="vatPercentage"
                      value={formData.vatPercentage}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      max="100"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                      placeholder="0.00"
                    />
                    <span className="flex items-center px-3 text-gray-600 dark:text-gray-400">%</span>
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="vatInclusive"
                      checked={formData.vatInclusive}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 dark:border-gray-600 text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      السعر شامل الضريبة
                    </span>
                  </label>
                </div>

                {/* Date Tracking */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    تتبع التواريخ
                  </label>
                  <input
                    type="date"
                    name="productionDate"
                    value={formData.productionDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                    placeholder="تاريخ الإنتاج"
                  />
                  <input
                    type="date"
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                    placeholder="تاريخ الانتهاء"
                  />
                  <input
                    type="text"
                    name="batchNumber"
                    value={formData.batchNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                    placeholder="رقم الدفعة"
                  />
                </div>

                {/* Discount Rules */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="discountRules.enabled"
                      checked={formData.discountRules.enabled}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 dark:border-gray-600 text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      تفعيل قواعد الخصم
                    </span>
                  </label>
                  {formData.discountRules.enabled && (
                    <div className="space-y-2 pl-6">
                      <input
                        type="number"
                        name="discountRules.percentage"
                        value={formData.discountRules.percentage}
                        onChange={handleInputChange}
                        step="0.01"
                        min="0"
                        max="100"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                        placeholder="نسبة الخصم (%)"
                      />
                      <input
                        type="number"
                        name="discountRules.minQuantity"
                        value={formData.discountRules.minQuantity || ''}
                        onChange={handleInputChange}
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                        placeholder="الحد الأدنى للكمية (اختياري)"
                      />
                    </div>
                  )}
                </div>

                {/* Show in Quick Products */}
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="showInQuickProducts"
                      checked={formData.showInQuickProducts}
                      onChange={(e) => setFormData(prev => ({ ...prev, showInQuickProducts: e.target.checked }))}
                      className="rounded border-gray-300 dark:border-gray-600 text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      عرض في المنتجات السريعة (نقطة البيع)
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mr-6">
                    عند التفعيل، سيظهر هذا المنتج في قسم المنتجات السريعة في صفحة نقطة البيع
                  </p>
                </div>

                {/* Product Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    حالة المنتج
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                  >
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                    <option value="hidden">مخفي من نقطة البيع</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            {AR_LABELS.cancel}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? AR_LABELS.loading : AR_LABELS.save}
          </button>
        </div>
      </form>

      {/* Brand Form Modal - Outside form to avoid nested form error */}
      <BrandFormModal
        isOpen={isBrandModalOpen}
        onClose={() => {
          setIsBrandModalOpen(false);
          // Reset brandId if it was set to the add brand option
          if (formData.brandId === '__add_brand__') {
            setFormData(prev => ({ ...prev, brandId: '' }));
          }
        }}
        onSave={handleBrandSave}
        brandToEdit={null}
        emptyBrand={{
          nameAr: '',
          description: '',
          status: 'Active'
        }}
      />

      {/* Unit Form Modal - Outside form to avoid nested form error */}
      <UnitFormModal
        isOpen={isUnitModalOpen}
        onClose={() => {
          setIsUnitModalOpen(false);
          setCurrentUnitIndex(null);
          setIsAddingMainUnit(false);
          // Reset unitName if it was set to the add unit option (for secondary units)
          if (currentUnitIndex !== null) {
            setFormData(prev => ({
              ...prev,
              units: prev.units.map((unit, i) =>
                i === currentUnitIndex && unit.unitName === '__add_unit__'
                  ? { ...unit, unitName: '' }
                  : unit
              ),
            }));
          }
          // Reset mainUnitId if it was set to the add unit option
          if (formData.mainUnitId === '__add_unit__') {
            setFormData(prev => ({ ...prev, mainUnitId: '' }));
          }
        }}
        onSave={handleUnitSave}
        unitToEdit={null}
        emptyUnit={{
          nameAr: '',
          description: ''
        }}
      />

      {/* Category Form Modal - Outside form to avoid nested form error */}
      <CategoryFormModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          // Reset categoryId if it was set to the add category option
          if (formData.categoryId === '__add_category__') {
            setFormData(prev => ({ ...prev, categoryId: '' }));
          }
        }}
        onSave={handleCategorySave}
        categoryToEdit={null}
        allCategories={categories}
      />
    </div>
  );
};

export default AddProductPage;

