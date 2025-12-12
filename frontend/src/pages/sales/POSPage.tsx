import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Product, Customer, POSInvoice, POSCartItem, SaleTransaction } from '@/shared/types';

import { AR_LABELS, UUID, SearchIcon, DeleteIcon, PlusIcon, HandIcon, CancelIcon, PrintIcon, CheckCircleIcon, ReturnIcon } from '@/shared/constants';
import { ToggleSwitch } from '@/shared/components/ui/ToggleSwitch';
import CustomDropdown from '@/shared/components/ui/CustomDropdown/CustomDropdown';
import { customersApi, productsApi, storeSettingsApi, ApiError } from '@/lib/api/client';
import { useCurrency } from '@/shared/contexts/CurrencyContext';
// PaymentProcessingModal removed - using simple payment flow

// Local POS product type with optional units
type POSProduct = Product & {
    units?: Array<{
        unitName: string;
        barcode?: string;
        sellingPrice: number;
        conversionFactor: number;
    }>;
    cost?: number;
    costPrice?: number;
    updatedAt?: string;
    description?: string;
    showInQuickProducts?: boolean;
    status?: string;
};

// --- MOCK DATA ---
const MOCK_PRODUCTS_DATA: POSProduct[] = [
  { id: 1, name: 'لابتوب Dell XPS 15', category: 'إلكترونيات', price: 1200.00, costPrice: 950.00, stock: 50, barcode: '629100100001', expiryDate: '2025-12-31', createdAt: '2023-01-15' },
  { id: 2, name: 'هاتف Samsung S23', category: 'إلكترونيات', price: 899.99, costPrice: 700.00, stock: 120, barcode: '629100100002', expiryDate: '2026-06-30', createdAt: new Date().toISOString() },
  { id: 3, name: 'كوكا كولا', category: 'مشروبات', price: 2.50, costPrice: 1.50, stock: 200, barcode: '629100100003', expiryDate: '2024-12-01', createdAt: '2023-12-01' },
  { id: 4, name: 'ماء (صغير)', category: 'مشروبات', price: 1.00, costPrice: 0.50, stock: 500, barcode: '629100100004', expiryDate: '2025-01-01', createdAt: '2023-11-01' },
  { id: 5, name: 'ليز بالملح', category: 'وجبات خفيفة', price: 3.00, costPrice: 1.80, stock: 150, barcode: '629100100005', expiryDate: '2024-08-01', createdAt: '2023-12-10' },
  { id: 6, name: 'سماعات Sony XM5', category: 'إلكترونيات', price: 349.00, costPrice: 250.00, stock: 8, barcode: '629100100006', expiryDate: '2027-01-01', createdAt: '2023-09-01' },
];

const MOCK_ORIGINAL_INVOICES: POSInvoice[] = [
    {
        id: 'INV-2024-ABCDE',
        date: new Date('2024-07-20T10:30:00Z'),
        cashier: AR_LABELS.ahmadSai,
        customer: { id: 'CUST-1', name: 'علي محمد', phone: '0501234567', previousBalance: 0 },
        items: [
            { productId: 3, name: 'كوكا كولا', unit: 'قطعة', quantity: 10, unitPrice: 2.50, total: 25.00, discount: 0 },
            { productId: 5, name: 'ليز بالملح', unit: 'قطعة', quantity: 5, unitPrice: 3.00, total: 15.00, discount: 1 },
        ],
        subtotal: 40.00,
        totalItemDiscount: 5,
        invoiceDiscount: 0,
        tax: 5.25,
        grandTotal: 40.25,
        paymentMethod: 'Cash',
    },
    {
        id: 'INV-2024-FGHIJ',
        date: new Date('2024-07-18T15:00:00Z'),
        cashier: AR_LABELS.ahmadSai,
        customer: { id: 'CUST-2', name: 'فاطمة الزهراء', phone: '0557654321', previousBalance: 150.75 },
        items: [
            { productId: 6, name: 'سماعات Sony XM5', unit: 'قطعة', quantity: 1, unitPrice: 349.00, total: 349.00, discount: 0 },
        ],
        subtotal: 349.00,
        totalItemDiscount: 0,
        invoiceDiscount: 0,
        tax: 52.35,
        grandTotal: 401.35,
        paymentMethod: 'Card',
    }
];

// All dummy/fake customers have been removed. Customer list starts empty.

const generateNewInvoice = (cashierName: string): POSInvoice => ({
  id: `INV-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
  date: new Date(),
  cashier: cashierName,
  customer: null, // No default dummy customer
  items: [],
  subtotal: 0,
  totalItemDiscount: 0,
  invoiceDiscount: 0,
  tax: 0,
  grandTotal: 0,
  paymentMethod: null,
});

// Helper function to filter out dummy/test customers
const isDummyCustomer = (customer: Customer): boolean => {
    const name = customer.name?.toLowerCase() || '';
    const phone = customer.phone?.toLowerCase() || '';
    
    // Common patterns for dummy/test customers
    const dummyPatterns = [
        'test', 'dummy', 'fake', 'example', 'sample', 'demo',
        'اختبار', 'تجريبي', 'مثال', 'وهمي'
    ];
    
    // Check if name or phone contains dummy patterns
    const isDummyName = dummyPatterns.some(pattern => name.includes(pattern));
    const isDummyPhone = phone.length < 5 || /^(000|111|123|999)/.test(phone.replace(/\D/g, ''));
    
    return isDummyName || isDummyPhone;
};

// --- MAIN POS COMPONENT ---
const POSPage: React.FC = () => {
    const { formatCurrency } = useCurrency();
    const [products, setProducts] = useState<POSProduct[]>(MOCK_PRODUCTS_DATA);
    const [quickProducts, setQuickProducts] = useState<POSProduct[]>([]);
    const [isLoadingQuickProducts, setIsLoadingQuickProducts] = useState(false);
    const [productSuggestionsOpen, setProductSuggestionsOpen] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]); // Customer list - starts empty, no dummy customers
    const [allCustomers, setAllCustomers] = useState<Customer[]>([]); // All customers from API
    const [customerSearchTerm, setCustomerSearchTerm] = useState(''); // Search term for customers
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
    const [currentInvoice, setCurrentInvoice] = useState<POSInvoice>(() => generateNewInvoice(AR_LABELS.ahmadSai));
    const [heldInvoices, setHeldInvoices] = useState<POSInvoice[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [saleCompleted, setSaleCompleted] = useState(false);
    const [returnCompleted, setReturnCompleted] = useState<SaleTransaction | null>(null);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('Cash');
    const [creditPaidAmount, setCreditPaidAmount] = useState(0);
    const [autoPrintEnabled, setAutoPrintEnabled] = useState(true);
    const [isReturnModalOpen, setReturnModalOpen] = useState(false);
    const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
    const [taxRate, setTaxRate] = useState<number>(0.15); // default 15% until settings load
    
    // Fetch tax rate from system settings (store settings)
    const fetchTaxRate = useCallback(async () => {
        try {
            const response = await storeSettingsApi.getSettings();
            const settings = (response.data as any)?.data?.settings || (response.data as any)?.settings || {};
            // Build a case-insensitive map of settings
            const settingsMap: Record<string, any> = {};
            Object.keys(settings || {}).forEach((k) => {
                settingsMap[k.toLowerCase()] = settings[k];
            });

            const get = (key: string) => settings[key] ?? settingsMap[key.toLowerCase()];

            // Accept several possible keys (lower/upper/underscored), and strip % if present
            const rawTax =
                get('taxRate') ??
                get('vatPercentage') ??
                get('vatRate') ??
                get('vat') ??
                get('tax') ??
                get('vat_percentage') ??
                get('tax_percentage') ??
                get('vatpercent') ??
                get('taxpercent') ??
                get('TAX_RATE') ??
                get('VAT_PERCENTAGE') ??
                get('VAT_RATE') ??
                get('VAT_PERCENT') ??
                get('TAX') ??
                get('VAT');
            if (rawTax !== undefined && rawTax !== null) {
                const cleaned = typeof rawTax === 'string' ? rawTax.replace('%', '').trim() : rawTax;
                const parsed = parseFloat(cleaned);
                if (!isNaN(parsed)) {
                    // If value looks like a whole number (> 1), treat as percentage (e.g., 15 => 0.15)
                    const normalized = parsed > 1 ? parsed / 100 : parsed;
                    setTaxRate(normalized);
                    return;
                }
            }
            // If nothing usable, keep default
            console.warn('Tax rate setting missing or invalid, using default 15%');
        } catch (err) {
            console.error('Failed to fetch tax rate from settings:', err);
        }
    }, []);
    
    const calculateTotals = useCallback((items: POSCartItem[], invoiceDiscount: number): Pick<POSInvoice, 'subtotal' | 'totalItemDiscount' | 'tax' | 'grandTotal'> => {
        const subtotal = items.reduce((acc, item) => acc + item.total, 0);
        const totalItemDiscount = items.reduce((acc, item) => acc + item.discount * item.quantity, 0);
        const totalDiscountValue = totalItemDiscount + invoiceDiscount;
        const taxableAmount = Math.max(0, subtotal - totalDiscountValue);
        const tax = taxableAmount * taxRate;
        const grandTotal = taxableAmount + tax;
        return { subtotal, totalItemDiscount, tax, grandTotal };
    }, [taxRate]);

    useEffect(() => {
        const newTotals = calculateTotals(currentInvoice.items, currentInvoice.invoiceDiscount);
        setCurrentInvoice(inv => ({ ...inv, ...newTotals }));
    }, [currentInvoice.items, currentInvoice.invoiceDiscount, calculateTotals]);
    
    // Fetch customers from API - made as useCallback so it can be called after customer creation
    const fetchCustomers = useCallback(async () => {
        setIsLoadingCustomers(true);
        try {
            const response = await customersApi.getCustomers();
            const customersData = (response.data as any)?.data?.customers || [];
            
            // Transform backend data to frontend Customer format and filter out dummy customers
            const transformedCustomers: Customer[] = Array.isArray(customersData)
                ? customersData
                    .map((customer: any) => ({
                        id: customer.id,
                        name: customer.name || customer.phone,
                        phone: customer.phone,
                        address: customer.address,
                        previousBalance: customer.previousBalance || 0,
                    }))
                    .filter((customer: Customer) => !isDummyCustomer(customer))
                : [];
            
            setAllCustomers(transformedCustomers);
            setCustomers(transformedCustomers);
        } catch (err: any) {
            const apiError = err as ApiError;
            console.error('Error fetching customers:', apiError);
            // Don't show error to user, just log it - customers list will remain empty
        } finally {
            setIsLoadingCustomers(false);
        }
    }, []);

    // Fetch quick products from API
    const fetchQuickProducts = useCallback(async () => {
        setIsLoadingQuickProducts(true);
        try {
            // Fetch all products - fetch multiple pages if needed to get all products
            let allProductsData: any[] = [];
            let currentPage = 1;
            let hasMorePages = true;
            const pageSize = 1000; // Max allowed by backend
            
            // Fetch all pages of products
            while (hasMorePages) {
                const response = await productsApi.getProducts({ page: currentPage, limit: pageSize });
                if (response.success) {
                    const productsData = (response.data as any)?.products || (response.data as any)?.data?.products || [];
                    allProductsData = [...allProductsData, ...productsData];
                    
                    // Check if there are more pages
                    const pagination = (response.data as any)?.pagination;
                    if (pagination) {
                        hasMorePages = pagination.hasNextPage === true;
                        currentPage++;
                    } else {
                        // If no pagination info, stop after first page
                        hasMorePages = false;
                    }
                } else {
                    hasMorePages = false;
                }
            }
            
            if (allProductsData.length > 0) {
                // Helper to normalize a backend product into our Product shape
                const normalizeProduct = (p: any): POSProduct => {
                    // Handle ID - can be string (MongoDB ObjectId) or number
                    let productId: number;
                    if (typeof p.id === 'string') {
                        // Try to parse as number, if fails use hash of string
                        const parsed = parseInt(p.id);
                        if (!isNaN(parsed) && parsed > 0) {
                            productId = parsed;
                        } else {
                            // Use hash of string ID to get consistent numeric ID
                            productId = p.id.split('').reduce((acc: number, char: string) => {
                                return ((acc << 5) - acc) + char.charCodeAt(0);
                            }, 0);
                            // Ensure positive number
                            productId = Math.abs(productId);
                        }
                    } else if (typeof p._id === 'string') {
                        // Fallback to _id if id doesn't exist
                        const parsed = parseInt(p._id);
                        productId = !isNaN(parsed) && parsed > 0 ? parsed : Math.abs(p._id.split('').reduce((acc: number, char: string) => {
                            return ((acc << 5) - acc) + char.charCodeAt(0);
                        }, 0));
                    } else {
                        productId = parseInt(p.id) || parseInt(p._id) || Date.now() + Math.random();
                    }
                    
                    return {
                        id: productId,
                        name: p.name || '',
                        category: p.categoryId || '',
                        price: parseFloat(p.price) || 0,
                        costPrice: parseFloat(p.costPrice) || 0,
                        cost: parseFloat(p.costPrice) || 0,
                        stock: parseInt(p.stock) || 0,
                        barcode: p.barcode || '',
                        units: Array.isArray(p.units)
                            ? p.units.map((u: any) => ({
                                unitName: u.unitName || u.name || '',
                                barcode: u.barcode || '',
                                sellingPrice: parseFloat(u.sellingPrice) || parseFloat(p.price) || 0,
                                conversionFactor: parseFloat(u.conversionFactor) || 1,
                              }))
                            : undefined,
                        expiryDate: p.expiryDate ? new Date(p.expiryDate).toISOString().split('T')[0] : '',
                        createdAt: p.createdAt || new Date().toISOString(),
                        updatedAt: p.updatedAt || new Date().toISOString(),
                        brand: p.brandId || '',
                        description: p.description,
                        showInQuickProducts: p.showInQuickProducts === true,
                        status: p.status || 'active', // Store status for reference
                    };
                };

                // Filter products that have showInQuickProducts enabled and are active for quick products
                const quickProductsList = allProductsData
                    .filter((p: any) => p.showInQuickProducts === true && (p.status === 'active' || !p.status))
                    .map((p: any) => normalizeProduct(p));
                
                setQuickProducts(quickProductsList);
                
                // Update the main products list with ALL products (regardless of status) for search functionality
                // This ensures all products in the database are searchable in POS
                const allProductsList = allProductsData.map((p: any) => normalizeProduct(p));
                setProducts(allProductsList);
                
                console.log(`Loaded ${allProductsList.length} products for POS (${quickProductsList.length} quick products)`);
            } else {
                console.warn('No products found in API response');
            }
        } catch (err: any) {
            console.error('Error fetching quick products:', err);
            // Keep using mock data on error
        } finally {
            setIsLoadingQuickProducts(false);
        }
    }, []);

    // Fetch customers and quick products on mount
    useEffect(() => {
        fetchCustomers();
        fetchTaxRate();
        fetchQuickProducts();
    }, [fetchCustomers, fetchQuickProducts, fetchTaxRate]);

    // Filter customers based on search term
    useEffect(() => {
        if (!customerSearchTerm.trim()) {
            setCustomers(allCustomers);
            return;
        }
        
        const searchLower = customerSearchTerm.toLowerCase();
        const filtered = allCustomers.filter(customer => 
            customer.name?.toLowerCase().includes(searchLower) ||
            customer.phone?.includes(searchLower) ||
            customer.address?.toLowerCase().includes(searchLower)
        );
        setCustomers(filtered);
    }, [customerSearchTerm, allCustomers]);

    useEffect(() => {
        if ((saleCompleted || returnCompleted) && autoPrintEnabled) {
            const timer = setTimeout(() => window.print(), 300); // Small delay to ensure render
            return () => clearTimeout(timer);
        }
    }, [saleCompleted, returnCompleted, autoPrintEnabled]);

    const getPiecesPerMainUnit = useCallback((product?: POSProduct): number => {
        if (!product?.units || product.units.length === 0) return 1;
        // Use the largest conversion factor to represent the smallest sub-unit (pieces per main unit)
        const maxFactor = Math.max(...product.units.map(u => (u.conversionFactor && u.conversionFactor > 0 ? u.conversionFactor : 0)));
        return maxFactor > 0 ? maxFactor : 1;
    }, []);

    const getUnitConversionFactor = useCallback((product: POSProduct | undefined, unitName?: string): number => {
        if (!product) return 1;
        const normalizedUnit = unitName?.toLowerCase().trim();
        const matched = product.units?.find(
            (u) =>
                !!u.unitName &&
                !!normalizedUnit &&
                u.unitName.toLowerCase() === normalizedUnit
        );
        const factor = matched?.conversionFactor;
        return factor && factor > 0 ? factor : 1;
    }, []);

    const handleAddProduct = (product: POSProduct, unit = 'قطعة', unitPriceOverride?: number, conversionFactorOverride?: number, piecesPerUnitOverride?: number) => {
        const productFromState = products.find(prod => prod.id === product.id) || product;
        const piecesPerMainUnit = getPiecesPerMainUnit(productFromState);
        const conversionFactor = conversionFactorOverride && conversionFactorOverride > 0
            ? conversionFactorOverride
            : getUnitConversionFactor(productFromState, unit);

        // piecesPerUnit determines how many pieces to add for this scan
        const piecesPerUnit = piecesPerUnitOverride && piecesPerUnitOverride > 0
            ? piecesPerUnitOverride
            : unit === 'قطعة'
                ? 1
                : piecesPerMainUnit;

        // Price we receive should be per-piece to keep totals accurate
        const incomingUnitPrice = unitPriceOverride ?? (piecesPerUnit > 0 ? (productFromState.price / piecesPerMainUnit) : productFromState.price);

        setCurrentInvoice(inv => {
            const existingItem = inv.items.find(item => item.productId === product.id);
            const currentQuantity = existingItem?.quantity || 0;
            const newQuantity = currentQuantity + piecesPerUnit;

            // Stock check using piece-based quantities
            const availablePieces = productFromState ? productFromState.stock * piecesPerMainUnit : Infinity;
            if (newQuantity > availablePieces) {
                alert(`الكمية المطلوبة (${newQuantity}) تتجاوز المخزون المتوفر (${availablePieces}).`);
                return inv;
            }

            if (existingItem) {
                const updatedQuantity = newQuantity;
                const updatedTotal = (existingItem.total ?? (existingItem.unitPrice * existingItem.quantity)) + (incomingUnitPrice * piecesPerUnit);
                const averagedUnitPrice = updatedQuantity > 0 ? updatedTotal / updatedQuantity : existingItem.unitPrice;

                return {
                    ...inv,
                    items: inv.items.map(item =>
                        item.productId === product.id
                            ? {
                                  ...item,
                                  quantity: updatedQuantity,
                                  total: updatedTotal,
                                  unitPrice: averagedUnitPrice,
                                  conversionFactor: item.conversionFactor || conversionFactor || piecesPerMainUnit,
                              }
                            : item
                    ),
                };
            }

            const initialQuantity = piecesPerUnit;
            const initialTotal = incomingUnitPrice * piecesPerUnit;

            const newItem: POSCartItem = {
                productId: product.id,
                name: product.name,
                unit: unit,
                quantity: initialQuantity,
                unitPrice: incomingUnitPrice,
                total: initialTotal,
                discount: 0,
                conversionFactor: conversionFactor || piecesPerMainUnit,
            };
            return { ...inv, items: [...inv.items, newItem] };
        });

        setSearchTerm('');
        setProductSuggestionsOpen(false);
    };
    
    type SearchMatch = { product: POSProduct; unitName: string; unitPrice: number; barcode?: string; conversionFactor?: number; piecesPerUnit?: number };

    const resolveSearchMatches = useCallback((term: string): SearchMatch[] => {
        const trimmed = term.trim();
        if (!trimmed) return [];
        const lower = trimmed.toLowerCase();
        const results: SearchMatch[] = [];

        products.forEach((p) => {
            const piecesPerMainUnit = getPiecesPerMainUnit(p);

            // Barcode exact match on product
            if (p.barcode && (p.barcode === trimmed || p.barcode.toLowerCase() === lower)) {
                const perPiecePrice = piecesPerMainUnit > 0 ? p.price / piecesPerMainUnit : p.price;
                results.push({ product: p, unitName: 'كرتون', unitPrice: perPiecePrice, barcode: p.barcode, conversionFactor: piecesPerMainUnit, piecesPerUnit: piecesPerMainUnit });
            }
            // Barcode match on units
            if (p.units) {
                for (const u of p.units) {
                    if (u.barcode && (u.barcode === trimmed || u.barcode.toLowerCase() === lower)) {
                        const perPiecePrice = u.sellingPrice || (piecesPerMainUnit > 0 ? p.price / piecesPerMainUnit : p.price);
                        // Secondary units are counted as 1 piece per scan
                        results.push({ product: p, unitName: u.unitName || 'قطعة', unitPrice: perPiecePrice, barcode: u.barcode, conversionFactor: u.conversionFactor || piecesPerMainUnit, piecesPerUnit: 1 });
                    }
                }
            }
            // Name contains
            if (p.name && p.name.toLowerCase().includes(lower)) {
                const perPiecePrice = piecesPerMainUnit > 0 ? p.price / piecesPerMainUnit : p.price;
                results.push({ product: p, unitName: 'كرتون', unitPrice: perPiecePrice, barcode: p.barcode, conversionFactor: piecesPerMainUnit, piecesPerUnit: piecesPerMainUnit });
            }
        });

        // Deduplicate exact same product+unit combination
        const seen = new Set<string>();
        return results.filter((r) => {
            const key = `${r.product.id}-${r.unitName}-${r.barcode || ''}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [products]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const matches = resolveSearchMatches(searchTerm);
        if (matches.length === 0) {
            alert('المنتج غير موجود');
            return;
        }
        if (matches.length === 1) {
            const match = matches[0];
            handleAddProduct(match.product, match.unitName, match.unitPrice, match.conversionFactor, match.piecesPerUnit);
        } else {
            // Show all matches for the cashier to pick
            setProductSuggestionsOpen(true);
        }
    };

    const productSuggestions = useMemo(() => {
        const matches = resolveSearchMatches(searchTerm);
        return matches.slice(0, 12);
    }, [searchTerm, resolveSearchMatches]);

    const handleUpdateQuantity = (productId: number, quantity: number) => {
        const normalizedQuantity = Number.isFinite(quantity) ? quantity : 0;
        const roundedQuantity = Math.max(0, Math.round(normalizedQuantity));
        const p = products.find(prod => prod.id === productId);
        const piecesPerMainUnit = getPiecesPerMainUnit(p);
        const availablePieces = p ? p.stock * piecesPerMainUnit : Infinity;
        if (p && roundedQuantity > availablePieces) {
            alert(`الكمية المطلوبة (${roundedQuantity}) تتجاوز المخزون المتوفر (${availablePieces}). لا يمكنك إضافة المزيد.`);
            return;
        }

        if (roundedQuantity < 1) {
            handleRemoveItem(productId);
            return;
        }
        setCurrentInvoice(inv => ({
            ...inv,
            items: inv.items.map(item =>
                item.productId === productId ? { ...item, quantity: roundedQuantity, total: item.unitPrice * roundedQuantity } : item
            ),
        }));
    };

    const handleUpdateItemDiscount = (productId: number, discount: number) => {
        setCurrentInvoice(inv => ({
            ...inv,
            items: inv.items.map(item =>
                item.productId === productId ? { ...item, discount: Math.max(0, discount) } : item
            ),
        }));
    };

    const handleRemoveItem = (productId: number) => {
        setCurrentInvoice(inv => ({
            ...inv,
            items: inv.items.filter(item => item.productId !== productId),
        }));
    };

    const handleHoldSale = () => {
        if (currentInvoice.items.length === 0) return;
        setHeldInvoices(prev => [...prev, currentInvoice]);
        setCurrentInvoice(generateNewInvoice(AR_LABELS.ahmadSai));
    };

    const handleRestoreSale = (invoiceId: string) => {
        const invoiceToRestore = heldInvoices.find(inv => inv.id === invoiceId);
        if (invoiceToRestore) {
            setHeldInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
            setCurrentInvoice(invoiceToRestore);
        }
    };
    
    const startNewSale = () => {
        setSaleCompleted(false);
        setReturnCompleted(null);
        setCurrentInvoice(generateNewInvoice(AR_LABELS.ahmadSai));
        setSelectedPaymentMethod('Cash');
        setCreditPaidAmount(0);
    }
    
    const handleFinalizePayment = () => {
        if (currentInvoice.items.length === 0) return;

        if (selectedPaymentMethod === 'Credit' && !currentInvoice.customer) {
            alert(AR_LABELS.selectRegisteredCustomerForCredit);
            return;
        }

        if (selectedPaymentMethod === 'Credit' && creditPaidAmount < 0) {
            alert('المبلغ المدفوع لا يمكن أن يكون سالباً.');
            return;
        }

        // For all payment methods (Cash, Credit, Card), proceed directly
        // Card payments are handled without terminal integration
        finalizeSaleWithoutTerminal();
    };

    const finalizeSaleWithoutTerminal = () => {
        // Deduct stock
        setProducts(prevProducts => {
            const newProducts = [...prevProducts];
            currentInvoice.items.forEach(item => {
                const productIndex = newProducts.findIndex(p => p.id === item.productId);
                if (productIndex !== -1) {
                    newProducts[productIndex].stock -= item.quantity;
                }
            });
            return newProducts;
        });
        
        const finalInvoice = { ...currentInvoice, paymentMethod: selectedPaymentMethod };
        console.log('Sale Finalized:', finalInvoice);
        setCurrentInvoice(finalInvoice);
        setSaleCompleted(true);
    };


    const handleConfirmReturn = (returnInvoice: SaleTransaction) => {
        // Quantities in returnInvoice.items are negative, so this adds stock back.
        setProducts(prevProducts => {
            const newProducts = [...prevProducts];
            returnInvoice.items.forEach(item => {
                const productIndex = newProducts.findIndex(p => p.id === item.productId);
                if (productIndex !== -1) {
                    newProducts[productIndex].stock -= item.quantity; // e.g., 50 - (-2) = 52
                }
            });
            return newProducts;
        });

        console.log("RETURN INVOICE CREATED:", returnInvoice);
        setReturnModalOpen(false);
        setReturnCompleted(returnInvoice);
    };

    const renderReceipt = (invoice: SaleTransaction | POSInvoice, title: string) => {
        const isReturn = 'originalInvoiceId' in invoice;
        return (
            <div id="printable-receipt" className="w-full max-w-md bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg text-right">
                <div className="text-center mb-3 sm:mb-4">
                    <CheckCircleIcon className={`w-12 h-12 sm:w-16 sm:h-16 ${isReturn ? 'text-blue-500' : 'text-green-500'} mx-auto print-hidden`} />
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 mt-2 print-hidden">{isReturn ? AR_LABELS.returnCompleted : AR_LABELS.saleCompleted}</h2>
                    <h3 className="text-lg sm:text-xl font-bold text-center text-gray-900 dark:text-gray-100 mt-3 sm:mt-4">{title}</h3>
                    <p className="text-center text-xs text-gray-500 dark:text-gray-400">123 الشارع التجاري, الرياض, السعودية</p>
                </div>

                <div className="text-xs my-3 sm:my-4 space-y-1 border-b border-dashed pb-2">
                    <p><strong>{AR_LABELS.invoiceNumber}:</strong> {invoice.id}</p>
                    {isReturn && 'originalInvoiceId' in invoice && <p><strong>{AR_LABELS.originalInvoiceNumber}:</strong> {invoice.originalInvoiceId}</p>}
                    <p><strong>{AR_LABELS.date}:</strong> {new Date(invoice.date).toLocaleString('ar-SA')}</p>
                    {/* FIX: Use type guard to access 'cashier' or 'seller' property */}
                    <p><strong>{AR_LABELS.posCashier}:</strong> {'cashier' in invoice ? invoice.cashier : invoice.seller}</p>
                    <p><strong>{AR_LABELS.customerName}:</strong> {'customer' in invoice ? invoice.customer?.name : invoice.customerName || 'N/A'}</p>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-full">
                        <thead>
                            <tr className="border-b-2 border-dashed border-gray-400 dark:border-gray-500">
                                <th className="py-1 text-right font-semibold px-1 sm:px-2">الصنف</th>
                                <th className="py-1 text-center font-semibold px-1 sm:px-2">الكمية</th>
                                <th className="py-1 text-center font-semibold px-1 sm:px-2">السعر</th>
                                <th className="py-1 text-left font-semibold px-1 sm:px-2">الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items.map(item => (
                                <tr key={item.productId} className="border-b border-dashed border-gray-300 dark:border-gray-600">
                                    <td className="py-1 px-1 sm:px-2">{item.name}</td>
                                    <td className="py-1 text-center px-1 sm:px-2">{Math.abs(item.quantity)}</td>
                                    <td className="py-1 text-center px-1 sm:px-2">{formatCurrency(item.unitPrice)}</td>
                                    <td className="py-1 text-left px-1 sm:px-2">{formatCurrency(Math.abs(item.total - item.discount * item.quantity))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-3 sm:mt-4 text-xs space-y-1">
                    <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">{AR_LABELS.subtotal}:</span><span>{formatCurrency(Math.abs(invoice.subtotal))}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">{AR_LABELS.totalDiscount}:</span><span>{formatCurrency(Math.abs(invoice.totalItemDiscount + invoice.invoiceDiscount))}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">{AR_LABELS.tax}:</span><span>{formatCurrency(Math.abs(invoice.tax))}</span></div>
                    <div className="flex justify-between font-bold text-sm sm:text-base border-t dark:border-gray-600 pt-1 mt-1"><span className="text-gray-800 dark:text-gray-100">{isReturn ? AR_LABELS.totalReturnValue : AR_LABELS.grandTotal}:</span><span className={isReturn ? 'text-red-600' : 'text-orange-600'}>{formatCurrency(Math.abs('grandTotal' in invoice ? invoice.grandTotal : invoice.totalAmount))}</span></div>
                </div>
                <p className="text-center text-xs mt-4 sm:mt-6 text-gray-500 dark:text-gray-400">شكراً لتعاملكم معنا!</p>
            </div>
        );
    }
    
    if (saleCompleted || returnCompleted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6">
                {saleCompleted && renderReceipt(currentInvoice, 'PoshPointHub')}
                {returnCompleted && renderReceipt(returnCompleted, AR_LABELS.returnInvoice)}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:space-x-4 sm:space-x-reverse mt-4 sm:mt-6 print-hidden w-full max-w-md">
                    <button onClick={startNewSale} className="inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 border border-transparent text-sm sm:text-base font-medium rounded-md shadow-sm text-white bg-orange-500 hover:bg-orange-600 transition-colors">
                        <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5 ml-2" />
                        <span>{AR_LABELS.startNewSale}</span>
                    </button>
                    <button onClick={() => window.print()} className="inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 text-sm sm:text-base font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                        <span className="h-4 w-4 sm:h-5 sm:w-5"><PrintIcon /></span>
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
                {/* Modern Header */}
                <div className="mb-4 sm:mb-6">
                    <div className="inline-flex items-center rounded-full bg-gradient-to-r from-orange-500/10 to-amber-500/10 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-orange-600 dark:text-orange-400 border border-orange-200/50 dark:border-orange-800/50 mb-2 sm:mb-3">
                        <div className="mr-2 h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                        نقاط البيع (POS)
                    </div>
                    <h1 className="bg-gradient-to-r from-slate-900 via-orange-900 to-slate-900 bg-clip-text text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-transparent dark:from-white dark:via-orange-100 dark:to-white">
                        {'نقطة البيع'}
                    </h1>
                </div>

                {/* Three Column Layout - Proportional widths: 25% - 50% - 25% */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_1fr] gap-3 sm:gap-4 h-auto md:h-[calc(100vh-12rem)] w-full overflow-x-hidden">
                   {/* Column 1: Customer & Quick Products (25%) */}
                    <div className="flex flex-col gap-3 sm:gap-4 min-h-0 min-w-0">
                        {/* Customer & Held Invoices */}
                        <div className="bg-white/95 dark:bg-gray-800/95 rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 space-y-3 sm:space-y-4 flex flex-col min-h-0">
                            <div className="flex-shrink-0">
                                <h3 className="font-bold text-sm sm:text-base text-gray-700 dark:text-gray-200 text-right mb-2">{AR_LABELS.customerName}</h3>
                                
                                {/* Customer Search Input */}
                                <div className="relative mb-2">
                                    <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                                    <input
                                        type="text"
                                        value={customerSearchTerm}
                                        onChange={(e) => {
                                            setCustomerSearchTerm(e.target.value);
                                            setIsCustomerDropdownOpen(true);
                                        }}
                                        onFocus={() => setIsCustomerDropdownOpen(true)}
                                        placeholder="ابحث عن عميل..."
                                        className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-right"
                                    />
                                </div>

                                {/* Selected Customer Display */}
                                {currentInvoice.customer && (
                                    <div className="mb-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                        <div className="flex justify-between items-start">
                                            <button
                                                onClick={() => setCurrentInvoice(inv => ({...inv, customer: null}))}
                                                className="text-red-500 hover:text-red-700 text-xs"
                                            >
                                                ✕
                                            </button>
                                            <div className="flex-1 text-right">
                                                <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{currentInvoice.customer.name}</p>
                                                <p className="text-xs text-gray-600 dark:text-gray-400">{currentInvoice.customer.phone}</p>
                                                {currentInvoice.customer.address && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{currentInvoice.customer.address}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Customer List Dropdown */}
                                {isCustomerDropdownOpen && (
                                    <>
                                        {/* Click outside to close dropdown */}
                                        <div
                                            className="fixed inset-0 z-[5]"
                                            onClick={() => setIsCustomerDropdownOpen(false)}
                                        />
                                        <div className="relative z-[10]">
                                            <div className="absolute w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                                {isLoadingCustomers ? (
                                                    <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">جاري التحميل...</div>
                                                ) : customers.length === 0 ? (
                                                    <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                                        {customerSearchTerm ? 'لا توجد نتائج' : 'لا يوجد عملاء'}
                                                    </div>
                                                ) : (
                                                    <div className="max-h-60 overflow-y-auto">
                                                        {customers.map((customer) => (
                                                            <button
                                                                key={customer.id}
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setCurrentInvoice(inv => ({...inv, customer}));
                                                                    setIsCustomerDropdownOpen(false);
                                                                    setCustomerSearchTerm('');
                                                                }}
                                                                className={`w-full text-right p-3 hover:bg-orange-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                                                                    currentInvoice.customer?.id === customer.id ? 'bg-orange-100 dark:bg-orange-900/30' : ''
                                                                }`}
                                                            >
                                                                <div className="flex flex-col items-end">
                                                                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{customer.name}</p>
                                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{customer.phone}</p>
                                                                    {customer.address && (
                                                                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 truncate w-full">{customer.address}</p>
                                                                    )}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}

                                <button 
                                    onClick={() => setIsAddCustomerModalOpen(true)}
                                    className="w-full text-center text-xs sm:text-sm text-orange-600 hover:text-orange-700 dark:text-orange-400 font-medium transition-colors py-1.5 mt-2"
                                >
                                    {AR_LABELS.addNewCustomer}
                                </button>
                            </div>
                            
                            {heldInvoices.length > 0 && (
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 sm:pt-4 flex-shrink-0">
                                    <h3 className="font-bold text-sm sm:text-base text-gray-700 dark:text-gray-200 text-right mb-2">{AR_LABELS.heldInvoices}</h3>
                                    <div className="space-y-2 max-h-20 sm:max-h-24 overflow-y-auto">
                                        {heldInvoices.map(inv => (
                                            <div key={inv.id} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs sm:text-sm">
                                                <span className="text-gray-800 dark:text-gray-300 truncate flex-1">{inv.id} ({inv.items.length} أصناف)</span>
                                                <button onClick={() => handleRestoreSale(inv.id)} className="text-green-600 hover:underline mr-2 flex-shrink-0">{AR_LABELS.restore}</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Quick Products */}
                        <div className="bg-white/95 dark:bg-gray-800/95 rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 flex-grow overflow-y-auto">
                            <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 text-right mb-3 sm:mb-4">{AR_LABELS.quickProducts}</h3>
                            {isLoadingQuickProducts ? (
                                <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                                    جاري التحميل...
                                </div>
                            ) : quickProducts.length === 0 ? (
                                <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                                    لا توجد منتجات سريعة. قم بتمكين المنتجات من إعدادات المنتج.
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                    {quickProducts.map(p => (
                                        <button 
                                            key={p.id} 
                                            onClick={() => handleAddProduct(p)} 
                                            disabled={p.stock <= 0}
                                            className="group p-3 sm:p-4 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl text-center hover:bg-orange-50 dark:hover:bg-gray-700 hover:border-orange-300 dark:hover:border-orange-600 transition-all duration-200 hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <span className="block text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{p.name}</span>
                                            <span className="block text-xs font-bold text-orange-600">{formatCurrency(p.price)}</span>
                                            {p.stock <= 0 && (
                                                <span className="block text-xs text-red-500 mt-1">نفد المخزون</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Column 2: Transaction/Cart (50% - Center, wider) */}
                    <div className="flex flex-col bg-white/95 dark:bg-gray-800/95 rounded-xl sm:rounded-2xl shadow-sm backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 min-h-0 min-w-0 overflow-hidden">
                        {/* Header */}
                        <div className="p-3 sm:p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs sm:text-sm text-gray-700 dark:text-gray-300 flex flex-col sm:flex-row justify-between gap-2 sm:gap-0 rounded-t-xl sm:rounded-t-2xl flex-shrink-0">
                            <span className="font-semibold truncate">{AR_LABELS.invoiceNumber}: <span className="font-mono text-orange-600">{currentInvoice.id}</span></span>
                            <span className="font-semibold truncate">{AR_LABELS.posCashier}: <span className="text-gray-900 dark:text-gray-100">{currentInvoice.cashier}</span></span>
                        </div>
                        {/* Search */}
                        <form onSubmit={handleSearch} className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                            <div className="relative">
                                <SearchIcon className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-gray-500" />
                                <input 
                                    type="text" 
                                    value={searchTerm} 
                                    onChange={e => {
                                        setSearchTerm(e.target.value);
                                        setProductSuggestionsOpen(true);
                                    }} 
                                    onFocus={() => setProductSuggestionsOpen(true)}
                                    placeholder={AR_LABELS.searchProductPlaceholder} 
                                    className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 text-sm sm:text-base rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-right"
                                />
                                {productSuggestionsOpen && productSuggestions.length > 0 && (
                                    <div className="absolute z-20 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {productSuggestions.map((s, idx) => (
                                            <button
                                                key={`${s.product.id}-${s.unitName}-${idx}`}
                                                type="button"
                                                onClick={() => handleAddProduct(s.product, s.unitName, s.unitPrice, s.conversionFactor, s.piecesPerUnit)}
                                                className="w-full text-right px-3 py-2 text-sm hover:bg-orange-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                                            >
                                                <div className="font-semibold text-gray-800 dark:text-gray-100">{s.product.name}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {s.unitName} • {s.barcode || s.product.barcode || 'بدون باركود'} • {formatCurrency(s.unitPrice)}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </form>
                        {/* Cart */}
                        <div className="flex-grow overflow-y-auto overflow-x-auto min-w-0">
                            <div className="overflow-x-auto min-w-0">
                                <table className="w-full text-right min-w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                        <tr>
                                            <th className="px-2 sm:px-3 py-2 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[5%]">#</th>
                                            <th className="px-2 sm:px-3 py-2 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[30%]">{AR_LABELS.productName}</th>
                                            <th className="px-2 sm:px-3 py-2 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[12%]">{AR_LABELS.quantity}</th>
                                            <th className="px-2 sm:px-3 py-2 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[12%]">{AR_LABELS.price}</th>
                                            <th className="px-2 sm:px-3 py-2 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[12%]">{AR_LABELS.discount}</th>
                                            <th className="px-2 sm:px-3 py-2 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[15%]">{AR_LABELS.totalAmount}</th>
                                            <th className="px-2 sm:px-3 py-2 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[10%]"></th>
                                        </tr>
                                    </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                   {currentInvoice.items.length === 0 ? (
                                        <tr><td colSpan={7} className="text-center py-8 sm:py-10 text-xs sm:text-sm text-gray-500 dark:text-gray-400">{AR_LABELS.noItemsInCart}</td></tr>
                                   ) : currentInvoice.items.map((item, index) => (
                                        <tr key={item.productId} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                                            <td className="px-2 sm:px-3 py-3 sm:py-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">{index + 1}</td>
                                            <td className="px-2 sm:px-3 py-3 sm:py-4 text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{item.name}</td>
                                            <td className="px-2 sm:px-3 py-3 sm:py-4">
                                                <input 
                                                    type="number" 
                                                    value={item.quantity} 
                                                        onChange={e => {
                                                            const value = parseFloat(e.target.value);
                                                            handleUpdateQuantity(item.productId, isNaN(value) ? item.quantity : value);
                                                        }} 
                                                    className="w-full max-w-[60px] text-xs sm:text-sm text-center border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent py-1 sm:py-1.5"
                                                />
                                            </td>
                                            <td className="px-2 sm:px-3 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatCurrency(item.unitPrice)}</td>
                                            <td className="px-2 sm:px-3 py-3 sm:py-4">
                                                <input 
                                                    type="number" 
                                                    value={item.discount} 
                                                    onChange={e => handleUpdateItemDiscount(item.productId, parseFloat(e.target.value) || 0)} 
                                                    className="w-full max-w-[60px] text-xs sm:text-sm text-center border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent py-1 sm:py-1.5"
                                                />
                                            </td>
                                            <td className="px-2 sm:px-3 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-orange-600 whitespace-nowrap">{formatCurrency(item.total - (item.discount * item.quantity))}</td>
                                            <td className="px-2 sm:px-3 py-3 sm:py-4">
                                                <button 
                                                    onClick={() => handleRemoveItem(item.productId)} 
                                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1.5 sm:p-2 rounded-lg hover:bg-red-50 dark:hover:bg-gray-700 transition-colors mx-auto"
                                                >
                                                    <span className="w-4 h-4 sm:w-5 sm:h-5 block"><DeleteIcon /></span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Column 3: Totals, Payment & Actions (25%) */}
                    <div className="flex flex-col gap-3 sm:gap-4 min-h-0 min-w-0 overflow-y-auto">
                        <div className="bg-gradient-to-br from-white via-orange-50/30 to-amber-50/30 dark:from-gray-800 dark:via-orange-950/20 dark:to-amber-950/20 rounded-xl sm:rounded-2xl shadow-lg border border-orange-200/50 dark:border-orange-800/50 backdrop-blur-xl p-4 sm:p-5 flex-grow">
                            {/* Action Buttons */}
                            <div className="mb-4">
                                <h3 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 text-right">الإجراءات</h3>
                                <div className="flex flex-col gap-2 sm:gap-3">
                                    <button 
                                        onClick={() => setReturnModalOpen(true)} 
                                        disabled={currentInvoice.items.length > 0}
                                        className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border-2 border-blue-400 dark:border-blue-600 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                                        title={currentInvoice.items.length > 0 ? "يجب إفراغ السلة لبدء عملية إرجاع" : AR_LABELS.returnProduct}
                                    >
                                        <span className="h-4 w-4 sm:h-5 sm:w-5 block"><ReturnIcon /></span>
                                        <span className="mr-2">{AR_LABELS.returnProduct}</span>
                                    </button>
                                    <button 
                                        onClick={handleHoldSale} 
                                        disabled={currentInvoice.items.length === 0} 
                                        className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border-2 border-yellow-400 dark:border-yellow-600 text-sm font-medium text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
                                    >
                                       <span className="h-4 w-4 sm:h-5 sm:w-5 block"><HandIcon /></span>
                                       <span className="mr-2">{AR_LABELS.holdSale}</span>
                                    </button>
                                    <button 
                                        onClick={() => startNewSale()} 
                                        className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border-2 border-red-400 dark:border-red-600 text-sm font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all duration-200 shadow-sm hover:shadow-md"
                                    >
                                        <span className="w-4 h-4 block"><CancelIcon /></span>
                                        <span className="mr-2">{AR_LABELS.cancel}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Totals Summary */}
                            <div className="mb-4">
                                <h3 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 text-right">ملخص الفاتورة</h3>
                                <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{AR_LABELS.subtotal}:</span>
                                        <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(currentInvoice.subtotal)}</span>
                                    </div>
                                    <div className="flex items-center justify-end gap-2">
                                        <label htmlFor="invoiceDiscount" className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{AR_LABELS.invoiceDiscount}:</label>
                                        <input
                                            type="number"
                                            id="invoiceDiscount"
                                            value={currentInvoice.invoiceDiscount}
                                            onChange={e => setCurrentInvoice(inv => ({...inv, invoiceDiscount: parseFloat(e.target.value) || 0}))}
                                            className="w-20 sm:w-24 text-xs sm:text-sm text-center border border-orange-300 dark:border-orange-600 bg-white dark:bg-gray-700 rounded-lg font-semibold focus:ring-2 focus:ring-orange-500 focus:border-orange-500 py-1.5"
                                        />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{AR_LABELS.totalDiscount}:</span>
                                        <span className="text-sm sm:text-base font-semibold text-red-600">{formatCurrency(currentInvoice.totalItemDiscount + currentInvoice.invoiceDiscount)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{AR_LABELS.tax} ({(taxRate * 100).toFixed(2)}%):</span>
                                        <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(currentInvoice.tax)}</span>
                                    </div>
                                    <div className="border-t-2 border-orange-300 dark:border-orange-700 pt-3 mt-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200">{AR_LABELS.grandTotal}:</span>
                                            <span className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">{formatCurrency(currentInvoice.grandTotal)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Method & Confirm */}
                            <div>
                                <h3 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 text-right">طريقة الدفع</h3>
                                <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm space-y-3">
                                    <div className="grid grid-cols-3 gap-2">
                                        <button 
                                            onClick={() => { setSelectedPaymentMethod('Cash'); setCreditPaidAmount(0); }} 
                                            className={`p-2 sm:p-3 rounded-xl border-2 text-center font-semibold text-xs sm:text-sm transition-all duration-200 ${
                                                selectedPaymentMethod === 'Cash' 
                                                    ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/40 text-orange-700 dark:text-orange-300 shadow-lg scale-105' 
                                                    : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50/50 dark:hover:bg-orange-900/20'
                                            }`}
                                        >
                                            {AR_LABELS.cash}
                                        </button>
                                        <button 
                                            onClick={() => { setSelectedPaymentMethod('Card'); setCreditPaidAmount(0); }} 
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
                                    {selectedPaymentMethod === 'Credit' && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 text-right mb-1.5">{AR_LABELS.amountPaid}</label>
                                            <input 
                                                type="number" 
                                                value={creditPaidAmount} 
                                                onChange={e => setCreditPaidAmount(parseFloat(e.target.value) || 0)} 
                                                className="w-full p-2 text-sm sm:text-base border-2 border-orange-300 dark:border-orange-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-center font-bold focus:ring-2 focus:ring-orange-500 focus:border-orange-500" 
                                                min="0" 
                                            />
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-2 sm:p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                                        <ToggleSwitch
                                            enabled={autoPrintEnabled}
                                            onChange={setAutoPrintEnabled}
                                        />
                                        <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                                            {AR_LABELS.autoPrintInvoice}
                                        </label>
                                    </div>
                                    <button 
                                        onClick={handleFinalizePayment} 
                                        disabled={currentInvoice.items.length === 0} 
                                        className="w-full px-4 py-3 text-sm sm:text-base font-bold text-white bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 rounded-xl hover:from-green-600 hover:via-emerald-600 hover:to-green-700 disabled:from-gray-400 disabled:via-gray-400 disabled:to-gray-500 dark:disabled:from-gray-600 dark:disabled:via-gray-600 dark:disabled:to-gray-700 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-200 disabled:cursor-not-allowed disabled:scale-100"
                                    >
                                        {AR_LABELS.confirmPayment}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <ReturnModal 
                isOpen={isReturnModalOpen} 
                onClose={() => setReturnModalOpen(false)}
                onConfirm={handleConfirmReturn}
                products={products}
                taxRate={taxRate}
            />
            <AddCustomerModal 
                isOpen={isAddCustomerModalOpen} 
                onClose={() => setIsAddCustomerModalOpen(false)}
                onSave={async (customer: Customer) => {
                    try {
                        // Save customer to API
                        const response = await customersApi.createCustomer({
                            name: customer.name,
                            phone: customer.phone,
                            address: customer.address,
                            previousBalance: customer.previousBalance || 0,
                        });

                        if (response.data && (response.data as any).data?.customer) {
                            // Refresh customers list to include the new customer
                            await fetchCustomers();
                            
                            // Optionally select the newly created customer
                            const newCustomerData = (response.data as any).data.customer;
                            const newCustomer: Customer = {
                                id: newCustomerData.id,
                                name: newCustomerData.name || newCustomerData.phone,
                                phone: newCustomerData.phone,
                                address: newCustomerData.address,
                                previousBalance: newCustomerData.previousBalance || 0,
                            };
                            
                            // Only select if it's not a dummy customer
                            if (!isDummyCustomer(newCustomer)) {
                                setCurrentInvoice(inv => ({...inv, customer: newCustomer}));
                            }
                            
                            setIsAddCustomerModalOpen(false);
                        }
                    } catch (err: any) {
                        const apiError = err as ApiError;
                        if (apiError.status === 401 || apiError.status === 403) {
                            // Handle auth errors if needed
                            console.error('Authentication error:', apiError);
                        }
                        const errorMessage = apiError.message || 'فشل حفظ العميل. يرجى المحاولة مرة أخرى.';
                        alert(errorMessage);
                        throw err; // Re-throw to let modal handle it
                    }
                }}
            />
        </div>
    );
};

// Add Customer Modal Component
const AddCustomerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (customer: Customer) => Promise<void>;
}> = ({ isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [errors, setErrors] = useState<{ phone?: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSave = async () => {
        // Validate phone number (required)
        if (!phone.trim()) {
            setErrors({ phone: 'رقم الهاتف مطلوب' });
            return;
        }

        // Clear errors
        setErrors({});
        setIsSubmitting(true);

        try {
            // Create customer data (without id - API will generate it)
            const customerData: Omit<Customer, 'id'> = {
                name: name.trim() || phone, // Use phone as name if name not provided
                phone: phone.trim(),
                previousBalance: 0,
                ...(address.trim() && { address: address.trim() }),
            };

            // Create a temporary customer object for type compatibility
            const tempCustomer: Customer = {
                id: UUID(), // Temporary ID, will be replaced by API
                ...customerData,
            };

            await onSave(tempCustomer);
            
            // Reset form only on success
            setName('');
            setPhone('');
            setAddress('');
        } catch (error) {
            // Error is handled by parent component
            console.error('Error saving customer:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md text-right" onClick={e => e.stopPropagation()}>
                <div className="p-6 space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{AR_LABELS.addNewCustomer}</h2>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{AR_LABELS.customerName}</label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            placeholder="اختياري"
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md text-right"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {AR_LABELS.phone} <span className="text-red-500">*</span>
                        </label>
                        <input 
                            type="tel" 
                            value={phone} 
                            onChange={e => {
                                setPhone(e.target.value);
                                if (errors.phone) setErrors({});
                            }}
                            className={`w-full p-2 border ${errors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md text-right`}
                            required
                        />
                        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{AR_LABELS.address}</label>
                        <textarea 
                            value={address} 
                            onChange={e => setAddress(e.target.value)} 
                            placeholder="اختياري"
                            rows={3}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md text-right resize-none"
                        />
                    </div>
                </div>
                <div className="flex justify-start space-x-4 space-x-reverse p-4 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700 rounded-b-lg">
                    <button 
                        onClick={handleSave} 
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-orange-500 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'جاري الحفظ...' : AR_LABELS.save}
                    </button>
                    <button 
                        onClick={onClose} 
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {AR_LABELS.cancel}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ReturnModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (returnInvoice: SaleTransaction) => void;
    products: POSProduct[];
    taxRate: number;
}> = ({ isOpen, onClose, onConfirm, products, taxRate }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [returnItems, setReturnItems] = useState<POSCartItem[]>([]);
    const [reason, setReason] = useState('');
    const [refundMethod, setRefundMethod] = useState<'Cash' | 'Card' | 'Credit'>('Cash');
    const { formatCurrency } = useCurrency();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchTerm) return;
        const trimmed = searchTerm.trim();
        const lower = trimmed.toLowerCase();
        
        // Search in products by barcode or name (case-insensitive)
        const foundProduct = products.find(p => {
            // Exact barcode match
            if (p.barcode && (p.barcode === trimmed || p.barcode.toLowerCase() === lower)) {
                return true;
            }
            // Name contains search term
            if (p.name && p.name.toLowerCase().includes(lower)) {
                return true;
            }
            // Check units barcodes
            if (p.units) {
                return p.units.some(u => u.barcode && (u.barcode === trimmed || u.barcode.toLowerCase() === lower));
            }
            return false;
        });
        
        if (foundProduct) {
            setReturnItems(prevItems => {
                const existingItem = prevItems.find(item => item.productId === foundProduct.id);
                if (existingItem) {
                    return prevItems.map(item => item.productId === foundProduct.id ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice } : item);
                } else {
                    return [...prevItems, {
                        productId: foundProduct.id,
                        name: foundProduct.name,
                        unit: 'قطعة',
                        quantity: 1,
                        unitPrice: foundProduct.price,
                        total: foundProduct.price,
                        discount: 0,
                    }];
                }
            });
            setSearchTerm('');
        } else {
            alert('المنتج غير موجود');
        }
    };

    const handleQuantityChange = (productId: number, value: string) => {
        const quantity = parseInt(value, 10);
        if (!isNaN(quantity) && quantity >= 0) {
            setReturnItems(prev => prev.map(item => 
                item.productId === productId 
                ? { ...item, quantity, total: quantity * item.unitPrice }
                : item
            ).filter(item => item.quantity > 0));
        }
    };
    
    const totalReturnValue = useMemo(() => {
        return returnItems.reduce((total, item) => total + item.total, 0);
    }, [returnItems]);

    const handleConfirm = () => {
        if (returnItems.length === 0) {
            alert("الرجاء إضافة منتجات للإرجاع.");
            return;
        }
        const returnTransactionItems: POSCartItem[] = returnItems.map(item => ({
            ...item,
            quantity: -item.quantity,
            total: -item.total,
        }));
        
        const subtotal = returnTransactionItems.reduce((acc, item) => acc + item.total, 0);
        const tax = subtotal * taxRate;
        const totalAmount = subtotal + tax;

        const returnInvoice: SaleTransaction = {
            id: `RET-${UUID()}`,
            originalInvoiceId: 'N/A - No Receipt',
            date: new Date().toISOString(),
            customerName: 'عميل إرجاع',
            customerId: 'N/A',
            seller: AR_LABELS.ahmadSai,
            items: returnTransactionItems,
            status: 'Returned',
            paymentMethod: refundMethod,
            subtotal,
            totalItemDiscount: 0,
            invoiceDiscount: 0,
            tax,
            totalAmount,
            paidAmount: totalAmount,
            remainingAmount: 0,
        };
        
        onConfirm(returnInvoice);
        handleClose();
    };

    const handleClose = () => {
        setSearchTerm('');
        setReturnItems([]);
        setReason('');
        setRefundMethod('Cash');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4" onClick={handleClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-2xl text-right max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 mb-3 sm:mb-4">{AR_LABELS.returnProduct}</h2>
                
                <form onSubmit={handleSearch} className="flex items-center gap-2 mb-3 sm:mb-4">
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={AR_LABELS.searchProductPlaceholder} className="w-full pl-3 pr-8 sm:pr-10 py-2 text-sm sm:text-base rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-orange-500 text-right"/>
                    <button type="submit" className="p-2 bg-blue-500 text-white rounded-md flex-shrink-0"><SearchIcon className="h-4 w-4 sm:h-5 sm:w-5"/></button>
                </form>

                <div className="space-y-3 sm:space-y-4">
                    <div>
                        <h3 className="font-semibold text-sm sm:text-base mb-2">{AR_LABELS.productsToReturn}</h3>
                        <div className="space-y-2 max-h-40 sm:max-h-48 overflow-y-auto border rounded-md p-2 dark:border-gray-700">
                            {returnItems.length > 0 ? returnItems.map(item => (
                                <div key={item.productId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2 rounded">
                                    <span className="text-xs sm:text-sm">{item.name} <span className="text-xs text-gray-500">({formatCurrency(item.unitPrice)})</span></span>
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <label className="text-xs sm:text-sm whitespace-nowrap">{AR_LABELS.returnQuantity}:</label>
                                        <input type="number" value={item.quantity} onChange={e => handleQuantityChange(item.productId, e.target.value)} min="1" className="w-16 sm:w-20 text-xs sm:text-sm text-center border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md py-1"/>
                                    </div>
                                </div>
                            )) : <p className="text-center text-xs sm:text-sm text-gray-500 py-4">{AR_LABELS.noItemsInCart}</p>}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs sm:text-sm font-medium mb-1">{AR_LABELS.reasonForRefund}</label>
                        <input type="text" value={reason} onChange={e => setReason(e.target.value)} className="w-full text-sm sm:text-base border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-right bg-white dark:bg-gray-700 py-1.5 sm:py-2 px-2 sm:px-3"/>
                    </div>
                     <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{AR_LABELS.refundMethod}</label>
                        <CustomDropdown
                            id="refund-method-dropdown"
                            value={refundMethod}
                            onChange={(value) => setRefundMethod(value as any)}
                            options={[
                                { value: 'Cash', label: AR_LABELS.cash },
                                { value: 'Card', label: AR_LABELS.card },
                                { value: 'Customer Credit', label: AR_LABELS.customerCredit }
                            ]}
                            placeholder={AR_LABELS.refundMethod}
                            className="w-full"
                        />
                    </div>
                    <div className="text-left text-lg sm:text-xl font-bold"><span>{AR_LABELS.totalReturnValue}: </span><span className="text-red-600">{formatCurrency(totalReturnValue)}</span></div>
                    <div className="flex flex-col sm:flex-row justify-start gap-2 sm:gap-4 sm:space-x-4 sm:space-x-reverse pt-3 sm:pt-4">
                        <button onClick={handleConfirm} className="px-4 py-2 text-sm sm:text-base bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors">{AR_LABELS.confirmReturn}</button>
                        <button onClick={handleClose} className="px-4 py-2 text-sm sm:text-base bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">{AR_LABELS.cancel}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default POSPage;