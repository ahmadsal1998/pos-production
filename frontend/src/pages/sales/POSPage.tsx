import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Product, Customer, POSInvoice, POSCartItem, SaleTransaction, SaleStatus, SalePaymentMethod } from '@/shared/types';

import { AR_LABELS, UUID, SearchIcon, DeleteIcon, PlusIcon, HandIcon, CancelIcon, PrintIcon, CheckCircleIcon } from '@/shared/constants';
import { ToggleSwitch } from '@/shared/components/ui/ToggleSwitch';
import CustomDropdown from '@/shared/components/ui/CustomDropdown/CustomDropdown';
import { customersApi, productsApi, salesApi, ApiError, storeSettingsApi } from '@/lib/api/client';
import { useCurrency } from '@/shared/contexts/CurrencyContext';
import { saveSale } from '@/shared/utils/salesStorage';
import { loadSettings, saveSettings } from '@/shared/utils/settingsStorage';
import { playBeepSound, preloadBeepSound } from '@/shared/utils/soundUtils';
import { convertArabicToEnglishNumerals } from '@/shared/utils';
import { useAuthStore } from '@/app/store';
import { printReceipt } from '@/shared/utils/printUtils';
import { productSync } from '@/lib/sync/productSync';
import { productsDB } from '@/lib/db/productsDB';
import { customerSync } from '@/lib/sync/customerSync';
import { customersDB } from '@/lib/db/customersDB';
import { salesSync } from '@/lib/sync/salesSync';
import { salesDB } from '@/lib/db/salesDB';
import { inventorySync } from '@/lib/sync/inventorySync';
import { ProductNotFoundModal } from '@/shared/components/ui/ProductNotFoundModal';
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
    
    // Only check phone length if phone exists and has content
    // Don't filter out customers with no phone or very short phone if they have a valid name
    const phoneDigits = phone.replace(/\D/g, '');
    const isDummyPhone = phoneDigits.length > 0 && (
        phoneDigits.length < 5 || 
        /^(000|111|123|999)/.test(phoneDigits)
    );
    
    const result = isDummyName || isDummyPhone;
    
    // Debug log when a customer is identified as dummy
    if (result) {
        console.log('[POS] isDummyCustomer: TRUE for:', {
            name: customer.name,
            phone: customer.phone,
            isDummyName,
            isDummyPhone,
            phoneDigits,
            phoneLength: phone.length
        });
    }
    
    return result;
};

// Helper function to transform customer data from backend/IndexedDB format to frontend Customer format
const transformCustomer = (customer: any, index?: number): Customer | null => {
    // Handle both id and _id fields - backend transforms _id to id in toJSON, but IndexedDB might have either
    // Convert to string and handle null/undefined cases
    let customerId = customer.id || customer._id;
    
    // Convert to string if it exists (handles numbers, ObjectIds, etc.)
    if (customerId != null) {
        customerId = String(customerId);
    }
    
    // Return null if id is missing or empty (will be filtered out)
    if (!customerId || customerId.trim() === '') {
        console.warn(`[POS] Customer [${index ?? '?'}] missing or empty id field:`, {
            customer,
            id: customer.id,
            _id: customer._id,
            customerId,
            idType: typeof customer.id,
            _idType: typeof customer._id
        });
        return null;
    }
    
    const transformed: Customer = {
        id: customerId,
        name: customer.name || customer.phone || '',
        phone: customer.phone || '',
        address: customer.address,
        previousBalance: customer.previousBalance || 0,
    };
    
    // Debug log for successful transformation
    if (index !== undefined && index < 3) {
        console.log(`[POS] Transformed customer [${index}]:`, {
            originalId: customer.id,
            original_id: customer._id,
            transformedId: transformed.id,
            name: transformed.name,
            phone: transformed.phone
        });
    }
    
    return transformed;
};

// Helper function to transform and filter customers
const transformAndFilterCustomers = (customers: any[]): Customer[] => {
    console.log(`[POS] transformAndFilterCustomers: Starting with ${customers.length} customers`);
    
    if (!customers || customers.length === 0) {
        console.log('[POS] transformAndFilterCustomers: Empty input array');
        return [];
    }
    
    // Log first few raw customers for debugging
    console.log('[POS] transformAndFilterCustomers: Sample raw customers:', 
        customers.slice(0, 3).map((c, i) => ({
            index: i,
            id: c.id,
            _id: c._id,
            name: c.name,
            phone: c.phone,
            hasId: !!c.id,
            has_id: !!c._id
        }))
    );
    
    const transformed = customers
        .map((customer, index) => transformCustomer(customer, index))
        .filter((customer): customer is Customer => {
            // Filter out null customers (missing id)
            if (!customer) {
                return false;
            }
            
            // Filter out customers without valid id (shouldn't happen after transformCustomer, but double-check)
            if (!customer.id || customer.id.trim() === '') {
                console.warn('[POS] Filtering out customer without valid id:', customer);
                return false;
            }
            
            // Check if it's a dummy customer
            const isDummy = isDummyCustomer(customer);
            if (isDummy) {
                console.log('[POS] Filtering out dummy customer:', customer.name, customer.phone);
            }
            
            return !isDummy;
        });
    
    console.log(`[POS] transformAndFilterCustomers: Transformed ${transformed.length} customers (filtered from ${customers.length})`);
    
    // Log transformed customers for debugging
    if (transformed.length > 0) {
        console.log('[POS] Transformed Customers:', transformed.slice(0, 5).map(c => ({
            id: c.id,
            name: c.name,
            phone: c.phone
        })));
    } else {
        console.warn('[POS] transformAndFilterCustomers: No customers after transformation!');
        console.warn('[POS] This suggests all customers were filtered out. Check:');
        console.warn('  - Are customer IDs valid?');
        console.warn('  - Are customers being marked as dummy?');
        console.warn('  - Sample raw customer:', customers[0]);
    }
    
    return transformed;
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
    const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
    const [storeAddress, setStoreAddress] = useState<string>(''); // Store address for receipts
    const [businessName, setBusinessName] = useState<string>(''); // Store business name for receipts

    const QUANTITY_STEP = 0.5;
    const MIN_QUANTITY = 0.5;

    const formatQuantityForInput = (quantity: number): string => {
        if (!Number.isFinite(quantity)) return '0';
        return Number.isInteger(quantity) ? String(quantity) : String(Math.round(quantity * 2) / 2);
    };

    const isAllowedQuantityDraft = (raw: string): boolean => {
        const s = raw.trim();
        if (s === '' || s === '.' || s === '.5') return true;
        if (/^\d+$/.test(s)) return true;        // 1
        if (/^\d+\.$/.test(s)) return true;      // 1. (in-progress)
        if (/^\d+\.5$/.test(s)) return true;     // 1.5
        return false;
    };

    const parseQuantityDraft = (raw: string): number | null => {
        const s = raw.trim();
        if (!s || s === '.' || /^\d+\.$/.test(s)) return null; // incomplete
        if (s === '.5') return 0.5;
        const parsed = Number.parseFloat(s);
        if (!Number.isFinite(parsed)) return null;
        return parsed;
    };

    const coerceToHalfStep = (quantity: number): number => {
        // Snap to nearest 0.5 to avoid floating point drift.
        return Math.round(quantity * 2) / 2;
    };

    const roundForStock = (value: number): number => {
        // Keep stock calculations stable when dealing with divisions/conversions.
        return Math.round(value * 1000) / 1000;
    };
    
    type HeldInvoice = POSInvoice & { heldKey: string };

    // Helper functions for held invoices persistence
    const HELD_INVOICES_STORAGE_KEY = 'pos_held_invoices';
    
    // Regular function for loading (can be used in useState initializer)
    const loadHeldInvoicesFromStorage = (): HeldInvoice[] => {
        try {
            const stored = localStorage.getItem(HELD_INVOICES_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Ensure dates are properly parsed
                return parsed.map((inv: any) => ({
                    ...inv,
                    date: inv.date ? new Date(inv.date) : new Date(),
                    // Ensure a stable unique key for React rendering and restore/remove ops
                    heldKey: inv.heldKey || `held_${inv.id || 'INV'}_${inv.date || Date.now()}_${UUID()}`,
                }));
            }
        } catch (error) {
            console.error('Error loading held invoices from localStorage:', error);
        }
        return [];
    };
    
    const saveHeldInvoicesToStorage = useCallback((invoices: HeldInvoice[]) => {
        try {
            localStorage.setItem(HELD_INVOICES_STORAGE_KEY, JSON.stringify(invoices));
        } catch (error) {
            console.error('Error saving held invoices to localStorage:', error);
        }
    }, []);
    
    // Initialize held invoices from localStorage
    const [heldInvoices, setHeldInvoices] = useState<HeldInvoice[]>(() => {
        try {
            return loadHeldInvoicesFromStorage();
        } catch (error) {
            console.error('Error initializing held invoices:', error);
            return [];
        }
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [saleCompleted, setSaleCompleted] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('Cash');
    const [creditPaidAmount, setCreditPaidAmount] = useState(0);
    const [creditPaidAmountError, setCreditPaidAmountError] = useState<string | null>(null);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false); // Track payment processing state
    // Load autoPrintInvoice setting from preferences, default to false
    const getAutoPrintSetting = (): boolean => {
        try {
            const settings = loadSettings(null);
            if (settings && settings.autoPrintInvoice !== undefined) {
                return settings.autoPrintInvoice;
            }
        } catch (err) {
            console.error('Failed to load autoPrintInvoice setting:', err);
        }
        return false; // Default to false if not found
    };
    
    const [autoPrintEnabled, setAutoPrintEnabled] = useState(() => getAutoPrintSetting());
    const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
    const [isProductNotFoundModalOpen, setIsProductNotFoundModalOpen] = useState(false);
    const [notFoundBarcode, setNotFoundBarcode] = useState<string>('');
    
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

    const HALF_UNIT_INCREMENT_ERROR =
        'Please enter a valid amount in half-unit increments (e.g., 0, 0.5, 1, 1.5…)';

    const isValidHalfUnitIncrement = (amount: number): boolean => {
        if (!Number.isFinite(amount) || amount < 0) return false;
        // Accept values where amount * 2 is an integer (whole or half units)
        const doubled = amount * 2;
        return Math.abs(doubled - Math.round(doubled)) < 1e-9;
    };

    const handleCreditPaidAmountChange = (value: string) => {
        // Keep behavior consistent with current code: empty input becomes 0
        if (value.trim() === '') {
            setCreditPaidAmount(0);
            setCreditPaidAmountError(null);
            return;
        }

        const nextAmount = Number(value);
        if (!Number.isFinite(nextAmount)) {
            setCreditPaidAmountError(HALF_UNIT_INCREMENT_ERROR);
            return;
        }

        if (!isValidHalfUnitIncrement(nextAmount)) {
            // Reject invalid patterns (do not update state), but show the message
            setCreditPaidAmountError(HALF_UNIT_INCREMENT_ERROR);
            return;
        }

        setCreditPaidAmount(nextAmount);
        setCreditPaidAmountError(null);
    };

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
            // Try to fetch from API first
            const response = await salesApi.getNextInvoiceNumber();
            const invoiceNumber = (response.data as any)?.data?.invoiceNumber || 'INV-1';
            return invoiceNumber;
        } catch (err: any) {
            const apiError = err as ApiError;
            console.warn('⚠️ API failed to get next invoice number, checking IndexedDB for offline invoice numbers:', apiError);
            
            // If offline or API fails, get next invoice number from IndexedDB
            try {
                const storeId = user?.storeId;
                if (storeId) {
                    await salesDB.init();
                    const offlineInvoiceNumber = await salesDB.getNextInvoiceNumberOffline(storeId);
                    console.log('✅ Generated offline invoice number:', offlineInvoiceNumber);
                    return offlineInvoiceNumber;
                }
            } catch (dbError: any) {
                console.error('❌ Failed to get invoice number from IndexedDB:', dbError);
            }
            
            // Last resort: fallback to INV-1 (but this should be avoided)
            console.warn('⚠️ Using fallback invoice number INV-1 (may cause duplicates if used multiple times offline)');
            return 'INV-1';
        }
    }, [user?.storeId]);

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
    
    // Sync held invoices to localStorage whenever they change
    useEffect(() => {
        saveHeldInvoicesToStorage(heldInvoices);
    }, [heldInvoices, saveHeldInvoicesToStorage]);

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
                const transformedCustomers: Customer[] = transformAndFilterCustomers(syncResult.customers);
                
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
            
            // Verify storeId before loading
            try {
                const token = localStorage.getItem('auth-token');
                if (token) {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    const storeId = payload.storeId;
                    console.log('[POS] Current storeId from token:', storeId, '(type:', typeof storeId, ')');
                } else {
                    console.warn('[POS] No auth token found in localStorage');
                }
            } catch (tokenError) {
                console.warn('[POS] Error reading storeId from token:', tokenError);
            }
            
            // Initialize IndexedDB
            await customersDB.init();
            
            // Get all customers from IndexedDB
            const dbCustomers = await customersDB.getAllCustomers();
            
            console.log(`[POS] getAllCustomers returned ${dbCustomers?.length || 0} customers`);
            
            // Log detailed info about retrieved customers
            if (dbCustomers && dbCustomers.length > 0) {
                console.log('[POS] Retrieved customers structure:', {
                    count: dbCustomers.length,
                    firstCustomerKeys: Object.keys(dbCustomers[0]),
                    firstCustomerSample: {
                        id: dbCustomers[0].id,
                        _id: dbCustomers[0]._id,
                        name: dbCustomers[0].name,
                        phone: dbCustomers[0].phone,
                        storeId: dbCustomers[0].storeId
                    }
                });
            }
            
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
                const transformedCustomers: Customer[] = transformAndFilterCustomers(dbCustomers);
                
                console.log(`[POS] Transformed ${transformedCustomers.length} customers (filtered from ${dbCustomers.length})`);
                console.log('[POS] Transformed Customers Array:', transformedCustomers);
                
                if (isMountedRef.current) {
                    setAllCustomers(transformedCustomers);
                    setCustomers(transformedCustomers);
                    setCustomersLoaded(true);
                    console.log(`[POS] Loaded ${transformedCustomers.length} customers from IndexedDB`);
                    console.log('[POS] State updated - allCustomers:', transformedCustomers.length, 'customers:', transformedCustomers.length);
                } else {
                    console.warn('[POS] Component unmounted, skipping state update');
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
                            const transformedCustomers: Customer[] = transformAndFilterCustomers(verifyCustomers);
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
                    ? transformAndFilterCustomers(customersData)
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
    // OPTIMIZED: Reuse loadProductsFromDB to avoid duplicate loading
    // This function is kept for backward compatibility but now delegates to loadProductsFromDB
    const fetchAllProducts = useCallback(async () => {
        // If products are already loaded, skip redundant load
        if (productsLoaded && products.length > 0) {
            console.log('[POS] Products already loaded, skipping redundant fetchAllProducts call');
            return;
        }
        
        // Delegate to loadProductsFromDB which handles all the logic
        await loadProductsFromDB();
    }, [normalizeProduct, productsLoaded, products.length, loadProductsFromDB]);

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
                        const transformedCustomers: Customer[] = transformAndFilterCustomers(result.customers);
                        
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
                // Also reload store address and business name from localStorage
                const settings = loadSettings(null);
                if (settings?.storeAddress) {
                    setStoreAddress(settings.storeAddress);
                }
                if (settings?.businessName) {
                    const legacyDefaultBusinessName = String.fromCharCode(80, 111, 115, 104, 80, 111, 105, 110, 116, 72, 117, 98);
                    const name = settings.businessName.trim();
                    if (name && name !== legacyDefaultBusinessName) {
                        setBusinessName(name);
                    } else {
                        setBusinessName('');
                    }
                }
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
                    
                    if (result.success && result.products && result.products.length > 0) {
                        // Update IndexedDB incrementally (no need to reload all products)
                        try {
                            await productsDB.storeProducts(result.products, { clearAll: false });
                            // Update local state incrementally instead of reloading all
                            setProducts(prevProducts => {
                                const productMap = new Map(prevProducts.map(p => [String(p.id), p]));
                                result.products!.forEach((p: any) => {
                                    const normalized = normalizeProduct(p);
                                    productMap.set(String(normalized.id), normalized);
                                });
                                return Array.from(productMap.values());
                            });
                            console.log('[POS] Products synced and updated incrementally after cache invalidation');
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
                            const transformedCustomers: Customer[] = transformAndFilterCustomers(dbCustomers);
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
                                        const transformedCustomers: Customer[] = transformAndFilterCustomers(verifyCustomers);
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
                const transformedCustomers: Customer[] = transformAndFilterCustomers(searchResults);

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

    // Load store address and business name from localStorage and backend when component mounts
    useEffect(() => {
        const loadStoreData = async () => {
            try {
                // First try localStorage
                const settings = loadSettings(null);
                
                // Load business name from localStorage (it's stored there, not in backend settings)
                if (settings?.businessName) {
                    const legacyDefaultBusinessName = String.fromCharCode(80, 111, 115, 104, 80, 111, 105, 110, 116, 72, 117, 98);
                    const name = settings.businessName.trim();
                    if (name && name !== legacyDefaultBusinessName) {
                        setBusinessName(name);
                    }
                }
                
                if (settings?.storeAddress) {
                    console.log('[POS] Found store address in localStorage:', settings.storeAddress);
                    setStoreAddress(settings.storeAddress);
                    return;
                } else {
                    console.log('[POS] No store address in localStorage, checking backend...');
                }

                // If not in localStorage, try backend
                try {
                    const backendSettings = await storeSettingsApi.getSettings();
                    console.log('[POS] Backend settings response:', backendSettings);
                    
                    // Handle nested response structure: backendSettings.data.data.settings
                    let settingsData: Record<string, string> | null = null;
                    
                    if (backendSettings.data) {
                        // Check for nested structure: data.data.settings
                        if ('data' in backendSettings.data && backendSettings.data.data && 'settings' in backendSettings.data.data) {
                            settingsData = (backendSettings.data.data as any).settings as Record<string, string>;
                            console.log('[POS] Found settings in nested structure (data.data.settings)');
                        }
                        // Check for direct structure: data.settings
                        else if ('settings' in backendSettings.data) {
                            settingsData = backendSettings.data.settings as Record<string, string>;
                            console.log('[POS] Found settings in direct structure (data.settings)');
                        }
                    }
                    
                    if (settingsData) {
                        console.log('[POS] Settings data:', settingsData);
                        // Check both lowercase and camelCase keys
                        const address = settingsData.storeaddress || settingsData.storeAddress || '';
                        if (address) {
                            console.log('[POS] Found store address:', address);
                            setStoreAddress(address);
                            // Also update localStorage for future use
                            if (settings) {
                                const updatedSettings = { ...settings, storeAddress: address };
                                saveSettings(updatedSettings);
                            } else {
                                // Create minimal settings object if none exists
                                const newSettings = {
                                    storeAddress: address,
                                } as any;
                                saveSettings(newSettings);
                            }
                        } else {
                            console.log('[POS] No store address found in backend settings. Available keys:', Object.keys(settingsData));
                        }
                    } else {
                        console.log('[POS] Settings data not found in response structure');
                    }
                } catch (backendError) {
                    console.warn('[POS] Failed to load storeAddress from backend:', backendError);
                    // Keep empty string if both fail
                }
            } catch (error) {
                console.error('Error loading store address:', error);
            }
        };

        loadStoreData();
    }, []);

    // Reload store address and business name when sale completes to ensure we have the latest value
    useEffect(() => {
        if (saleCompleted) {
            const reloadStoreData = async () => {
                try {
                    // Check localStorage first
                    const settings = loadSettings(null);
                    
                    // Reload business name
                    if (settings?.businessName) {
                        const legacyDefaultBusinessName = String.fromCharCode(80, 111, 115, 104, 80, 111, 105, 110, 116, 72, 117, 98);
                        const name = settings.businessName.trim();
                        if (name && name !== legacyDefaultBusinessName) {
                            setBusinessName(name);
                        } else {
                            setBusinessName('');
                        }
                    }
                    
                    if (settings?.storeAddress) {
                        setStoreAddress(settings.storeAddress);
                        return;
                    }

                    // If not in localStorage, try backend
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
                            const address = settingsData.storeaddress || settingsData.storeAddress || '';
                            if (address) {
                                setStoreAddress(address);
                            }
                        }
                    } catch (error) {
                        console.warn('[POS] Failed to reload storeAddress when sale completed:', error);
                    }
                } catch (error) {
                    console.error('[POS] Error reloading store address on sale completion:', error);
                }
            };
            reloadStoreData();
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

    // Helper function to extract unit info from product and matched unit
    const extractUnitInfo = useCallback((product: POSProduct, matchedUnit: any | null) => {
        const piecesPerMainUnit = getPiecesPerMainUnit(product);
        
        let unitName = 'قطعة';
        let unitPrice = product.price;
        let conversionFactor = 1;
        let piecesPerUnit = 1;
        
        // If a unit was matched, use its information
        if (matchedUnit) {
            unitName = matchedUnit.unitName || 'قطعة';
            unitPrice = matchedUnit.sellingPrice || product.price;
            conversionFactor = matchedUnit.conversionFactor || piecesPerMainUnit;
            piecesPerUnit = 1; // Secondary units are counted as 1 piece per scan
        } else {
            // Product barcode matched - use default unit
            unitName = 'قطعة';
            unitPrice = piecesPerMainUnit > 0 ? product.price / piecesPerMainUnit : product.price;
            conversionFactor = piecesPerMainUnit;
            piecesPerUnit = piecesPerMainUnit;
        }
        
        return { unitName, unitPrice, conversionFactor, piecesPerUnit };
    }, [getPiecesPerMainUnit]);

    // Barcode search function - OPTIMIZED: checks IndexedDB first for instant results
    // Then validates with server in background to ensure data accuracy
    const searchProductByBarcode = useCallback(async (barcode: string): Promise<{ success: boolean; product?: POSProduct; unitName?: string; unitPrice?: number; conversionFactor?: number; piecesPerUnit?: number }> => {
        const trimmed = barcode.trim();
        if (!trimmed) {
            return { success: false };
        }

        console.log(`[POS] Searching product by barcode: "${trimmed}"`);
        
        // STEP 1: Check IndexedDB first for instant response
        try {
            const dbResult = await productsDB.getProductByBarcode(trimmed);
            
            if (dbResult && dbResult.product) {
                console.log(`[POS] Product found in IndexedDB (instant): ${dbResult.product.name || 'Unknown'}`);
                
                // Normalize the product
                const normalizedProduct = normalizeProduct(dbResult.product);
                const { unitName, unitPrice, conversionFactor, piecesPerUnit } = extractUnitInfo(normalizedProduct, dbResult.matchedUnit);
                
                // Return immediately with cached product for instant cart addition
                // Server validation will run in background
                const instantResult = {
                    success: true,
                    product: normalizedProduct,
                    unitName,
                    unitPrice,
                    conversionFactor,
                    piecesPerUnit,
                };
                
                // STEP 2: Validate with server in background (non-blocking)
                // This ensures we have the latest data but doesn't delay the UI
                (async () => {
                    try {
                        setIsSearchingServer(true);
                        console.log(`[POS] Validating product with server in background: "${trimmed}"`);
                        
                        const response = await productsApi.getProductByBarcode(trimmed);
                        
                        if (response.data?.success && response.data?.data?.product) {
                            const productData = response.data.data.product;
                            const serverMatchedUnit = response.data.data.matchedUnit;
                            const serverProduct = normalizeProduct(productData);
                            
                            // Update IndexedDB with fresh server data
                            try {
                                await productsDB.storeProduct(productData);
                                productsDB.notifyOtherTabs();
                                console.log(`[POS] Updated IndexedDB with fresh server data for: ${serverProduct.name}`);
                                
                                // Update products state with fresh data
                                setProducts(prevProducts => {
                                    const updated = prevProducts.filter(p => {
                                        const matchesById = String(p.id) === String(serverProduct.id);
                                        const matchesByOriginalId = serverProduct.originalId && 
                                            String(p.originalId) === String(serverProduct.originalId);
                                        return !matchesById && !matchesByOriginalId;
                                    });
                                    updated.push(serverProduct);
                                    return updated;
                                });
                                
                                // If product data changed significantly (e.g., price, stock), we could update the cart
                                // For now, we just log it - future enhancement could update cart items if needed
                                const priceChanged = Math.abs((serverProduct.price || 0) - (normalizedProduct.price || 0)) > 0.01;
                                const stockChanged = (serverProduct.stock || 0) !== (normalizedProduct.stock || 0);
                                
                                if (priceChanged || stockChanged) {
                                    console.log(`[POS] Product data changed on server for ${serverProduct.name}:`, {
                                        priceChanged,
                                        stockChanged,
                                        oldPrice: normalizedProduct.price,
                                        newPrice: serverProduct.price,
                                        oldStock: normalizedProduct.stock,
                                        newStock: serverProduct.stock
                                    });
                                    // Note: Cart items are not automatically updated here to avoid disrupting the user
                                    // The fresh data is in state/IndexedDB for future scans and stock checks
                                }
                            } catch (error) {
                                console.error('[POS] Error updating IndexedDB with server data:', error);
                            }
                        }
                    } catch (err: any) {
                        // Server validation failed - log but don't block UI
                        console.warn('[POS] Background server validation failed (non-critical):', err?.message || err);
                        // Product is already in cart from IndexedDB, so user can continue
                    } finally {
                        setIsSearchingServer(false);
                    }
                })();
                
                return instantResult;
            }
        } catch (error) {
            console.error('[POS] Error searching IndexedDB for barcode:', error);
            // Continue to server search fallback
        }
        
        // STEP 3: Fallback to server search if not found in IndexedDB
        try {
            setIsSearchingServer(true);
            console.log(`[POS] Product not in IndexedDB, searching server: "${trimmed}"`);
            
            const response = await productsApi.getProductByBarcode(trimmed);

            if (response.data?.success && response.data?.data?.product) {
                const productData = response.data.data.product;
                const matchedUnit = response.data.data.matchedUnit;
                
                // Normalize the product
                const normalizedProduct = normalizeProduct(productData);
                const { unitName, unitPrice, conversionFactor, piecesPerUnit } = extractUnitInfo(normalizedProduct, matchedUnit);

                console.log(`[POS] Product found on server: ${normalizedProduct.name}`);
                
                // Store product in IndexedDB for future instant lookups
                try {
                    await productsDB.storeProduct(productData);
                    productsDB.notifyOtherTabs();
                    console.log(`[POS] Stored product in IndexedDB for future instant lookups: ${normalizedProduct.name}`);
                    
                    // Update products state
                    setProducts(prevProducts => {
                        const updated = prevProducts.filter(p => {
                            const matchesById = String(p.id) === String(normalizedProduct.id);
                            const matchesByOriginalId = normalizedProduct.originalId && 
                                String(p.originalId) === String(normalizedProduct.originalId);
                            return !matchesById && !matchesByOriginalId;
                        });
                        updated.push(normalizedProduct);
                        return updated;
                    });
                } catch (error) {
                    console.error('[POS] Error storing product in IndexedDB:', error);
                    // Continue anyway - we still have the product from API
                }
                
                return {
                    success: true,
                    product: normalizedProduct,
                    unitName,
                    unitPrice,
                    conversionFactor,
                    piecesPerUnit,
                };
            } else {
                console.log(`[POS] Product not found on server for barcode: "${trimmed}"`);
                return { success: false };
            }
        } catch (err: any) {
            console.error('[POS] Error searching product by barcode on server:', err);
            // If it's a 404, the product simply doesn't exist
            if (err?.status === 404) {
                console.log(`[POS] Product not found (404) for barcode: "${trimmed}"`);
            } else {
                console.error('[POS] Unexpected error during server barcode search:', {
                    status: err?.status,
                    message: err?.message,
                    details: err?.details
                });
            }
            return { success: false };
        } finally {
            setIsSearchingServer(false);
        }
    }, [normalizeProduct, extractUnitInfo]);

    // Handler for Quick Add product from ProductNotFoundModal
    const handleQuickAddProduct = useCallback(async (barcode: string, costPrice: number, sellingPrice: number, productName?: string) => {
        try {
            console.log('[POS] Quick adding product:', { barcode, costPrice, sellingPrice, productName });

            // Create product permanently in store database
            const productData = {
                name: productName?.trim() || `منتج ${barcode}`, // Use provided name or default name using barcode
                barcode: barcode.trim(),
                costPrice: costPrice,
                price: sellingPrice,
                stock: 0, // Start with 0 stock
                status: 'active',
            };

            const response = await productsApi.createProduct(productData);

            // Check response structure: response.data.data.product or response.data.product
            const createdProduct = (response.data as any)?.data?.product || (response.data as any)?.product;

            if (response.success && createdProduct) {
                console.log('[POS] Product created successfully:', createdProduct);

                // Normalize the product
                const normalizedProduct = normalizeProduct(createdProduct);

                // Store in IndexedDB for future instant lookups
                try {
                    await productsDB.storeProduct(createdProduct);
                    productsDB.notifyOtherTabs();
                    console.log('[POS] Stored quick-added product in IndexedDB');
                } catch (error) {
                    console.error('[POS] Error storing product in IndexedDB:', error);
                }

                // Update products state
                setProducts(prevProducts => {
                    const updated = prevProducts.filter(p => {
                        const matchesById = String(p.id) === String(normalizedProduct.id);
                        const matchesByOriginalId = normalizedProduct.originalId && 
                            String(p.originalId) === String(normalizedProduct.originalId);
                        return !matchesById && !matchesByOriginalId;
                    });
                    updated.push(normalizedProduct);
                    return updated;
                });

                // Add product to cart immediately
                const { unitName, unitPrice, conversionFactor, piecesPerUnit } = extractUnitInfo(normalizedProduct, null);
                await handleAddProduct(
                    normalizedProduct,
                    unitName || 'قطعة',
                    unitPrice,
                    conversionFactor,
                    piecesPerUnit
                );

                console.log('[POS] Quick-added product added to cart successfully');
            } else {
                throw new Error((response as any).message || 'Failed to create product');
            }
        } catch (error: any) {
            console.error('[POS] Error in quick add product:', error);
            const errorMessage = error.response?.data?.message || error.message || 'فشل إضافة المنتج';
            throw new Error(errorMessage);
        }
    }, [normalizeProduct, extractUnitInfo, handleAddProduct]);

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
                    // Product not found - show modal
                    setNotFoundBarcode(barcode);
                    setIsProductNotFoundModalOpen(true);
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
        const halfStepQuantity = Math.max(0, coerceToHalfStep(normalizedQuantity));

        // Find the item to get product info for stock check
        const item = currentInvoice.items.find(i => i.cartItemId === cartItemId);
        if (!item) return;

        if (halfStepQuantity < MIN_QUANTITY) {
            handleRemoveItem(cartItemId);
            return;
        }

        setCurrentInvoice(inv => ({
            ...inv,
            items: inv.items.map(item =>
                item.cartItemId === cartItemId
                    ? { ...item, quantity: halfStepQuantity, total: item.unitPrice * halfStepQuantity }
                    : item
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
        
        // Create a deep copy of the current invoice to prevent reference issues
        const invoiceToHold: HeldInvoice = {
            ...currentInvoice,
            date: new Date(currentInvoice.date),
            customer: currentInvoice.customer ? { ...currentInvoice.customer } : null,
            items: currentInvoice.items.map(item => ({
                ...item,
                // Ensure all nested properties are copied
                productId: item.productId,
                originalId: item.originalId,
            })),
            heldKey: `held_${currentInvoice.id}_${Date.now()}_${UUID()}`,
        };
        
        // Add to held invoices state
        setHeldInvoices(prev => {
            const updated = [...prev, invoiceToHold];
            // Persist to localStorage
            saveHeldInvoicesToStorage(updated);
            return updated;
        });
        
        // Fetch next invoice number and create new invoice
        // This ensures the held invoice is completely isolated from the new one
        const nextInvoiceNumber = await fetchNextInvoiceNumber();
        setCurrentInvoice(generateNewInvoice(currentUserName, nextInvoiceNumber));
        
        console.log(`[POS] Invoice ${invoiceToHold.id} suspended. New invoice ${nextInvoiceNumber} created.`);
    };

    const handleRestoreSale = async (heldKey: string) => {
        const invoiceToRestore = heldInvoices.find(inv => inv.heldKey === heldKey);
        if (invoiceToRestore) {
            // CRITICAL FIX: Fetch a new invoice number when restoring a suspended invoice
            // This prevents conflicts when the suspended invoice is completed and synced
            const newInvoiceNumber = await fetchNextInvoiceNumber();
            
            // Create a deep copy when restoring to prevent reference issues
            // IMPORTANT: Assign the new invoice number to avoid conflicts
            const restoredInvoice: POSInvoice = {
                ...invoiceToRestore,
                id: newInvoiceNumber, // Assign new invoice number to prevent conflicts
                date: new Date(invoiceToRestore.date),
                customer: invoiceToRestore.customer ? { ...invoiceToRestore.customer } : null,
                items: invoiceToRestore.items.map(item => ({
                    ...item,
                    productId: item.productId,
                    originalId: item.originalId,
                })),
            };
            
            // Remove from held invoices and update localStorage
            setHeldInvoices(prev => {
                const updated = prev.filter(inv => inv.heldKey !== heldKey);
                saveHeldInvoicesToStorage(updated);
                return updated;
            });
            
            // Set the restored invoice as current with the new invoice number
            setCurrentInvoice(restoredInvoice);
            setSaleCompleted(false); // Reset sale completed state
            
            console.log(`[POS] Held invoice restored: ${heldKey} -> new invoice ${newInvoiceNumber}.`);
        }
    };

    const handleDeleteHeldInvoice = (heldKey: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent triggering restore when clicking delete
        if (window.confirm('هل أنت متأكد من حذف هذه الفاتورة المعلقة؟')) {
            setHeldInvoices(prev => {
                const updated = prev.filter(inv => inv.heldKey !== heldKey);
                saveHeldInvoicesToStorage(updated);
                return updated;
            });
            console.log(`[POS] Held invoice deleted: ${heldKey}`);
        }
    };
    
    const startNewSale = async () => {
        setSaleCompleted(false);
        const nextInvoiceNumber = await fetchNextInvoiceNumber();
        setCurrentInvoice(generateNewInvoice(currentUserName, nextInvoiceNumber));
        setSelectedPaymentMethod('Cash');
        setCreditPaidAmount(0);
        setCreditPaidAmountError(null);
    }

    const handleCancelSale = async () => {
        // Only confirm if there are items that will be removed from the cart
        if (currentInvoice.items.length > 0) {
            const confirmed = window.confirm('هل أنت متأكد أنك تريد إزالة المنتجات المحددة من السلة؟');
            if (!confirmed) return;
        }
        await startNewSale();
    };
    
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
        
        // PERFORMANCE FIX: Do optimistic local state updates immediately (non-blocking)
        // This ensures the UI updates instantly while background operations run
        setProducts(prevProducts => {
            const newProducts = [...prevProducts];
            returnInvoice.items.forEach(item => {
                if (!item || !item.productId || item.quantity <= 0) {
                    return;
                }
                
                const productIndex = newProducts.findIndex(p => String(p.id) === String(item.productId));
                if (productIndex !== -1) {
                    const product = newProducts[productIndex];
                    const piecesPerMainUnit = getPiecesPerMainUnit(product);
                    const stockAddition = item.conversionFactor && item.conversionFactor > 0
                        ? roundForStock(item.quantity / item.conversionFactor)
                        : item.quantity;
                    
                    // Update stock optimistically (ADD stock for returns)
                    const oldStock = product.stock;
                    const newStock = product.stock + stockAddition;
                    newProducts[productIndex].stock = newStock;
                    
                    // Update IndexedDB in background (non-blocking)
                    if (product.originalId) {
                        productsDB.updateProductStock(product.originalId, newStock).catch(error => {
                            console.error(`[POS] Error updating stock in IndexedDB for product ${product.originalId}:`, error);
                        });
                    }
                    
                    if (process.env.NODE_ENV === 'development') {
                        console.log(`Local state: Added stock for product "${product.name}" (ID: ${item.productId}): ${oldStock} -> ${newStock} (+${stockAddition})`);
                    }
                }
            });
            return newProducts;
        });
        
        // CRITICAL: Mark return as completed IMMEDIATELY to enable instant navigation
        // This happens before any blocking operations
        console.log('Return Finalized:', finalInvoice);
        setCurrentInvoice(finalInvoice);
        setSaleCompleted(true);
        setIsProcessingPayment(false); // Clear loading state immediately
        
        // PERFORMANCE FIX: Move all heavy operations to background (non-blocking)
        // Stock updates, sale sync, and product sync all run in background
        
        // Background task: Update stock in backend (non-blocking)
        const stockUpdateResults: Array<{ success: boolean; productName: string; productId: string | number; error?: string }> = [];
        
        // Run stock updates in background without blocking
        Promise.resolve().then(async () => {
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
                stockAddition = roundForStock(stockAddition);

                const productIdToUpdateString = String(productIdToUpdate);
                
                // OFFLINE-FIRST APPROACH: Update local IndexedDB first, then sync
                const currentStock = product?.stock || 0;
                const newStock = currentStock + stockAddition; // ADD stock for returns
                
                try {
                    // Step 1: Update local IndexedDB immediately (already done in optimistic update above)
                    // This ensures the UI shows correct stock even when offline
                    
                    // Step 2: Queue stock change for sync (works offline)
                    try {
                        await inventorySync.queueStockChange(
                            productIdToUpdateString,
                            invoiceItemName,
                            currentStock,
                            newStock,
                            'return'
                        );
                        console.log(`📦 Return stock change queued for ${invoiceItemName}: ${currentStock} -> ${newStock} (+${stockAddition})`);
                    } catch (queueError) {
                        console.warn(`⚠️ Failed to queue return stock change for ${invoiceItemName}:`, queueError);
                        // Continue anyway - local update succeeded
                    }
                    
                    // Step 3: Try to sync immediately if online (non-blocking)
                    if (navigator.onLine) {
                        // Try to sync in background, but don't wait for it
                        inventorySync.syncUnsyncedChanges().catch((syncError) => {
                            console.warn(`⚠️ Background sync failed for return ${invoiceItemName}, will retry later:`, syncError);
                        });
                    }
                    
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
            
            // Log summary of stock updates
            const successful = stockUpdateResults.filter(r => r.success).length;
            const failed = stockUpdateResults.filter(r => !r.success).length;
            console.log(`Return stock updates completed: ${successful} successful, ${failed} failed`);
            
            if (failed > 0) {
                const failedProducts = stockUpdateResults
                    .filter(r => !r.success)
                    .map(r => `${r.productName} (ID: ${r.productId})`)
                    .join(', ');
                console.warn(`Failed to update stock for return: ${failedProducts}`);
            }
        } catch (error) {
            console.error('Error updating stock for return in background:', error);
            // Stock update failed but return is already completed - log error only
        }
        }).catch(error => {
            console.error('Background stock update task failed for return:', error);
        });

        // Background task: Sync products after quantity changes (non-blocking)
        const productIdsToSync = returnInvoice.items
            .map(item => item.originalId)
            .filter((id): id is string => !!id);
        
        if (productIdsToSync.length > 0) {
            // Use requestIdleCallback to defer non-critical sync to idle time
            const scheduleSync = (callback: () => void) => {
                if ('requestIdleCallback' in window) {
                    requestIdleCallback(callback, { timeout: 5000 });
                } else {
                    // Fallback for browsers without requestIdleCallback
                    setTimeout(callback, 100);
                }
            };
            
            scheduleSync(() => {
                productSync.syncAfterQuantityChange(productIdsToSync).then(async (result) => {
                    if (result.success && result.products && result.products.length > 0) {
                        // Update IndexedDB incrementally (faster than clearing all)
                        try {
                            await productsDB.storeProducts(result.products, { clearAll: false });
                            // Update local state incrementally instead of reloading all
                            setProducts(prevProducts => {
                                const productMap = new Map(prevProducts.map(p => [String(p.id), p]));
                                result.products!.forEach((p: any) => {
                                    const normalized = normalizeProduct(p);
                                    productMap.set(String(normalized.id), normalized);
                                });
                                return Array.from(productMap.values());
                            });
                            console.log(`[POS] Updated IndexedDB incrementally with ${result.products.length} synced products after return`);
                        } catch (error) {
                            console.error('[POS] Error updating IndexedDB after return sync:', error);
                        }
                    }
                }).catch(error => {
                    console.error('[POS] Error syncing products after return:', error);
                });
            });
        }

        // Background task: Save return to IndexedDB and sync with backend (non-blocking)
        Promise.resolve().then(async () => {
            try {
                // Get storeId from user for sync service
                const storeId = user?.storeId;
                if (!storeId) {
                    throw new Error('Store ID is required to save return');
                }

                const customerName = returnInvoice.customer?.name || 'عميل نقدي';
                const customerId = returnInvoice.customer?.id || 'walk-in-customer';
                
                // Prepare sale data for backend API (as a return invoice)
                const saleData = {
                    invoiceNumber: returnInvoice.id,
                    storeId: storeId, // Required by SaleRecord type
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
                        // Ensure all values are positive before negating for returns
                        const positiveQuantity = Math.abs(item.quantity);
                        const positiveUnitPrice = Math.abs(item.unitPrice);
                        const positiveDiscount = Math.abs(item.discount || 0);
                        const positiveTotal = Math.abs(item.total);
                        // Calculate totalPrice: (unitPrice * quantity) - discount, then negate
                        const calculatedTotalPrice = (positiveUnitPrice * positiveQuantity) - (positiveDiscount * positiveQuantity);
                        
                        return {
                            productId: backendProductId, // Use original backend ID
                            productName: item.name,
                            quantity: positiveQuantity, // Positive quantity
                            unitPrice: -positiveUnitPrice, // Negative for returns
                            totalPrice: -Math.abs(calculatedTotalPrice), // Negative for returns, ensure non-negative
                            unit: item.unit,
                            discount: positiveDiscount, // Positive discount value
                            conversionFactor: item.conversionFactor,
                        };
                    }),
                    subtotal: -Math.abs(returnInvoice.subtotal || 0), // Negative for returns, ensure non-negative
                    totalItemDiscount: -Math.abs(returnInvoice.totalItemDiscount || 0), // Negative for returns, ensure non-negative
                    invoiceDiscount: -Math.abs(returnInvoice.invoiceDiscount || 0), // Negative for returns, ensure non-negative
                    tax: -Math.abs(returnInvoice.tax || 0), // Negative for returns, ensure non-negative
                    total: -Math.abs(returnInvoice.grandTotal || 0), // Negative for returns, ensure non-negative
                    paidAmount: -Math.abs(returnInvoice.grandTotal || 0), // Negative for returns, ensure non-negative
                    remainingAmount: 0, // Always 0 for returns (fully refunded)
                    paymentMethod: 'cash', // Returns are typically cash
                    status: 'refunded', // Use 'refunded' status (valid enum value in backend)
                    isReturn: true, // Mark as return invoice
                    seller: returnInvoice.cashier,
                };

                // Use IndexedDB sync service (saves locally and syncs with backend)
                const syncResult = await salesSync.createAndSyncSale(saleData, storeId);
                
                if (syncResult.success) {
                    console.log('✅ Return saved to IndexedDB and synced:', returnInvoice.id);
                    
                    // Show warning if sync had errors but return was saved locally
                    if (syncResult.error) {
                        console.warn('⚠️ Return saved locally, will sync later:', syncResult.error);
                    }

                    // Create SaleTransaction for return (with negative values) for localStorage backup
                    const returnTransaction: SaleTransaction = {
                        id: syncResult.saleId || returnInvoice.id,
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

                    // Save to localStorage as backup (legacy support)
                    saveSale(returnTransaction);
                    console.log('Return transaction saved to localStorage (backup):', returnTransaction);
                } else {
                    throw new Error(syncResult.error || 'Failed to save return');
                }
            } catch (error: any) {
                console.error('❌ Failed to save return in background:', error);
                // Don't show alert - return is already completed and user is on print page
                // The return will be retried by the periodic sync service
            }
        }).catch(error => {
            console.error('Background return sync task failed:', error);
        });
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

        if (selectedPaymentMethod === 'Credit' && !isValidHalfUnitIncrement(creditPaidAmount)) {
            setCreditPaidAmountError(HALF_UNIT_INCREMENT_ERROR);
            return;
        }

        // For all payment methods (Cash, Credit, Card), proceed directly
        // Card payments are handled without terminal integration
        finalizeSaleWithoutTerminal();
    };

    const finalizeSaleWithoutTerminal = async () => {
        // Show immediate feedback
        setIsProcessingPayment(true);
        
        const finalInvoice = { ...currentInvoice, paymentMethod: selectedPaymentMethod };
        
        // Check if this is a return (should not happen here, but safety check)
        if (finalInvoice.originalInvoiceId) {
            console.warn('Attempted to finalize a return invoice through sale flow. Use processReturnInvoice instead.');
            setIsProcessingPayment(false);
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
        
        // PERFORMANCE FIX: Do optimistic local state updates immediately (non-blocking)
        // This ensures the UI updates instantly while background operations run
        const invoiceItemsForStateUpdate = currentInvoice.items || [];
        
        // Update local state optimistically (immediate, non-blocking)
        setProducts(prevProducts => {
            const newProducts = [...prevProducts];
            
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
                
                // Skip if product not found
                if (productIndex === -1) {
                    return;
                }

                const product = newProducts[productIndex];
                
                // CRITICAL VALIDATION: Ensure we found the correct product
                if (String(product.id) !== String(invoiceItemProductId)) {
                    return;
                }

                // Calculate stock reduction
                const piecesPerMainUnit = getPiecesPerMainUnit(product);
                const stockReduction = item.conversionFactor && item.conversionFactor > 0
                    ? roundForStock(item.quantity / item.conversionFactor)
                    : item.quantity;

                // Update stock for this specific product only (optimistic update)
                const oldStock = product.stock;
                const newStock = Math.max(0, product.stock - stockReduction);
                newProducts[productIndex].stock = newStock;

                // Update IndexedDB in background (non-blocking)
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
        
        // CRITICAL: Mark sale as completed IMMEDIATELY to enable instant navigation
        // This happens before any blocking operations
        console.log('Sale Finalized:', finalInvoice);
        setCurrentInvoice(finalInvoice);
        setSaleCompleted(true);
        // NOTE: Keep isProcessingPayment true until sale sync completes to prevent duplicate submissions
        
        // PERFORMANCE FIX: Move all heavy operations to background (non-blocking)
        // Stock updates, sale sync, and product sync all run in background
        
        // Background task: Update stock in backend (non-blocking)
        const stockUpdateResults: Array<{ success: boolean; productName: string; productId: string | number; error?: string }> = [];
        
        // Run stock updates in background without blocking
        Promise.resolve().then(async () => {
            try {
            // OPTIMIZATION: Batch API calls instead of sequential processing
            // Step 1: Prepare all product update data (validation and calculation)
            interface ProductUpdateData {
                item: POSCartItem;
                productIdToUpdate: string;
                invoiceItemProductId: string | number;
                invoiceItemName: string;
                stockChange: number;
                product?: POSProduct;
            }
            
            const productUpdateDataList: ProductUpdateData[] = [];
            
            // First pass: validate and prepare all update data
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
                
                // Keep conversions stable without forcing integer rounding
                stockChange = roundForStock(stockChange);

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
                
                // OFFLINE-FIRST APPROACH: Update local IndexedDB first, then sync
                const expectedName = product?.name || invoiceItemName;
                const currentStock = product?.stock || 0;
                const newStock = Math.max(0, currentStock - stockChange);
                
                try {
                    // Step 1: Update local IndexedDB immediately (already done in optimistic update above)
                    // This ensures the UI shows correct stock even when offline
                    
                    // Step 2: Queue stock change for sync (works offline)
                    try {
                        await inventorySync.queueStockChange(
                            productIdToUpdateString,
                            expectedName,
                            currentStock,
                            newStock,
                            'sale'
                        );
                        console.log(`📦 Stock change queued for ${expectedName}: ${currentStock} -> ${newStock} (reduced by ${stockChange})`);
                    } catch (queueError) {
                        console.warn(`⚠️ Failed to queue stock change for ${expectedName}:`, queueError);
                        // Continue anyway - local update succeeded
                    }
                    
                    // Step 3: Try to sync immediately if online (non-blocking)
                    if (navigator.onLine) {
                        // Try to sync in background, but don't wait for it
                        inventorySync.syncUnsyncedChanges().catch((syncError) => {
                            console.warn(`⚠️ Background sync failed for ${expectedName}, will retry later:`, syncError);
                        });
                    }
                    
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
            console.error('Error updating stock in background:', error);
            // Stock update failed but sale is already completed - log error only
        }
        }).catch(error => {
            console.error('Background stock update task failed:', error);
        });
        
        // Background task: Sync products after quantity changes (non-blocking)
        const productIdsToSync = invoiceItems
            .map(item => item.originalId)
            .filter((id): id is string => !!id);
        
        if (productIdsToSync.length > 0) {
            // Use requestIdleCallback to defer non-critical sync to idle time
            const scheduleSync = (callback: () => void) => {
                if ('requestIdleCallback' in window) {
                    requestIdleCallback(callback, { timeout: 5000 });
                } else {
                    // Fallback for browsers without requestIdleCallback
                    setTimeout(callback, 100);
                }
            };
            
            scheduleSync(() => {
                productSync.syncAfterQuantityChange(productIdsToSync).then(async (result) => {
                    if (result.success && result.products && result.products.length > 0) {
                        // Update IndexedDB incrementally (faster than clearing all)
                        try {
                            await productsDB.storeProducts(result.products, { clearAll: false });
                            // Update local state incrementally instead of reloading all
                            setProducts(prevProducts => {
                                const productMap = new Map(prevProducts.map(p => [String(p.id), p]));
                                result.products!.forEach((p: any) => {
                                    const normalized = normalizeProduct(p);
                                    productMap.set(String(normalized.id), normalized);
                                });
                                return Array.from(productMap.values());
                            });
                            console.log(`[POS] Updated IndexedDB incrementally with ${result.products.length} synced products after sale`);
                        } catch (error) {
                            console.error('[POS] Error updating IndexedDB after sale sync:', error);
                        }
                    }
                }).catch(error => {
                    console.error('[POS] Error syncing products after sale:', error);
                });
            });
        }

        // Background task: Save sale to IndexedDB and sync with backend (non-blocking)
        Promise.resolve().then(async () => {
            try {
                // Get storeId from user
                const storeId = user?.storeId;
                if (!storeId) {
                    throw new Error('Store ID is required to save sale');
                }

                // Create SaleTransaction for localStorage backup
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

                // Check if invoice number already exists in IndexedDB before saving
                // This prevents duplicate invoice numbers when working offline
                try {
                    await salesDB.init();
                    const invoiceExists = await salesDB.invoiceNumberExists(storeId, finalInvoice.id);
                    if (invoiceExists) {
                        console.warn(`⚠️ Invoice number ${finalInvoice.id} already exists in IndexedDB, generating new number...`);
                        // Generate a new unique invoice number
                        const newInvoiceNumber = await salesDB.getNextInvoiceNumberOffline(storeId);
                        saleData.invoiceNumber = newInvoiceNumber;
                        finalInvoice.id = newInvoiceNumber; // Update the invoice ID as well
                        console.log(`✅ Generated new unique invoice number: ${newInvoiceNumber}`);
                    }
                } catch (checkError: any) {
                    console.warn('⚠️ Could not check invoice number uniqueness, proceeding anyway:', checkError);
                }

                // Use IndexedDB sync service (saves locally and syncs with backend)
                // CRITICAL: Ensure sale is saved to IndexedDB even if sync fails
                let syncResult;
                try {
                    syncResult = await salesSync.createAndSyncSale(saleData, storeId);
                    console.log(`[POS] Sale sync result for ${saleData.invoiceNumber}:`, {
                        success: syncResult.success,
                        saleId: syncResult.saleId,
                        error: syncResult.error
                    });
                } catch (syncError: any) {
                    // If createAndSyncSale throws an error, try to save directly to IndexedDB
                    console.error('❌ Error in createAndSyncSale, attempting direct IndexedDB save:', syncError);
                    try {
                        await salesDB.init();
                        saleData.synced = false;
                        await salesDB.saveSale(saleData);
                        console.log('✅ Sale saved directly to IndexedDB after sync error:', finalInvoice.id);
                        syncResult = { success: true, saleId: saleData.id || finalInvoice.id, error: syncError?.message };
                    } catch (dbError: any) {
                        console.error('❌ Failed to save sale to IndexedDB:', dbError);
                        // Still try to save to localStorage as last resort
                        syncResult = { success: false, error: dbError?.message || 'Failed to save sale' };
                    }
                }
                
                // Always save to localStorage as backup, even if IndexedDB save failed
                try {
                    // Convert POSInvoice to SaleTransaction for localStorage backup
                    let saleTransaction: SaleTransaction = {
                        id: syncResult?.saleId || finalInvoice.id,
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

                    // Save to localStorage as backup (legacy support)
                    saveSale(saleTransaction);
                    console.log('✅ Sale transaction saved to localStorage (backup):', saleTransaction);
                } catch (localStorageError) {
                    console.error('❌ Failed to save sale to localStorage:', localStorageError);
                }
                
                if (syncResult?.success) {
                    console.log('✅ Sale saved to IndexedDB and synced:', finalInvoice.id);
                    
                    // Show warning if sync had errors but sale was saved locally
                    if (syncResult.error) {
                        console.warn('⚠️ Sale saved locally, will sync later:', syncResult.error);
                    }
                } else {
                    // Sale was saved to localStorage at least, log warning
                    console.warn('⚠️ Sale saved to localStorage only, IndexedDB save may have failed:', syncResult?.error);
                }
            } catch (error: any) {
                console.error('❌ Failed to save sale in background:', error);
                // Don't show alert - sale is already completed and user is on print page
                // The sale will be retried by the periodic sync service
            } finally {
                // Clear processing state after sale sync completes (success or failure)
                setIsProcessingPayment(false);
            }
        }).catch(error => {
            console.error('Background sale sync task failed:', error);
            // Ensure processing state is cleared even if promise chain fails
            setIsProcessingPayment(false);
        });
    };



    const renderReceipt = (invoice: SaleTransaction | POSInvoice, title: string) => {
        // Check if this is a return invoice
        const isReturn = 'originalInvoiceId' in invoice && invoice.originalInvoiceId !== undefined
            || ('status' in invoice && invoice.status === 'Returned')
            || ('id' in invoice && invoice.id.startsWith('RET-'));
        
        // Get store address and business name from state, with fallback to localStorage
        const settings = loadSettings(null);
        const addressFromState = storeAddress || '';
        const addressFromSettings = settings?.storeAddress || '';
        const addressToDisplay = addressFromState || addressFromSettings || '';
        
        // Debug logging
        console.log('[POS] renderReceipt - Address check:', {
            storeAddressState: storeAddress,
            addressFromSettings: addressFromSettings,
            addressToDisplay: addressToDisplay,
            hasSettings: !!settings
        });
        
        const legacyDefaultBusinessName = String.fromCharCode(80, 111, 115, 104, 80, 111, 105, 110, 116, 72, 117, 98);
        const businessNameToDisplay = businessName || (settings?.businessName && settings.businessName.trim() && settings.businessName !== legacyDefaultBusinessName ? settings.businessName.trim() : '');
        
        return (
            <div id="printable-receipt" className="w-full max-w-md bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg text-right">
                <div className="text-center mb-4 sm:mb-5">
                    <CheckCircleIcon className={`w-12 h-12 sm:w-16 sm:h-16 ${isReturn ? 'text-blue-500' : 'text-green-500'} mx-auto print-hidden`} />
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 mt-2 print-hidden">{isReturn ? AR_LABELS.returnCompleted : AR_LABELS.saleCompleted}</h2>
                    <h3 className="text-lg sm:text-xl font-bold text-center text-gray-900 dark:text-gray-100 mt-3 sm:mt-4 mb-2">{title}</h3>
                    {addressToDisplay ? (
                        <p className="text-center text-xs text-gray-500 dark:text-gray-400">{addressToDisplay}</p>
                    ) : null}
                </div>

                <div className="invoice-info text-xs my-4 space-y-1.5">
                    {businessNameToDisplay && (
                        <p><strong>اسم المتجر:</strong> {businessNameToDisplay}</p>
                    )}
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
                                            <th className="py-2.5 px-3 text-right align-middle font-bold border border-gray-300 dark:border-gray-600" style={{ borderRight: '1px solid #dee2e6', borderLeft: '1px solid #dee2e6', borderTop: '1px solid #dee2e6', borderBottom: '2px solid #495057' }}>اسم المنتج</th>
                                            <th className="py-2.5 px-3 text-center align-middle font-bold border border-gray-300 dark:border-gray-600" style={{ borderRight: '1px solid #dee2e6', borderLeft: '1px solid #dee2e6', borderTop: '1px solid #dee2e6', borderBottom: '2px solid #495057' }}>الكمية</th>
                                            <th className="py-2.5 px-3 text-center align-middle font-bold border border-gray-300 dark:border-gray-600" style={{ borderRight: '1px solid #dee2e6', borderLeft: '1px solid #dee2e6', borderTop: '1px solid #dee2e6', borderBottom: '2px solid #495057' }}>سعر الوحدة</th>
                                            <th className="py-2.5 px-3 text-center align-middle font-bold border border-gray-300 dark:border-gray-600" style={{ borderRight: '1px solid #dee2e6', borderLeft: '1px solid #dee2e6', borderTop: '1px solid #dee2e6', borderBottom: '2px solid #495057' }}>الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items.slice().reverse().map((item, idx) => {
                                const itemUnitPrice = isReturn ? -Math.abs(item.unitPrice) : item.unitPrice;
                                const itemTotal = isReturn ? -Math.abs(item.total - item.discount * item.quantity) : (item.total - item.discount * item.quantity);
                                return (
                                            <tr key={item.cartItemId || `receipt-item-${idx}`} className="border-b border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="py-2.5 px-3 text-right align-middle border border-gray-300 dark:border-gray-600 font-medium">{item.name}</td>
                                                <td className="py-2.5 px-3 text-center align-middle border border-gray-300 dark:border-gray-600">{Math.abs(item.quantity)}</td>
                                                <td className={`py-2.5 px-3 text-center align-middle border border-gray-300 dark:border-gray-600 ${isReturn ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>{formatCurrency(itemUnitPrice)}</td>
                                                <td className={`py-2.5 px-3 text-center align-middle border border-gray-300 dark:border-gray-600 font-semibold ${isReturn ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>{formatCurrency(itemTotal)}</td>
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
        const businessName = loadSettings(null)?.businessName;
        const legacyDefaultBusinessName = String.fromCharCode(80, 111, 115, 104, 80, 111, 105, 110, 116, 72, 117, 98);
        const receiptTitle =
            isReturnInvoice
                ? 'Returns'
                : businessName && businessName.trim() && businessName !== legacyDefaultBusinessName
                    ? businessName
                    : '';
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
        <div ref={posContainerRef} className="relative h-screen overflow-hidden">
            {/* Modern Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-orange-50/20 to-amber-100/30 dark:from-slate-950 dark:via-orange-950/20 dark:to-amber-950/30" />
            <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-orange-400/15 to-amber-400/15 blur-3xl animate-pulse" />
            <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-rose-400/15 to-orange-400/15 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
            
            <div className="relative w-full h-full flex flex-col px-2 sm:px-4 py-2 sm:py-4 overflow-hidden">
                {/* Suspended Invoices Horizontal Tabs - Above main grid */}
                {heldInvoices.length > 0 && (
                    <div className="flex-shrink-0 mb-1.5 sm:mb-2 w-full">
                        <div className="bg-white/95 dark:bg-gray-800/95 rounded-md sm:rounded-lg shadow-lg p-1.5 sm:p-2 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50">
                            <h3 className="font-bold text-[11px] sm:text-xs text-gray-700 dark:text-gray-200 text-right mb-1 sm:mb-1.5">
                                {AR_LABELS.heldInvoices}
                            </h3>
                            <div className="flex gap-1 sm:gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
                                {heldInvoices.map((inv, index) => (
                                    <div
                                        key={inv.heldKey}
                                        onClick={() => handleRestoreSale(inv.heldKey)}
                                        className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/30 dark:to-amber-900/30 border border-yellow-300 dark:border-yellow-700 rounded-md cursor-pointer hover:shadow-md hover:scale-105 transition-all duration-200 min-w-[100px] sm:min-w-[110px] group"
                                    >
                                        <div className="flex-1 text-right min-w-0">
                                            <div className="font-semibold text-[11px] sm:text-xs text-gray-800 dark:text-gray-200 truncate leading-tight">
                                                فاتورة {index + 1}
                                            </div>
                                            <div className="text-[9px] sm:text-[10px] text-gray-600 dark:text-gray-400 truncate leading-tight">
                                                {inv.id}
                                            </div>
                                            <div className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-500 leading-tight">
                                                {inv.items.length} أصناف
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => handleDeleteHeldInvoice(inv.heldKey, e)}
                                            className="flex-shrink-0 p-0.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                            aria-label="حذف الفاتورة"
                                        >
                                            <span className="h-3 w-3 sm:h-3.5 sm:w-3.5 block"><DeleteIcon /></span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Three Column Layout - Proportional widths: ~19% - 50% - 31% */}
                <div className="grid grid-cols-1 md:grid-cols-[0.75fr_2.3fr_1fr] gap-2 sm:gap-3 md:gap-4 h-full min-h-0 w-full overflow-hidden items-stretch">
                {/* Column 1: Customer & Quick Products (25%) */}
                    <div className="flex flex-col gap-2 sm:gap-3 md:gap-4 min-h-0 min-w-0 h-full">
                        {/* Quick Products */}
                        <div className="bg-white/95 dark:bg-gray-800/95 rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-4 md:p-6 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 flex-grow min-h-0 overflow-y-auto relative z-0">
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
                                            type="button"
                                            onClick={() => handleAddProduct(p)} 
                                            className={`group p-3 sm:p-4 border rounded-lg sm:rounded-xl text-center transition-all duration-200 hover:shadow-md active:scale-95 ${
                                                p.stock <= 0
                                                    ? 'border-red-200 dark:border-red-900/50 hover:bg-red-50/50 dark:hover:bg-red-900/10 hover:border-red-300 dark:hover:border-red-800'
                                                    : 'border-gray-200 dark:border-gray-700 hover:bg-orange-50 dark:hover:bg-gray-700 hover:border-orange-300 dark:hover:border-orange-600'
                                            }`}
                                        >
                                            <span className="block text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{p.name}</span>
                                            <span className="block text-xs font-bold text-orange-600">{formatCurrency(p.price)}</span>
                                            {p.stock <= 0 && (
                                                <span className="block text-xs text-red-600 dark:text-red-400 mt-1">نفد المخزون</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Column 2: Transaction/Cart (50% - Center, wider) */}
                    <div className="flex flex-col bg-white/95 dark:bg-gray-800/95 rounded-xl sm:rounded-2xl shadow-sm backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 min-h-0 min-w-0 overflow-hidden h-full">
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
                        <div className="flex-grow overflow-y-auto overflow-x-auto min-w-0 relative">
                            <div className="overflow-x-auto min-w-0">
                                <table className="w-full text-right min-w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                        <tr>
                                            <th className="px-2 sm:px-3 py-2 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[5%] align-middle">#</th>
                                            <th className="px-2 sm:px-3 py-2 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[30%] align-middle">{AR_LABELS.productName}</th>
                                            <th className="px-2 sm:px-3 py-2 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[12%] text-center align-middle">{AR_LABELS.quantity}</th>
                                            <th className="px-2 sm:px-3 py-2 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[12%] text-center align-middle">{AR_LABELS.price}</th>
                                            <th className="px-2 sm:px-3 py-2 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[15%] text-center align-middle">{AR_LABELS.totalAmount}</th>
                                            <th className="px-2 sm:px-3 py-2 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[10%] text-center align-middle"></th>
                                        </tr>
                                    </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                   {currentInvoice.items.length === 0 ? (
                                            <tr><td colSpan={6} className="text-center align-middle py-8 sm:py-10 text-xs sm:text-sm text-gray-500 dark:text-gray-400">{AR_LABELS.noItemsInCart}</td></tr>
                                   ) : currentInvoice.items.slice().reverse().map((item, index) => (
                                        <tr key={item.cartItemId || `item-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                                                <td className="px-2 sm:px-3 py-3 sm:py-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 align-middle">{index + 1}</td>
                                                <td className="px-2 sm:px-3 py-3 sm:py-4 text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 break-words align-middle">{item.name}</td>
                                                <td className="px-2 sm:px-3 py-3 sm:py-4 text-center align-middle">
                                                <div className="inline-flex items-center justify-center gap-1" dir="ltr">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (!item.cartItemId) return;
                                                            setQuantityDrafts(prev => {
                                                                const next = { ...prev };
                                                                delete next[item.cartItemId as string];
                                                                return next;
                                                            });
                                                            handleUpdateQuantity(item.cartItemId, item.quantity - QUANTITY_STEP);
                                                        }}
                                                        className="w-6 h-6 sm:w-7 sm:h-7 inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-orange-500"
                                                        aria-label="إنقاص الكمية"
                                                        disabled={!item.cartItemId}
                                                    >
                                                        −
                                                    </button>
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={item.cartItemId ? (quantityDrafts[item.cartItemId] ?? formatQuantityForInput(item.quantity)) : formatQuantityForInput(item.quantity)}
                                                        onChange={(e) => {
                                                            if (!item.cartItemId) return;
                                                            const raw = e.target.value.replace(',', '.');
                                                            if (!isAllowedQuantityDraft(raw)) return;
                                                            setQuantityDrafts(prev => ({ ...prev, [item.cartItemId as string]: raw }));

                                                            const parsed = parseQuantityDraft(raw);
                                                            if (parsed !== null) {
                                                                handleUpdateQuantity(item.cartItemId, parsed);
                                                            }
                                                        }}
                                                        onBlur={() => {
                                                            if (!item.cartItemId) return;
                                                            const raw = quantityDrafts[item.cartItemId];
                                                            if (raw === undefined) return;

                                                            const parsed = parseQuantityDraft(raw);
                                                            if (parsed !== null) {
                                                                handleUpdateQuantity(item.cartItemId, parsed);
                                                            }

                                                            setQuantityDrafts(prev => {
                                                                const next = { ...prev };
                                                                delete next[item.cartItemId as string];
                                                                return next;
                                                            });
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (!item.cartItemId) return;
                                                            if (e.key === 'Enter') {
                                                                (e.currentTarget as HTMLInputElement).blur();
                                                            }
                                                            if (e.key === 'Escape') {
                                                                setQuantityDrafts(prev => {
                                                                    const next = { ...prev };
                                                                    delete next[item.cartItemId as string];
                                                                    return next;
                                                                });
                                                                (e.currentTarget as HTMLInputElement).blur();
                                                            }
                                                        }}
                                                        className="w-[52px] sm:w-[60px] text-xs sm:text-sm text-center border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent py-1 sm:py-1.5"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (!item.cartItemId) return;
                                                            setQuantityDrafts(prev => {
                                                                const next = { ...prev };
                                                                delete next[item.cartItemId as string];
                                                                return next;
                                                            });
                                                            handleUpdateQuantity(item.cartItemId, item.quantity + QUANTITY_STEP);
                                                        }}
                                                        className="w-6 h-6 sm:w-7 sm:h-7 inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-orange-500"
                                                        aria-label="زيادة الكمية"
                                                        disabled={!item.cartItemId}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-2 sm:px-3 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap text-center align-middle">{formatCurrency(item.unitPrice)}</td>
                                            <td className="px-2 sm:px-3 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-orange-600 whitespace-nowrap text-center align-middle">{formatCurrency(item.total - (item.discount * item.quantity))}</td>
                                            <td className="px-2 sm:px-3 py-3 sm:py-4 text-center align-middle">
                                                <button 
                                                    onClick={() => {
                                                        if (item.cartItemId) {
                                                            const confirmed = window.confirm('هل أنت متأكد أنك تريد إزالة هذا المنتج من السلة؟');
                                                            if (!confirmed) return;
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
                    <div className="flex flex-col gap-2 sm:gap-3 md:gap-4 min-w-0 h-full min-h-0">
                        <div className="bg-gradient-to-br from-white via-orange-50/30 to-amber-50/30 dark:from-gray-800 dark:via-orange-950/20 dark:to-amber-950/20 rounded-xl sm:rounded-2xl shadow-lg border border-orange-200/50 dark:border-orange-800/50 backdrop-blur-xl p-3 sm:p-4 md:p-5 flex flex-col min-h-0 overflow-y-auto">
                            {/* Hold / Cancel Buttons (above Customer Name) */}
                            <div className="mb-2 sm:mb-3 md:mb-4">
                                <div className="flex flex-row gap-2 sm:gap-3">
                                    <button
                                        onClick={handleHoldSale}
                                        disabled={currentInvoice.items.length === 0}
                                        className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl border-2 border-yellow-400 dark:border-yellow-600 text-sm font-medium text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
                                    >
                                        <span className="h-4 w-4 sm:h-5 sm:w-5 block"><HandIcon /></span>
                                        <span className="mr-2">{AR_LABELS.holdSale}</span>
                                    </button>
                                    <button
                                        onClick={handleCancelSale}
                                        className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl border-2 border-red-400 dark:border-red-600 text-sm font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all duration-200 shadow-sm hover:shadow-md"
                                    >
                                        <span className="w-4 h-4 block"><CancelIcon /></span>
                                        <span className="mr-2">{AR_LABELS.cancel}</span>
                                    </button>
                                </div>
                            </div>
                            {/* Customer Section */}
                            <div className="flex-shrink-0 mb-2 sm:mb-3 md:mb-4">
                                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                                    <h3 className="font-bold text-sm sm:text-base text-gray-700 dark:text-gray-200 text-right">{AR_LABELS.customerName}</h3>
                                </div>
                                
                                {/* Customer Search Input with Dropdown */}
                                <div className="flex items-start gap-2 mb-2">
                                    <div className="relative z-[100] flex-1 min-w-0">
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
                                                                const transformedCustomers: Customer[] = transformAndFilterCustomers(dbCustomers);
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
                                                                        const transformedCustomers: Customer[] = transformAndFilterCustomers(syncResult.customers);
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
                                                            
                                                            // Debug logging for UI rendering
                                                            console.log('[POS] UI Render - Customer Dropdown:', {
                                                                isLoadingCustomers,
                                                                customersLength: customers.length,
                                                                allCustomersLength: allCustomers.length,
                                                                customersToShowLength: customersToShow.length,
                                                                customerSearchTerm,
                                                                customersLoaded,
                                                                sampleCustomers: customersToShow.slice(0, 3).map(c => ({ id: c.id, name: c.name, phone: c.phone }))
                                                            });
                                                            
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

                                    <button 
                                        type="button"
                                        onClick={() => setIsAddCustomerModalOpen(true)}
                                        className="shrink-0 inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-orange-300 bg-orange-50 px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold text-orange-700 shadow-sm transition-colors hover:bg-orange-100 hover:border-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-orange-800/60 dark:bg-orange-950/25 dark:text-orange-200 dark:hover:bg-orange-950/40 dark:focus-visible:ring-offset-gray-800"
                                    >
                                        {AR_LABELS.addNewCustomer}
                                    </button>
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
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Totals Summary */}
                            <div className="mb-2 sm:mb-3 md:mb-4">
                                <h3 className="text-[10px] sm:text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 md:mb-3 text-right">ملخص الفاتورة</h3>
                                <div className="bg-white/85 dark:bg-gray-800/80 rounded-lg sm:rounded-xl md:rounded-2xl p-2 sm:p-3 md:p-4 lg:p-5 border border-gray-200/60 dark:border-gray-700/60 backdrop-blur-sm shadow-sm">
                                    <div className="divide-y divide-gray-200/70 dark:divide-gray-700/70">
                                        <div className="py-1.5 sm:py-2 grid grid-cols-[minmax(0,auto)_1fr] items-center gap-x-2 sm:gap-x-3 md:gap-x-4 lg:gap-x-6">
                                            <span className="text-[11px] sm:text-xs md:text-sm lg:text-base font-semibold text-gray-900 dark:text-gray-100 tabular-nums text-left justify-self-start break-words">
                                                {formatCurrency(currentInvoice.subtotal)}
                                            </span>
                                            <span className="text-[10px] sm:text-[11px] md:text-xs lg:text-sm text-gray-600 dark:text-gray-400 text-right justify-self-end">
                                                {AR_LABELS.subtotal}:
                                            </span>
                                        </div>

                                        <div className="py-1.5 sm:py-2 grid grid-cols-[minmax(0,auto)_1fr] items-center gap-x-2 sm:gap-x-3 md:gap-x-4 lg:gap-x-6">
                                            <div className="justify-self-start">
                                                <input
                                                    type="number"
                                                    id="invoiceDiscount"
                                                    value={currentInvoice.invoiceDiscount}
                                                    onChange={e => setCurrentInvoice(inv => ({...inv, invoiceDiscount: parseFloat(e.target.value) || 0}))}
                                                    className="w-16 sm:w-20 md:w-24 lg:w-28 text-[10px] sm:text-xs md:text-sm text-left border border-orange-300 dark:border-orange-600 bg-white dark:bg-gray-700 rounded-md sm:rounded-lg font-semibold tabular-nums focus:ring-2 focus:ring-orange-500 focus:border-orange-500 py-1 sm:py-1.5 px-1.5 sm:px-2"
                                                />
                                            </div>
                                            <label htmlFor="invoiceDiscount" className="text-[10px] sm:text-[11px] md:text-xs lg:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap text-right justify-self-end">
                                                {AR_LABELS.invoiceDiscount}:
                                            </label>
                                        </div>

                                        <div className="py-1.5 sm:py-2 grid grid-cols-[minmax(0,auto)_1fr] items-center gap-x-2 sm:gap-x-3 md:gap-x-4 lg:gap-x-6">
                                            <span className="text-[11px] sm:text-xs md:text-sm lg:text-base font-semibold text-red-600 tabular-nums text-left justify-self-start break-words">
                                                {formatCurrency(currentInvoice.totalItemDiscount + currentInvoice.invoiceDiscount)}
                                            </span>
                                            <span className="text-[10px] sm:text-[11px] md:text-xs lg:text-sm text-gray-600 dark:text-gray-400 text-right justify-self-end">
                                                {AR_LABELS.totalDiscount}:
                                            </span>
                                        </div>

                                        <div className="py-1.5 sm:py-2 grid grid-cols-[minmax(0,auto)_1fr] items-center gap-x-2 sm:gap-x-3 md:gap-x-4 lg:gap-x-6">
                                            <span className="text-[11px] sm:text-xs md:text-sm lg:text-base font-semibold text-gray-900 dark:text-gray-100 tabular-nums text-left justify-self-start break-words">
                                                {formatCurrency(currentInvoice.tax)}
                                            </span>
                                            <span className="text-[10px] sm:text-[11px] md:text-xs lg:text-sm text-gray-600 dark:text-gray-400 text-right justify-self-end">
                                                {AR_LABELS.tax} ({(taxRate * 100).toFixed(2)}%):
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-2 sm:mt-2.5 md:mt-3 bg-gradient-to-l from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30 border-2 border-orange-400 dark:border-orange-600 rounded-lg sm:rounded-xl md:rounded-xl p-2 sm:p-2.5 md:p-3 lg:p-4 shadow-md ring-2 ring-orange-200 dark:ring-orange-800/50">
                                        <div className="grid grid-cols-[minmax(0,auto)_1fr] items-center gap-x-2 sm:gap-x-3 md:gap-x-4 lg:gap-x-6">
                                            <span className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-orange-600 dark:text-orange-400 tabular-nums text-left justify-self-start break-words">
                                                {formatCurrency(currentInvoice.grandTotal)}
                                            </span>
                                            <span className="text-xs sm:text-sm md:text-base lg:text-lg font-bold text-gray-800 dark:text-gray-200 text-right justify-self-end">
                                                {AR_LABELS.grandTotal}:
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Method & Confirm */}
                            <div>
                                <h3 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3 text-right">طريقة الدفع</h3>
                                <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm space-y-3">
                                    <div className="grid grid-cols-3 gap-2">
                                        <button 
                                            onClick={() => { setSelectedPaymentMethod('Cash'); setCreditPaidAmount(0); setCreditPaidAmountError(null); }} 
                                            className={`p-2 sm:p-3 rounded-xl border-2 text-center font-semibold text-xs sm:text-sm transition-all duration-200 ${
                                                selectedPaymentMethod === 'Cash' 
                                                    ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/40 text-orange-700 dark:text-orange-300 shadow-lg scale-105' 
                                                    : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50/50 dark:hover:bg-orange-900/20'
                                            }`}
                                        >
                                            {AR_LABELS.cash}
                                        </button>
                                        <button 
                                            onClick={() => { setSelectedPaymentMethod('Card'); setCreditPaidAmount(0); setCreditPaidAmountError(null); }} 
                                            className={`p-2 sm:p-3 rounded-xl border-2 text-center font-semibold text-xs sm:text-sm transition-all duration-200 ${
                                                selectedPaymentMethod === 'Card' 
                                                    ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/40 text-orange-700 dark:text-orange-300 shadow-lg scale-105' 
                                                    : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50/50 dark:hover:bg-orange-900/20'
                                            }`}
                                        >
                                            {AR_LABELS.visa}
                                        </button>
                                        <button 
                                            onClick={() => { setSelectedPaymentMethod('Credit'); setCreditPaidAmountError(null); }} 
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
                                                onChange={(e) => handleCreditPaidAmountChange(e.target.value)} 
                                                className="w-full p-2 text-sm sm:text-base border-2 border-orange-300 dark:border-orange-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-center font-bold focus:ring-2 focus:ring-orange-500 focus:border-orange-500" 
                                                min="0" 
                                                step="0.5"
                                            />
                                            {creditPaidAmountError && (
                                                <p className="mt-1.5 text-xs sm:text-sm text-red-600 dark:text-red-400 text-right">
                                                    {creditPaidAmountError}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                        <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-1.5 sm:p-2 rounded-lg border border-gray-200 dark:border-gray-600 flex-1">
                                            <ToggleSwitch
                                                enabled={autoPrintEnabled}
                                                onChange={setAutoPrintEnabled}
                                            />
                                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                                                {AR_LABELS.autoPrintInvoice}
                                            </label>
                                        </div>
                                        <button 
                                            onClick={handleReturn} 
                                            disabled={currentInvoice.items.length === 0} 
                                            className="flex-1 px-3 py-2 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-red-500 via-rose-500 to-red-600 rounded-lg hover:from-red-600 hover:via-rose-600 hover:to-red-700 disabled:from-gray-400 disabled:via-gray-400 disabled:to-gray-500 dark:disabled:from-gray-600 dark:disabled:via-gray-600 dark:disabled:to-gray-700 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 disabled:cursor-not-allowed disabled:scale-100"
                                        >
                                            {AR_LABELS.returnProduct}
                                        </button>
                                    </div>
                                    <button 
                                        onClick={handleFinalizePayment} 
                                        disabled={currentInvoice.items.length === 0 || isProcessingPayment} 
                                        className="w-full px-8 py-5 text-lg sm:text-xl font-bold text-white bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 rounded-xl hover:from-green-600 hover:via-emerald-600 hover:to-green-700 disabled:from-gray-400 disabled:via-gray-400 disabled:to-gray-500 dark:disabled:from-gray-600 dark:disabled:via-gray-600 dark:disabled:to-gray-700 shadow-2xl hover:shadow-3xl hover:scale-[1.02] transition-all duration-200 disabled:cursor-not-allowed disabled:scale-100"
                                    >
                                        {isProcessingPayment ? 'جاري المعالجة...' : AR_LABELS.confirmPayment}
                                    </button>
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
                                const transformedCustomers: Customer[] = transformAndFilterCustomers(dbCustomers);
                                
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
            <ProductNotFoundModal
                isOpen={isProductNotFoundModalOpen}
                barcode={notFoundBarcode}
                onClose={() => {
                    setIsProductNotFoundModalOpen(false);
                    setNotFoundBarcode('');
                }}
                onQuickAdd={handleQuickAddProduct}
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
    const [showInitialBalanceStep, setShowInitialBalanceStep] = useState(false);
    const [initialBalanceType, setInitialBalanceType] = useState<'balance' | 'debt' | null>(null);
    const [initialAmount, setInitialAmount] = useState(0);

    const handleBasicInfoSave = () => {
        // Validate phone number (required)
        if (!phone.trim()) {
            setErrors({ phone: 'رقم الهاتف مطلوب' });
            return;
        }

        // Clear errors and show balance step
        setErrors({});
        setShowInitialBalanceStep(true);
    };

    const handleSkipBalance = async () => {
        // Skip balance step and save customer with zero balance
        await saveCustomer(0);
    };

    const handleBalanceStepSave = async () => {
        if (initialBalanceType === null) {
            alert('يرجى اختيار نوع الرصيد الأولي.');
            return;
        }

        if (initialAmount <= 0) {
            alert('المبلغ يجب أن يكون أكبر من صفر.');
            return;
        }

        // Calculate previousBalance: positive for balance, negative for debt
        const previousBalance = initialBalanceType === 'balance' ? initialAmount : -initialAmount;
        await saveCustomer(previousBalance);
    };

    const saveCustomer = async (previousBalance: number) => {
        setIsSubmitting(true);

        try {
            // Create customer data (without id - API will generate it)
            const customerData: Omit<Customer, 'id'> = {
                name: name.trim() || phone, // Use phone as name if name not provided
                phone: phone.trim(),
                previousBalance: previousBalance,
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
            setShowInitialBalanceStep(false);
            setInitialBalanceType(null);
            setInitialAmount(0);
        } catch (error) {
            // Error is handled by parent component
            console.error('Error saving customer:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    // Show initial balance/debt step
    if (showInitialBalanceStep) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md text-right" onClick={e => e.stopPropagation()}>
                    <div className="p-6 space-y-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">إضافة رصيد أولي</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">اختر نوع الرصيد الأولي للعميل (يمكنك تخطي هذه الخطوة)</p>
                        
                        <div className="space-y-2">
                            <button
                                onClick={() => setInitialBalanceType('balance')}
                                className={`w-full px-4 py-3 rounded-md text-right font-medium transition-colors ${
                                    initialBalanceType === 'balance'
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}
                            >
                                {AR_LABELS.addBalance}
                            </button>
                            <button
                                onClick={() => setInitialBalanceType('debt')}
                                className={`w-full px-4 py-3 rounded-md text-right font-medium transition-colors ${
                                    initialBalanceType === 'debt'
                                        ? 'bg-red-500 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}
                            >
                                {AR_LABELS.addDebt}
                            </button>
                        </div>

                        {initialBalanceType && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {initialBalanceType === 'balance' ? AR_LABELS.addBalance : AR_LABELS.addDebt}
                                </label>
                                <input 
                                    type="number" 
                                    value={initialAmount} 
                                    onChange={e => setInitialAmount(parseFloat(e.target.value) || 0)} 
                                    placeholder="0.00"
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md text-left"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                        )}
                    </div>
                    <div className="flex justify-start space-x-4 space-x-reverse p-4 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700 rounded-b-lg">
                        <button 
                            onClick={handleBalanceStepSave} 
                            disabled={isSubmitting || !initialBalanceType || initialAmount <= 0}
                            className="px-4 py-2 bg-orange-500 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'جاري الحفظ...' : AR_LABELS.save}
                        </button>
                        <button 
                            onClick={handleSkipBalance} 
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            تخطي
                        </button>
                        <button 
                            onClick={() => setShowInitialBalanceStep(false)} 
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {AR_LABELS.cancel}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Show basic info form
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
                        onClick={handleBasicInfoSave} 
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-orange-500 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'جاري الحفظ...' : 'التالي'}
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