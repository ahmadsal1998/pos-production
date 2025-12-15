import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Product, Customer, POSInvoice, POSCartItem, SaleTransaction, SaleStatus, SalePaymentMethod } from '@/shared/types';

import { AR_LABELS, UUID, SearchIcon, DeleteIcon, PlusIcon, HandIcon, CancelIcon, PrintIcon, CheckCircleIcon } from '@/shared/constants';
import { ToggleSwitch } from '@/shared/components/ui/ToggleSwitch';
import CustomDropdown from '@/shared/components/ui/CustomDropdown/CustomDropdown';
import { customersApi, productsApi, salesApi, ApiError } from '@/lib/api/client';
import { useCurrency } from '@/shared/contexts/CurrencyContext';
import { saveSale } from '@/shared/utils/salesStorage';
import { loadSettings } from '@/shared/utils/settingsStorage';
import { playBeepSound, preloadBeepSound } from '@/shared/utils/soundUtils';
import { convertArabicToEnglishNumerals } from '@/shared/utils';
import { useAuthStore } from '@/app/store';
import { printReceipt } from '@/shared/utils/printUtils';
import { productSync } from '@/lib/sync/productSync';
import { productsDB } from '@/lib/db/productsDB';
import { customerSync } from '@/lib/sync/customerSync';
import { customersDB } from '@/lib/db/customersDB';
import { salesSync } from '@/lib/sync/salesSync';
// PaymentProcessingModal removed - using simple payment flow

// Local POS product type with optional units
type POSProduct = Product & {
    originalId?: string; // Store original backend ID (MongoDB ObjectId) for API calls
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

// All dummy/fake customers have been removed. Customer list starts empty.

const generateNewInvoice = (cashierName: string, invoiceNumber: string = 'INV-1', isReturn: boolean = false, originalInvoiceId?: string): POSInvoice => ({
  id: invoiceNumber,
  date: new Date(),
  cashier: cashierName,
  customer: null,
  items: [],
  subtotal: 0,
  totalItemDiscount: 0,
  invoiceDiscount: 0,
  tax: 0,
  grandTotal: 0,
  paymentMethod: null,
  originalInvoiceId: originalInvoiceId,
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
    const { user } = useAuthStore();
    const currentUserName = user?.fullName || user?.username || 'Unknown';
    const [products, setProducts] = useState<POSProduct[]>([]); // Keep for backward compatibility, but IndexedDB is primary
    const [quickProducts, setQuickProducts] = useState<POSProduct[]>([]);
    const [isLoadingQuickProducts, setIsLoadingQuickProducts] = useState(false);
    const [productSuggestionsOpen, setProductSuggestionsOpen] = useState(false);
    const [productsLoaded, setProductsLoaded] = useState(false); // Track if products loaded from IndexedDB
    const [isSearchingServer, setIsSearchingServer] = useState(false); // Track server-side search state
    const [isLoadingFromDB, setIsLoadingFromDB] = useState(false); // Track IndexedDB loading state
    const [customers, setCustomers] = useState<Customer[]>([]); // Customer list - starts empty, no dummy customers
    const [allCustomers, setAllCustomers] = useState<Customer[]>([]); // All customers from API
    const [customerSearchTerm, setCustomerSearchTerm] = useState(''); // Search term for customers
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
    const [customersLoaded, setCustomersLoaded] = useState(false); // Track if client-side customers loaded successfully
    const [isSearchingCustomersServer, setIsSearchingCustomersServer] = useState(false); // Track server-side customer search state
    const isLoadingCustomersRef = useRef(false); // Prevent multiple simultaneous customer loads
    const isMountedRef = useRef(true); // Track if component is mounted
    const isProductSyncInProgressRef = useRef(false); // Prevent multiple simultaneous product syncs
    const lastProductSyncAttemptRef = useRef<number>(0); // Track last sync attempt time
    const posContainerRef = useRef<HTMLDivElement>(null); // Ref for the main POS container
    // Barcode processing queue to prevent concurrent searches
    const barcodeQueueRef = useRef<string[]>([]); // Queue of barcodes waiting to be processed
    const isProcessingBarcodeRef = useRef(false); // Track if a barcode is currently being processed
    const [currentInvoice, setCurrentInvoice] = useState<POSInvoice>(() => generateNewInvoice(currentUserName, 'INV-1'));
    const [heldInvoices, setHeldInvoices] = useState<POSInvoice[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [saleCompleted, setSaleCompleted] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('Cash');
    const [creditPaidAmount, setCreditPaidAmount] = useState(0);
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
    
    // Helper function to get allowSellingZeroStock setting, default to true
    const getAllowSellingZeroStockSetting = (): boolean => {
        try {
            const settings = loadSettings(null);
            if (settings && settings.allowSellingZeroStock !== undefined) {
                return settings.allowSellingZeroStock;
            }
        } catch (err) {
            console.error('Failed to load allowSellingZeroStock setting:', err);
        }
        return true; // Default to true if not found
    };
    const [autoPrintEnabled, setAutoPrintEnabled] = useState(() => getAutoPrintSetting());
    const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
    
    // Helper function to get tax rate from settings (synchronous for initial state)
    // This is a regular function (not useCallback) so it can be used in useState initializer
    const getTaxRateFromSettings = (): number => {
        try {
            const settings = loadSettings(null);
            
            // Check if settings exist and vatPercentage is defined (including 0)
            if (settings && settings.vatPercentage !== undefined && settings.vatPercentage !== null) {
                let vatPercentage = settings.vatPercentage;
                
                // Handle string values that might come from form inputs
                if (typeof vatPercentage === 'string') {
                    vatPercentage = parseFloat(vatPercentage);
                    if (isNaN(vatPercentage)) {
                        console.warn('Invalid vatPercentage value (string), using 0');
                        return 0;
                    }
                }
                
                // Ensure it's a number
                if (typeof vatPercentage !== 'number' || isNaN(vatPercentage)) {
                    console.warn('Invalid vatPercentage value, using 0');
                    return 0;
                }
                
                // Handle the value - it could be stored as a percentage (15) or decimal (0.15)
                // If value is > 1, treat as percentage and convert to decimal (e.g., 15 => 0.15)
                // If value is <= 1, treat as decimal (e.g., 0.15 => 0.15, 0 => 0)
                const normalized = vatPercentage > 1 
                    ? vatPercentage / 100 
                    : vatPercentage;
                
                return normalized;
            }
        } catch (err) {
            console.error('Failed to load tax rate from localStorage:', err);
        }
        
        // Default to 0 if no settings found (not 15% - removed hardcoded default)
        return 0;
    };
    
    // Initialize tax rate from settings synchronously (no hardcoded 0.15)
    // This ensures the correct tax rate is used from the start, even if it's 0%
    const [taxRate, setTaxRate] = useState<number>(() => getTaxRateFromSettings());
    
    // Fetch tax rate from localStorage settings (for updates when settings change)
    const fetchTaxRate = useCallback(() => {
        const newTaxRate = getTaxRateFromSettings();
        setTaxRate(newTaxRate);
        console.log('Tax rate loaded from localStorage:', newTaxRate, '(', (newTaxRate * 100).toFixed(2), '%)');
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

    // Convert Arabic numerals to English in the POS interface
    useEffect(() => {
        if (!posContainerRef.current) return;

        let isConverting = false; // Flag to prevent infinite loops

        const convertNumeralsInNode = (node: Node): void => {
            if (isConverting) return; // Prevent recursive calls
            
            if (node.nodeType === Node.TEXT_NODE) {
                const textNode = node as Text;
                const originalText = textNode.textContent || '';
                // Check if text contains Arabic numerals
                if (/[٠-٩]/.test(originalText)) {
                    isConverting = true;
                    const convertedText = convertArabicToEnglishNumerals(originalText);
                    if (originalText !== convertedText) {
                        textNode.textContent = convertedText;
                    }
                    isConverting = false;
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                // Skip input elements to avoid interfering with user input
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    return;
                }
                // Recursively process child nodes
                Array.from(element.childNodes).forEach(convertNumeralsInNode);
            }
        };

        const convertNumeralsInContainer = (): void => {
            if (posContainerRef.current && !isConverting) {
                isConverting = true;
                convertNumeralsInNode(posContainerRef.current);
                isConverting = false;
            }
        };

        // Initial conversion after a short delay to ensure DOM is ready
        const timeoutId = setTimeout(convertNumeralsInContainer, 100);

        // Set up MutationObserver to watch for DOM changes
        const observer = new MutationObserver((mutations) => {
            if (isConverting) return; // Skip if already converting
            
            // Use requestAnimationFrame to batch conversions and avoid performance issues
            requestAnimationFrame(() => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach((node) => {
                            if (posContainerRef.current && posContainerRef.current.contains(node)) {
                                convertNumeralsInNode(node);
                            }
                        });
                    } else if (mutation.type === 'characterData') {
                        // Handle text content changes
                        const textNode = mutation.target as Text;
                        // Only convert if the text node is within our container
                        if (posContainerRef.current && posContainerRef.current.contains(textNode)) {
                            const originalText = textNode.textContent || '';
                            // Check if text contains Arabic numerals before converting
                            if (/[٠-٩]/.test(originalText)) {
                                isConverting = true;
                                const convertedText = convertArabicToEnglishNumerals(originalText);
                                if (originalText !== convertedText) {
                                    textNode.textContent = convertedText;
                                }
                                isConverting = false;
                            }
                        }
                    }
                });
            });
        });

        if (posContainerRef.current) {
            observer.observe(posContainerRef.current, {
                childList: true,
                subtree: true,
                characterData: true,
            });
        }

        return () => {
            clearTimeout(timeoutId);
            observer.disconnect();
        };
    }, []);
    
    // Fetch next invoice number from API
    const fetchNextInvoiceNumber = useCallback(async (): Promise<string> => {
        try {
            const response = await salesApi.getNextInvoiceNumber();
            const invoiceNumber = (response.data as any)?.data?.invoiceNumber || 'INV-1';
            return invoiceNumber;
        } catch (err: any) {
            const apiError = err as ApiError;
            console.error('Error fetching next invoice number:', apiError);
            // Fallback to INV-1 if API fails
            return 'INV-1';
        }
    }, []);

    // Fetch initial invoice number on mount
    useEffect(() => {
        const initializeInvoiceNumber = async () => {
            const nextInvoiceNumber = await fetchNextInvoiceNumber();
            setCurrentInvoice(inv => ({ ...inv, id: nextInvoiceNumber }));
        };
        initializeInvoiceNumber();
    }, [fetchNextInvoiceNumber]);

    // Initialize sales sync service on mount
    useEffect(() => {
        const initializeSalesSync = async () => {
            try {
                await salesSync.init();
                console.log('✅ Sales sync service initialized');
            } catch (error) {
                console.error('❌ Failed to initialize sales sync service:', error);
            }
        };
        initializeSalesSync();
    }, []);

    // Preload beep sound on mount for instant playback
    useEffect(() => {
        preloadBeepSound();
    }, []);

    // Set mounted ref to false on unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Fetch customers from API and sync to IndexedDB
    const fetchCustomers = useCallback(async () => {
        if (!isMountedRef.current) {
            return;
        }
        
        setIsLoadingCustomers(true);
        try {
            console.log('[POS] Starting to fetch customers from server...');
            
            // Sync customers from server (this handles IndexedDB storage)
            const syncResult = await customerSync.syncCustomers({ forceRefresh: true });
            
            console.log('[POS] Sync result:', {
                success: syncResult.success,
                syncedCount: syncResult.syncedCount,
                customersCount: syncResult.customers?.length || 0,
                error: syncResult.error
            });
            
            if (!isMountedRef.current) {
                return;
            }
            
            if (syncResult.success && syncResult.customers) {
                // Transform backend data to frontend Customer format and filter out dummy customers
                // Handle both id and _id fields (backend may return either)
                const transformedCustomers: Customer[] = syncResult.customers
                    .map((customer: any) => {
                        // Handle both id and _id - backend transforms _id to id in toJSON, but might have either
                        const customerId = customer.id || customer._id;
                        return {
                            id: customerId,
                            name: customer.name || customer.phone,
                            phone: customer.phone,
                            address: customer.address,
                            previousBalance: customer.previousBalance || 0,
                        };
                    })
                    .filter((customer: Customer) => {
                        if (!customer.id) return false;
                        return !isDummyCustomer(customer);
                    });
                
                setAllCustomers(transformedCustomers);
                setCustomers(transformedCustomers);
                setCustomersLoaded(true);
                console.log(`[POS] Successfully loaded ${transformedCustomers.length} customers and stored in IndexedDB`);
                return syncResult;
            } else if (syncResult.success && (!syncResult.customers || syncResult.customers.length === 0)) {
                // Empty customer list is a valid state
                setAllCustomers([]);
                setCustomers([]);
                setCustomersLoaded(true);
                console.log(`[POS] Successfully loaded 0 customers from server (empty list)`);
                return syncResult;
            } else {
                console.warn('[POS] Failed to sync customers:', syncResult.error);
                // Even on failure, mark as loaded to prevent infinite loading
                // POS can continue with empty list and use server-side search as fallback
                setAllCustomers([]);
                setCustomers([]);
                setCustomersLoaded(true);
                return syncResult;
            }
        } catch (err: any) {
            if (!isMountedRef.current) {
                return;
            }
            
            const apiError = err as ApiError;
            console.error('[POS] Error fetching customers:', apiError);
            console.error('[POS] Error details:', {
                message: apiError.message,
                status: apiError.status,
                code: apiError.code,
                stack: err instanceof Error ? err.stack : undefined
            });
            // Even on error, mark as loaded to prevent infinite loading
            // POS can continue with empty list and use server-side search as fallback
            setAllCustomers([]);
            setCustomers([]);
            setCustomersLoaded(true);
            throw err; // Re-throw to let caller handle it
        } finally {
            if (isMountedRef.current) {
                setIsLoadingCustomers(false);
            }
        }
    }, []);

    // Load customers from IndexedDB on mount
    const loadCustomersFromDB = useCallback(async () => {
        if (isLoadingCustomersRef.current) {
            console.log('[POS] Customer load already in progress, skipping...');
            return;
        }
        
        isLoadingCustomersRef.current = true;
        setIsLoadingCustomers(true);
        try {
            console.log('[POS] Loading customers from IndexedDB...');
            // Initialize IndexedDB
            await customersDB.init();
            
            // Get all customers from IndexedDB
            const dbCustomers = await customersDB.getAllCustomers();
            
            console.log(`[POS] getAllCustomers returned ${dbCustomers?.length || 0} customers`);
            
            if (dbCustomers && dbCustomers.length > 0) {
                // Log first customer structure for debugging
                if (dbCustomers.length > 0) {
                    console.log('[POS] Sample customer from IndexedDB:', {
                        raw: dbCustomers[0],
                        hasId: !!dbCustomers[0].id,
                        has_id: !!dbCustomers[0]._id,
                        id: dbCustomers[0].id,
                        _id: dbCustomers[0]._id,
                        name: dbCustomers[0].name,
                        phone: dbCustomers[0].phone
                    });
                }
                
                // Transform backend data to frontend Customer format and filter out dummy customers
                // Handle both id and _id fields (backend may return either)
                const transformedCustomers: Customer[] = dbCustomers
                    .map((customer: any) => {
                        // Handle both id and _id - backend transforms _id to id in toJSON, but IndexedDB might have either
                        const customerId = customer.id || customer._id;
                        if (!customerId) {
                            console.warn('[POS] Customer missing id field:', customer);
                        }
                        return {
                            id: customerId,
                            name: customer.name || customer.phone,
                            phone: customer.phone,
                            address: customer.address,
                            previousBalance: customer.previousBalance || 0,
                        };
                    })
                    .filter((customer: Customer) => {
                        // Filter out customers without id and dummy customers
                        if (!customer.id) {
                            console.warn('[POS] Filtering out customer without id:', customer);
                            return false;
                        }
                        return !isDummyCustomer(customer);
                    });
                
                console.log(`[POS] Transformed ${transformedCustomers.length} customers (filtered from ${dbCustomers.length})`);
                
                if (isMountedRef.current) {
                    setAllCustomers(transformedCustomers);
                    setCustomers(transformedCustomers);
                    setCustomersLoaded(true);
                    console.log(`[POS] Loaded ${transformedCustomers.length} customers from IndexedDB`);
                }
            } else {
                // No customers in IndexedDB - try to sync from server
                console.log('[POS] No customers in IndexedDB, syncing from server...');
                // Don't set customersLoaded yet - wait for fetchCustomers to complete
                // Try to sync from server
                try {
                    const syncResult = await fetchCustomers();
                    // After sync, verify IndexedDB was updated
                    if (isMountedRef.current && syncResult?.success && syncResult.customers && syncResult.customers.length > 0) {
                        // Reload from IndexedDB to ensure we have the latest data
                        const verifyCustomers = await customersDB.getAllCustomers();
                        if (verifyCustomers && verifyCustomers.length > 0) {
                            const transformedCustomers: Customer[] = verifyCustomers
                                .map((customer: any) => {
                                    // Handle both id and _id fields
                                    const customerId = customer.id || customer._id;
                                    return {
                                        id: customerId,
                                        name: customer.name || customer.phone,
                                        phone: customer.phone,
                                        address: customer.address,
                                        previousBalance: customer.previousBalance || 0,
                                    };
                                })
                                .filter((customer: Customer) => {
                                    if (!customer.id) return false;
                                    return !isDummyCustomer(customer);
                                });
                            setAllCustomers(transformedCustomers);
                            setCustomers(transformedCustomers);
                            setCustomersLoaded(true);
                            console.log(`[POS] Successfully loaded ${transformedCustomers.length} customers after sync in loadCustomersFromDB`);
                        }
                    }
                } catch (syncError) {
                    console.error('[POS] Failed to sync customers from server:', syncError);
                    console.error('[POS] Sync error details:', {
                        message: syncError instanceof Error ? syncError.message : String(syncError),
                        stack: syncError instanceof Error ? syncError.stack : undefined
                    });
                    // Only set customersLoaded to true if fetchCustomers didn't already set it
                    if (isMountedRef.current) {
                        setAllCustomers([]);
                        setCustomers([]);
                        setCustomersLoaded(true); // Mark as loaded even if empty to prevent infinite loading
                    }
                }
            }
        } catch (error) {
            console.error('[POS] Error loading customers from IndexedDB:', error);
            // Try to sync from server as fallback
            try {
                await fetchCustomers();
            } catch (syncError) {
                console.warn('[POS] Failed to sync customers from server after IndexedDB error:', syncError);
                // Only set customersLoaded to true if fetchCustomers didn't already set it
                if (isMountedRef.current) {
                    setAllCustomers([]);
                    setCustomers([]);
                    setCustomersLoaded(true); // Mark as loaded even if empty to prevent infinite loading
                }
            }
        } finally {
            setIsLoadingCustomers(false);
            isLoadingCustomersRef.current = false;
        }
    }, [fetchCustomers]);

    // Server-side customer search function (fallback when client-side customers aren't loaded)
    const searchCustomersOnServer = useCallback(async (term: string): Promise<Customer[]> => {
        const trimmed = term.trim();
        if (!trimmed) return [];

        try {
            setIsSearchingCustomersServer(true);
            console.log(`[POS] Performing server-side customer search for: "${trimmed}"`);
            
            // Use API search parameter to search on server
            const response = await customersApi.getCustomers({ search: trimmed });

            if (response.success) {
                const customersData = (response.data as any)?.data?.customers || [];
                
                // Sync found customers to IndexedDB to keep cache updated (server is source of truth)
                if (customersData.length > 0) {
                    try {
                        // Sync each found customer to IndexedDB to ensure cache is up-to-date
                        await Promise.all(
                            customersData.map((customer: any) => 
                                customerSync.syncAfterCreateOrUpdate(customer).catch(err => 
                                    console.warn('[POS] Error syncing customer from search:', err)
                                )
                            )
                        );
                        console.log(`[POS] Synced ${customersData.length} customers from search to IndexedDB`);
                    } catch (syncError) {
                        console.warn('[POS] Error syncing customers from search to IndexedDB:', syncError);
                        // Continue anyway - we still have the search results
                    }
                }
                
                // Transform and filter out dummy customers
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

                console.log(`[POS] Server-side customer search found ${transformedCustomers.length} matches`);
                return transformedCustomers;
            } else {
                console.warn('[POS] Server-side customer search response was not successful');
                return [];
            }
        } catch (err: any) {
            console.error('[POS] Error in server-side customer search:', err);
            return [];
        } finally {
            setIsSearchingCustomersServer(false);
        }
    }, []);

    // Helper to normalize a backend product into our Product shape
    const normalizeProduct = useCallback((p: any): POSProduct => {
        // Store original backend ID for API calls
        const originalId = p.id || p._id || '';
        
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
            originalId: originalId, // Store original backend ID
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
    }, []);

    // Fetch quick products from API with caching and backend filtering
    const fetchQuickProducts = useCallback(async () => {
        const CACHE_KEY = 'pos_quick_products_cache';
        const CACHE_TIMESTAMP_KEY = 'pos_quick_products_cache_timestamp';
        const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL
        
        // Check cache first
        try {
            const cachedData = localStorage.getItem(CACHE_KEY);
            const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
            
            if (cachedData && cachedTimestamp) {
                const timestamp = parseInt(cachedTimestamp, 10);
                const now = Date.now();
                
                // If cache is still valid, use it
                if (now - timestamp < CACHE_TTL) {
                    const quickProductsList = JSON.parse(cachedData);
                    setQuickProducts(quickProductsList);
                    setIsLoadingQuickProducts(false);
                    console.log(`Loaded ${quickProductsList.length} quick products from cache`);
                    return;
                }
            }
        } catch (cacheError) {
            console.warn('Error reading cache, fetching from API:', cacheError);
        }

        setIsLoadingQuickProducts(true);
        try {
            // Use backend filtering to only fetch quick products - much more efficient!
            // Fetch with higher limit since quick products are typically few
            const response = await productsApi.getProducts({ 
                page: 1, 
                limit: 100, // Should be enough for quick products
                showInQuickProducts: true,
                status: 'active'
            });
            
            if (response.success) {
                const productsData = (response.data as any)?.products || (response.data as any)?.data?.products || [];
                
                if (productsData.length > 0) {
                    // Normalize and set quick products
                    const quickProductsList = productsData.map((p: any) => normalizeProduct(p));
                    setQuickProducts(quickProductsList);
                    
                    // Cache the results
                    try {
                        localStorage.setItem(CACHE_KEY, JSON.stringify(quickProductsList));
                        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
                    } catch (cacheError) {
                        console.warn('Error caching quick products:', cacheError);
                    }
                    
                    console.log(`Loaded ${quickProductsList.length} quick products from API`);
                } else {
                    setQuickProducts([]);
                    console.log('No quick products found');
                }
            } else {
                console.warn('API response was not successful');
                setQuickProducts([]);
            }
        } catch (err: any) {
            console.error('Error fetching quick products:', err);
            // Try to use cached data as fallback even if expired
            try {
                const cachedData = localStorage.getItem(CACHE_KEY);
                if (cachedData) {
                    const quickProductsList = JSON.parse(cachedData);
                    setQuickProducts(quickProductsList);
                    console.log('Using expired cache as fallback');
                } else {
                    setQuickProducts([]);
                }
            } catch (fallbackError) {
                setQuickProducts([]);
            }
        } finally {
            setIsLoadingQuickProducts(false);
        }
    }, [normalizeProduct]);

    // Load products from IndexedDB on mount
    // Only syncs if IndexedDB is empty AND data is stale (not just empty)
    const loadProductsFromDB = useCallback(async () => {
        try {
            setIsLoadingFromDB(true);
            console.log('[POS] Loading products from IndexedDB...');
            
            // Initialize IndexedDB
            await productsDB.init();
            
            // Get all products from IndexedDB
            const dbProducts = await productsDB.getAllProducts();
            
            if (dbProducts && dbProducts.length > 0) {
                // Normalize and set products
                const normalizedProducts = dbProducts.map((p: any) => normalizeProduct(p));
                setProducts(normalizedProducts);
                setProductsLoaded(true);
                console.log(`[POS] Loaded ${normalizedProducts.length} products from IndexedDB (no sync needed)`);
            } else {
                // No products in IndexedDB - check if we should sync
                // Only sync if:
                // 1. No sync is already in progress
                // 2. We haven't attempted a sync recently (within 30 seconds)
                const now = Date.now();
                const timeSinceLastAttempt = now - lastProductSyncAttemptRef.current;
                const SYNC_COOLDOWN = 30 * 1000; // 30 seconds cooldown
                
                if (isProductSyncInProgressRef.current) {
                    console.log('[POS] Product sync already in progress, skipping duplicate request');
                    setProductsLoaded(false);
                    return;
                }
                
                if (timeSinceLastAttempt < SYNC_COOLDOWN) {
                    console.log(`[POS] Sync cooldown active (${Math.ceil((SYNC_COOLDOWN - timeSinceLastAttempt) / 1000)}s remaining), skipping sync`);
                    setProductsLoaded(false);
                    return;
                }
                
                // Check if data is fresh (even if empty, might have been cleared recently)
                const DATA_FRESHNESS_THRESHOLD = 5 * 60 * 1000; // 5 minutes
                const isFresh = await productsDB.isDataFresh(DATA_FRESHNESS_THRESHOLD);
                
                if (isFresh && dbProducts.length === 0) {
                    // Data was recently cleared but is still considered fresh - don't sync
                    console.log('[POS] IndexedDB is empty but data is fresh (recently cleared), skipping sync');
                    setProductsLoaded(false);
                    return;
                }
                
                // Mark sync as in progress
                isProductSyncInProgressRef.current = true;
                lastProductSyncAttemptRef.current = now;
                
                console.log('[POS] No products in IndexedDB and data is stale, syncing from server...');
                const syncResult = await productSync.syncProducts({ forceRefresh: false });
                
                // Clear sync in progress flag
                isProductSyncInProgressRef.current = false;
                
                if (syncResult.success && syncResult.products) {
                    const normalizedProducts = syncResult.products.map((p: any) => normalizeProduct(p));
                    setProducts(normalizedProducts);
                    setProductsLoaded(true);
                    console.log(`[POS] Synced and loaded ${normalizedProducts.length} products`);
                } else {
                    setProductsLoaded(false);
                    console.warn('[POS] Failed to sync products from server:', syncResult.error);
                }
            }
        } catch (error: any) {
            console.error('[POS] Error loading products from IndexedDB:', error);
            setProductsLoaded(false);
            // Clear sync in progress flag on error
            isProductSyncInProgressRef.current = false;
        } finally {
            setIsLoadingFromDB(false);
        }
    }, [normalizeProduct]);

    // Fetch all products for search functionality (lazy load in background)
    // Now uses IndexedDB as primary storage - NO SYNC unless IndexedDB is empty AND stale
    const fetchAllProducts = useCallback(async () => {
        try {
            console.log('[POS] Loading products from IndexedDB for search...');
            
            // First check IndexedDB
            await productsDB.init();
            const dbProducts = await productsDB.getAllProducts();
            
            if (dbProducts && dbProducts.length > 0) {
                // Use products from IndexedDB - no sync needed
                const allProductsList = dbProducts.map((p: any) => normalizeProduct(p));
                setProducts(allProductsList);
                setProductsLoaded(true);
                console.log(`[POS] Using ${allProductsList.length} products from IndexedDB (no sync needed)`);
                return;
            }
            
            // IndexedDB is empty - check if we should sync
            // Only sync if:
            // 1. No sync is already in progress
            // 2. We haven't attempted a sync recently (within 30 seconds)
            // 3. Data is stale (not fresh)
            const now = Date.now();
            const timeSinceLastAttempt = now - lastProductSyncAttemptRef.current;
            const SYNC_COOLDOWN = 30 * 1000; // 30 seconds cooldown
            
            if (isProductSyncInProgressRef.current) {
                console.log('[POS] Product sync already in progress, skipping duplicate request');
                setProductsLoaded(false);
                return;
            }
            
            if (timeSinceLastAttempt < SYNC_COOLDOWN) {
                console.log(`[POS] Sync cooldown active (${Math.ceil((SYNC_COOLDOWN - timeSinceLastAttempt) / 1000)}s remaining), skipping sync`);
                setProductsLoaded(false);
                return;
            }
            
            // Check if data is fresh (even if empty, might have been cleared recently)
            const DATA_FRESHNESS_THRESHOLD = 5 * 60 * 1000; // 5 minutes
            const isFresh = await productsDB.isDataFresh(DATA_FRESHNESS_THRESHOLD);
            
            if (isFresh && dbProducts.length === 0) {
                // Data was recently cleared but is still considered fresh - don't sync
                console.log('[POS] IndexedDB is empty but data is fresh (recently cleared), skipping sync');
                setProductsLoaded(false);
                return;
            }
            
            // Mark sync as in progress
            isProductSyncInProgressRef.current = true;
            lastProductSyncAttemptRef.current = now;
            
            console.log('[POS] No products in IndexedDB and data is stale, using productSync to fetch from server...');
            const syncResult = await productSync.syncProducts({ forceRefresh: false });
            
            // Clear sync in progress flag
            isProductSyncInProgressRef.current = false;
            
            if (syncResult.success && syncResult.products) {
                const allProductsList = syncResult.products.map((p: any) => normalizeProduct(p));
                setProducts(allProductsList);
                setProductsLoaded(true);
                console.log(`[POS] Successfully loaded ${allProductsList.length} products via productSync`);
            } else {
                console.warn('[POS] Failed to sync products from server:', syncResult.error);
                setProductsLoaded(false);
            }
        } catch (err: any) {
            console.error('[POS] Error fetching all products for search:', err);
            setProductsLoaded(false);
            // Clear sync in progress flag on error
            isProductSyncInProgressRef.current = false;
        }
    }, [normalizeProduct]);

    // Fetch customers and quick products on mount, and load products from IndexedDB
    useEffect(() => {
        // Load customers from IndexedDB (fast, handles large datasets)
        loadCustomersFromDB();
        fetchTaxRate();
        fetchQuickProducts(); // Fast - uses backend filtering and cache
        
        // Load products from IndexedDB (fast, handles large datasets)
        loadProductsFromDB();
        
        // Note: fetchAllProducts is called by loadProductsFromDB if needed
        // No need to call it again here to avoid duplicate sync attempts
        
        // Sync customers in background (only if needed - customerSync handles this internally)
        // Only sync if customersLoaded is false (meaning initial load didn't find customers)
        const timer = setTimeout(() => {
            // Check if customers are already loaded before syncing
            if (!customersLoaded || allCustomers.length === 0) {
                customerSync.syncCustomers({ forceRefresh: true }).then((result) => {
                    if (!isMountedRef.current) {
                        return;
                    }
                    
                    if (result.success && result.customers) {
                        const transformedCustomers: Customer[] = result.customers
                            .map((customer: any) => ({
                                id: customer.id,
                                name: customer.name || customer.phone,
                                phone: customer.phone,
                                address: customer.address,
                                previousBalance: customer.previousBalance || 0,
                            }))
                            .filter((customer: Customer) => !isDummyCustomer(customer));
                        
                        if (transformedCustomers.length > 0) {
                            setAllCustomers(transformedCustomers);
                            setCustomers(transformedCustomers);
                            setCustomersLoaded(true);
                            console.log(`[POS] Background sync loaded ${transformedCustomers.length} customers`);
                        } else if (!customersLoaded) {
                            // Only set customersLoaded if it wasn't already set
                            setAllCustomers([]);
                            setCustomers([]);
                            setCustomersLoaded(true);
                            console.log(`[POS] Background sync: no customers found`);
                        }
                    } else if (!customersLoaded) {
                        // Only set customersLoaded if it wasn't already set
                        setAllCustomers([]);
                        setCustomers([]);
                        setCustomersLoaded(true);
                        console.log(`[POS] Background sync failed: ${result.error || 'Unknown error'}`);
                    }
                }).catch((error) => {
                    if (isMountedRef.current && !customersLoaded) {
                        console.error('[POS] Background sync error:', error);
                        setAllCustomers([]);
                        setCustomers([]);
                        setCustomersLoaded(true);
                    }
                });
            }
        }, 1000); // Small delay to let IndexedDB load first
        
        return () => {
            clearTimeout(timer);
        };
    }, [loadCustomersFromDB, fetchQuickProducts, fetchTaxRate, loadProductsFromDB]);

    // Reload tax rate when page becomes visible
    // Note: Products are NOT synced on visibility change to prevent unnecessary server load
    // Sync only happens when there's an actual change (invoice created, quantity updated, etc.)
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (!document.hidden) {
                fetchTaxRate();
                // Products sync is handled only when actual changes occur, not on visibility change
                // This prevents unnecessary server load when just switching tabs
                console.log('[POS] Page visible - using existing IndexedDB data (no sync)');
                // Reload customers from IndexedDB in case a customer was added while page was hidden
                // This is lightweight and ensures the dropdown is up-to-date
                if (!isLoadingCustomersRef.current) {
                    loadCustomersFromDB().catch(error => {
                        console.error('[POS] Error reloading customers on visibility change:', error);
                    });
                }
            }
        };
        
        const handleStorageChange = (e: StorageEvent) => {
            // Reload tax rate if settings were changed
            if (e.key && e.key.startsWith('pos_settings_')) {
                fetchTaxRate();
            }
            // If products cache was invalidated, sync products
            // Only sync if not already in progress and enough time has passed
            if (e.key && (e.key.startsWith('pos_products_cache_') || e.key?.startsWith('products_db_changed_'))) {
                const now = Date.now();
                const timeSinceLastAttempt = now - lastProductSyncAttemptRef.current;
                const SYNC_COOLDOWN = 30 * 1000; // 30 seconds cooldown
                
                if (isProductSyncInProgressRef.current) {
                    console.log('[POS] Product sync already in progress, skipping cache invalidation sync');
                    return;
                }
                
                if (timeSinceLastAttempt < SYNC_COOLDOWN) {
                    console.log(`[POS] Sync cooldown active (${Math.ceil((SYNC_COOLDOWN - timeSinceLastAttempt) / 1000)}s remaining), skipping cache invalidation sync`);
                    return;
                }
                
                // Mark sync as in progress
                isProductSyncInProgressRef.current = true;
                lastProductSyncAttemptRef.current = now;
                
                productSync.syncProducts({ forceRefresh: true }).then(async (result) => {
                    // Clear sync in progress flag
                    isProductSyncInProgressRef.current = false;
                    
                    if (result.success && result.products) {
                        // Update IndexedDB
                        try {
                            await productsDB.storeProducts(result.products);
                            // Reload from IndexedDB
                            const dbProducts = await productsDB.getAllProducts();
                            const normalizedProducts = dbProducts.map((p: any) => normalizeProduct(p));
                            setProducts(normalizedProducts);
                            console.log('[POS] Products synced and updated in IndexedDB after cache invalidation');
                        } catch (error) {
                            console.error('[POS] Error updating IndexedDB after cache invalidation:', error);
                        }
                    }
                }).catch(error => {
                    console.error('[POS] Error syncing products after cache invalidation:', error);
                    // Clear sync in progress flag on error
                    isProductSyncInProgressRef.current = false;
                });
            }
            // If customers cache was invalidated, sync customerssss
            if (e.key?.startsWith('customers_db_changed_')) {
                // Use loadCustomersFromDB to ensure proper closure and avoid "setCustomers is not defined" errors
                loadCustomersFromDB().catch(error => {
                    console.error('[POS] Error reloading customers after cache invalidation:', error);
                });
            }
        };

        // Listen for customer changes via BroadcastChannel
        let customerChannel: BroadcastChannel | null = null;
        try {
            customerChannel = new BroadcastChannel('customers_db_channel');
            customerChannel.onmessage = (event) => {
                if (event.data.type === 'customers_changed') {
                    // Reload customers from IndexedDB
                    loadCustomersFromDB();
                }
            };
        } catch (error) {
            console.warn('[POS] BroadcastChannel not supported for customers');
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('storage', handleStorageChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('storage', handleStorageChange);
            if (customerChannel) {
                customerChannel.close();
            }
        };
    }, [fetchTaxRate, normalizeProduct, loadCustomersFromDB]);

    // State for server-side customer search results
    const [serverCustomerSearchResults, setServerCustomerSearchResults] = useState<Customer[]>([]);

    // Sync customers list when allCustomers changes (but don't trigger reload)
    useEffect(() => {
        if (customersLoaded && !customerSearchTerm.trim() && allCustomers.length > 0) {
            // Only update customers if they're different to prevent unnecessary re-renders
            setCustomers(prevCustomers => {
                if (prevCustomers.length !== allCustomers.length ||
                    !prevCustomers.every((c, i) => allCustomers[i]?.id === c.id)) {
                    return allCustomers;
                }
                return prevCustomers;
            });
        }
    }, [allCustomers, customersLoaded, customerSearchTerm]);

    // Filter customers based on search term (uses IndexedDB for fast local search)
    useEffect(() => {
        if (!customerSearchTerm.trim()) {
            // If no search term, use allCustomers if already loaded
            if (customersLoaded && allCustomers.length > 0) {
                setServerCustomerSearchResults([]);
                return;
            }

            // If customers are not loaded and we're not already loading, try to load from IndexedDB
            if (isLoadingCustomersRef.current) {
                return;
            }

            isLoadingCustomersRef.current = true;
            const loadAllCustomers = async () => {
                try {
                    await customersDB.init();
                    const dbCustomers = await customersDB.getAllCustomers();
                    
                    if (isMountedRef.current) {
                        if (dbCustomers && dbCustomers.length > 0) {
                            const transformedCustomers: Customer[] = dbCustomers
                                .map((customer: any) => ({
                                    id: customer.id,
                                    name: customer.name || customer.phone,
                                    phone: customer.phone,
                                    address: customer.address,
                                    previousBalance: customer.previousBalance || 0,
                                }))
                                .filter((customer: Customer) => !isDummyCustomer(customer));
                            try {
                                setAllCustomers(transformedCustomers);
                                setCustomers(transformedCustomers);
                                setCustomersLoaded(true);
                                console.log(`[POS] Loaded ${transformedCustomers.length} customers from IndexedDB for dropdown`);
                            } catch (error) {
                                // Silently handle if component unmounted
                                console.debug('[POS] State update skipped (component unmounted)');
                            }
                        } else {
                            // Empty IndexedDB - try to sync from server
                            console.log('[POS] IndexedDB empty, syncing from server for dropdown...');
                            try {
                                const syncResult = await fetchCustomers();
                                // After sync, reload from IndexedDB to verify it was stored
                                if (isMountedRef.current) {
                                    const verifyCustomers = await customersDB.getAllCustomers();
                                    console.log(`[POS] After sync, IndexedDB now has ${verifyCustomers?.length || 0} customers`);
                                    if (verifyCustomers && verifyCustomers.length > 0) {
                                        // Reload the transformed customers
                                        const transformedCustomers: Customer[] = verifyCustomers
                                            .map((customer: any) => ({
                                                id: customer.id,
                                                name: customer.name || customer.phone,
                                                phone: customer.phone,
                                                address: customer.address,
                                                previousBalance: customer.previousBalance || 0,
                                            }))
                                            .filter((customer: Customer) => !isDummyCustomer(customer));
                                        setAllCustomers(transformedCustomers);
                                        setCustomers(transformedCustomers);
                                        setCustomersLoaded(true);
                                        console.log(`[POS] Successfully loaded ${transformedCustomers.length} customers after sync`);
                                    }
                                }
                            } catch (syncError) {
                                console.error('[POS] Failed to sync customers from server for dropdown:', syncError);
                                console.error('[POS] Sync error details:', {
                                    message: syncError instanceof Error ? syncError.message : String(syncError),
                                    stack: syncError instanceof Error ? syncError.stack : undefined
                                });
                                // Mark as loaded even if sync failed
                                if (isMountedRef.current) {
                                    setAllCustomers([]);
                                    setCustomers([]);
                                    setCustomersLoaded(true);
                                    console.log(`[POS] Loaded 0 customers (sync failed)`);
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('[POS] Error loading customers from IndexedDB:', error);
                    // Try to sync from server as fallback
                    try {
                        await fetchCustomers();
                    } catch (syncError) {
                        console.warn('[POS] Failed to sync customers from server after IndexedDB error:', syncError);
                        // Even on error, mark as loaded to prevent infinite loading
                        if (isMountedRef.current) {
                            setCustomersLoaded(true);
                            setAllCustomers([]);
                            setCustomers([]);
                        }
                    }
                } finally {
                    isLoadingCustomersRef.current = false;
                }
            };
            loadAllCustomers();
            setServerCustomerSearchResults([]);
            return;
        }

        // Use IndexedDB search for fast local search
        const searchCustomersLocal = async () => {
            if (!isMountedRef.current) return;
            try {
                // Search in IndexedDB (fast, handles large datasets)
                const searchResults = await customersDB.searchCustomers(customerSearchTerm);

                if (!isMountedRef.current) return;

                // Transform and filter out dummy customers
                const transformedCustomers: Customer[] = searchResults
                    .map((customer: any) => ({
                        id: customer.id,
                        name: customer.name || customer.phone,
                        phone: customer.phone,
                        address: customer.address,
                        previousBalance: customer.previousBalance || 0,
                    }))
                    .filter((customer: Customer) => !isDummyCustomer(customer));

                try {
                    setCustomers(transformedCustomers);
                    setServerCustomerSearchResults([]);
                } catch (error) {
                    // Silently handle if component unmounted
                    console.debug('[POS] State update skipped (component unmounted)');
                }
            } catch (error) {
                if (!isMountedRef.current) return;
                console.error('[POS] Error searching customers in IndexedDB:', error);
                // Fallback to server-side search
                if (!customersLoaded || allCustomers.length === 0) {
                    const results = await searchCustomersOnServer(customerSearchTerm);
                    if (isMountedRef.current) {
                        try {
                            setServerCustomerSearchResults(results);
                            setCustomers(results);
                        } catch (error) {
                            console.debug('[POS] State update skipped (component unmounted)');
                        }
                    }
                } else {
                    // Fallback to client-side filter from state
                    const searchLower = customerSearchTerm.toLowerCase();
                    const filtered = allCustomers.filter(customer => 
                        customer.name?.toLowerCase().includes(searchLower) ||
                        customer.phone?.includes(searchLower) ||
                        customer.address?.toLowerCase().includes(searchLower)
                    );
                    if (isMountedRef.current) {
                        try {
                            setCustomers(filtered);
                        } catch (error) {
                            console.debug('[POS] State update skipped (component unmounted)');
                        }
                    }
                }
            }
        };

        // Debounce search
        const timeoutId = setTimeout(() => {
            searchCustomersLocal();
        }, 300);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [customerSearchTerm, searchCustomersOnServer]);

    // Load autoPrintInvoice setting when component mounts or settings change
    useEffect(() => {
        const settings = loadSettings(null);
        if (settings && settings.autoPrintInvoice !== undefined) {
            setAutoPrintEnabled(settings.autoPrintInvoice);
        }
    }, []);

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

    // Check stock from server for critical operations (bypasses cache)
    const checkStockFromServer = useCallback(async (productId: string, originalId?: string): Promise<number | null> => {
        const idToQuery = originalId || productId;
        if (!idToQuery) return null;

        try {
            const serverProduct = await productSync.queryProductFromServer(idToQuery);
            if (serverProduct) {
                return serverProduct.stock || 0;
            }
        } catch (error) {
            console.error('[POS] Error checking stock from server:', error);
        }
        return null;
    }, []);

    const handleAddProduct = async (product: POSProduct, unit = 'قطعة', unitPriceOverride?: number, conversionFactorOverride?: number, piecesPerUnitOverride?: number, useServerStockCheck = false) => {
        // Use the passed product directly to ensure we use the correct price (avoids hash collision issues)
        // Only use productFromState for additional properties like units if needed
        const productFromState = products.find(prod => prod.id === product.id);
        
        // CRITICAL: Always use the passed product data as the source of truth
        // The passed product comes from fresh API data (e.g., barcode search), not stale IndexedDB/state
        // Prefer the passed product's data, but merge with state product for units if available
        const finalProduct: POSProduct = {
            ...product,
            // Use units from state if available and passed product doesn't have them
            units: product.units || productFromState?.units,
        };
        
        const piecesPerMainUnit = getPiecesPerMainUnit(finalProduct);
        const conversionFactor = conversionFactorOverride && conversionFactorOverride > 0
            ? conversionFactorOverride
            : getUnitConversionFactor(finalProduct, unit);

        // piecesPerUnit determines how many pieces to add for this scan
        const piecesPerUnit = piecesPerUnitOverride && piecesPerUnitOverride > 0
            ? piecesPerUnitOverride
            : unit === 'قطعة'
                ? 1
                : piecesPerMainUnit;

        // Calculate the unit price
        // Priority: unitPriceOverride > product price (for base unit or no units) > calculated per-piece price
        let incomingUnitPrice: number;
        if (unitPriceOverride !== undefined && unitPriceOverride > 0) {
            incomingUnitPrice = unitPriceOverride;
        } else if (finalProduct.units && finalProduct.units.length > 0 && unit !== 'قطعة') {
            // Product has units and we're using a specific unit - calculate per-piece price
            incomingUnitPrice = piecesPerMainUnit > 0 ? (finalProduct.price / piecesPerMainUnit) : finalProduct.price;
        } else {
            // Product without units or using base unit - use product price directly
            incomingUnitPrice = finalProduct.price;
        }
        
        // Final safety check: ensure we have a valid price
        if (!incomingUnitPrice || incomingUnitPrice <= 0 || !isFinite(incomingUnitPrice)) {
            console.warn('Invalid price calculated, using product price:', { product, incomingUnitPrice, finalProduct });
            incomingUnitPrice = product.price || 0;
        }

        // CRITICAL: Always use the passed product's stock as the source of truth
        // The passed product comes from fresh API data (e.g., barcode search), which has the latest quantity
        // Only fall back to state product if the passed product doesn't have stock data
        let availableStock = product.stock !== undefined && product.stock !== null 
            ? product.stock 
            : (productFromState?.stock ?? 0);
            
        console.log('[POS] Stock check:', {
            productId: product.id,
            productName: product.name,
            passedProductStock: product.stock,
            stateProductStock: productFromState?.stock,
            finalAvailableStock: availableStock,
            source: product.stock !== undefined && product.stock !== null ? 'passed_product' : 'state_fallback'
        });
        if (useServerStockCheck && product.originalId) {
            const serverStock = await checkStockFromServer(String(product.id), product.originalId);
            if (serverStock !== null) {
                availableStock = serverStock;
                // Update IndexedDB and local state with fresh stock
                try {
                    await productsDB.updateProductStock(product.originalId, serverStock);
                } catch (error) {
                    console.error('[POS] Error updating stock in IndexedDB:', error);
                }
                setProducts(prevProducts => {
                    const updated = prevProducts.map(p => 
                        String(p.id) === String(product.id) 
                            ? { ...p, stock: serverStock }
                            : p
                    );
                    // If product not in state, add it
                    if (!updated.some(p => String(p.id) === String(product.id))) {
                        updated.push({ ...product, stock: serverStock });
                    }
                    return updated;
                });
            }
        }

        setCurrentInvoice(inv => {
            // Check for existing item using productId AND name AND unit to avoid hash collision issues
            // Only update quantity if it's truly the same product (same ID, name, and unit)
            const existingItem = inv.items.find(item => 
                item.productId === product.id && 
                item.name === product.name && 
                item.unit === unit
            );
            const currentQuantity = existingItem?.quantity || 0;
            const newQuantity = currentQuantity + piecesPerUnit;

            // Stock check using piece-based quantities
            const availablePieces = availableStock * piecesPerMainUnit;
            
            // Check allowSellingZeroStock setting
            const allowSellingZeroStock = getAllowSellingZeroStockSetting();
            
            // If setting is disabled and stock is zero, block the sale
            if (!allowSellingZeroStock && availablePieces === 0) {
                alert(`لا يمكن بيع المنتج "${product.name}" لأنه لا يوجد مخزون متوفر.`);
                return inv;
            }
            
            // If quantity exceeds available stock (and stock > 0), block the sale
            if (newQuantity > availablePieces && availablePieces > 0) {
                alert(`الكمية المطلوبة (${newQuantity}) تتجاوز المخزون المتوفر (${availablePieces}).`);
                return inv;
            }

            if (existingItem) {
                // Same product, same unit - update quantity
                const updatedQuantity = newQuantity;
                const updatedTotal = (existingItem.total ?? (existingItem.unitPrice * existingItem.quantity)) + (incomingUnitPrice * piecesPerUnit);
                const averagedUnitPrice = updatedQuantity > 0 ? updatedTotal / updatedQuantity : existingItem.unitPrice;

                // If existing item doesn't have cartItemId, generate one for backward compatibility
                const itemCartItemId = existingItem.cartItemId || `${existingItem.productId}-${existingItem.name}-${existingItem.unit}-${Date.now()}-${Math.random()}`;

                return {
                    ...inv,
                    items: inv.items.map(item => {
                        // Match by cartItemId if available, otherwise fall back to productId + name + unit
                        const isMatch = existingItem.cartItemId 
                            ? item.cartItemId === existingItem.cartItemId
                            : (item.productId === product.id && item.name === product.name && item.unit === unit);
                        
                        return isMatch
                            ? {
                                  ...item,
                                  cartItemId: itemCartItemId, // Ensure cartItemId exists
                                  originalId: item.originalId || product.originalId, // Preserve or set originalId
                                  quantity: updatedQuantity,
                                  total: updatedTotal,
                                  unitPrice: averagedUnitPrice,
                                  conversionFactor: item.conversionFactor || conversionFactor || piecesPerMainUnit,
                              }
                            : item;
                    }),
                };
            }

            // New product or different unit - add as new item
            const initialQuantity = piecesPerUnit;
            const initialTotal = incomingUnitPrice * piecesPerUnit;

            const newItem: POSCartItem = {
                cartItemId: `${product.id}-${product.name}-${unit}-${Date.now()}-${Math.random()}`, // Unique ID for this cart item
                productId: product.id,
                originalId: product.originalId, // Store backend ID for stock updates
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

    // Server-side search function (fallback when client-side products aren't loaded)
    const searchProductsOnServer = useCallback(async (term: string): Promise<SearchMatch[]> => {
        const trimmed = term.trim();
        if (!trimmed) return [];

        try {
            setIsSearchingServer(true);
            console.log(`[POS] Performing server-side search for: "${trimmed}"`);
            
            // Use API search parameter to search on server
            const response = await productsApi.getProducts({ 
                page: 1, 
                limit: 100, // Get up to 100 results
                search: trimmed 
            });

            if (response.success) {
                const productsData = (response.data as any)?.products || (response.data as any)?.data?.products || [];
                const results: SearchMatch[] = [];

                productsData.forEach((p: any) => {
                    const normalizedProduct = normalizeProduct(p);
                    const piecesPerMainUnit = getPiecesPerMainUnit(normalizedProduct);

                    // Check barcode match on product
                    if (normalizedProduct.barcode && (
                        normalizedProduct.barcode === trimmed || 
                        normalizedProduct.barcode.toLowerCase() === trimmed.toLowerCase()
                    )) {
                        const perPiecePrice = piecesPerMainUnit > 0 ? normalizedProduct.price / piecesPerMainUnit : normalizedProduct.price;
                        results.push({ 
                            product: normalizedProduct, 
                            unitName: 'كرتون', 
                            unitPrice: perPiecePrice, 
                            barcode: normalizedProduct.barcode, 
                            conversionFactor: piecesPerMainUnit, 
                            piecesPerUnit: piecesPerMainUnit 
                        });
                    }

                    // Check barcode match on units
                    if (normalizedProduct.units) {
                        for (const u of normalizedProduct.units) {
                            if (u.barcode && (
                                u.barcode === trimmed || 
                                u.barcode.toLowerCase() === trimmed.toLowerCase()
                            )) {
                                const perPiecePrice = u.sellingPrice || (piecesPerMainUnit > 0 ? normalizedProduct.price / piecesPerMainUnit : normalizedProduct.price);
                                results.push({ 
                                    product: normalizedProduct, 
                                    unitName: u.unitName || 'قطعة', 
                                    unitPrice: perPiecePrice, 
                                    barcode: u.barcode, 
                                    conversionFactor: u.conversionFactor || piecesPerMainUnit, 
                                    piecesPerUnit: 1 
                                });
                            }
                        }
                    }

                    // Name match (API already filters by name, but we include it for completeness)
                    const lower = trimmed.toLowerCase();
                    if (normalizedProduct.name && normalizedProduct.name.toLowerCase().includes(lower)) {
                        const perPiecePrice = piecesPerMainUnit > 0 ? normalizedProduct.price / piecesPerMainUnit : normalizedProduct.price;
                        results.push({ 
                            product: normalizedProduct, 
                            unitName: 'كرتون', 
                            unitPrice: perPiecePrice, 
                            barcode: normalizedProduct.barcode, 
                            conversionFactor: piecesPerMainUnit, 
                            piecesPerUnit: piecesPerMainUnit 
                        });
                    }
                });

                // Deduplicate
                const seen = new Set<string>();
                const uniqueResults = results.filter((r) => {
                    const key = `${r.product.id}-${r.unitName}-${r.barcode || ''}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });

                console.log(`[POS] Server-side search found ${uniqueResults.length} matches`);
                return uniqueResults;
            } else {
                console.warn('[POS] Server-side search response was not successful');
                return [];
            }
        } catch (err: any) {
            console.error('[POS] Error in server-side search:', err);
            return [];
        } finally {
            setIsSearchingServer(false);
        }
    }, [normalizeProduct]);

    // Client-side search function (uses IndexedDB for fast search)
    const resolveSearchMatches = useCallback(async (term: string): Promise<SearchMatch[]> => {
        const trimmed = term.trim();
        if (!trimmed) return [];
        const lower = trimmed.toLowerCase();
        const results: SearchMatch[] = [];

        try {
            // Search in IndexedDB first (fast, handles large datasets)
            const dbProducts = await productsDB.searchProducts({
                searchTerm: trimmed,
                limit: 1000, // Get up to 1000 results for search
            });

            // Process results
            dbProducts.forEach((p: any) => {
                const normalizedProduct = normalizeProduct(p);
                const piecesPerMainUnit = getPiecesPerMainUnit(normalizedProduct);

                // Barcode exact match on product
                const productBarcode = normalizedProduct.barcode || (p as any).primaryBarcode || '';
                if (productBarcode && (productBarcode === trimmed || productBarcode.toLowerCase() === lower)) {
                    const perPiecePrice = piecesPerMainUnit > 0 ? normalizedProduct.price / piecesPerMainUnit : normalizedProduct.price;
                    results.push({ 
                        product: normalizedProduct, 
                        unitName: 'كرتون', 
                        unitPrice: perPiecePrice, 
                        barcode: productBarcode, 
                        conversionFactor: piecesPerMainUnit, 
                        piecesPerUnit: piecesPerMainUnit 
                    });
                }
                
                // Barcode match on units
                if (normalizedProduct.units) {
                    for (const u of normalizedProduct.units) {
                        if (u.barcode && (u.barcode === trimmed || u.barcode.toLowerCase() === lower)) {
                            const perPiecePrice = u.sellingPrice || (piecesPerMainUnit > 0 ? normalizedProduct.price / piecesPerMainUnit : normalizedProduct.price);
                            // Secondary units are counted as 1 piece per scan
                            results.push({ 
                                product: normalizedProduct, 
                                unitName: u.unitName || 'قطعة', 
                                unitPrice: perPiecePrice, 
                                barcode: u.barcode, 
                                conversionFactor: u.conversionFactor || piecesPerMainUnit, 
                                piecesPerUnit: 1 
                            });
                        }
                    }
                }
                
                // Name contains (already filtered by IndexedDB search, but add to results)
                if (normalizedProduct.name && normalizedProduct.name.toLowerCase().includes(lower)) {
                    const perPiecePrice = piecesPerMainUnit > 0 ? normalizedProduct.price / piecesPerMainUnit : normalizedProduct.price;
                    results.push({ 
                        product: normalizedProduct, 
                        unitName: 'كرتون', 
                        unitPrice: perPiecePrice, 
                        barcode: productBarcode, 
                        conversionFactor: piecesPerMainUnit, 
                        piecesPerUnit: piecesPerMainUnit 
                    });
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
        } catch (error) {
            console.error('[POS] Error searching IndexedDB:', error);
            // Fallback to local state search
            const results: SearchMatch[] = [];
            products.forEach((p) => {
                const piecesPerMainUnit = getPiecesPerMainUnit(p);
                if (p.barcode && (p.barcode === trimmed || p.barcode.toLowerCase() === lower)) {
                    const perPiecePrice = piecesPerMainUnit > 0 ? p.price / piecesPerMainUnit : p.price;
                    results.push({ product: p, unitName: 'كرتون', unitPrice: perPiecePrice, barcode: p.barcode, conversionFactor: piecesPerMainUnit, piecesPerUnit: piecesPerMainUnit });
                }
                if (p.name && p.name.toLowerCase().includes(lower)) {
                    const perPiecePrice = piecesPerMainUnit > 0 ? p.price / piecesPerMainUnit : p.price;
                    results.push({ product: p, unitName: 'كرتون', unitPrice: perPiecePrice, barcode: p.barcode, conversionFactor: piecesPerMainUnit, piecesPerUnit: piecesPerMainUnit });
                }
            });
            return results;
        }
    }, [products, normalizeProduct, getPiecesPerMainUnit]);

    // Helper function to check if input is a barcode (numeric only)
    const isBarcodeInput = useCallback((input: string): boolean => {
        const trimmed = input.trim();
        if (!trimmed) return false;
        // Check if input is numeric only (1 digit or more)
        return /^[0-9]+$/.test(trimmed);
    }, []);

    // Helper function to remove leading zeros from a barcode
    const removeLeadingZeros = useCallback((barcode: string): string => {
        return barcode.replace(/^0+/, '') || '0'; // Keep at least one digit if all zeros
    }, []);

    // Barcode search function - searches by exact barcode match
    // Handles leading zeros by trying original value first, then without leading zeros
    const searchProductByBarcode = useCallback(async (barcode: string): Promise<{ success: boolean; product?: POSProduct; unitName?: string; unitPrice?: number; conversionFactor?: number; piecesPerUnit?: number }> => {
        const trimmed = barcode.trim();
        if (!trimmed) {
            return { success: false };
        }

        // Helper function to process a successful search response
        const processSearchResponse = async (response: any, searchBarcode: string): Promise<{ success: boolean; product?: POSProduct; unitName?: string; unitPrice?: number; conversionFactor?: number; piecesPerUnit?: number }> => {
            if (response.data?.success && response.data?.data?.product) {
                const productData = response.data.data.product;
                const matchedUnit = response.data.data.matchedUnit;
                
                // Normalize the product
                const normalizedProduct = normalizeProduct(productData);
                
                // Determine unit information
                let unitName = 'قطعة';
                let unitPrice = normalizedProduct.price;
                let conversionFactor = 1;
                let piecesPerUnit = 1;
                
                const piecesPerMainUnit = getPiecesPerMainUnit(normalizedProduct);
                
                // If a unit was matched, use its information
                if (matchedUnit) {
                    unitName = matchedUnit.unitName || 'قطعة';
                    unitPrice = matchedUnit.sellingPrice || normalizedProduct.price;
                    conversionFactor = matchedUnit.conversionFactor || piecesPerMainUnit;
                    piecesPerUnit = 1; // Secondary units are counted as 1 piece per scan
                } else {
                    // Product barcode matched - use default unit
                    unitName = 'قطعة';
                    unitPrice = piecesPerMainUnit > 0 ? normalizedProduct.price / piecesPerMainUnit : normalizedProduct.price;
                    conversionFactor = piecesPerMainUnit;
                    piecesPerUnit = piecesPerMainUnit;
                }

                console.log(`[POS] Product found by barcode: ${normalizedProduct.name} (searched with: "${searchBarcode}")`);
                
                // Update IndexedDB and state with fresh product data immediately
                // This ensures stock checks use the latest quantity, not stale cached data
                // NOTE: We use productsDB.storeProduct() directly instead of productSync to avoid
                // triggering unnecessary server syncs. ProductSync should only run on actual changes
                // (sales, returns, quantity updates), not on barcode scans or cart additions.
                try {
                    // Store product directly in IndexedDB without triggering a sync
                    await productsDB.storeProduct(productData);
                    // Notify other tabs of the update (lightweight, doesn't trigger sync)
                    productsDB.notifyOtherTabs();
                    console.log(`[POS] Updated IndexedDB with fresh product data from server for: ${normalizedProduct.name}`);
                    
                    // Update products state to replace stale data
                    // Match by both id and originalId to ensure we replace the correct product
                    setProducts(prevProducts => {
                        const updated = prevProducts.filter(p => {
                            const matchesById = String(p.id) === String(normalizedProduct.id);
                            const matchesByOriginalId = normalizedProduct.originalId && 
                                String(p.originalId) === String(normalizedProduct.originalId);
                            return !matchesById && !matchesByOriginalId;
                        });
                        // Add the fresh product data (this replaces any stale version)
                        updated.push(normalizedProduct);
                        return updated;
                    });
                    console.log(`[POS] Updated products state with fresh data for: ${normalizedProduct.name}`);
                } catch (error) {
                    console.error('[POS] Error updating IndexedDB/state with fresh product data:', error);
                    // Continue anyway - we still have the fresh product from API
                }
                
                return {
                    success: true,
                    product: normalizedProduct,
                    unitName,
                    unitPrice,
                    conversionFactor,
                    piecesPerUnit,
                };
            }
            return { success: false };
        };

        try {
            setIsSearchingServer(true);
            
            // First, try searching with the original barcode value
            console.log(`[POS] Searching product by barcode: "${trimmed}"`);
            let response;
            let productFound = false;
            
            try {
                response = await productsApi.getProductByBarcode(trimmed);
                console.log('[POS] Barcode search response:', response);
                
                const result = await processSearchResponse(response, trimmed);
                if (result.success) {
                    return result;
                }
                // Product not found in response
                productFound = false;
            } catch (err: any) {
                // If 404, we'll try without leading zeros
                if (err?.status === 404) {
                    console.log(`[POS] Product not found (404) for barcode: "${trimmed}", trying without leading zeros...`);
                    productFound = false;
                } else {
                    // For other errors, rethrow to be handled below
                    throw err;
                }
            }
            
            // If not found, try searching without leading zeros
            const normalizedBarcode = removeLeadingZeros(trimmed);
            if (!productFound && normalizedBarcode !== trimmed && normalizedBarcode !== '0') {
                console.log(`[POS] Retrying search with normalized barcode (without leading zeros): "${normalizedBarcode}"`);
                try {
                    response = await productsApi.getProductByBarcode(normalizedBarcode);
                    console.log('[POS] Normalized barcode search response:', response);
                    
                    const result = await processSearchResponse(response, normalizedBarcode);
                    if (result.success) {
                        return result;
                    }
                } catch (err: any) {
                    if (err?.status === 404) {
                        console.log(`[POS] Product not found (404) for normalized barcode: "${normalizedBarcode}"`);
                    } else {
                        throw err;
                    }
                }
            }
            
            // Product not found with either variation
            const triedNormalized = normalizedBarcode !== trimmed && normalizedBarcode !== '0';
            console.log(`[POS] Product not found for barcode: "${trimmed}"${triedNormalized ? ` (tried original and normalized: "${normalizedBarcode}")` : ''}`);
            return { success: false };
            
        } catch (err: any) {
            console.error('[POS] Error searching product by barcode:', err);
            // If it's a 404, the product simply doesn't exist
            if (err?.status === 404) {
                console.log(`[POS] Product not found (404) for barcode: "${trimmed}"`);
            } else {
                console.error('[POS] Unexpected error during barcode search:', {
                    status: err?.status,
                    message: err?.message,
                    details: err?.details
                });
            }
            return { success: false };
        } finally {
            setIsSearchingServer(false);
        }
    }, [normalizeProduct, getPiecesPerMainUnit, removeLeadingZeros]);

    // Queue processor for barcodes - ensures sequential processing
    const processBarcodeQueue = useCallback(async () => {
        // If already processing, don't start another process
        if (isProcessingBarcodeRef.current) {
            return;
        }

        // If queue is empty, nothing to process
        if (barcodeQueueRef.current.length === 0) {
            return;
        }

        // Mark as processing
        isProcessingBarcodeRef.current = true;

        // Process barcodes one at a time
        while (barcodeQueueRef.current.length > 0) {
            const barcode = barcodeQueueRef.current.shift(); // Get and remove first barcode
            if (!barcode) continue;

            try {
                // Process this barcode
                const barcodeResult = await searchProductByBarcode(barcode);
                
                if (barcodeResult.success && barcodeResult.product) {
                    // Product found - add to cart automatically
                    handleAddProduct(
                        barcodeResult.product,
                        barcodeResult.unitName || 'قطعة',
                        barcodeResult.unitPrice,
                        barcodeResult.conversionFactor,
                        barcodeResult.piecesPerUnit
                    );
                    setSearchTerm('');
                    setProductSuggestionsOpen(false);
                } else {
                    // Product not found
                    alert('المنتج غير موجود');
                    setSearchTerm('');
                    setProductSuggestionsOpen(false);
                }
            } catch (error) {
                console.error('[POS] Error processing barcode from queue:', error);
                // Continue processing next barcode even if this one failed
            }
        }

        // Mark as not processing
        isProcessingBarcodeRef.current = false;
    }, [searchProductByBarcode, handleAddProduct]);

    // Function to add barcode to queue and trigger processing
    const queueBarcodeSearch = useCallback((barcode: string) => {
        const trimmed = barcode.trim();
        if (!trimmed) return;

        // Add to queue
        barcodeQueueRef.current.push(trimmed);
        
        // Play beep sound immediately when barcode is detected
        playBeepSound();
        
        // Clear search term immediately to prepare for next scan
        setSearchTerm('');
        
        // Start processing queue (will only start if not already processing)
        processBarcodeQueue();
    }, [processBarcodeQueue]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const trimmedSearchTerm = searchTerm.trim();
        if (!trimmedSearchTerm) return;

        // Check if input is a barcode (numeric only)
        if (isBarcodeInput(trimmedSearchTerm)) {
            // Use queue-based barcode search to prevent concurrent processing
            queueBarcodeSearch(trimmedSearchTerm);
            return;
        }

        // Not a barcode - use regular name search
        // If products aren't loaded or array is empty, use server-side search
        if (!productsLoaded || products.length === 0) {
            console.log('[POS] Using server-side search (client-side products not loaded)');
            const matches = await searchProductsOnServer(trimmedSearchTerm);
            if (matches.length === 0) {
                alert('المنتج غير موجود');
                return;
            }
            // Store the matches for the suggestions dropdown
            setServerSearchResults(matches);
            if (matches.length === 1) {
                const match = matches[0];
                handleAddProduct(match.product, match.unitName, match.unitPrice, match.conversionFactor, match.piecesPerUnit);
                setSearchTerm('');
                setProductSuggestionsOpen(false);
            } else {
                // Show all matches for the cashier to pick
                setProductSuggestionsOpen(true);
            }
            return;
        }

        // Use IndexedDB search if products are loaded (async)
        if (productsLoaded && products.length > 0) {
            const matches = await resolveSearchMatches(trimmedSearchTerm);
            if (matches.length === 0) {
                alert('المنتج غير موجود');
                return;
            }
            if (matches.length === 1) {
                const match = matches[0];
                handleAddProduct(match.product, match.unitName, match.unitPrice, match.conversionFactor, match.piecesPerUnit);
                setSearchTerm('');
                setProductSuggestionsOpen(false);
            } else {
                // Show all matches for the cashier to pick
                setProductSuggestionsOpen(true);
            }
        }
    };

    // State for server-side search results (for suggestions dropdown)
    const [serverSearchResults, setServerSearchResults] = useState<SearchMatch[]>([]);
    // State for client-side search results (for suggestions dropdown)
    const [clientSearchResults, setClientSearchResults] = useState<SearchMatch[]>([]);

    // Update server search results when search term changes (debounced)
    useEffect(() => {
        if (!searchTerm.trim()) {
            setServerSearchResults([]);
            setClientSearchResults([]);
            return;
        }

        // Only use server-side search if client-side products aren't loaded
        if (!productsLoaded || products.length === 0) {
            const timeoutId = setTimeout(async () => {
                const results = await searchProductsOnServer(searchTerm);
                setServerSearchResults(results);
            }, 300); // Debounce 300ms

            return () => clearTimeout(timeoutId);
        } else {
            setServerSearchResults([]);
        }
    }, [searchTerm, productsLoaded, products.length, searchProductsOnServer]);

    // Update client-side search results when search term changes (debounced)
    useEffect(() => {
        if (!searchTerm.trim()) {
            setClientSearchResults([]);
            return;
        }

        // Only use client-side search if products are loaded
        if (productsLoaded && products.length > 0) {
            const timeoutId = setTimeout(async () => {
                const matches = await resolveSearchMatches(searchTerm);
                setClientSearchResults(matches);
            }, 300); // Debounce 300ms

            return () => clearTimeout(timeoutId);
        } else {
            setClientSearchResults([]);
        }
    }, [searchTerm, resolveSearchMatches, productsLoaded, products.length]);

    // Compute product suggestions from either server or client results
    const productSuggestions = useMemo(() => {
        // If using server-side search, return server results
        if (!productsLoaded || products.length === 0) {
            return serverSearchResults.slice(0, 12);
        }
        // Otherwise use client-side search results
        return clientSearchResults.slice(0, 12);
    }, [productsLoaded, products.length, serverSearchResults, clientSearchResults]);

    const handleUpdateQuantity = (cartItemId: string, quantity: number) => {
        const normalizedQuantity = Number.isFinite(quantity) ? quantity : 0;
        const roundedQuantity = Math.max(0, Math.round(normalizedQuantity));
        
        // Find the item to get product info for stock check
        const item = currentInvoice.items.find(i => i.cartItemId === cartItemId);
        if (!item) return;
        
        const p = products.find(prod => prod.id === item.productId);
        const piecesPerMainUnit = getPiecesPerMainUnit(p);
        const availablePieces = p ? p.stock * piecesPerMainUnit : Infinity;
        
        // Check allowSellingZeroStock setting
        const allowSellingZeroStock = getAllowSellingZeroStockSetting();
        
        // If setting is disabled and stock is zero, block the update
        if (p && !allowSellingZeroStock && availablePieces === 0 && roundedQuantity > 0) {
            alert(`لا يمكن بيع المنتج "${p.name}" لأنه لا يوجد مخزون متوفر.`);
            return;
        }
        
        // If quantity exceeds available stock (and stock > 0), block the update
        if (p && roundedQuantity > availablePieces && availablePieces > 0) {
            alert(`الكمية المطلوبة (${roundedQuantity}) تتجاوز المخزون المتوفر (${availablePieces}). لا يمكنك إضافة المزيد.`);
            return;
        }

        if (roundedQuantity < 1) {
            handleRemoveItem(cartItemId);
            return;
        }
        setCurrentInvoice(inv => ({
            ...inv,
            items: inv.items.map(item =>
                item.cartItemId === cartItemId ? { ...item, quantity: roundedQuantity, total: item.unitPrice * roundedQuantity } : item
            ),
        }));
    };

    const handleUpdateItemDiscount = (cartItemId: string, discount: number) => {
        setCurrentInvoice(inv => ({
            ...inv,
            items: inv.items.map(item =>
                item.cartItemId === cartItemId ? { ...item, discount: Math.max(0, discount) } : item
            ),
        }));
    };

    const handleRemoveItem = (cartItemId: string) => {
        setCurrentInvoice(inv => ({
            ...inv,
            items: inv.items.filter(item => item.cartItemId !== cartItemId),
        }));
    };

    const handleHoldSale = async () => {
        if (currentInvoice.items.length === 0) return;
        setHeldInvoices(prev => [...prev, currentInvoice]);
        const nextInvoiceNumber = await fetchNextInvoiceNumber();
        setCurrentInvoice(generateNewInvoice(currentUserName, nextInvoiceNumber));
    };

    const handleRestoreSale = (invoiceId: string) => {
        const invoiceToRestore = heldInvoices.find(inv => inv.id === invoiceId);
        if (invoiceToRestore) {
            setHeldInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
            setCurrentInvoice(invoiceToRestore);
        }
    };
    
    const startNewSale = async () => {
        setSaleCompleted(false);
        const nextInvoiceNumber = await fetchNextInvoiceNumber();
        setCurrentInvoice(generateNewInvoice(currentUserName, nextInvoiceNumber));
        setSelectedPaymentMethod('Cash');
        setCreditPaidAmount(0);
    }
    
    const handleReturn = async () => {
        if (currentInvoice.items.length === 0) {
            alert('يرجى إضافة منتجات للإرجاع');
            return;
        }
        
        // Fetch next invoice number for return (returns use same sequential format)
        const nextInvoiceNumber = await fetchNextInvoiceNumber();
        
        // Create a return invoice with current cart items
        const returnInvoice = generateNewInvoice(currentUserName, nextInvoiceNumber, true);
        returnInvoice.customer = currentInvoice.customer;
        
        // Copy items to return invoice (quantities will be positive for returns)
        returnInvoice.items = currentInvoice.items.map(item => ({
            ...item,
            quantity: Math.abs(item.quantity), // Ensure positive quantity for returns
            total: Math.abs(item.total), // Ensure positive total for returns
        }));
        
        // Recalculate totals for return invoice
        const totals = calculateTotals(returnInvoice.items, returnInvoice.invoiceDiscount);
        returnInvoice.subtotal = totals.subtotal;
        returnInvoice.totalItemDiscount = totals.totalItemDiscount;
        returnInvoice.tax = totals.tax;
        returnInvoice.grandTotal = totals.grandTotal;
        
        // Process the return
        processReturnInvoice(returnInvoice);
    }
    
    const processReturnInvoice = async (returnInvoice: POSInvoice) => {
        const finalInvoice = { ...returnInvoice, paymentMethod: 'Cash' }; // Returns are typically cash
        
        // Update stock - ADD stock back for returns
        const stockUpdateResults: Array<{ success: boolean; productName: string; productId: string | number; error?: string }> = [];
        
        try {
            for (const item of returnInvoice.items) {
                if (!item || !item.productId || item.quantity <= 0) {
                    continue;
                }

                const invoiceItemProductId = item.productId;
                const invoiceItemName = item.name;
                
                let productIdToUpdate: string | undefined = item.originalId;
                let product: POSProduct | undefined;
                
                if (productIdToUpdate) {
                    console.log(`[Return Stock Update] Using originalId from cart item: ${productIdToUpdate}`);
                } else {
                    const matchingProducts = products.filter(p => String(p.id) === String(invoiceItemProductId));
                    if (matchingProducts.length === 0) {
                        stockUpdateResults.push({ 
                            success: false, 
                            productName: invoiceItemName, 
                            productId: invoiceItemProductId,
                            error: `Product not found for return`
                        });
                        continue;
                    }
                    product = matchingProducts[0];
                    productIdToUpdate = product.originalId;
                }

                if (!productIdToUpdate) {
                    stockUpdateResults.push({ 
                        success: false, 
                        productName: invoiceItemName, 
                        productId: invoiceItemProductId,
                        error: `Missing originalId for return`
                    });
                    continue;
                }

                // Calculate stock addition for returns
                let piecesPerMainUnit = 1;
                if (product) {
                    piecesPerMainUnit = getPiecesPerMainUnit(product);
                } else if (item.conversionFactor && item.conversionFactor > 0) {
                    piecesPerMainUnit = item.conversionFactor;
                }
                
                let stockAddition: number;
                if (item.conversionFactor && item.conversionFactor > 0 && piecesPerMainUnit > 1) {
                    stockAddition = item.quantity / item.conversionFactor;
                } else {
                    stockAddition = item.quantity;
                }
                stockAddition = Math.ceil(stockAddition);

                const productIdToUpdateString = String(productIdToUpdate);
                
                try {
                    const currentProductResponse = await productsApi.getProduct(productIdToUpdateString);
                    const currentProduct = (currentProductResponse.data as any)?.data?.product || (currentProductResponse.data as any)?.product;
                    
                    if (!currentProduct) {
                        throw new Error('Product data not found');
                    }

                    const currentStock = currentProduct.stock || 0;
                    const newStock = currentStock + stockAddition; // ADD stock for returns
                    
                    await productsApi.updateProduct(productIdToUpdateString, {
                        ...currentProduct,
                        stock: newStock,
                    });
                    
                    console.log(`✓ Return: Stock added for "${invoiceItemName}": ${currentStock} -> ${newStock} (+${stockAddition})`);
                    stockUpdateResults.push({ 
                        success: true, 
                        productName: invoiceItemName,
                        productId: invoiceItemProductId
                    });
                } catch (error: any) {
                    console.error(`✗ Failed to update stock for return:`, error);
                    stockUpdateResults.push({ 
                        success: false, 
                        productName: invoiceItemName, 
                        productId: invoiceItemProductId,
                        error: error?.message || 'Unknown error'
                    });
                }
            }
        } catch (error) {
            console.error('Error updating stock for return:', error);
        }

        // Sync products after quantity changes (non-blocking)
        const productIdsToSync = returnInvoice.items
            .map(item => item.originalId)
            .filter((id): id is string => !!id);
        
        if (productIdsToSync.length > 0) {
            productSync.syncAfterQuantityChange(productIdsToSync).then(async (result) => {
                if (result.success && result.products) {
                    // Update IndexedDB with synced products
                    try {
                        await productsDB.storeProducts(result.products);
                        // Reload from IndexedDB
                        const dbProducts = await productsDB.getAllProducts();
                        const normalizedProducts = dbProducts.map((p: any) => normalizeProduct(p));
                        setProducts(normalizedProducts);
                        console.log(`[POS] Updated IndexedDB with ${normalizedProducts.length} synced products after return`);
                    } catch (error) {
                        console.error('[POS] Error updating IndexedDB after return sync:', error);
                    }
                }
            }).catch(error => {
                console.error('[POS] Error syncing products after return:', error);
            });
        }

        // Update local product state
        setProducts(prevProducts => {
            const newProducts = [...prevProducts];
            returnInvoice.items.forEach(item => {
                const productIndex = newProducts.findIndex(p => String(p.id) === String(item.productId));
                if (productIndex !== -1) {
                    const product = newProducts[productIndex];
                    const piecesPerMainUnit = getPiecesPerMainUnit(product);
                    const stockAddition = item.conversionFactor && item.conversionFactor > 0 
                        ? Math.ceil(item.quantity / item.conversionFactor)
                        : item.quantity;
                    newProducts[productIndex].stock = product.stock + stockAddition;
                }
            });
            return newProducts;
        });

            // Save return as a new sale with "refunded" status (backend enum value)
            try {
                const customerName = returnInvoice.customer?.name || 'عميل نقدي';
                const customerId = returnInvoice.customer?.id || 'walk-in-customer';
                
                // Prepare sale data for backend API (as a return invoice)
                const saleData = {
                    invoiceNumber: returnInvoice.id,
                    date: returnInvoice.date instanceof Date 
                        ? returnInvoice.date.toISOString() 
                        : new Date().toISOString(),
                    customerId: customerId !== 'walk-in-customer' ? customerId : undefined,
                    customerName: customerName,
                    items: returnInvoice.items.map(item => {
                        // Use originalId from cart item if available, otherwise try to find product
                        let backendProductId: string;
                        if (item.originalId) {
                            backendProductId = item.originalId;
                        } else {
                            // Fallback: find product to get original backend ID
                            const product = products.find(p => p.id === item.productId);
                            backendProductId = product?.originalId || String(item.productId);
                        }
                        return {
                            productId: backendProductId, // Use original backend ID
                            productName: item.name,
                            quantity: item.quantity,
                            unitPrice: -Math.abs(item.unitPrice), // Negative for returns
                            totalPrice: -(item.total - (item.discount * item.quantity)), // Negative for returns
                            unit: item.unit,
                            discount: item.discount,
                            conversionFactor: item.conversionFactor,
                        };
                    }),
                    subtotal: -Math.abs(returnInvoice.subtotal), // Negative for returns
                    totalItemDiscount: -Math.abs(returnInvoice.totalItemDiscount), // Negative for returns
                    invoiceDiscount: -Math.abs(returnInvoice.invoiceDiscount), // Negative for returns
                    tax: -Math.abs(returnInvoice.tax), // Negative for returns
                    total: -Math.abs(returnInvoice.grandTotal), // Negative for returns
                    paidAmount: -Math.abs(returnInvoice.grandTotal), // Negative for returns
                    remainingAmount: 0, // Always 0 for returns (fully refunded)
                    paymentMethod: 'cash', // Returns are typically cash
                    status: 'refunded', // Use 'refunded' status (valid enum value in backend)
                    isReturn: true, // Mark as return invoice
                    seller: returnInvoice.cashier,
                };

                // Save return sale to database
                const saleResponse = await salesApi.createSale(saleData);
                console.log('Return sale saved to database:', saleResponse);
                
                // Create SaleTransaction for return (with negative values)
                const returnTransaction: SaleTransaction = {
                    id: returnInvoice.id,
                    date: returnInvoice.date instanceof Date 
                        ? returnInvoice.date.toISOString() 
                        : new Date().toISOString(),
                    customerName: customerName,
                    customerId: customerId,
                    totalAmount: -Math.abs(returnInvoice.grandTotal), // Negative for returns
                    paidAmount: -Math.abs(returnInvoice.grandTotal), // Negative for returns
                    remainingAmount: 0, // Always 0 for returns (fully refunded)
                    paymentMethod: 'Cash' as SalePaymentMethod,
                    status: 'Returned' as SaleStatus,
                    seller: returnInvoice.cashier,
                    items: returnInvoice.items.map(item => ({
                        productId: item.productId,
                        name: item.name,
                        unit: item.unit,
                        quantity: item.quantity,
                        unitPrice: -Math.abs(item.unitPrice), // Negative for returns
                        total: -Math.abs(item.total), // Negative for returns
                        discount: item.discount,
                        conversionFactor: item.conversionFactor,
                    })),
                    subtotal: -Math.abs(returnInvoice.subtotal), // Negative for returns
                    totalItemDiscount: -Math.abs(returnInvoice.totalItemDiscount), // Negative for returns
                    invoiceDiscount: -Math.abs(returnInvoice.invoiceDiscount), // Negative for returns
                    tax: -Math.abs(returnInvoice.tax), // Negative for returns
                };

                // Update transaction ID if provided by backend
                if (saleResponse.data && (saleResponse.data as any).data?.sale) {
                    const savedSale = (saleResponse.data as any).data.sale;
                    returnTransaction.id = savedSale.id || savedSale._id || returnTransaction.id;
                }

                // Save to localStorage
                saveSale(returnTransaction);
                console.log('Return transaction saved:', returnTransaction);
                
                // Show success and reset
                setCurrentInvoice(returnInvoice);
                setSaleCompleted(true);
            } catch (error: any) {
                const apiError = error as ApiError;
                console.error('Failed to save return:', apiError);
                alert(`تم إرجاع المنتجات، لكن حدث خطأ في حفظ الفاتورة: ${apiError.message || 'خطأ غير معروف'}`);
            }
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

    const finalizeSaleWithoutTerminal = async () => {
        const finalInvoice = { ...currentInvoice, paymentMethod: selectedPaymentMethod };
        
        // Check if this is a return (should not happen here, but safety check)
        if (finalInvoice.originalInvoiceId) {
            console.warn('Attempted to finalize a return invoice through sale flow. Use processReturnInvoice instead.');
            return;
        }
        
        // CRITICAL: Only update stock for products in the invoice items
        // Ensure we're iterating ONLY over currentInvoice.items, not all products
        const invoiceItems = currentInvoice.items || [];
        
        if (invoiceItems.length === 0) {
            console.warn('No items in invoice, skipping stock update');
        } else {
            console.log(`Updating stock for ${invoiceItems.length} product(s) in invoice:`, 
                invoiceItems.map(item => ({ productId: item.productId, name: item.name, quantity: item.quantity })));
        }
        
        // Update stock in backend for each product IN THE INVOICE ONLY
        const stockUpdateResults: Array<{ success: boolean; productName: string; productId: string | number; error?: string }> = [];
        
        try {
            // CRITICAL FIX: Explicitly iterate only over invoice items, not all products
            // Process items sequentially to avoid race conditions and ensure correct productId mapping
            for (const item of invoiceItems) {
                // Validate that item has required fields
                if (!item || !item.productId || item.quantity <= 0) {
                    const errorMsg = `Invalid invoice item: missing productId or invalid quantity`;
                    console.warn(errorMsg, item);
                    stockUpdateResults.push({ 
                        success: false, 
                        productName: item?.name || 'Unknown', 
                        productId: item?.productId || 'unknown',
                        error: errorMsg 
                    });
                    continue;
                }

                // Store the invoice item's productId to ensure we use the correct one
                const invoiceItemProductId = item.productId;
                const invoiceItemName = item.name;
                
                // CRITICAL FIX: Use originalId from cart item if available, otherwise try to find product
                let productIdToUpdate: string | undefined = item.originalId;
                let product: POSProduct | undefined;
                
                if (productIdToUpdate) {
                    // We have the originalId directly from the cart item - use it!
                    console.log(`[Stock Update] Using originalId from cart item: ${productIdToUpdate} for product "${invoiceItemName}"`);
                } else {
                    // Fallback: Try to find product in products array to get originalId
                    console.warn(`[Stock Update] originalId not found in cart item, searching in products array for productId: ${invoiceItemProductId}`);
                    const matchingProducts = products.filter(p => String(p.id) === String(invoiceItemProductId));
                    
                    if (matchingProducts.length === 0) {
                        const errorMsg = `Product not found in products list and no originalId in cart item for productId: ${invoiceItemProductId}, name: ${invoiceItemName}`;
                        console.error(errorMsg, { 
                            invoiceItemProductId, 
                            invoiceItemName, 
                            availableProductIds: products.map(p => ({ id: p.id, name: p.name })) 
                        });
                        stockUpdateResults.push({ 
                            success: false, 
                            productName: invoiceItemName, 
                            productId: invoiceItemProductId,
                            error: errorMsg 
                        });
                        continue;
                    }

                    // If multiple products match (shouldn't happen, but handle it), use the first one
                    if (matchingProducts.length > 1) {
                        console.warn(`Multiple products found with same ID: ${invoiceItemProductId}. Using first match.`, matchingProducts);
                    }

                    product = matchingProducts[0];

                    // CRITICAL VALIDATION: Ensure product ID matches invoice item ID
                    if (String(product.id) !== String(invoiceItemProductId)) {
                        const errorMsg = `Product ID mismatch: product.id (${product.id}) !== item.productId (${invoiceItemProductId})`;
                        console.error(errorMsg, { product, item });
                        stockUpdateResults.push({ 
                            success: false, 
                            productName: invoiceItemName, 
                            productId: invoiceItemProductId,
                            error: errorMsg 
                        });
                        continue;
                    }

                    // Validate product name matches (additional safety check)
                    if (product.name !== invoiceItemName) {
                        console.warn(`Product name mismatch: product.name (${product.name}) !== item.name (${invoiceItemName}). Continuing anyway.`);
                    }

                    if (!product.originalId) {
                        const errorMsg = `Product missing originalId for productId: ${invoiceItemProductId}, name: ${invoiceItemName}`;
                        console.error(errorMsg, { product });
                        stockUpdateResults.push({ 
                            success: false, 
                            productName: invoiceItemName, 
                            productId: invoiceItemProductId,
                            error: errorMsg 
                        });
                        continue;
                    }
                    
                    productIdToUpdate = product.originalId;
                }

                // Calculate the stock change considering conversion factors
                // For sales, we SUBTRACT stock
                const itemQuantity = item.quantity;
                
                // The quantity in the cart is in pieces, we need to convert to base units for stock
                // Get piecesPerMainUnit from product if available, otherwise use conversionFactor
                let piecesPerMainUnit = 1;
                if (product) {
                    piecesPerMainUnit = getPiecesPerMainUnit(product);
                } else if (item.conversionFactor && item.conversionFactor > 0) {
                    piecesPerMainUnit = item.conversionFactor;
                }
                
                let stockChange: number;
                
                if (item.conversionFactor && item.conversionFactor > 0 && piecesPerMainUnit > 1) {
                    // If we're selling in a sub-unit (e.g., pieces), convert to base unit (e.g., cartons)
                    // Example: 24 pieces with conversionFactor 24 = 1 carton
                    stockChange = itemQuantity / item.conversionFactor;
                } else {
                    // Direct quantity (already in base units)
                    stockChange = itemQuantity;
                }
                
                // Round up to ensure we don't under-deduct stock
                stockChange = Math.ceil(stockChange);

                // CRITICAL: Use the specific product's originalId to update ONLY that product
                // Store in a const to prevent accidental modification
                const productIdToUpdateString = String(productIdToUpdate);
                
                // Final validation: ensure productIdToUpdate is valid
                if (!productIdToUpdate || productIdToUpdate === 'undefined' || productIdToUpdate === 'null') {
                    const errorMsg = `Invalid originalId for product: ${invoiceItemProductId}, originalId: ${productIdToUpdate}`;
                    console.error(errorMsg, { item, product });
                    stockUpdateResults.push({ 
                        success: false, 
                        productName: invoiceItemName, 
                        productId: invoiceItemProductId,
                        error: errorMsg 
                    });
                    continue;
                }

                // Log the update attempt with full context
                console.log(`[Stock Update] Processing item:`, {
                    invoiceItemProductId,
                    invoiceItemName,
                    productId: product?.id || 'N/A',
                    productName: product?.name || invoiceItemName,
                    productIdToUpdate: productIdToUpdateString,
                    quantity: item.quantity,
                    stockChange,
                });
                
                // Get current product data to update stock
                try {
                    const currentProductResponse = await productsApi.getProduct(productIdToUpdateString);
                    const currentProduct = (currentProductResponse.data as any)?.data?.product || (currentProductResponse.data as any)?.product;
                    
                    if (!currentProduct) {
                        throw new Error('Product data not found in response');
                    }

                    // CRITICAL VALIDATION: Verify we got the correct product from the API
                    const responseProductId = String(currentProduct.id || currentProduct._id);
                    if (responseProductId !== productIdToUpdateString) {
                        const errorMsg = `Product ID mismatch in API response: expected ${productIdToUpdateString}, got ${responseProductId}. Aborting update to prevent wrong product update.`;
                        console.error(errorMsg, { 
                            productIdToUpdate: productIdToUpdateString, 
                            responseProductId, 
                            currentProduct,
                            invoiceItemProductId,
                            invoiceItemName
                        });
                        throw new Error(errorMsg);
                    }

                    // Additional validation: verify product name matches
                    const expectedName = product?.name || invoiceItemName;
                    if (currentProduct.name !== expectedName) {
                        console.warn(`Product name mismatch in API response: expected "${expectedName}", got "${currentProduct.name}". Continuing with update.`);
                    }

                    const currentStock = currentProduct.stock || 0;
                    // For sales, subtract stock
                    const newStock = Math.max(0, currentStock - stockChange);
                    
                    // CRITICAL FIX: Update ONLY the specific product using its productId
                    // Ensure we're passing the correct productId in the URL
                    // Double-check productIdToUpdate before making the API call
                    console.log(`[Stock Update] Calling API: PUT /products/${productIdToUpdateString}`, {
                        productIdToUpdate: productIdToUpdateString,
                        invoiceItemProductId,
                        productName: expectedName,
                        currentStock,
                        newStock,
                        stockChange: `-${stockChange}`,
                        operation: 'SALE (subtracting stock)',
                    });
                    
                    await productsApi.updateProduct(productIdToUpdateString, {
                        ...currentProduct,
                        stock: newStock,
                    });
                    
                    console.log(`✓ Stock updated for product "${expectedName}" (Frontend ID: ${invoiceItemProductId}, Backend ID: ${productIdToUpdateString}): ${currentStock} -> ${newStock} (reduced by ${stockChange})`);
                    stockUpdateResults.push({ 
                        success: true, 
                        productName: expectedName,
                        productId: invoiceItemProductId
                    });
                } catch (error: any) {
                    const errorMsg = error?.message || 'Unknown error';
                    const productName = product?.name || invoiceItemName;
                    console.error(`✗ Failed to update stock for product "${productName}" (Frontend ID: ${invoiceItemProductId}, Backend ID: ${productIdToUpdateString}):`, error);
                    stockUpdateResults.push({ 
                        success: false, 
                        productName: productName, 
                        productId: invoiceItemProductId,
                        error: errorMsg 
                    });
                    // Continue with other products even if one fails
                }
            }

            // Stock updates are processed sequentially above
            // Log summary of stock updates
            const successful = stockUpdateResults.filter(r => r.success).length;
            const failed = stockUpdateResults.filter(r => !r.success).length;
            console.log(`Stock updates completed: ${successful} successful, ${failed} failed`);
            
            if (failed > 0) {
                const failedProducts = stockUpdateResults
                    .filter(r => !r.success)
                    .map(r => `${r.productName} (ID: ${r.productId})`)
                    .join(', ');
                console.warn(`Failed to update stock for: ${failedProducts}`);
            }

            // CRITICAL: Verify we only updated products in the invoice
            const updatedProductIds = stockUpdateResults
                .filter(r => r.success)
                .map(r => r.productId);
            const invoiceProductIds = invoiceItems.map(item => item.productId);
            // Compare as strings to handle type differences
            const extraUpdates = updatedProductIds.filter(id => {
                const idStr = String(id);
                return !invoiceProductIds.some(invId => String(invId) === idStr);
            });
            if (extraUpdates.length > 0) {
                console.error(`CRITICAL ERROR: Updated products not in invoice!`, extraUpdates);
            }
        } catch (error) {
            console.error('Error updating stock:', error);
            // Continue with sale creation even if stock update fails
        }

        // Update local state (optimistic update)
        // CRITICAL: Only update products that are in the invoice items
        // First, check which products are missing and fetch them
        const invoiceItemsForStateUpdate = currentInvoice.items || [];
        
        // Identify missing products that need to be fetched
        const missingProductsToFetch: Array<{ item: POSCartItem; originalId: string }> = [];
        
        // Check which invoice items have products missing from local state
        invoiceItemsForStateUpdate.forEach(item => {
            if (!item || !item.productId || item.quantity <= 0) {
                return;
            }
            
            const existsInState = products.some(p => String(p.id) === String(item.productId));
            if (!existsInState && item.originalId) {
                missingProductsToFetch.push({ item, originalId: item.originalId });
            }
        });
        
        // Fetch missing products if any
        let fetchedProducts: POSProduct[] = [];
        if (missingProductsToFetch.length > 0) {
            try {
                const fetchPromises = missingProductsToFetch.map(async ({ originalId }) => {
                    try {
                        const response = await productsApi.getProduct(originalId);
                        const productData = (response.data as any)?.data?.product || (response.data as any)?.product;
                        if (productData) {
                            return normalizeProduct(productData);
                        }
                    } catch (error) {
                        // Silently fail - product will be skipped in local state update
                        if (process.env.NODE_ENV === 'development') {
                            console.debug(`Could not fetch product ${originalId} for local state update:`, error);
                        }
                    }
                    return null;
                });
                
                fetchedProducts = (await Promise.all(fetchPromises)).filter((p): p is POSProduct => p !== null);
            } catch (error) {
                // Silently continue - backend update already succeeded
                if (process.env.NODE_ENV === 'development') {
                    console.debug('Error fetching missing products for local state update:', error);
                }
            }
        }
        
        // Update local state: add fetched products and update stock
        setProducts(prevProducts => {
            const newProducts = [...prevProducts];
            
            // Add fetched products that don't already exist
            fetchedProducts.forEach(fetchedProduct => {
                const exists = newProducts.some(p => String(p.id) === String(fetchedProduct.id));
                if (!exists) {
                    newProducts.push(fetchedProduct);
                }
            });
            
            // CRITICAL FIX: Only iterate over invoice items, not all products
            invoiceItemsForStateUpdate.forEach(item => {
                // Validate item has required fields
                if (!item || !item.productId || item.quantity <= 0) {
                    return;
                }

                // Store the invoice item's productId to ensure we use the correct one
                const invoiceItemProductId = item.productId;
                const invoiceItemName = item.name;

                // Find the product by matching productId
                const productIndex = newProducts.findIndex(p => String(p.id) === String(invoiceItemProductId));
                
                // Skip if product not found (may happen if fetch failed, but backend update already succeeded)
                if (productIndex === -1) {
                    // Only log in development mode - this is expected for products not in local state
                    if (process.env.NODE_ENV === 'development') {
                        console.debug(`Product not found in local state for productId: ${invoiceItemProductId}, name: ${invoiceItemName}. Skipping local state update (backend update already succeeded).`);
                    }
                    return;
                }

                const product = newProducts[productIndex];
                
                // CRITICAL VALIDATION: Ensure we found the correct product
                if (String(product.id) !== String(invoiceItemProductId)) {
                    if (process.env.NODE_ENV === 'development') {
                        console.debug(`Product ID mismatch in local state update: product.id (${product.id}) !== item.productId (${invoiceItemProductId})`);
                    }
                    return;
                }

                // Calculate stock reduction
                const piecesPerMainUnit = getPiecesPerMainUnit(product);
                const stockReduction = item.conversionFactor && item.conversionFactor > 0 
                    ? Math.ceil(item.quantity / item.conversionFactor)
                    : item.quantity;

                // Update stock for this specific product only
                const oldStock = product.stock;
                const newStock = Math.max(0, product.stock - stockReduction);
                newProducts[productIndex].stock = newStock;

                // Also update IndexedDB
                if (product.originalId) {
                    productsDB.updateProductStock(product.originalId, newStock).catch(error => {
                        console.error(`[POS] Error updating stock in IndexedDB for product ${product.originalId}:`, error);
                    });
                }

                if (process.env.NODE_ENV === 'development') {
                    console.log(`Local state: Updated stock for product "${product.name}" (ID: ${invoiceItemProductId}): ${oldStock} -> ${newStock} (reduced by ${stockReduction})`);
                }
            });
            
            return newProducts;
        });
        
        // Sync products after quantity changes (non-blocking)
        const productIdsToSync = invoiceItems
            .map(item => item.originalId)
            .filter((id): id is string => !!id);
        
        if (productIdsToSync.length > 0) {
            productSync.syncAfterQuantityChange(productIdsToSync).then(async (result) => {
                if (result.success && result.products) {
                    // Update IndexedDB with synced products
                    try {
                        await productsDB.storeProducts(result.products);
                        // Reload from IndexedDB
                        const dbProducts = await productsDB.getAllProducts();
                        const normalizedProducts = dbProducts.map((p: any) => normalizeProduct(p));
                        setProducts(normalizedProducts);
                        console.log(`[POS] Updated IndexedDB with ${normalizedProducts.length} synced products after sale`);
                    } catch (error) {
                        console.error('[POS] Error updating IndexedDB after sale sync:', error);
                    }
                }
            }).catch(error => {
                console.error('[POS] Error syncing products after sale:', error);
            });
        }
        
        console.log('Sale Finalized:', finalInvoice);
        setCurrentInvoice(finalInvoice);
        setSaleCompleted(true);

        // Create SaleTransaction and save to localStorage
        const customerName = finalInvoice.customer?.name || 'عميل نقدي';
        const customerId = finalInvoice.customer?.id || 'walk-in-customer';
        
        // Calculate paid and remaining amounts based on payment method
        let paidAmount = 0;
        let remainingAmount = 0;
        let status: SaleStatus = 'Paid';
        
        if (selectedPaymentMethod === 'Cash' || selectedPaymentMethod === 'Card') {
            // Full payment for cash and card
            paidAmount = finalInvoice.grandTotal;
            remainingAmount = 0;
            status = 'Paid';
        } else if (selectedPaymentMethod === 'Credit') {
            // Credit payment - use the paid amount if specified
            paidAmount = creditPaidAmount;
            remainingAmount = finalInvoice.grandTotal - creditPaidAmount;
            
            if (remainingAmount <= 0) {
                status = 'Paid';
                remainingAmount = 0;
            } else if (paidAmount > 0) {
                status = 'Partial';
            } else {
                status = 'Due';
            }
        }

        // Convert POSInvoice to SaleTransaction
        let saleTransaction: SaleTransaction = {
            id: finalInvoice.id,
            date: finalInvoice.date instanceof Date 
                ? finalInvoice.date.toISOString() 
                : new Date().toISOString(),
            customerName: customerName,
            customerId: customerId,
            totalAmount: finalInvoice.grandTotal,
            paidAmount: paidAmount,
            remainingAmount: remainingAmount,
            paymentMethod: selectedPaymentMethod as SalePaymentMethod,
            status: status,
            seller: finalInvoice.cashier,
            items: finalInvoice.items.map(item => ({
                productId: item.productId,
                name: item.name,
                unit: item.unit,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total,
                discount: item.discount,
                conversionFactor: item.conversionFactor,
            })),
            subtotal: finalInvoice.subtotal,
            totalItemDiscount: finalInvoice.totalItemDiscount,
            invoiceDiscount: finalInvoice.invoiceDiscount,
            tax: finalInvoice.tax,
        };

        // Save to IndexedDB and sync with backend
        try {
            // Get storeId from user
            const storeId = user?.storeId;
            if (!storeId) {
                throw new Error('Store ID is required to save sale');
            }

            // Prepare sale data for IndexedDB and backend
            const saleData = {
                invoiceNumber: finalInvoice.id,
                storeId: storeId,
                date: finalInvoice.date instanceof Date 
                    ? finalInvoice.date.toISOString() 
                    : new Date().toISOString(),
                customerId: customerId !== 'walk-in-customer' ? customerId : undefined,
                customerName: customerName,
                items: finalInvoice.items.map(item => {
                    // Use originalId from cart item if available, otherwise try to find product
                    let backendProductId: string;
                    if (item.originalId) {
                        backendProductId = item.originalId;
                    } else {
                        // Fallback: find product to get original backend ID
                        const product = products.find(p => p.id === item.productId);
                        backendProductId = product?.originalId || String(item.productId);
                    }
                    return {
                        productId: backendProductId, // Use original backend ID
                        productName: item.name,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.total - (item.discount * item.quantity),
                        unit: item.unit,
                        discount: item.discount,
                        conversionFactor: item.conversionFactor,
                    };
                }),
                subtotal: finalInvoice.subtotal,
                totalItemDiscount: finalInvoice.totalItemDiscount,
                invoiceDiscount: finalInvoice.invoiceDiscount,
                tax: finalInvoice.tax,
                total: finalInvoice.grandTotal,
                paidAmount: paidAmount,
                remainingAmount: remainingAmount,
                paymentMethod: selectedPaymentMethod.toLowerCase(), // Convert to lowercase for backend
                status: status === 'Paid' ? 'completed' : status === 'Partial' ? 'partial_payment' : 'pending',
                seller: finalInvoice.cashier,
            };

            // Use IndexedDB sync service (saves locally and syncs with backend)
            const syncResult = await salesSync.createAndSyncSale(saleData, storeId);
            
            if (syncResult.success) {
                // Update sale transaction with database ID if provided
                if (syncResult.saleId) {
                    saleTransaction.id = syncResult.saleId;
                }
                console.log('✅ Sale saved to IndexedDB and synced:', finalInvoice.id);
                
                // Show warning if sync had errors but sale was saved locally
                if (syncResult.error) {
                    console.warn('⚠️ Sale saved locally, will sync later:', syncResult.error);
                }
            } else {
                throw new Error(syncResult.error || 'Failed to save sale');
            }
        } catch (error: any) {
            console.error('❌ Failed to save sale:', error);
            // Show alert for errors with more helpful message
            const errorMessage = error?.message || 'خطأ غير معروف';
            let userMessage = '';
            
            if (errorMessage.includes('IndexedDB') || errorMessage.includes('indexedDB')) {
                // IndexedDB specific error
                userMessage = `تم حفظ الفاتورة على الخادم بنجاح، لكن حدث خطأ في التخزين المحلي. الفاتورة آمنة على الخادم.\n\nError: ${errorMessage}`;
            } else {
                // General error
                userMessage = `تم إنشاء الفاتورة، لكن حدث خطأ في حفظها: ${errorMessage}`;
            }
            
            alert(userMessage);
        }

        // Save to localStorage as backup (legacy support)
        saveSale(saleTransaction);
        console.log('Sale transaction saved to localStorage (backup):', saleTransaction);
    };



    const renderReceipt = (invoice: SaleTransaction | POSInvoice, title: string) => {
        // Check if this is a return invoice
        const isReturn = 'originalInvoiceId' in invoice && invoice.originalInvoiceId !== undefined
            || ('status' in invoice && invoice.status === 'Returned')
            || ('id' in invoice && invoice.id.startsWith('RET-'));
        return (
            <div id="printable-receipt" className="w-full max-w-md bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg text-right">
                <div className="text-center mb-4 sm:mb-5">
                    <CheckCircleIcon className={`w-12 h-12 sm:w-16 sm:h-16 ${isReturn ? 'text-blue-500' : 'text-green-500'} mx-auto print-hidden`} />
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 mt-2 print-hidden">{isReturn ? AR_LABELS.returnCompleted : AR_LABELS.saleCompleted}</h2>
                    <h3 className="text-lg sm:text-xl font-bold text-center text-gray-900 dark:text-gray-100 mt-3 sm:mt-4 mb-2">{title}</h3>
                    <p className="text-center text-xs text-gray-500 dark:text-gray-400">123 الشارع التجاري, الرياض, السعودية</p>
                </div>

                <div className="invoice-info text-xs my-4 space-y-1.5">
                    <p><strong>{AR_LABELS.invoiceNumber}:</strong> {invoice.id}</p>
                    {isReturn && 'originalInvoiceId' in invoice && <p><strong>{AR_LABELS.originalInvoiceNumber}:</strong> {invoice.originalInvoiceId}</p>}
                    <p><strong>{AR_LABELS.date}:</strong> {new Date(invoice.date).toLocaleString('ar-SA')}</p>
                    {/* FIX: Use type guard to access 'cashier' or 'seller' property */}
                    <p><strong>{AR_LABELS.posCashier}:</strong> {'cashier' in invoice ? invoice.cashier : invoice.seller}</p>
                    <p><strong>{AR_LABELS.customerName}:</strong> {'customer' in invoice ? invoice.customer?.name : invoice.customerName || 'N/A'}</p>
                </div>
                
                <div className="overflow-x-auto -mx-2 sm:mx-0">
                    <table className="w-full text-xs min-w-full border-collapse" style={{ borderSpacing: 0 }}>
                        <thead>
                            <tr className="bg-gray-100 dark:bg-gray-700">
                                <th className="py-2.5 px-3 text-right font-bold border border-gray-300 dark:border-gray-600" style={{ borderRight: '1px solid #dee2e6', borderLeft: '1px solid #dee2e6', borderTop: '1px solid #dee2e6', borderBottom: '2px solid #495057' }}>اسم المنتج</th>
                                <th className="py-2.5 px-3 text-center font-bold border border-gray-300 dark:border-gray-600" style={{ borderRight: '1px solid #dee2e6', borderLeft: '1px solid #dee2e6', borderTop: '1px solid #dee2e6', borderBottom: '2px solid #495057' }}>الكمية</th>
                                <th className="py-2.5 px-3 text-center font-bold border border-gray-300 dark:border-gray-600" style={{ borderRight: '1px solid #dee2e6', borderLeft: '1px solid #dee2e6', borderTop: '1px solid #dee2e6', borderBottom: '2px solid #495057' }}>سعر الوحدة</th>
                                <th className="py-2.5 px-3 text-left font-bold border border-gray-300 dark:border-gray-600" style={{ borderRight: '1px solid #dee2e6', borderLeft: '1px solid #dee2e6', borderTop: '1px solid #dee2e6', borderBottom: '2px solid #495057' }}>الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items.map((item, idx) => {
                                const itemUnitPrice = isReturn ? -Math.abs(item.unitPrice) : item.unitPrice;
                                const itemTotal = isReturn ? -Math.abs(item.total - item.discount * item.quantity) : (item.total - item.discount * item.quantity);
                                return (
                                <tr key={item.cartItemId || `receipt-item-${idx}`} className="border-b border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="py-2.5 px-3 text-right border border-gray-300 dark:border-gray-600 font-medium">{item.name}</td>
                                    <td className="py-2.5 px-3 text-center border border-gray-300 dark:border-gray-600">{Math.abs(item.quantity)}</td>
                                    <td className={`py-2.5 px-3 text-center border border-gray-300 dark:border-gray-600 ${isReturn ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>{formatCurrency(itemUnitPrice)}</td>
                                    <td className={`py-2.5 px-3 text-left border border-gray-300 dark:border-gray-600 font-semibold ${isReturn ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>{formatCurrency(itemTotal)}</td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="receipt-summary mt-5 text-xs">
                    <div className="flex justify-between py-1.5">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">{AR_LABELS.subtotal}:</span>
                        <span className={`font-semibold ${isReturn ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                            {formatCurrency(isReturn ? -Math.abs(invoice.subtotal) : invoice.subtotal)}
                        </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">{AR_LABELS.totalDiscount}:</span>
                        <span className={`font-semibold ${isReturn ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                            {formatCurrency(isReturn ? -Math.abs(invoice.totalItemDiscount + invoice.invoiceDiscount) : -(invoice.totalItemDiscount + invoice.invoiceDiscount))}
                        </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">{AR_LABELS.tax}:</span>
                        <span className={`font-semibold ${isReturn ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                            {formatCurrency(isReturn ? -Math.abs(invoice.tax) : invoice.tax)}
                        </span>
                    </div>
                    <div className="grand-total flex justify-between">
                        <span className="text-gray-900 dark:text-gray-100 font-bold">{isReturn ? AR_LABELS.totalReturnValue : AR_LABELS.grandTotal}:</span>
                        <span className={`font-bold text-lg ${isReturn ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
                            {formatCurrency(isReturn ? -Math.abs('grandTotal' in invoice ? invoice.grandTotal : invoice.totalAmount) : ('grandTotal' in invoice ? invoice.grandTotal : invoice.totalAmount))}
                        </span>
                    </div>
                </div>
                <p className="receipt-footer text-center text-xs mt-6 text-gray-500 dark:text-gray-400">شكراً لتعاملكم معنا!</p>
            </div>
        );
    }
    
    if (saleCompleted) {
        const isReturnInvoice = currentInvoice.id.startsWith('RET-') || currentInvoice.originalInvoiceId !== undefined;
        const receiptTitle = isReturnInvoice ? 'Returns' : 'PoshPointHub';
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6">
                {saleCompleted && renderReceipt(currentInvoice, receiptTitle)}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:space-x-4 sm:space-x-reverse mt-4 sm:mt-6 print-hidden w-full max-w-md">
                    <button onClick={startNewSale} className="inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 border border-transparent text-sm sm:text-base font-medium rounded-md shadow-sm text-white bg-orange-500 hover:bg-orange-600 transition-colors">
                        <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5 ml-2" />
                        <span>{AR_LABELS.startNewSale}</span>
                    </button>
                    <button onClick={() => printReceipt('printable-receipt')} className="inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 text-sm sm:text-base font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                        <span className="h-4 w-4 sm:h-5 sm:w-5"><PrintIcon /></span>
                        <span className="mr-2">{AR_LABELS.printReceipt}</span>
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div ref={posContainerRef} className="relative min-h-screen overflow-hidden">
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
                        <div className="bg-white/95 dark:bg-gray-800/95 rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 space-y-3 sm:space-y-4 flex flex-col min-h-0 relative z-10">
                            <div className="flex-shrink-0">
                                <h3 className="font-bold text-sm sm:text-base text-gray-700 dark:text-gray-200 text-right mb-2">{AR_LABELS.customerName}</h3>
                                
                                {/* Customer Search Input with Dropdown */}
                                <div className="relative mb-2 z-[100]">
                                    <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 z-10" />
                                    <input
                                        type="text"
                                        value={customerSearchTerm}
                                        onChange={(e) => {
                                            setCustomerSearchTerm(e.target.value);
                                            setIsCustomerDropdownOpen(true);
                                        }}
                                        onFocus={async () => {
                                            if (!isMountedRef.current) return;
                                            setIsCustomerDropdownOpen(true);
                                            // Ensure customers are loaded when dropdown opens (only if not already loaded)
                                            if (!customersLoaded) {
                                                try {
                                                    // First try IndexedDB
                                                    await customersDB.init();
                                                    if (!isMountedRef.current) return;
                                                    const dbCustomers = await customersDB.getAllCustomers();
                                                    if (isMountedRef.current) {
                                                        if (dbCustomers && dbCustomers.length > 0) {
                                                            const transformedCustomers: Customer[] = dbCustomers
                                                                .map((customer: any) => ({
                                                                    id: customer.id,
                                                                    name: customer.name || customer.phone,
                                                                    phone: customer.phone,
                                                                    address: customer.address,
                                                                    previousBalance: customer.previousBalance || 0,
                                                                }))
                                                                .filter((customer: Customer) => !isDummyCustomer(customer));
                                                            try {
                                                                setAllCustomers(transformedCustomers);
                                                                setCustomers(transformedCustomers);
                                                                setCustomersLoaded(true);
                                                                console.log(`[POS] Loaded ${transformedCustomers.length} customers on focus`);
                                                            } catch (error) {
                                                                console.debug('[POS] State update skipped (component unmounted)');
                                                            }
                                                        } else {
                                                            // Empty IndexedDB - try to sync from server
                                                            console.log(`[POS] IndexedDB empty on focus, syncing from server...`);
                                                            try {
                                                                const syncResult = await customerSync.syncCustomers({ forceRefresh: true });
                                                                if (!isMountedRef.current) return;
                                                                
                                                                if (syncResult.success && syncResult.customers) {
                                                                    const transformedCustomers: Customer[] = syncResult.customers
                                                                        .map((customer: any) => ({
                                                                            id: customer.id,
                                                                            name: customer.name || customer.phone,
                                                                            phone: customer.phone,
                                                                            address: customer.address,
                                                                            previousBalance: customer.previousBalance || 0,
                                                                        }))
                                                                        .filter((customer: Customer) => !isDummyCustomer(customer));
                                                                    try {
                                                                        setAllCustomers(transformedCustomers);
                                                                        setCustomers(transformedCustomers);
                                                                        setCustomersLoaded(true);
                                                                        console.log(`[POS] Synced ${transformedCustomers.length} customers on focus`);
                                                                    } catch (error) {
                                                                        console.debug('[POS] State update skipped (component unmounted)');
                                                                    }
                                                                } else if (syncResult.success && (!syncResult.customers || syncResult.customers.length === 0)) {
                                                                    // Empty list from server is also valid
                                                                    setAllCustomers([]);
                                                                    setCustomers([]);
                                                                    setCustomersLoaded(true);
                                                                    console.log(`[POS] Synced 0 customers on focus (empty list)`);
                                                                } else {
                                                                    // Sync failed
                                                                    setAllCustomers([]);
                                                                    setCustomers([]);
                                                                    setCustomersLoaded(true);
                                                                    console.warn(`[POS] Sync failed on focus: ${syncResult.error || 'Unknown error'}`);
                                                                }
                                                            } catch (syncError) {
                                                                console.warn('[POS] Failed to sync customers on focus:', syncError);
                                                                // Mark as loaded even if sync failed
                                                                if (isMountedRef.current) {
                                                                    setAllCustomers([]);
                                                                    setCustomers([]);
                                                                    setCustomersLoaded(true);
                                                                }
                                                            }
                                                        }
                                                    }
                                                } catch (error) {
                                                    if (isMountedRef.current) {
                                                        console.error('[POS] Error loading customers on focus:', error);
                                                    }
                                                }
                                            } else if (isMountedRef.current && customers.length === 0 && allCustomers.length > 0) {
                                                // If customers state is empty but allCustomers has data, update customers
                                                try {
                                                    setCustomers(allCustomers);
                                                } catch (error) {
                                                    console.debug('[POS] State update skipped (component unmounted)');
                                                }
                                            }
                                        }}
                                        placeholder="ابحث عن عميل..."
                                        className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-right"
                                    />
                                    
                                    {/* Customer List Dropdown - positioned relative to input container */}
                                    {isCustomerDropdownOpen && (
                                        <>
                                            {/* Click outside to close dropdown */}
                                            <div
                                                className="fixed inset-0 z-[9998]"
                                                onClick={() => setIsCustomerDropdownOpen(false)}
                                            />
                                            <div className="absolute top-full left-0 right-0 z-[9999] mt-1">
                                                <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-2xl max-h-60 overflow-y-auto">
                                                    {isLoadingCustomers ? (
                                                        <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">جاري التحميل...</div>
                                                    ) : (() => {
                                                        // Use allCustomers if customers is empty but allCustomers has data
                                                        const customersToShow = customers.length > 0 ? customers : (allCustomers.length > 0 ? allCustomers : []);
                                                        return customersToShow.length === 0 ? (
                                                            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                                                {customerSearchTerm ? 'لا توجد نتائج' : 'لا يوجد عملاء'}
                                                            </div>
                                                        ) : (
                                                            customersToShow.map((customer) => (
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
                                                            ))
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </>
                                    )}
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
                        <div className="bg-white/95 dark:bg-gray-800/95 rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 flex-grow overflow-y-auto relative z-0">
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
                                    {quickProducts.map((p, index) => (
                                        <button 
                                            key={`quick-product-${p.id}-${index}`} 
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
                                        const value = e.target.value;
                                        setSearchTerm(value);
                                        // Only show suggestions for non-barcode input (name search)
                                        if (!isBarcodeInput(value)) {
                                            setProductSuggestionsOpen(true);
                                        } else {
                                            // For barcode input, don't show suggestions while typing
                                            setProductSuggestionsOpen(false);
                                        }
                                    }} 
                                    onKeyDown={async (e) => {
                                        // Handle Enter key for barcode search
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const trimmed = searchTerm.trim();
                                            
                                            // If it's a barcode (numeric only), use queue-based search
                                            if (trimmed && isBarcodeInput(trimmed)) {
                                                // Use queue-based barcode search to prevent concurrent processing
                                                queueBarcodeSearch(trimmed);
                                            } else {
                                                // Not a barcode - use regular form submit (name search)
                                                handleSearch(e as any);
                                            }
                                        }
                                    }}
                                    onFocus={() => {
                                        // Only show suggestions if not a barcode input
                                        if (!isBarcodeInput(searchTerm)) {
                                            setProductSuggestionsOpen(true);
                                        }
                                    }}
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
                                        <tr key={item.cartItemId || `item-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                                            <td className="px-2 sm:px-3 py-3 sm:py-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">{index + 1}</td>
                                            <td className="px-2 sm:px-3 py-3 sm:py-4 text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{item.name}</td>
                                            <td className="px-2 sm:px-3 py-3 sm:py-4">
                                                <input 
                                                    type="number" 
                                                    value={item.quantity} 
                                                        onChange={e => {
                                                            const value = parseFloat(e.target.value);
                                                            if (item.cartItemId) {
                                                                handleUpdateQuantity(item.cartItemId, isNaN(value) ? item.quantity : value);
                                                            }
                                                        }} 
                                                    className="w-full max-w-[60px] text-xs sm:text-sm text-center border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent py-1 sm:py-1.5"
                                                />
                                            </td>
                                            <td className="px-2 sm:px-3 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatCurrency(item.unitPrice)}</td>
                                            <td className="px-2 sm:px-3 py-3 sm:py-4">
                                                <input 
                                                    type="number" 
                                                    value={item.discount} 
                                                    onChange={e => {
                                                        if (item.cartItemId) {
                                                            handleUpdateItemDiscount(item.cartItemId, parseFloat(e.target.value) || 0);
                                                        }
                                                    }} 
                                                    className="w-full max-w-[60px] text-xs sm:text-sm text-center border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent py-1 sm:py-1.5"
                                                />
                                            </td>
                                            <td className="px-2 sm:px-3 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-orange-600 whitespace-nowrap">{formatCurrency(item.total - (item.discount * item.quantity))}</td>
                                            <td className="px-2 sm:px-3 py-3 sm:py-4">
                                                <button 
                                                    onClick={() => {
                                                        if (item.cartItemId) {
                                                            handleRemoveItem(item.cartItemId);
                                                        }
                                                    }} 
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
                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                        <button 
                                            onClick={handleFinalizePayment} 
                                            disabled={currentInvoice.items.length === 0} 
                                            className="flex-1 px-4 py-3 text-sm sm:text-base font-bold text-white bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 rounded-xl hover:from-green-600 hover:via-emerald-600 hover:to-green-700 disabled:from-gray-400 disabled:via-gray-400 disabled:to-gray-500 dark:disabled:from-gray-600 dark:disabled:via-gray-600 dark:disabled:to-gray-700 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-200 disabled:cursor-not-allowed disabled:scale-100"
                                        >
                                            {AR_LABELS.confirmPayment}
                                        </button>
                                        <button 
                                            onClick={handleReturn} 
                                            disabled={currentInvoice.items.length === 0} 
                                            className="flex-1 px-4 py-3 text-sm sm:text-base font-bold text-white bg-gradient-to-r from-red-500 via-rose-500 to-red-600 rounded-xl hover:from-red-600 hover:via-rose-600 hover:to-red-700 disabled:from-gray-400 disabled:via-gray-400 disabled:to-gray-500 dark:disabled:from-gray-600 dark:disabled:via-gray-600 dark:disabled:to-gray-700 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-200 disabled:cursor-not-allowed disabled:scale-100"
                                        >
                                            {AR_LABELS.returnProduct}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
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

                        if (response.success && response.data && (response.data as any).data?.customer) {
                            const newCustomerData = (response.data as any).data.customer;
                            
                            // Store the new customer directly in IndexedDB immediately (we already have it from the response)
                            // Use syncAfterCreateOrUpdate for proper sync handling and cross-tab notification
                            try {
                                await customerSync.syncAfterCreateOrUpdate(newCustomerData);
                                console.log('[POSPage] Successfully synced customer to IndexedDB');
                            } catch (syncError) {
                                console.error('[POSPage] Error syncing customer to IndexedDB:', syncError);
                                // Continue anyway - the customer was created successfully
                            }
                            
                            // Reload customers from IndexedDB to get updated list
                            if (isMountedRef.current) {
                                const dbCustomers = await customersDB.getAllCustomers();
                                const transformedCustomers: Customer[] = dbCustomers
                                    .map((customer: any) => {
                                        // Handle both id and _id fields
                                        const customerId = customer.id || customer._id;
                                        return {
                                            id: customerId,
                                            name: customer.name || customer.phone,
                                            phone: customer.phone,
                                            address: customer.address,
                                            previousBalance: customer.previousBalance || 0,
                                        };
                                    })
                                    .filter((customer: Customer) => {
                                        if (!customer.id) return false;
                                        return !isDummyCustomer(customer);
                                    });
                                
                                try {
                                    setAllCustomers(transformedCustomers);
                                    setCustomers(transformedCustomers);
                                    setCustomersLoaded(true);
                                } catch (error) {
                                    console.debug('[POS] State update skipped (component unmounted)');
                                }
                            }
                            
                            // Optionally select the newly created customer
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

export default POSPage;