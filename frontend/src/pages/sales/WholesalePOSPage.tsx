import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Customer, WholesaleInvoice, WholesalePOSCartItem } from '@/features/sales/types/pos.types';
import { WholesaleProduct, WholesaleProductUnit } from '@/features/products/types/product.types';
import { AR_LABELS, UUID, SearchIcon, DeleteIcon, PlusIcon, CancelIcon, PrintIcon, CheckCircleIcon } from '@/shared/constants';
import CustomDropdown from '@/shared/components/ui/CustomDropdown/CustomDropdown';
import { useAuthStore } from '@/app/store';
import { loadSettings, saveSettings } from '@/shared/utils/settingsStorage';
import { printReceipt } from '@/shared/utils/printUtils';
import { useCurrency } from '@/shared/contexts/CurrencyContext';
import { storeSettingsApi } from '@/lib/api/client';

// --- MOCK DATA ---
const MOCK_WHOLESALE_PRODUCTS: WholesaleProduct[] = [
  { id: 1, name: 'كوكا كولا', category: 'مشروبات', brand: 'كوكا كولا', createdAt: '2023-01-15', imageUrl: 'https://picsum.photos/seed/coke/200/200', units: [
    { name: 'حبة', price: 2.50, cost: 1.50, stock: 500, barcode: 'COKE-P' },
    { name: 'كرتون (24 حبة)', price: 55.00, cost: 36.00, stock: 20, barcode: 'COKE-C24' },
  ]},
  { id: 2, name: 'ماء (صغير)', category: 'مشروبات', brand: 'نستله', createdAt: '2023-02-20', imageUrl: 'https://picsum.photos/seed/water/200/200', units: [
    { name: 'حبة', price: 1.00, cost: 0.50, stock: 1000, barcode: 'WATER-P' },
    { name: 'كرتون (40 حبة)', price: 35.00, cost: 20.00, stock: 25, barcode: 'WATER-C40' },
  ]},
  { id: 3, name: 'ليز بالملح', category: 'وجبات خفيفة', brand: 'ليز', createdAt: '2023-03-10', imageUrl: 'https://picsum.photos/seed/lays/200/200', units: [
    { name: 'حبة', price: 3.00, cost: 1.80, stock: 300, barcode: 'LAYS-P' },
    { name: 'صندوق (12 حبة)', price: 33.00, cost: 21.60, stock: 25, barcode: 'LAYS-B12' },
  ]},
  { id: 4, name: 'هاتف Samsung S23', category: 'إلكترونيات', brand: 'سامسونج', createdAt: '2023-04-01', imageUrl: 'https://picsum.photos/seed/samsung/200/200', units: [
    { name: 'جهاز', price: 850, cost: 700, stock: 50, barcode: 'SAM-S23' },
  ]},
  { id: 5, name: 'بيبسي', category: 'مشروبات', brand: 'بيبسي', createdAt: '2023-01-20', imageUrl: 'https://picsum.photos/seed/pepsi/200/200', units: [
    { name: 'حبة', price: 2.50, cost: 1.50, stock: 450, barcode: 'PEPSI-P' },
    { name: 'كرتون (24 حبة)', price: 54.00, cost: 35.00, stock: 18, barcode: 'PEPSI-C24' },
  ]},
  { id: 6, name: 'شيبس دوريتوس', category: 'وجبات خفيفة', brand: 'دوريتوس', createdAt: '2023-03-15', imageUrl: 'https://picsum.photos/seed/doritos/200/200', units: [
    { name: 'حبة', price: 3.50, cost: 2.00, stock: 280, barcode: 'DOR-P' },
    { name: 'صندوق (20 حبة)', price: 65.00, cost: 40.00, stock: 12, barcode: 'DOR-B20' },
  ]},
  { id: 7, name: 'شوكولاتة كيت كات', category: 'حلويات', brand: 'نستله', createdAt: '2023-02-10', imageUrl: 'https://picsum.photos/seed/kitkat/200/200', units: [
    { name: 'قطعة', price: 1.50, cost: 0.80, stock: 600, barcode: 'KIT-P' },
    { name: 'صندوق (48 قطعة)', price: 68.00, cost: 38.40, stock: 30, barcode: 'KIT-B48' },
  ]},
  { id: 8, name: 'أرز بسمتي', category: 'مواد غذائية', brand: 'عزيز', createdAt: '2023-01-05', imageUrl: 'https://picsum.photos/seed/rice/200/200', units: [
    { name: 'كيس (5 كجم)', price: 25.00, cost: 18.00, stock: 150, barcode: 'RICE-5KG' },
    { name: 'كيس (10 كجم)', price: 45.00, cost: 32.00, stock: 80, barcode: 'RICE-10KG' },
  ]},
  { id: 9, name: 'زيت عباد الشمس', category: 'مواد غذائية', brand: 'الزيت الذهبي', createdAt: '2023-02-25', imageUrl: 'https://picsum.photos/seed/oil/200/200', units: [
    { name: 'زجاجة (1 لتر)', price: 12.00, cost: 8.50, stock: 200, barcode: 'OIL-1L' },
    { name: 'كرتون (12 زجاجة)', price: 138.00, cost: 102.00, stock: 15, barcode: 'OIL-C12' },
  ]},
  { id: 10, name: 'سكر أبيض', category: 'مواد غذائية', brand: 'السكر الأبيض', createdAt: '2023-01-30', imageUrl: 'https://picsum.photos/seed/sugar/200/200', units: [
    { name: 'كيس (1 كجم)', price: 4.50, cost: 3.20, stock: 300, barcode: 'SUGAR-1KG' },
    { name: 'كيس (5 كجم)', price: 20.00, cost: 14.50, stock: 100, barcode: 'SUGAR-5KG' },
  ]},
  { id: 11, name: 'معكرونة سباجيتي', category: 'مواد غذائية', brand: 'الغذاء الصحي', createdAt: '2023-03-01', imageUrl: 'https://picsum.photos/seed/pasta/200/200', units: [
    { name: 'كيس (500 جم)', price: 3.00, cost: 2.00, stock: 250, barcode: 'PASTA-500' },
    { name: 'كرتون (12 كيس)', price: 34.00, cost: 22.00, stock: 20, barcode: 'PASTA-C12' },
  ]},
  { id: 12, name: 'حليب طويل الأجل', category: 'ألبان', brand: 'ألبان', createdAt: '2023-02-15', imageUrl: 'https://picsum.photos/seed/milk/200/200', units: [
    { name: 'علبة (1 لتر)', price: 6.50, cost: 4.50, stock: 180, barcode: 'MILK-1L' },
    { name: 'كرتون (12 علبة)', price: 75.00, cost: 52.00, stock: 25, barcode: 'MILK-C12' },
  ]},
  { id: 13, name: 'خبز توست', category: 'مواد غذائية', brand: 'الخبز الطازج', createdAt: '2023-03-20', imageUrl: 'https://picsum.photos/seed/bread/200/200', units: [
    { name: 'رغيف', price: 2.00, cost: 1.20, stock: 400, barcode: 'BREAD-P' },
    { name: 'صندوق (20 رغيف)', price: 38.00, cost: 22.00, stock: 30, barcode: 'BREAD-B20' },
  ]},
  { id: 14, name: 'قهوة نسكافيه', category: 'مشروبات', brand: 'نستله', createdAt: '2023-01-25', imageUrl: 'https://picsum.photos/seed/coffee/200/200', units: [
    { name: 'علبة (200 جم)', price: 18.00, cost: 12.00, stock: 120, barcode: 'COFFEE-200' },
    { name: 'علبة (400 جم)', price: 32.00, cost: 21.00, stock: 60, barcode: 'COFFEE-400' },
  ]},
  { id: 15, name: 'شاي ليبتون', category: 'مشروبات', brand: 'ليبتون', createdAt: '2023-02-05', imageUrl: 'https://picsum.photos/seed/tea/200/200', units: [
    { name: 'علبة (100 كيس)', price: 15.00, cost: 10.00, stock: 150, barcode: 'TEA-100' },
    { name: 'صندوق (10 علبة)', price: 140.00, cost: 95.00, stock: 12, barcode: 'TEA-B10' },
  ]},
  { id: 16, name: 'دجاج مجمد', category: 'لحوم', brand: 'الدجاج الذهبي', createdAt: '2023-03-25', imageUrl: 'https://picsum.photos/seed/chicken/200/200', units: [
    { name: 'كيلو', price: 18.00, cost: 13.00, stock: 100, barcode: 'CHICKEN-1KG' },
    { name: 'كرتون (10 كجم)', price: 170.00, cost: 125.00, stock: 8, barcode: 'CHICKEN-10KG' },
  ]},
  { id: 17, name: 'صابون الغسيل', category: 'منظفات', brand: 'المنظف القوي', createdAt: '2023-01-12', imageUrl: 'https://picsum.photos/seed/soap/200/200', units: [
    { name: 'علبة (1 كجم)', price: 8.00, cost: 5.50, stock: 200, barcode: 'SOAP-1KG' },
    { name: 'كرتون (12 علبة)', price: 90.00, cost: 63.00, stock: 15, barcode: 'SOAP-C12' },
  ]},
  { id: 18, name: 'مناديل ورقية', category: 'منظفات', brand: 'النعومة', createdAt: '2023-02-28', imageUrl: 'https://picsum.photos/seed/tissue/200/200', units: [
    { name: 'علبة', price: 6.00, cost: 4.00, stock: 250, barcode: 'TISSUE-P' },
    { name: 'صندوق (24 علبة)', price: 138.00, cost: 92.00, stock: 18, barcode: 'TISSUE-B24' },
  ]},
  { id: 19, name: 'شامبو للشعر', category: 'منظفات', brand: 'الجمال', createdAt: '2023-03-05', imageUrl: 'https://picsum.photos/seed/shampoo/200/200', units: [
    { name: 'زجاجة (400 مل)', price: 14.00, cost: 9.50, stock: 140, barcode: 'SHAMPOO-400' },
    { name: 'زجاجة (750 مل)', price: 24.00, cost: 16.50, stock: 80, barcode: 'SHAMPOO-750' },
  ]},
  { id: 20, name: 'بطاطس شيبس', category: 'وجبات خفيفة', brand: 'الشيبس الذهبي', createdAt: '2023-01-18', imageUrl: 'https://picsum.photos/seed/chips/200/200', units: [
    { name: 'كيس', price: 2.75, cost: 1.70, stock: 350, barcode: 'CHIPS-P' },
    { name: 'صندوق (30 كيس)', price: 78.00, cost: 48.00, stock: 10, barcode: 'CHIPS-B30' },
  ]},
];

// All dummy/fake wholesale customers have been removed. Customer list starts empty.

const ALL_CATEGORIES = [...new Set(MOCK_WHOLESALE_PRODUCTS.map(p => p.category))];
const ALL_BRANDS = [...new Set(MOCK_WHOLESALE_PRODUCTS.map(p => p.brand))];

const generateNewInvoice = (cashierName: string): WholesaleInvoice => ({
  id: `WINV-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
  date: new Date(),
  cashier: cashierName,
  customer: null,
  items: [],
  subtotal: 0,
  totalDiscount: 0,
  grandTotal: 0,
  paymentMethod: null,
});

const WholesalePOSPage: React.FC = () => {
    const { user } = useAuthStore();
    const { formatCurrency } = useCurrency();
    const currentUserName = user?.fullName || user?.username || 'Unknown';
    const [invoice, setInvoice] = useState<WholesaleInvoice>(generateNewInvoice(currentUserName));
    const [customers, setCustomers] = useState<Customer[]>([]); // Customer list - starts empty, no dummy customers
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ category: 'all', brand: 'all' });
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
    const [dueDate, setDueDate] = useState('');
    const [saleCompleted, setSaleCompleted] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false); // Prevent multiple submissions
    const [selectedProduct, setSelectedProduct] = useState<WholesaleProduct | null>(null);
    const [modalQuantities, setModalQuantities] = useState<Record<string, string>>({});
    const [storeLogoUrl, setStoreLogoUrl] = useState<string>('');
    
    // Load autoPrintInvoice setting from preferences, default to true
    const getAutoPrintSetting = (): boolean => {
        try {
            const settings = loadSettings(null);
            if (settings && settings.autoPrintInvoice !== undefined) {
                return settings.autoPrintInvoice;
            }
        } catch (err) {
            console.error('Failed to load autoPrintInvoice setting:', err);
        }
        return true; // Default to true if not found
    };
    const [autoPrintEnabled, setAutoPrintEnabled] = useState(() => getAutoPrintSetting());
    
    // Infinite scroll state
    const [displayedCount, setDisplayedCount] = useState(20); // Initial number of products to display
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const calculateTotals = useCallback((items: WholesalePOSCartItem[], discount: number) => {
        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        const grandTotal = subtotal - discount;
        return { subtotal, grandTotal, totalDiscount: discount };
    }, []);

    const handleAddItem = (product: WholesaleProduct, unit: WholesaleProductUnit, quantity: number) => {
        if (!selectedCustomer) {
            alert('الرجاء اختيار عميل أولاً.');
            return;
        }
        
        if (isNaN(quantity) || quantity <= 0) {
            return; 
        }

        const existingItem = invoice.items.find(item => String(item.productId) === String(product.id) && item.unitName === unit.name);
        const currentQuantityInCart = existingItem?.quantity || 0;
        const totalQuantityRequested = currentQuantityInCart + quantity;

        let newItems: WholesalePOSCartItem[];
        if (existingItem) {
            newItems = invoice.items.map(item =>
                String(item.productId) === String(product.id) && item.unitName === unit.name
                    ? { ...item, quantity: totalQuantityRequested, total: totalQuantityRequested * item.unitPrice }
                    : item
            );
        } else {
            const newItem: WholesalePOSCartItem = {
                productId: product.id,
                name: product.name,
                unitName: unit.name,
                quantity: quantity,
                unitPrice: unit.price,
                total: quantity * unit.price
            };
            newItems = [...invoice.items, newItem];
        }
        const totals = calculateTotals(newItems, invoice.totalDiscount);
        setInvoice(inv => ({...inv, items: newItems, ...totals }));
    };

    const handleOpenProductModal = (product: WholesaleProduct) => {
        setSelectedProduct(product);
        // Initialize modal quantities with empty values
        const initialQuantities: Record<string, string> = {};
        product.units.forEach(unit => {
            initialQuantities[`${product.id}-${unit.name}`] = '';
        });
        setModalQuantities(initialQuantities);
    };

    const handleCloseProductModal = () => {
        setSelectedProduct(null);
        setModalQuantities({});
    };

    const handleModalQuantityChange = (productId: number, unitName: string, value: string) => {
        const key = `${productId}-${unitName}`;
        if (/^\d*$/.test(value)) {
            setModalQuantities(prev => ({
                ...prev,
                [key]: value
            }));
        }
    };

    const handleSaveToCart = () => {
        if (!selectedProduct || !selectedCustomer) {
            alert('الرجاء اختيار عميل أولاً.');
            return;
        }

        // Collect all items to add with their quantities
        const itemsToAdd: Array<{ unit: WholesaleProductUnit; quantity: number }> = [];
        
        selectedProduct.units.forEach(unit => {
            const key = `${selectedProduct.id}-${unit.name}`;
            const quantity = parseInt(modalQuantities[key] || '0', 10);
            
            if (quantity > 0) {
                itemsToAdd.push({ unit, quantity });
            }
        });

        if (itemsToAdd.length === 0) {
            alert('الرجاء تحديد كمية لإضافة المنتج إلى السلة.');
            return;
        }

        // Add all items at once using functional update
        setInvoice(currentInvoice => {
            let newItems = [...currentInvoice.items];

            itemsToAdd.forEach(({ unit, quantity }) => {
                const existingItemIndex = newItems.findIndex(
                    item => String(item.productId) === String(selectedProduct.id) && item.unitName === unit.name
                );

                if (existingItemIndex >= 0) {
                    // Update existing item
                    const existingItem = newItems[existingItemIndex];
                    const newQuantity = existingItem.quantity + quantity;
                    newItems[existingItemIndex] = {
                        ...existingItem,
                        quantity: newQuantity,
                        total: newQuantity * existingItem.unitPrice
                    };
                } else {
                    // Add new item
                    const newItem: WholesalePOSCartItem = {
                        productId: selectedProduct.id,
                        name: selectedProduct.name,
                        unitName: unit.name,
                        quantity: quantity,
                        unitPrice: unit.price,
                        total: quantity * unit.price
                    };
                    newItems.push(newItem);
                }
            });

            // Calculate totals
            const totals = calculateTotals(newItems, currentInvoice.totalDiscount);
            
            return {
                ...currentInvoice,
                items: newItems,
                ...totals
            };
        });

        // Close modal after successful addition
        handleCloseProductModal();
    };

    const handleUpdateQuantity = (productId: number, unitName: string, quantity: number) => {
        let newItems = invoice.items.map(item => 
            String(item.productId) === String(productId) && item.unitName === unitName 
            ? {...item, quantity, total: quantity * item.unitPrice} 
            : item
        );

        if (quantity < 1) {
            newItems = newItems.filter(item => !(String(item.productId) === String(productId) && item.unitName === unitName));
        }
        const totals = calculateTotals(newItems, invoice.totalDiscount);
        setInvoice(inv => ({...inv, items: newItems, ...totals }));
    };

    const handleRemoveItem = (productId: number, unitName: string) => {
        const newItems = invoice.items.filter(item => !(String(item.productId) === String(productId) && item.unitName === unitName));
        const totals = calculateTotals(newItems, invoice.totalDiscount);
        setInvoice(inv => ({...inv, items: newItems, ...totals }));
    };

    const handleDiscountChange = (discountValue: number) => {
        const discount = Math.max(0, discountValue);
        const totals = calculateTotals(invoice.items, discount);
        setInvoice(inv => ({ ...inv, ...totals }));
    };
    
    const handleClearCart = () => {
        if(window.confirm('هل أنت متأكد من أنك تريد إفراغ السلة؟')) {
            const totals = calculateTotals([], 0);
            setInvoice(inv => ({...inv, items: [], ...totals}));
        }
    };
    
    const handleSelectCustomer = (customerId: string) => {
        const customer = customers.find(c => c.id === customerId);
        setSelectedCustomer(customer || null);
        setInvoice(inv => ({...inv, customer: customer || null}));
    };
    
    const openPaymentModal = () => {
        if(invoice.items.length === 0 || !selectedCustomer) return;
        setSelectedPaymentMethod('Cash');
        setPaymentModalOpen(true);
    };

    const handleFinalizeSale = () => {
        // Prevent multiple submissions
        if (isProcessingPayment) {
            return;
        }
        
        if (!invoice.customer || !selectedPaymentMethod) {
            alert('الرجاء اختيار عميل وطريقة دفع.');
            return;
        }
        
        setIsProcessingPayment(true);
        
        let finalInvoice: WholesaleInvoice = { 
            ...invoice, 
            paymentMethod: selectedPaymentMethod 
        };
        
        if (selectedPaymentMethod === 'Credit') {
            if (!dueDate) {
                alert('الرجاء تحديد تاريخ الاستحقاق.');
                setIsProcessingPayment(false);
                return;
            }
            finalInvoice.dueDate = dueDate;
        }
        console.log("SALE FINALIZED: ", finalInvoice);
        setSaleCompleted(true);
        setPaymentModalOpen(false);
        setIsProcessingPayment(false);
    };
    
    const startNewSale = () => {
        setSaleCompleted(false);
        setInvoice(generateNewInvoice(currentUserName));
        setSelectedCustomer(null);
        setDueDate('');
        setSelectedProduct(null);
        setModalQuantities({});
        setSelectedPaymentMethod(null);
    };
    
    // Load autoPrintInvoice setting when component mounts or settings change
    useEffect(() => {
        const settings = loadSettings(null);
        if (settings && settings.autoPrintInvoice !== undefined) {
            setAutoPrintEnabled(settings.autoPrintInvoice);
        }
    }, []);

    // Load store logo when sale completes to ensure we have the latest logo for the receipt
    useEffect(() => {
        if (saleCompleted) {
            const loadStoreLogo = async () => {
                try {
                    // Check localStorage first
                    const settings = loadSettings(null);
                    if (settings?.logoUrl) {
                        setStoreLogoUrl(settings.logoUrl);
                    }
                    
                    // Always check backend for latest logo URL
                    try {
                        const backendSettings = await storeSettingsApi.getSettings();
                        
                        // Handle nested response structure
                        let settingsData: Record<string, string> | null = null;
                        
                        if (backendSettings.data) {
                            // Check for nested structure: data.data.settings
                            if ('data' in backendSettings.data && backendSettings.data.data && 'settings' in backendSettings.data.data) {
                                settingsData = (backendSettings.data.data as any).settings as Record<string, string>;
                            }
                            // Check for direct structure: data.settings
                            else if ('settings' in backendSettings.data) {
                                settingsData = backendSettings.data.settings as Record<string, string>;
                            }
                        }
                        
                        if (settingsData) {
                            // Load logo URL from backend settings
                            const logoUrl = settingsData.logourl || settingsData.logoUrl || '';
                            if (logoUrl) {
                                console.log('[WholesalePOS] Found store logo URL in backend:', logoUrl.substring(0, 50) + '...');
                                setStoreLogoUrl(logoUrl);
                                // Also update localStorage for future use
                                if (settings) {
                                    const updatedSettings = { ...settings, logoUrl: logoUrl };
                                    saveSettings(updatedSettings);
                                } else {
                                    // Create minimal settings object if none exists
                                    const newSettings = {
                                        logoUrl: logoUrl,
                                    } as any;
                                    saveSettings(newSettings);
                                }
                            }
                        }
                    } catch (backendError) {
                        console.warn('[WholesalePOS] Failed to load logo from backend:', backendError);
                    }
                } catch (error) {
                    console.error('[WholesalePOS] Error loading store logo:', error);
                }
            };
            
            loadStoreLogo();
        }
    }, [saleCompleted]);
    
    // Auto-print when sale is completed and autoPrintInvoice is enabled
    useEffect(() => {
        if (saleCompleted && autoPrintEnabled) {
            // Small delay to ensure the receipt screen is rendered before printing
            const timer = setTimeout(() => {
                // Check if the receipt element exists and is visible
                const receiptElement = document.getElementById('printable-receipt');
                if (receiptElement) {
                    // Use silent print utility - prints without opening new window/tab
                    printReceipt('printable-receipt').catch((error) => {
                        console.error('Auto-print failed:', error);
                    });
                } else {
                    // If receipt not found, try again after a short delay
                    setTimeout(() => {
                        printReceipt('printable-receipt').catch((error) => {
                            console.error('Auto-print failed:', error);
                        });
                    }, 200);
                }
            }, 100); // Minimal delay to ensure receipt element is rendered
            return () => clearTimeout(timer);
        }
    }, [saleCompleted, autoPrintEnabled]);
    
    const filteredProducts = useMemo(() => {
        return MOCK_WHOLESALE_PRODUCTS.filter(p => {
            const matchesSearch = searchTerm ? (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.units.some(u => u.barcode?.toLowerCase().includes(searchTerm.toLowerCase()))) : true;
            const matchesCategory = filters.category !== 'all' ? p.category === filters.category : true;
            const matchesBrand = filters.brand !== 'all' ? p.brand === filters.brand : true;
            return matchesSearch && matchesCategory && matchesBrand;
        });
    }, [searchTerm, filters]);

    // Products to display (paginated)
    const displayedProducts = useMemo(() => {
        return filteredProducts.slice(0, displayedCount);
    }, [filteredProducts, displayedCount]);

    // Check if there are more products to load
    const hasMore = displayedCount < filteredProducts.length;

    // Reset displayed count when filters or search change
    useEffect(() => {
        setDisplayedCount(20);
    }, [searchTerm, filters.category, filters.brand]);

    // Infinite scroll using Intersection Observer
    useEffect(() => {
        if (!hasMore || isLoadingMore) return;

        const currentTrigger = loadMoreTriggerRef.current;
        const scrollContainer = scrollContainerRef.current;
        if (!currentTrigger || !scrollContainer) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const firstEntry = entries[0];
                if (firstEntry.isIntersecting && hasMore && !isLoadingMore) {
                    setIsLoadingMore(true);
                    // Load more products with a slight delay for smooth UX
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            setDisplayedCount(prev => Math.min(prev + 20, filteredProducts.length));
                            setIsLoadingMore(false);
                        }, 200);
                    });
                }
            },
            {
                root: scrollContainer, // Use scroll container as root
                rootMargin: '100px', // Start loading 100px before reaching the trigger
                threshold: 0.01, // Trigger when 1% of the element is visible
            }
        );

        observer.observe(currentTrigger);

        return () => {
            observer.disconnect();
        };
    }, [hasMore, isLoadingMore, filteredProducts.length]);

    const renderReceipt = (invoice: WholesaleInvoice) => {
        // Load store address and business name from settings
        const settings = loadSettings(null);
        const storeAddress = settings?.storeAddress || '';
        const legacyDefaultBusinessName = String.fromCharCode(80, 111, 115, 104, 80, 111, 105, 110, 116, 72, 117, 98);
        const businessNameToDisplay = settings?.businessName && settings.businessName.trim() && settings.businessName !== legacyDefaultBusinessName ? settings.businessName.trim() : '';
        
        // Get store logo from state (loaded from backend API) with fallback to localStorage settings
        // This ensures we always use the correct store's logo from the backend
        const logoUrlFromState = storeLogoUrl || '';
        const logoUrlFromSettings = settings?.logoUrl || '';
        const finalLogoUrl = logoUrlFromState || logoUrlFromSettings;
        
        // Check if we have a custom logo - accept Firebase URLs, data URLs (base64 images), or blob URLs
        const hasCustomLogo = !!(finalLogoUrl && finalLogoUrl.trim() && (
            finalLogoUrl.includes('firebasestorage.googleapis.com') || // Firebase Storage URL
            finalLogoUrl.startsWith('data:image/') || // Base64 data URL (backward compatibility)
            finalLogoUrl.startsWith('blob:') || // Blob URL
            (finalLogoUrl.startsWith('http') && finalLogoUrl.includes('logo')) // HTTP URL (for other storage services)
        ));
        
        return (
            <div id="printable-receipt" className="w-full max-w-md bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg text-right">
                <div className="text-center mb-4 sm:mb-5">
                    <CheckCircleIcon className="w-12 h-12 sm:w-16 sm:h-16 text-green-500 mx-auto print-hidden" />
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 mt-2 print-hidden">{AR_LABELS.saleCompleted}</h2>
                    
                    {/* Store Logo */}
                    <div className="flex justify-center mb-4 mt-4">
                        {hasCustomLogo && finalLogoUrl ? (
                            <div className="receipt-logo">
                                <img 
                                    src={finalLogoUrl} 
                                    alt="Store logo" 
                                    className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-2xl shadow-xl bg-white dark:bg-gray-800 p-2 border-2 border-gray-100 dark:border-gray-700"
                                    style={{
                                        maxWidth: '96px',
                                        maxHeight: '96px',
                                        width: 'auto',
                                        height: 'auto',
                                    }}
                                    onError={(e) => {
                                        console.error('[WholesalePOS Receipt] Failed to load logo image:', finalLogoUrl.substring(0, 50));
                                        // Fallback to default logo on error
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="receipt-logo w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 shadow-xl relative" style={{
                                background: 'linear-gradient(135deg, #f97316 0%, #f59e0b 50%, #ea580c 100%)',
                                boxShadow: '0 10px 25px -5px rgba(249, 115, 22, 0.3), 0 4px 6px -2px rgba(249, 115, 22, 0.2)',
                            }}>
                                <svg 
                                    className="w-12 h-12 sm:w-14 sm:h-14 text-white" 
                                    fill="none" 
                                    viewBox="0 0 24 24" 
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                        )}
                    </div>
                    
                    <h3 className="text-lg sm:text-xl font-bold text-center text-gray-900 dark:text-gray-100 mt-3 sm:mt-4 mb-2">فاتورة جملة</h3>
                    {storeAddress && (
                        <p className="text-center text-xs text-gray-500 dark:text-gray-400">{storeAddress}</p>
                    )}
                </div>

                <div className="invoice-info text-xs my-4 space-y-1.5">
                    {businessNameToDisplay && (
                        <p><strong>اسم المتجر:</strong> {businessNameToDisplay}</p>
                    )}
                    <p><strong>{AR_LABELS.invoiceNumber}:</strong> {invoice.id}</p>
                    <p><strong>{AR_LABELS.date}:</strong> {new Date(invoice.date).toLocaleString('ar-SA')}</p>
                    <p><strong>{AR_LABELS.posCashier}:</strong> {invoice.cashier}</p>
                    <p><strong>{AR_LABELS.customerName}:</strong> {invoice.customer?.name || 'N/A'}</p>
                    {invoice.customer?.companyName && <p><strong>اسم الشركة:</strong> {invoice.customer.companyName}</p>}
                </div>
                
                <div className="overflow-x-auto -mx-2 sm:mx-0">
                    <table className="w-full text-xs min-w-full border-collapse" style={{ borderSpacing: 0 }}>
                        <thead>
                            <tr className="bg-gray-100 dark:bg-gray-700">
                                <th className="py-2.5 px-3 text-right font-bold border border-gray-300 dark:border-gray-600" style={{ borderRight: '1px solid #dee2e6', borderLeft: '1px solid #dee2e6', borderTop: '1px solid #dee2e6', borderBottom: '2px solid #495057' }}>اسم المنتج</th>
                                <th className="py-2.5 px-3 text-center font-bold border border-gray-300 dark:border-gray-600" style={{ borderRight: '1px solid #dee2e6', borderLeft: '1px solid #dee2e6', borderTop: '1px solid #dee2e6', borderBottom: '2px solid #495057' }}>الوحدة</th>
                                <th className="py-2.5 px-3 text-center font-bold border border-gray-300 dark:border-gray-600" style={{ borderRight: '1px solid #dee2e6', borderLeft: '1px solid #dee2e6', borderTop: '1px solid #dee2e6', borderBottom: '2px solid #495057' }}>الكمية</th>
                                <th className="py-2.5 px-3 text-center font-bold border border-gray-300 dark:border-gray-600" style={{ borderRight: '1px solid #dee2e6', borderLeft: '1px solid #dee2e6', borderTop: '1px solid #dee2e6', borderBottom: '2px solid #495057' }}>سعر الوحدة</th>
                                <th className="py-2.5 px-3 text-left font-bold border border-gray-300 dark:border-gray-600" style={{ borderRight: '1px solid #dee2e6', borderLeft: '1px solid #dee2e6', borderTop: '1px solid #dee2e6', borderBottom: '2px solid #495057' }}>الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items.slice().reverse().map(item => (
                                <tr key={`${item.productId}-${item.unitName}`} className="border-b border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="py-2.5 px-3 text-right border border-gray-300 dark:border-gray-600 font-medium">{item.name}</td>
                                    <td className="py-2.5 px-3 text-center border border-gray-300 dark:border-gray-600">{item.unitName}</td>
                                    <td className="py-2.5 px-3 text-center border border-gray-300 dark:border-gray-600">{item.quantity}</td>
                                    <td className="py-2.5 px-3 text-center border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">{formatCurrency(item.unitPrice)}</td>
                                    <td className="py-2.5 px-3 text-left border border-gray-300 dark:border-gray-600 font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(item.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="receipt-summary mt-5 text-xs">
                    <div className="flex justify-between py-1.5">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">{AR_LABELS.subtotal}:</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">{AR_LABELS.totalDiscount}:</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(invoice.totalDiscount)}</span>
                    </div>
                    <div className="grand-total flex justify-between">
                        <span className="text-gray-900 dark:text-gray-100 font-bold">{AR_LABELS.grandTotal}:</span>
                        <span className="font-bold text-lg text-orange-600 dark:text-orange-400">{formatCurrency(invoice.grandTotal)}</span>
                    </div>
                </div>
                <p className="receipt-footer text-center text-xs mt-6 text-gray-500 dark:text-gray-400">شكراً لتعاملكم معنا!</p>
            </div>
        );
    };

    if (saleCompleted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6">
                {renderReceipt(invoice)}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:space-x-4 sm:space-x-reverse mt-4 sm:mt-6 print-hidden w-full max-w-md">
                    <button onClick={startNewSale} className="inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 border border-transparent text-sm sm:text-base font-medium rounded-md shadow-sm text-white bg-orange-500 hover:bg-orange-600 transition-colors">
                        <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5 ml-2" />
                        <span>{AR_LABELS.startNewSale}</span>
                    </button>
                    <button onClick={() => printReceipt('printable-receipt')} className="inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 text-sm sm:text-base font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                        <span className="h-4 w-4 sm:h-5 sm:w-5 block"><PrintIcon /></span>
                        <span className="mr-2">{AR_LABELS.printReceipt}</span>
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="relative min-h-screen overflow-hidden">
            {/* Modern Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-orange-50/20 to-amber-100/30 dark:from-slate-950 dark:via-orange-950/20 dark:to-amber-950/30" />
            <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-orange-400/15 to-amber-400/15 blur-3xl animate-pulse" />
            <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-rose-400/15 to-orange-400/15 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
            
            <div className="relative w-full px-2 sm:px-4 py-4 sm:py-6 overflow-x-hidden">
                {/* Three Vertical Sections Layout */}
                <div className="flex flex-col gap-4 sm:gap-6 h-auto w-full overflow-x-hidden">
             

                    {/* Section 2: Customer Details */}
                    <div className="bg-white/95 dark:bg-gray-800/95 rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 flex-shrink-0">
                        <h3 className="font-bold text-sm sm:text-base text-gray-700 dark:text-gray-200 text-right mb-3 sm:mb-4">{AR_LABELS.customerDetails}</h3>
                        <CustomDropdown
                            id="wholesale-customer-dropdown"
                            value={selectedCustomer?.id || ''}
                            onChange={(value) => handleSelectCustomer(value)}
                            options={customers.map(c => ({ value: c.id, label: `${c.name} (${c.companyName || ''})` }))}
                            placeholder={AR_LABELS.selectWholesaleCustomer}
                            className="w-full mb-3"
                        />
                        {selectedCustomer && (
                            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-right border-t border-gray-200 dark:border-gray-700 pt-3 space-y-1">
                                <p><strong>{AR_LABELS.phone}:</strong> {selectedCustomer.phone}</p>
                                <p><strong>{AR_LABELS.address}:</strong> {selectedCustomer.address}</p>
                                {selectedCustomer.previousBalance > 0 && (
                                    <p className="text-orange-600"><strong>الرصيد السابق:</strong> {selectedCustomer.previousBalance.toFixed(2)} ر.س</p>
                                )}
                            </div>
                        )}
                    </div>

                           {/* Section 1: Search & Filter */}
                           <div className="p-3 sm:p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 rounded-xl sm:rounded-2xl shadow-sm backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 flex-shrink-0 space-y-3 sm:space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                            <div className="relative">
                                <SearchIcon className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-gray-500" />
                                <input 
                                    type="text" 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)} 
                                    placeholder={AR_LABELS.searchProductPlaceholder} 
                                    className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 text-sm sm:text-base rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-right"
                                />
                            </div>
                            <CustomDropdown
                                id="brand-filter-dropdown"
                                value={filters.brand}
                                onChange={(value) => setFilters(f => ({...f, brand: value}))}
                                options={[
                                    { value: 'all', label: AR_LABELS.allBrands },
                                    ...ALL_BRANDS.map(b => ({ value: b, label: b }))
                                ]}
                                placeholder={AR_LABELS.allBrands}
                                className="w-full"
                            />
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto pb-2">
                            <button 
                                onClick={() => setFilters(f => ({...f, category: 'all'}))} 
                                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-full whitespace-nowrap transition-all duration-200 ${
                                    filters.category === 'all' 
                                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md' 
                                        : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}
                            >
                                {AR_LABELS.allCategories}
                            </button>
                            {ALL_CATEGORIES.map(c => (
                                <button 
                                    key={c} 
                                    onClick={() => setFilters(f => ({...f, category: c}))} 
                                    className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-full whitespace-nowrap transition-all duration-200 ${
                                        filters.category === c 
                                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md' 
                                            : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>

               

                    {/* Products Grid - Display below the three sections */}
                    <div className="bg-white/95 dark:bg-gray-800/95 rounded-xl sm:rounded-2xl shadow-sm backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
                        <div 
                            ref={scrollContainerRef}
                            className="overflow-y-auto p-3 sm:p-4 md:p-6 bg-gray-50 dark:bg-gray-900 custom-scrollbar"
                            style={{
                                // Show 4 rows of products
                                // Card height: image (128px mobile / 144px desktop) + padding + text area ≈ 200-220px
                                // Gap between rows: 12-16px (gap-3 sm:gap-4)
                                // Padding: 12px mobile, 16px tablet, 24px desktop
                                // Formula: (4 * card-height) + (3 * gap) + (2 * vertical-padding)
                                maxHeight: 'calc(4 * 200px + 3 * 12px + 24px)', // Mobile: ~860px
                            }}
                        >
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                                {displayedProducts.map(p => (
                                    <div 
                                        key={p.id} 
                                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm flex flex-col transition-all duration-200 hover:shadow-lg hover:border-orange-300 dark:hover:border-orange-600 cursor-pointer group"
                                        onClick={() => handleOpenProductModal(p)}
                                    >
                                        <div className="relative overflow-hidden rounded-t-xl">
                                            <img 
                                                src={p.imageUrl} 
                                                alt={p.name} 
                                                className="w-full h-32 sm:h-36 object-cover transition-transform duration-200 group-hover:scale-105" 
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                        </div>
                                        <div className="p-3 sm:p-4 flex flex-col flex-grow justify-center">
                                            <h4 className="font-bold text-sm sm:text-base text-gray-800 dark:text-gray-100 text-center line-clamp-2">
                                                {p.name}
                                            </h4>
                                        </div>
                                    </div>
                                ))}
                                {filteredProducts.length === 0 && (
                                    <div className="col-span-full text-center py-16 text-gray-500 dark:text-gray-400">
                                        <p className="text-sm sm:text-base">{AR_LABELS.noSalesFound}</p>
                                    </div>
                                )}
                            </div>
                            
                            {/* Infinite Scroll Trigger */}
                            {hasMore && (
                                <div 
                                    ref={loadMoreTriggerRef}
                                    className="flex justify-center items-center py-8 min-h-[100px]"
                                    aria-live="polite"
                                    aria-label="Loading more products"
                                >
                                    {isLoadingMore ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">جاري تحميل المزيد من المنتجات...</p>
                                        </div>
                                    ) : (
                                        <div className="h-1 w-full max-w-[200px]"></div>
                                    )}
                                </div>
                            )}
                            
                            {/* End of list indicator */}
                            {!hasMore && displayedProducts.length > 0 && (
                                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                                    <p className="text-sm">تم عرض جميع المنتجات ({filteredProducts.length})</p>
                                </div>
                            )}
                        </div>
                    </div>

                         {/* Section 3: Order Summary */}
                         <div className="bg-gradient-to-br from-white via-orange-50/30 to-amber-50/30 dark:from-gray-800 dark:via-orange-950/20 dark:to-amber-950/20 rounded-xl sm:rounded-2xl shadow-lg border border-orange-200/50 dark:border-orange-800/50 backdrop-blur-xl p-4 sm:p-5 flex flex-col flex-grow min-h-0">
                        <div className="mb-3 sm:mb-4 flex-shrink-0">
                            <h3 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3 text-right">{AR_LABELS.orderSummary}</h3>
                            <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 rounded-xl text-right flex-shrink-0">
                                <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">{AR_LABELS.invoiceNumber}: </span>
                                <span className="text-xs sm:text-sm font-mono text-orange-600">{invoice.id}</span>
                            </div>
                        </div>
                        
                        {/* Cart Items */}
                        <div className="flex-grow overflow-y-auto min-h-0 mb-3 sm:mb-4 max-h-[400px]">
                            {invoice.items.length === 0 ? (
                                <p className="text-center text-gray-500 dark:text-gray-400 py-8 sm:py-10 text-xs sm:text-sm">{AR_LABELS.noItemsInCart}</p>
                            ) : (
                                <div className="space-y-2">
                                    {invoice.items.slice().reverse().map(item => (
                                        <div key={`${item.productId}-${item.unitName}`} className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-2 sm:p-3 border border-gray-200 dark:border-gray-700">
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <div className="flex-grow text-right">
                                                    <p className="font-semibold text-xs sm:text-sm text-gray-800 dark:text-gray-200">{item.name}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">({item.unitName})</p>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{item.unitPrice.toFixed(2)} ر.س</p>
                                                </div>
                                                <button 
                                                    onClick={() => handleRemoveItem(Number(item.productId), item.unitName)} 
                                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                                                >
                                                    <span className="w-4 h-4 block"><DeleteIcon /></span>
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <input 
                                                    type="number" 
                                                    value={item.quantity} 
                                                    onChange={e => handleUpdateQuantity(Number(item.productId), item.unitName, parseInt(e.target.value) || 1)} 
                                                    className="w-16 sm:w-20 text-center border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-xs sm:text-sm py-1 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                                    min="1"
                                                />
                                                <p className="font-semibold text-xs sm:text-sm text-orange-600">{item.total.toFixed(2)} ر.س</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Totals */}
                        <div className="flex-shrink-0 space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                            <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-3 sm:p-4 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm space-y-2">
                                <div className="divide-y divide-gray-200/70 dark:divide-gray-700/70">
                                    <div className="py-2 grid grid-cols-[minmax(7.5rem,auto)_1fr] items-center gap-x-6 text-xs sm:text-sm">
                                        <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums text-left justify-self-start">
                                            {invoice.items.length}
                                        </span>
                                        <span className="text-gray-600 dark:text-gray-400 text-right justify-self-end">
                                            {AR_LABELS.totalItems}:
                                        </span>
                                    </div>
                                    <div className="py-2 grid grid-cols-[minmax(7.5rem,auto)_1fr] items-center gap-x-6 text-xs sm:text-sm">
                                        <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums text-left justify-self-start">
                                            {invoice.items.reduce((s, i) => s + i.quantity, 0)}
                                        </span>
                                        <span className="text-gray-600 dark:text-gray-400 text-right justify-self-end">
                                            {AR_LABELS.totalQuantity}:
                                        </span>
                                    </div>
                                    <div className="py-2 grid grid-cols-[minmax(7.5rem,auto)_1fr] items-center gap-x-6 text-xs sm:text-sm">
                                        <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums text-left justify-self-start">
                                            {invoice.subtotal.toFixed(2)} ر.س
                                        </span>
                                        <span className="text-gray-600 dark:text-gray-400 text-right justify-self-end">
                                            {AR_LABELS.subtotal}:
                                        </span>
                                    </div>
                                    <div className="py-2 grid grid-cols-[minmax(7.5rem,auto)_1fr] items-center gap-x-6 text-xs sm:text-sm">
                                        <div className="justify-self-start">
                                            <input
                                                type="number"
                                                placeholder="0.00"
                                                value={invoice.totalDiscount || ''}
                                                onChange={e => handleDiscountChange(parseFloat(e.target.value) || 0)}
                                                className="w-24 sm:w-28 text-xs sm:text-sm text-left border border-orange-300 dark:border-orange-600 bg-white dark:bg-gray-700 rounded-lg font-semibold tabular-nums focus:ring-2 focus:ring-orange-500 focus:border-orange-500 py-1.5 px-2"
                                            />
                                        </div>
                                        <label className="text-gray-600 dark:text-gray-400 whitespace-nowrap text-right justify-self-end">
                                            {AR_LABELS.discount}:
                                        </label>
                                    </div>
                                </div>
                                <div className="mt-3 bg-gradient-to-l from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30 border-2 border-orange-400 dark:border-orange-600 rounded-xl p-3 sm:p-4 shadow-md ring-2 ring-orange-200 dark:ring-orange-800/50">
                                    <div className="grid grid-cols-[minmax(7.5rem,auto)_1fr] items-center gap-x-6">
                                        <span className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400 tabular-nums text-left justify-self-start">
                                            {invoice.grandTotal.toFixed(2)} ر.س
                                        </span>
                                        <span className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 text-right justify-self-end">
                                            {AR_LABELS.grandTotal}:
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2 sm:gap-3 flex-shrink-0">
                            <button 
                                onClick={handleClearCart} 
                                disabled={invoice.items.length === 0} 
                                className="w-full px-4 py-2.5 text-sm font-medium bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800"
                            >
                                {AR_LABELS.clearCart}
                            </button>
                            <button 
                                onClick={openPaymentModal} 
                                disabled={invoice.items.length === 0 || !selectedCustomer} 
                                className="w-full px-4 py-3 text-sm sm:text-base font-bold text-white bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 rounded-xl hover:from-green-600 hover:via-emerald-600 hover:to-green-700 disabled:from-gray-400 disabled:via-gray-400 disabled:to-gray-500 dark:disabled:from-gray-600 dark:disabled:via-gray-600 dark:disabled:to-gray-700 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-200 disabled:cursor-not-allowed disabled:scale-100"
                            >
                                {AR_LABELS.checkout}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Product Selection Modal */}
            {selectedProduct && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-3 sm:p-4 transition-opacity duration-300 ease-out" 
                    onClick={handleCloseProductModal}
                >
                    <div 
                        className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 w-full max-w-md text-right max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-out"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between mb-4">
                            <button 
                                onClick={handleCloseProductModal}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                                <span className="w-6 h-6 block"><CancelIcon /></span>
                            </button>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 flex-grow text-center">
                                {selectedProduct.name}
                            </h2>
                            <div className="w-6"></div> {/* Spacer for alignment */}
                        </div>

                        {/* Product Image */}
                        <div className="mb-4">
                            <img 
                                src={selectedProduct.imageUrl} 
                                alt={selectedProduct.name} 
                                className="w-full h-48 sm:h-56 object-cover rounded-xl"
                            />
                        </div>

                        {/* Product Units */}
                        <div className="space-y-3 mb-6">
                            <h3 className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                الوحدات المتاحة:
                            </h3>
                            {selectedProduct.units.map((unit, idx) => (
                                <div 
                                    key={unit.barcode || `${selectedProduct.id}-${idx}`} 
                                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-600"
                                >
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="text-right">
                                            <p className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200">
                                                {unit.name}
                                            </p>
                                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                {unit.price.toFixed(2)} ر.س
                                            </p>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                                متوفر: <span className="font-semibold text-orange-600">{unit.stock}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <label className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                            الكمية:
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={modalQuantities[`${selectedProduct.id}-${unit.name}`] || ''}
                                            onChange={(e) => handleModalQuantityChange(selectedProduct.id, unit.name, e.target.value)}
                                            className="flex-grow p-2 text-sm sm:text-base border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-center focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Save Button */}
                        <button 
                            onClick={handleSaveToCart}
                            disabled={!selectedCustomer}
                            className="w-full px-4 py-3 text-sm sm:text-base font-bold text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 rounded-xl hover:from-orange-600 hover:via-amber-600 hover:to-orange-600 disabled:from-gray-400 disabled:via-gray-400 disabled:to-gray-500 dark:disabled:from-gray-600 dark:disabled:via-gray-600 dark:disabled:to-gray-700 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-200 disabled:cursor-not-allowed disabled:scale-100"
                        >
                            {AR_LABELS.addToCart}
                        </button>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {paymentModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4" onClick={() => setPaymentModalOpen(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 w-full max-w-sm text-right" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">{AR_LABELS.checkout}</h2>
                        <div className="mb-4 p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-700 dark:to-gray-800 rounded-xl text-center border border-orange-200 dark:border-gray-600">
                            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-2">{AR_LABELS.grandTotal}</p>
                            <p className="text-3xl sm:text-4xl font-mono font-bold text-orange-600">{invoice.grandTotal.toFixed(2)} ر.س</p>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{AR_LABELS.paymentMethod}</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button 
                                    onClick={() => setSelectedPaymentMethod('Cash')} 
                                    className={`p-2 sm:p-3 rounded-xl border-2 text-center font-semibold text-xs sm:text-sm transition-all duration-200 ${
                                        selectedPaymentMethod === 'Cash' 
                                            ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/40 text-orange-700 dark:text-orange-300 shadow-lg scale-105' 
                                            : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50/50 dark:hover:bg-orange-900/20'
                                    }`}
                                >
                                    {AR_LABELS.cash}
                                </button>
                                <button 
                                    onClick={() => setSelectedPaymentMethod('Card')} 
                                    className={`p-2 sm:p-3 rounded-xl border-2 text-center font-semibold text-xs sm:text-sm transition-all duration-200 ${
                                        selectedPaymentMethod === 'Card' 
                                            ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/40 text-orange-700 dark:text-orange-300 shadow-lg scale-105' 
                                            : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50/50 dark:hover:bg-orange-900/20'
                                    }`}
                                >
                                    {AR_LABELS.visa}
                                </button>
                                <button 
                                    onClick={() => setSelectedPaymentMethod('Credit')} 
                                    className={`p-2 sm:p-3 rounded-xl border-2 text-center font-semibold text-xs sm:text-sm transition-all duration-200 ${
                                        selectedPaymentMethod === 'Credit' 
                                            ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/40 text-orange-700 dark:text-orange-300 shadow-lg scale-105' 
                                            : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50/50 dark:hover:bg-orange-900/20'
                                    }`}
                                >
                                    {AR_LABELS.credit}
                                </button>
                            </div>
                        </div>
                        {selectedPaymentMethod === 'Credit' && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{AR_LABELS.dueDate}</label>
                                <input 
                                    type="date" 
                                    value={dueDate} 
                                    onChange={e => setDueDate(e.target.value)} 
                                    className="w-full p-2 text-sm sm:text-base border-2 border-orange-300 dark:border-orange-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" 
                                />
                            </div>
                        )}
                        <div className="flex justify-between gap-2 sm:gap-3 mt-6">
                            <button 
                                onClick={() => setPaymentModalOpen(false)} 
                                className="w-full px-4 py-2.5 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-xl text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                            >
                                {AR_LABELS.cancel}
                            </button>
                            <button 
                                onClick={handleFinalizeSale}
                                disabled={isProcessingPayment}
                                className="w-full px-4 py-2.5 text-sm sm:text-base bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:via-emerald-600 hover:to-green-700 disabled:from-gray-400 disabled:via-gray-400 disabled:to-gray-500 dark:disabled:from-gray-600 dark:disabled:via-gray-600 dark:disabled:to-gray-700 shadow-xl hover:shadow-2xl transition-all duration-200 disabled:cursor-not-allowed"
                            >
                                {/* HIDDEN: Processing message removed - button stays disabled but shows normal text */}
                                {AR_LABELS.confirmPayment}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WholesalePOSPage;
