import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AR_LABELS, SearchIcon, DeleteIcon, PlusIcon } from '@/shared/constants';
import { useCurrency } from '@/shared/contexts/CurrencyContext';
import { productsApi, suppliersApi, purchasesApi, getApiErrorMessage } from '@/lib/api';
import { productsDB } from '@/lib/db/productsDB';
import { playBeepSound } from '@/shared/utils/soundUtils';
import { ProductNotFoundModal } from '@/shared/components/ui/ProductNotFoundModal';
import type { PurchaseItem } from '@/features/financial/types';
import type { SupplierSummary } from '@/lib/api';

type PaymentMethod = 'Cash' | 'Bank Transfer' | 'Credit' | 'Cheque';

/** One selectable unit level (base = main product unit, or a sub-unit). */
interface UnitOption {
  key: string;
  label: string;
  unitsPerBase: number; // How many of this unit fit in one "base" (main product) unit
  /** Cost price for this unit variant (stored at add-to-cart so unit change works without product lookup). */
  unitCost?: number;
  /** Selling price for this unit variant. */
  sellingPrice?: number;
}

interface CartLine {
  cartId: string;
  productId: string;
  productName: string;
  categoryName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  unit: string;
  /** Quantity in base (main) unit for conversion. */
  quantityInBase: number;
  /** Which unit level is selected for display (key from unitOptions). */
  unitLevelKey: string;
  unitOptions: UnitOption[];
  baseCostPrice: number;
  /** Base (main unit) selling price from product — for display only; totals use cost. */
  baseSellingPrice: number;
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  Cash: AR_LABELS.cash,
  'Bank Transfer': AR_LABELS.bankTransfer,
  Credit: AR_LABELS.credit,
  Cheque: AR_LABELS.cheque,
};

const PURCHASE_DRAFT_KEY = 'purchase_pos_draft';

/** Build list of unit levels for a product (base + sub-units) with conversion to base. */
function buildUnitOptions(product: any): UnitOption[] {
  const base: UnitOption = { key: 'base', label: 'قطعة', unitsPerBase: 1 };
  const units = product?.units;
  if (!units || !Array.isArray(units) || units.length === 0) return [base];
  const sorted = [...units].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
  const options: UnitOption[] = [base];
  for (const u of sorted) {
    const order = u.order ?? 0;
    if (order < 1) continue;
    let unitsPerBase = 1;
    const inPath = sorted.filter((x: any) => (x.order ?? 0) >= 1 && (x.order ?? 0) <= order);
    for (const x of inPath) unitsPerBase *= x.unitsInPrevious || 1;
    const label = u.unitName || u.name || u.nameAr || `Unit ${order}`;
    options.push({ key: `unit_${order}`, label, unitsPerBase });
  }
  return options;
}

/** Build unit options with cost and selling price per variant (so unit change loads correct prices without product lookup). */
function buildUnitOptionsWithPrices(
  product: any,
  getUnitCostPrice: (parentProduct: any, matchedUnit: any | null) => number
): UnitOption[] {
  const baseCost = getUnitCostPrice(product, null);
  const baseSelling = Number(product?.price ?? product?.retailSellingPrice ?? 0);
  const base: UnitOption = {
    key: 'base',
    label: 'قطعة',
    unitsPerBase: 1,
    unitCost: baseCost,
    sellingPrice: baseSelling,
  };
  const units = product?.units;
  if (!units || !Array.isArray(units) || units.length === 0) return [base];
  const sorted = [...units].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
  const options: UnitOption[] = [base];
  for (const u of sorted) {
    const order = u.order ?? 0;
    if (order < 1) continue;
    let unitsPerBase = 1;
    const inPath = sorted.filter((x: any) => (x.order ?? 0) >= 1 && (x.order ?? 0) <= order);
    for (const x of inPath) unitsPerBase *= x.unitsInPrevious || 1;
    const label = u.unitName || u.name || u.nameAr || `Unit ${order}`;
    const unitCost = getUnitCostPrice(product, u);
    const sellingPrice = Number(u.sellingPrice) >= 0 ? Number(u.sellingPrice) : baseSelling;
    options.push({ key: `unit_${order}`, label, unitsPerBase, unitCost, sellingPrice });
  }
  return options;
}

/** Get how many of the matched unit fit in one base unit. */
function getUnitsPerBaseForMatchedUnit(product: any, matchedUnit: any | null): number {
  if (!matchedUnit) return 1;
  const units = product?.units;
  if (!units || !Array.isArray(units)) return 1;
  const order = matchedUnit.order ?? 0;
  if (order < 1) return 1;
  const sorted = [...units].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
  const inPath = sorted.filter((u: any) => (u.order ?? 0) >= 1 && (u.order ?? 0) <= order);
  let unitsPerBase = 1;
  for (const u of inPath) unitsPerBase *= u.unitsInPrevious || 1;
  return unitsPerBase;
}

/** Resolve product unit object from unitLevelKey ('base' or 'unit_N') for variant-style cost lookup. */
function getMatchedUnitFromUnitLevelKey(product: any, unitLevelKey: string): any | null {
  const units = product?.units;
  if (!units || !Array.isArray(units) || units.length === 0) return null;
  if (unitLevelKey === 'base') {
    return units.find((u: any) => (u.order ?? 0) === 0) ?? units[0] ?? null;
  }
  const match = unitLevelKey.match(/^unit_(\d+)$/);
  if (!match) return null;
  const order = parseInt(match[1], 10);
  return units.find((u: any) => (u.order ?? 0) === order) ?? null;
}

/** Format number for UI display only (max decimals); internal calculations keep full precision. */
function formatForDisplay(value: number, maxDecimals: number = 3): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return parseFloat(value.toFixed(maxDecimals));
}

/** Derive display quantity, unitCost, unit, totalCost from quantityInBase + selected unit option and baseCostPrice. */
function deriveDisplayFromBase(
  quantityInBase: number,
  unitLevelKey: string,
  unitOptions: UnitOption[],
  baseCostPrice: number
): { quantity: number; unitCost: number; unit: string; totalCost: number } {
  const opt = unitOptions.find((o) => o.key === unitLevelKey) || unitOptions[0];
  const unitsPerBase = opt.unitsPerBase || 1;
  const quantity = quantityInBase * unitsPerBase;
  const unitCost = baseCostPrice / unitsPerBase;
  const totalCost = quantityInBase * baseCostPrice;
  return { quantity, unitCost, unit: opt.label, totalCost };
}

export interface PurchasePOSViewProps {
  /** When set, the form loads this purchase for editing and the confirm button becomes "Edit Purchase Invoice". */
  editPurchaseId?: string;
  onPurchaseCreated?: () => void;
  onViewStatement?: (supplierId: string) => void;
}

export const PurchasePOSView: React.FC<PurchasePOSViewProps> = ({ editPurchaseId, onPurchaseCreated, onViewStatement }) => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [summaries, setSummaries] = useState<SupplierSummary[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<{ id: string; name: string } | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [poNumber, setPoNumber] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [showSupplierBalanceStep, setShowSupplierBalanceStep] = useState(false);
  const [initialBalanceType, setInitialBalanceType] = useState<'balance' | 'debt' | null>(null);
  const [initialAmount, setInitialAmount] = useState(0);
  const [isLoadingQuickProducts, setIsLoadingQuickProducts] = useState(true);
  const [notFoundBarcode, setNotFoundBarcode] = useState('');
  const [isProductNotFoundModalOpen, setIsProductNotFoundModalOpen] = useState(false);
  const barcodeQueueRef = useRef<string[]>([]);
  const isProcessingBarcodeRef = useRef(false);
  const draftRef = useRef({ cart, selectedSupplier, discount, taxPercent, paidAmount, paymentMethod, poNumber });
  draftRef.current = { cart, selectedSupplier, discount, taxPercent, paidAmount, paymentMethod, poNumber };

  // Same as POS: numeric-only input is treated as barcode
  const isBarcodeInput = useCallback((input: string): boolean => {
    const trimmed = input.trim();
    if (!trimmed) return false;
    return /^[0-9]+$/.test(trimmed);
  }, []);

  // Unit cost for purchase: same logic as POS calculateUnitCostPrice (for matched unit)
  const calculateUnitCostPrice = useCallback((parentProduct: any, matchedUnit: any | null): number => {
    if (!matchedUnit) return parseFloat(parentProduct.costPrice) || 0;
    const allUnits = parentProduct.units || [];
    const matchedUnitOrder = matchedUnit.order ?? 0;
    if (matchedUnitOrder === 0) return parseFloat(parentProduct.costPrice) || 0;
    let cumulativeConversionFactor = 1;
    if (allUnits.length > 0) {
      const unitsInPath = allUnits
        .filter((u: any) => (u.order ?? 0) >= 1 && (u.order ?? 0) <= matchedUnitOrder)
        .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
      for (const currentUnit of unitsInPath) {
        const unitsInPrev = currentUnit.unitsInPrevious || 1;
        if (unitsInPrev > 0) cumulativeConversionFactor *= unitsInPrev;
      }
    }
    const parentCostPrice = parseFloat(parentProduct.costPrice) || 0;
    if (cumulativeConversionFactor > 0) return parentCostPrice / cumulativeConversionFactor;
    if (matchedUnit.conversionFactor && matchedUnit.conversionFactor > 0) return parentCostPrice / matchedUnit.conversionFactor;
    return parentCostPrice;
  }, []);

  // Quick products: same API and cache as POS (identical data source)
  const fetchQuickProducts = useCallback(async () => {
    const CACHE_KEY = 'pos_quick_products_cache';
    const CACHE_TIMESTAMP_KEY = 'pos_quick_products_cache_timestamp';
    const CACHE_TTL = 5 * 60 * 1000;
    try {
      const cachedData = localStorage.getItem(CACHE_KEY);
      const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      if (cachedData && cachedTimestamp && Date.now() - parseInt(cachedTimestamp, 10) < CACHE_TTL) {
        setProducts(JSON.parse(cachedData));
        setIsLoadingQuickProducts(false);
        return;
      }
    } catch (_) {}
    setIsLoadingQuickProducts(true);
    try {
      const response = await productsApi.getProducts({
        page: 1,
        limit: 100,
        showInQuickProducts: true,
        status: 'active',
        includeCategories: true,
      });
      const productsData = (response.data as any)?.products ?? (response.data as any)?.data?.products ?? [];
      const list = Array.isArray(productsData) ? productsData : [];
      setProducts(list);
      if (list.length > 0) {
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(list));
          localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
        } catch (_) {}
      }
    } catch (e) {
      console.error('Failed to load quick products', e);
      try {
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) setProducts(JSON.parse(cachedData));
        else setProducts([]);
      } catch (_) {
        setProducts([]);
      }
    } finally {
      setIsLoadingQuickProducts(false);
    }
  }, []);

  const loadSuppliers = useCallback(async () => {
    try {
      const res = await suppliersApi.getSuppliers();
      const list = (res as any)?.data?.data?.suppliers ?? (res as any)?.data?.suppliers ?? [];
      setSuppliers(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('Failed to load suppliers', e);
      setSuppliers([]);
    }
  }, []);

  const loadSummaries = useCallback(async () => {
    try {
      const res = await suppliersApi.getSupplierAccountsSummary();
      const list = (res as any)?.data?.data?.summaries ?? (res as any)?.data?.summaries ?? [];
      setSummaries(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('Failed to load supplier summaries', e);
      setSummaries([]);
    }
  }, []);

  const loadNextPo = useCallback(async () => {
    try {
      const res = await purchasesApi.getNextPoNumber();
      const num = (res as any)?.data?.data?.poNumber ?? (res as any)?.data?.poNumber ?? '';
      setPoNumber(num);
    } catch (e) {
      setPoNumber(`PO-${Date.now()}`);
    }
  }, []);

  useEffect(() => {
    fetchQuickProducts();
    loadSuppliers();
    loadSummaries();
    if (!editPurchaseId) loadNextPo();
  }, [fetchQuickProducts, loadSuppliers, loadSummaries, loadNextPo, editPurchaseId]);

  // Load purchase for edit mode
  useEffect(() => {
    if (!editPurchaseId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await purchasesApi.getPurchase(editPurchaseId);
        const raw = (res as any)?.data?.data?.purchase ?? (res as any)?.data?.purchase;
        if (!raw || cancelled) return;
        setSelectedSupplier({ id: raw.supplierId, name: raw.supplierName });
        setSupplierSearch(raw.supplierName || '');
        const items = raw.items ?? [];
        const cartLines: CartLine[] = items.map((item: any, index: number) => {
          const qty = Number(item.quantity) || 1;
          const qtyInBase = item.quantityInMainUnit != null && Number(item.quantityInMainUnit) >= 0 ? Number(item.quantityInMainUnit) : qty;
          const unit = item.unit || 'قطعة';
          const unitOptions: UnitOption[] = [{ key: 'base', label: unit, unitsPerBase: 1 }];
          return {
            cartId: `edit-${item.productId}-${index}`,
            productId: String(item.productId),
            productName: item.productName || '',
            categoryName: '',
            quantity: qty,
            unitCost: Number(item.unitCost) || 0,
            totalCost: Number(item.totalCost) || 0,
            unit,
            quantityInBase: qtyInBase,
            unitLevelKey: 'base',
            unitOptions,
            baseCostPrice: Number(item.unitCost) || 0,
            baseSellingPrice: item.sellingPrice != null ? Number(item.sellingPrice) : 0,
          };
        });
        setCart(cartLines);
        setDiscount(Number(raw.discount) || 0);
        const sub = Number(raw.subtotal) || 0;
        const disc = Number(raw.discount) || 0;
        const taxVal = Number(raw.tax) || 0;
        const taxPct = sub - disc > 0 ? (taxVal / (sub - disc)) * 100 : 15;
        setTaxPercent(taxPct);
        setPaidAmount(Number(raw.paidAmount) || 0);
        setPaymentMethod((raw.paymentMethod as PaymentMethod) || 'Cash');
        setPoNumber(raw.poNumber ?? '');
      } catch (e) {
        console.error('Failed to load purchase for edit', e);
      }
    })();
    return () => { cancelled = true; };
  }, [editPurchaseId]);

  // Restore draft from sessionStorage when returning to purchases (e.g. after navigation)
  useEffect(() => {
    if (editPurchaseId) return;
    try {
      const raw = sessionStorage.getItem(PURCHASE_DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as {
        cart?: CartLine[];
        selectedSupplier?: { id: string; name: string } | null;
        discount?: number;
        taxPercent?: number;
        paidAmount?: number;
        paymentMethod?: PaymentMethod;
        poNumber?: string;
      };
      if (d.cart && Array.isArray(d.cart) && d.cart.length > 0) {
        setCart(d.cart);
        if (d.selectedSupplier) setSelectedSupplier(d.selectedSupplier);
        if (typeof d.discount === 'number') setDiscount(d.discount);
        if (typeof d.taxPercent === 'number') setTaxPercent(d.taxPercent);
        if (typeof d.paidAmount === 'number') setPaidAmount(d.paidAmount);
        if (d.paymentMethod && ['Cash', 'Bank Transfer', 'Credit', 'Cheque'].includes(d.paymentMethod)) setPaymentMethod(d.paymentMethod);
        if (typeof d.poNumber === 'string') setPoNumber(d.poNumber);
      }
    } catch (_) {}
  }, [editPurchaseId]);

  // Save draft to sessionStorage on unmount so it can be restored when user comes back
  useEffect(() => {
    if (editPurchaseId) return;
    return () => {
      const { cart: c, selectedSupplier: s, discount: d, taxPercent: t, paidAmount: p, paymentMethod: m, poNumber: po } = draftRef.current;
      if (c && c.length > 0) {
        try {
          sessionStorage.setItem(
            PURCHASE_DRAFT_KEY,
            JSON.stringify({ cart: c, selectedSupplier: s, discount: d, taxPercent: t, paidAmount: p, paymentMethod: m, poNumber: po ?? '' })
          );
        } catch (_) {}
      }
    };
  }, [editPurchaseId]);

  // Filter quick products by name for non-barcode search (same as POS name search on client)
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase().trim();
    return products.filter(
      (p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  // Barcode search: IndexedDB first, then API fallback (avoids "not found" when storage is full)
  const searchProductByBarcodeForPurchase = useCallback(async (barcode: string) => {
    const trimmed = barcode.trim();
    if (!trimmed) return { success: false as const };
    try {
      await productsDB.init();
      let dbResult = await productsDB.getProductByBarcode(trimmed);
      if (!dbResult?.product) {
        try {
          const apiResponse = await productsApi.getProductByBarcode(trimmed);
          const apiData = (apiResponse as any)?.data;
          if (apiData?.success && apiData?.data?.product) {
            const productObj = apiData.data.product;
            const matchedUnit = apiData.data.matchedUnit ?? null;
            dbResult = { product: productObj, matchedUnit };
            try {
              await productsDB.storeProduct(productObj);
              productsDB.notifyOtherTabs();
            } catch (_) {}
          }
        } catch (_) {}
      }
      if (!dbResult?.product) return { success: false as const };
      const product = dbResult.product;
      const matchedUnit = dbResult.matchedUnit ?? null;
      const isScaleBarcode = product.isScaleBarcodeProduct || product.isScaleBarcode;
      const extractedWeight = product.extractedWeight;
      const rawQuantity = isScaleBarcode && extractedWeight ? extractedWeight : 1;
      const unitCost = calculateUnitCostPrice(product, matchedUnit);
      const productId = String(product.id ?? product._id);
      const productName = product.name || '';
      const categoryName = product.category?.nameAr || product.category?.name || product.category || '';
      const unit = isScaleBarcode && extractedWeight ? (product.scaleBarcodeFormat?.weightUnit === 'kg' ? 'كيلوجرام' : 'جرام') : 'قطعة';
      const baseCostPrice = parseFloat(product.costPrice) || 0;
      const baseSellingPrice = parseFloat(product.price) || parseFloat(product.retailSellingPrice) || 0;
      const unitOptions: UnitOption[] = isScaleBarcode
        ? [{ key: 'base', label: unit, unitsPerBase: 1, unitCost: unitCost, sellingPrice: baseSellingPrice }]
        : buildUnitOptionsWithPrices(product, calculateUnitCostPrice);
      const unitsPerBase = isScaleBarcode ? 1 : getUnitsPerBaseForMatchedUnit(product, matchedUnit);
      const quantityInBase = rawQuantity / unitsPerBase;
      const unitLevelKey = isScaleBarcode ? 'base' : (matchedUnit != null ? `unit_${matchedUnit.order ?? 0}` : 'base');
      const display = deriveDisplayFromBase(quantityInBase, unitLevelKey, unitOptions, baseCostPrice);
      return {
        success: true as const,
        productId,
        productName,
        categoryName,
        quantityInBase,
        unitLevelKey,
        unitOptions,
        baseCostPrice: parseFloat(product.costPrice) || 0,
        baseSellingPrice,
        quantity: display.quantity,
        unitCost: display.unitCost,
        unit: display.unit,
        totalCost: display.totalCost,
      };
    } catch (_) {
      return { success: false as const };
    }
  }, [calculateUnitCostPrice]);

  const addToCartFromBarcodeResult = useCallback(
    (result: {
      productId: string;
      productName: string;
      categoryName: string;
      quantityInBase: number;
      unitLevelKey: string;
      unitOptions: UnitOption[];
      baseCostPrice: number;
      baseSellingPrice: number;
      quantity: number;
      unitCost: number;
      unit: string;
      totalCost: number;
    }) => {
      setCart((prev) => {
        const existing = prev.find((l) => l.productId === result.productId);
        if (existing) {
          const newQuantityInBase = existing.quantityInBase + result.quantityInBase;
          const display = deriveDisplayFromBase(
            newQuantityInBase,
            existing.unitLevelKey,
            existing.unitOptions,
            existing.baseCostPrice
          );
          return prev.map((l) =>
            l.cartId === existing.cartId
              ? { ...l, quantityInBase: newQuantityInBase, ...display }
              : l
          );
        }
        const cartId = `cart-${result.productId}-${Date.now()}`;
        return [
          ...prev,
          {
            cartId,
            productId: result.productId,
            productName: result.productName,
            categoryName: result.categoryName,
            quantityInBase: result.quantityInBase,
            unitLevelKey: result.unitLevelKey,
            unitOptions: result.unitOptions,
            baseCostPrice: result.baseCostPrice,
            baseSellingPrice: result.baseSellingPrice,
            quantity: result.quantity,
            unitCost: result.unitCost,
            totalCost: result.totalCost,
            unit: result.unit,
          },
        ];
      });
    },
    []
  );

  const processBarcodeQueue = useCallback(async () => {
    if (isProcessingBarcodeRef.current || barcodeQueueRef.current.length === 0) return;
    isProcessingBarcodeRef.current = true;
    while (barcodeQueueRef.current.length > 0) {
      const barcode = barcodeQueueRef.current.shift();
      if (!barcode) continue;
      try {
        const result = await searchProductByBarcodeForPurchase(barcode);
        if (result.success) {
          addToCartFromBarcodeResult(result);
          setProductSearch('');
        } else {
          setNotFoundBarcode(barcode);
          setIsProductNotFoundModalOpen(true);
          setProductSearch('');
        }
      } catch (_) {}
    }
    isProcessingBarcodeRef.current = false;
  }, [searchProductByBarcodeForPurchase, addToCartFromBarcodeResult]);

  const queueBarcodeSearch = useCallback((barcode: string) => {
    const trimmed = barcode.trim();
    if (!trimmed) return;
    barcodeQueueRef.current.push(trimmed);
    playBeepSound();
    setProductSearch('');
    processBarcodeQueue();
  }, [processBarcodeQueue]);

  const handleProductSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = productSearch.trim();
    if (!trimmed) return;
    if (isBarcodeInput(trimmed)) {
      queueBarcodeSearch(trimmed);
      return;
    }
    // Non-barcode: keep filtering quick products (productSearch already set)
  }, [productSearch, isBarcodeInput, queueBarcodeSearch]);

  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return suppliers;
    const q = supplierSearch.toLowerCase().trim();
    return suppliers.filter(
      (s) =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.phone || '').toLowerCase().includes(q)
    );
  }, [suppliers, supplierSearch]);

  const subtotal = useMemo(() => cart.reduce((sum, l) => sum + l.totalCost, 0), [cart]);
  const totalAfterDiscount = subtotal - discount;
  const taxAmount = totalAfterDiscount * (taxPercent / 100);
  const grandTotal = totalAfterDiscount + taxAmount;
  const remaining = Math.max(0, grandTotal - paidAmount);

  const totalSellingPrice = useMemo(
    () => cart.reduce((sum, l) => sum + l.quantityInBase * (l.baseSellingPrice ?? 0), 0),
    [cart]
  );
  const totalCostPrice = subtotal;
  const netProfit = totalSellingPrice - totalCostPrice;
  const profitPercent = totalCostPrice > 0 ? (netProfit / totalCostPrice) * 100 : 0;

  const supplierBalance = useMemo(() => {
    if (!selectedSupplier) return null;
    return summaries.find((s) => s.supplierId === selectedSupplier.id) ?? null;
  }, [selectedSupplier, summaries]);

  const addToCart = useCallback((product: any) => {
    const baseCostPrice = Number(product.costPrice ?? product.cost ?? 0);
    const baseSellingPrice = Number(product.price ?? product.retailSellingPrice ?? 0);
    const id = String(product.id ?? product._id);
    const categoryName = product.category?.nameAr || product.category?.name || product.category || '';
    const unitOptions = buildUnitOptionsWithPrices(product, calculateUnitCostPrice);
    const quantityInBase = 1;
    const unitLevelKey = 'base';
    const display = deriveDisplayFromBase(quantityInBase, unitLevelKey, unitOptions, baseCostPrice);
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === id);
      if (existing) {
        const newQuantityInBase = existing.quantityInBase + quantityInBase;
        const nextDisplay = deriveDisplayFromBase(
          newQuantityInBase,
          existing.unitLevelKey,
          existing.unitOptions,
          existing.baseCostPrice
        );
        return prev.map((l) =>
          l.cartId === existing.cartId ? { ...l, quantityInBase: newQuantityInBase, ...nextDisplay } : l
        );
      }
      const cartId = `cart-${id}-${Date.now()}`;
      return [
        ...prev,
        {
          cartId,
          productId: id,
          productName: product.name || '',
          categoryName,
          quantityInBase,
          unitLevelKey,
          unitOptions,
          baseCostPrice,
          baseSellingPrice,
          ...display,
        },
      ];
    });
  }, [calculateUnitCostPrice]);

  const handleQuickAddProduct = useCallback(async (barcode: string, costPrice: number, sellingPrice: number, productName?: string) => {
    try {
      const productData = {
        name: productName?.trim() || `منتج ${barcode}`,
        barcode: barcode.trim(),
        costPrice,
        price: sellingPrice,
        stock: 0,
        status: 'active',
      };
      const response = await productsApi.createProduct(productData);
      const created = (response.data as any)?.data?.product ?? (response.data as any)?.product;
      if (response.success && created) {
        try {
          await productsDB.storeProduct(created);
          productsDB.notifyOtherTabs();
        } catch (_) {}
        addToCart({ ...created, costPrice, cost: costPrice });
        setToast({ message: 'تم إضافة المنتج للفاتورة', type: 'success' });
        setIsProductNotFoundModalOpen(false);
        setNotFoundBarcode('');
      }
    } catch (e: any) {
      setToast({ message: getApiErrorMessage(e, 'فشل إضافة المنتج'), type: 'error' });
      throw e;
    }
  }, [addToCart]);

  /** Variant-style unit change: load cost and selling price for the selected unit variant; quantity unchanged, no conversion. */
  const changeUnitLevel = useCallback((cartId: string, newUnitLevelKey: string) => {
    setCart((prev) =>
      prev.map((line) => {
        if (line.cartId !== cartId) return line;
        const opt = line.unitOptions.find((o) => o.key === newUnitLevelKey) ?? line.unitOptions[0];
        const product = products.find((p: any) => String(p.id ?? p._id) === String(line.productId));
        const matchedUnit = product ? getMatchedUnitFromUnitLevelKey(product, newUnitLevelKey) : null;
        const unitCost =
          opt?.unitCost != null && opt.unitCost >= 0
            ? opt.unitCost
            : product
              ? calculateUnitCostPrice(product, matchedUnit)
              : line.unitCost;
        const baseSellingPrice =
          opt?.sellingPrice != null && opt.sellingPrice >= 0
            ? opt.sellingPrice
            : matchedUnit != null && Number(matchedUnit.sellingPrice) >= 0
              ? Number(matchedUnit.sellingPrice)
              : line.baseSellingPrice;
        const quantity = line.quantity;
        const totalCost = quantity * unitCost;
        return {
          ...line,
          unitLevelKey: newUnitLevelKey,
          unit: opt?.label ?? line.unit,
          unitCost,
          totalCost,
          quantity,
          quantityInBase: quantity,
          baseSellingPrice,
        };
      })
    );
  }, [products, calculateUnitCostPrice]);

  const updateCartLine = (cartId: string, field: 'quantity' | 'unitCost' | 'baseSellingPrice', value: number) => {
    setCart((prev) =>
      prev.map((line) => {
        if (line.cartId !== cartId) return line;
        if (field === 'quantity') {
          const quantity = Math.max(0, value);
          const totalCost = quantity * line.unitCost;
          return { ...line, quantity, quantityInBase: quantity, totalCost };
        }
        if (field === 'baseSellingPrice') {
          return { ...line, baseSellingPrice: value };
        }
        const next = { ...line, [field]: value };
        next.totalCost = next.quantity * next.unitCost;
        return next;
      })
    );
  };

  const removeFromCart = (cartId: string) => {
    setCart((prev) => prev.filter((l) => l.cartId !== cartId));
  };

  const saveNewSupplier = async (previousBalance: number) => {
    try {
      const res = await suppliersApi.createSupplier({
        name: newSupplierName.trim(),
        phone: newSupplierPhone.trim() || undefined,
        previousBalance,
      });
      const created = (res as any)?.data?.data?.supplier ?? (res as any)?.data?.supplier;
      if (created) {
        setSuppliers((prev) => [{ ...created, id: created.id }, ...prev]);
        setSelectedSupplier({ id: created.id, name: created.name });
        setNewSupplierName('');
        setNewSupplierPhone('');
        setShowSupplierBalanceStep(false);
        setInitialBalanceType(null);
        setInitialAmount(0);
        setIsAddSupplierOpen(false);
        setToast({ message: 'تم إضافة المورد', type: 'success' });
        loadSummaries();
      }
    } catch (e: any) {
      setToast({ message: getApiErrorMessage(e, 'فشل إضافة المورد'), type: 'error' });
    }
  };

  const handleAddSupplierBasicInfo = () => {
    if (!newSupplierName.trim()) {
      setToast({ message: 'اسم المورد مطلوب', type: 'error' });
      return;
    }
    setShowSupplierBalanceStep(true);
  };

  const handleSupplierSkipBalance = () => {
    saveNewSupplier(0);
  };

  const handleSupplierBalanceStepSave = () => {
    if (initialBalanceType === null) {
      setToast({ message: 'يرجى اختيار نوع الرصيد الأولي.', type: 'error' });
      return;
    }
    if (initialAmount <= 0) {
      setToast({ message: 'المبلغ يجب أن يكون أكبر من صفر.', type: 'error' });
      return;
    }
    const previousBalance = initialBalanceType === 'balance' ? initialAmount : -initialAmount;
    saveNewSupplier(previousBalance);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedSupplier) {
      setToast({ message: 'يرجى اختيار المورد', type: 'error' });
      return;
    }
    if (cart.length === 0) {
      setToast({ message: 'أضف منتجات للفاتورة', type: 'error' });
      return;
    }
    setIsSubmitting(true);
    try {
      const items: PurchaseItem[] = cart.map((l) => ({
        productId: l.productId,
        productName: l.productName,
        quantity: l.quantity,
        unitCost: l.unitCost,
        totalCost: l.totalCost,
        unit: l.unit,
        ...(l.baseSellingPrice != null && l.baseSellingPrice >= 0 ? { sellingPrice: l.baseSellingPrice } : {}),
        quantityInMainUnit: l.quantityInBase,
      }));
      const body = {
        supplierId: selectedSupplier.id,
        supplierName: selectedSupplier.name,
        items,
        subtotal,
        discount,
        tax: taxAmount,
        totalAmount: grandTotal,
        paidAmount,
        paymentMethod,
        purchaseDate: new Date().toISOString(),
        notes: undefined as string | undefined,
        chequeDetails: undefined as any,
      };
      if (editPurchaseId) {
        await purchasesApi.updatePurchase(editPurchaseId, body);
        setToast({ message: 'تم تحديث فاتورة الشراء بنجاح', type: 'success' });
        setCart([]);
        setDiscount(0);
        setPaidAmount(0);
        try {
          sessionStorage.removeItem(PURCHASE_DRAFT_KEY);
        } catch (_) {}
        loadSummaries();
        onPurchaseCreated?.();
        navigate('/purchases', { replace: true });
      } else {
        await purchasesApi.createPurchase({
          ...body,
          poNumber: poNumber || undefined,
        });
        setToast({ message: 'تم حفظ فاتورة الشراء بنجاح', type: 'success' });
        setCart([]);
        setDiscount(0);
        setPaidAmount(0);
        try {
          sessionStorage.removeItem(PURCHASE_DRAFT_KEY);
        } catch (_) {}
        loadNextPo();
        loadSummaries();
        onPurchaseCreated?.();
      }
    } catch (e: any) {
      setToast({ message: getApiErrorMessage(e, editPurchaseId ? 'فشل تحديث الفاتورة' : 'فشل حفظ الفاتورة'), type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-lg shadow-lg ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      <ProductNotFoundModal
        isOpen={isProductNotFoundModalOpen}
        barcode={notFoundBarcode}
        onClose={() => {
          setIsProductNotFoundModalOpen(false);
          setNotFoundBarcode('');
        }}
        onQuickAdd={handleQuickAddProduct}
      />

      {/* Invoice entry bar — compact, workflow: Who → Totals + Payment → Confirm */}
      <div className="flex-shrink-0 mb-3">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
          <div className="p-3 sm:p-4 flex flex-col gap-3 lg:gap-4">
            {/* Row 1: Supplier */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-2">
              <div className="flex-1 min-w-0">
                <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1 text-right">
                  المورد
                </label>
                <div className="flex gap-1.5">
                  <div className="relative flex-1 min-w-0">
                    <input
                      type="text"
                      value={selectedSupplier ? selectedSupplier.name : supplierSearch}
                      onChange={(e) => {
                        setSupplierSearch(e.target.value);
                        if (selectedSupplier) setSelectedSupplier(null);
                        setIsSupplierDropdownOpen(true);
                      }}
                      onFocus={() => setIsSupplierDropdownOpen(true)}
                      placeholder="بحث أو اختر مورد..."
                      className="w-full h-9 px-2.5 rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 text-sm text-right placeholder:text-gray-400 focus:outline-none focus:ring-1.5 focus:ring-orange-500/25 focus:border-orange-400"
                    />
                    {isSupplierDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsSupplierDropdownOpen(false)} />
                        <div className="absolute top-full left-0 right-0 z-20 mt-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto py-0.5">
                          {filteredSuppliers.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setSelectedSupplier({ id: s.id, name: s.name });
                                setSupplierSearch('');
                                setIsSupplierDropdownOpen(false);
                              }}
                              className="w-full text-right px-2.5 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                            >
                              {s.name}
                              {s.phone && <span className="text-xs text-gray-500 mr-2"> {s.phone}</span>}
                            </button>
                          ))}
                          {filteredSuppliers.length === 0 && (
                            <div className="px-2.5 py-2 text-sm text-gray-500">لا موردين</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddSupplierOpen(true)}
                    className="shrink-0 h-9 w-9 flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="إضافة مورد"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
                {selectedSupplier && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-right">
                    <span className="font-medium text-gray-800 dark:text-gray-200">{selectedSupplier.name}</span>
                    {supplierBalance != null && (
                      <span className="text-gray-500 dark:text-gray-400 tabular-nums">
                        رصيد: {formatCurrency(supplierBalance.balance)}
                      </span>
                    )}
                    {onViewStatement && (
                      <button type="button" onClick={() => onViewStatement(selectedSupplier.id)} className="text-orange-600 dark:text-orange-400 hover:underline">
                        {AR_LABELS.supplierStatement}
                      </button>
                    )}
                    <button type="button" onClick={() => setSelectedSupplier(null)} className="text-red-500 hover:underline">إلغاء</button>
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: Invoice totals + Payment side-by-side (desktop), Confirm at end */}
            <div className="flex flex-col lg:flex-row lg:items-stretch gap-3">
              <div className="flex flex-col sm:flex-row gap-3 flex-1 min-w-0">
                {/* مبلغ الفاتورة — wider for visual emphasis */}
                <div className="flex-[1.5] min-w-0 rounded-lg bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-600/50 px-3 py-2.5">
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-2 text-right">مبلغ الفاتورة</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1.5 text-[11px]">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-gray-500 dark:text-gray-400">{AR_LABELS.subtotal}</span>
                      <span className="font-medium tabular-nums text-gray-800 dark:text-gray-200">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-gray-500 dark:text-gray-400">{AR_LABELS.discount}</span>
                      <input
                        type="number"
                        min={0}
                        value={discount}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                        className="w-full max-w-20 h-6 rounded border border-gray-200 dark:border-gray-600 px-1.5 text-[11px] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-orange-500/30"
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-gray-500 dark:text-gray-400">{AR_LABELS.tax}%</span>
                      <input
                        type="number"
                        min={0}
                        value={taxPercent}
                        onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                        className="w-full max-w-16 h-6 rounded border border-gray-200 dark:border-gray-600 px-1.5 text-[11px] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-orange-500/30"
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-gray-600 dark:text-gray-300 font-medium">{AR_LABELS.grandTotal}</span>
                      <span className="text-xs font-bold tabular-nums text-orange-600 dark:text-orange-400">{formatCurrency(grandTotal)}</span>
                    </div>
                  </div>
                </div>
                {/* الدفع — narrower, balanced with invoice */}
                <div className="flex-1 min-w-0 rounded-lg bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-600/50 px-3 py-2.5">
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-2 text-right">الدفع</p>
                  <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 text-[11px]">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-gray-500 dark:text-gray-400">طريقة الدفع</span>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        className="w-full h-6 rounded border border-gray-200 dark:border-gray-600 px-1.5 text-[11px] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-orange-500/30 appearance-none cursor-pointer"
                      >
                        {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((method) => (
                          <option key={method} value={method}>{PAYMENT_LABELS[method]}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-gray-500 dark:text-gray-400">المدفوع</span>
                      <input
                        type="number"
                        min={0}
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                        className="w-full max-w-20 h-6 rounded border border-gray-200 dark:border-gray-600 px-1.5 text-[11px] font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-orange-500/30"
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-gray-500 dark:text-gray-400">المتبقي</span>
                      <span className="font-semibold tabular-nums text-gray-800 dark:text-gray-200 leading-6">{formatCurrency(remaining)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleConfirmPurchase}
                disabled={isSubmitting || !selectedSupplier || cart.length === 0}
                className="h-9 lg:h-auto lg:min-h-[2.25rem] px-4 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs shadow-sm hover:shadow transition-all flex items-center justify-center shrink-0"
              >
                {isSubmitting ? 'جاري الحفظ...' : editPurchaseId ? 'تعديل فاتورة الشراء' : 'تأكيد فاتورة الشراء'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2-column grid: products + cart */}
      <div className="grid grid-cols-1 md:grid-cols-[0.75fr_2.3fr] gap-3 lg:gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Column 1: Product search (barcode + name) + Quick products — same as POS */}
        <div className="flex flex-col min-h-0 bg-white/95 dark:bg-gray-800/95 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
          <form onSubmit={handleProductSearchSubmit} className="p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="relative">
              <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const trimmed = productSearch.trim();
                    if (trimmed && isBarcodeInput(trimmed)) {
                      e.preventDefault();
                      queueBarcodeSearch(trimmed);
                    }
                  }
                }}
                placeholder={AR_LABELS.searchProductPlaceholder}
                className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-right"
              />
            </div>
          </form>
          <div className="p-2 border-b border-gray-100 dark:border-gray-700/50">
            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 text-right">
              {AR_LABELS.quickProducts}
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {isLoadingQuickProducts ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">جاري التحميل...</p>
            ) : filteredProducts.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                {productSearch ? 'لا توجد نتائج' : 'لا توجد منتجات سريعة. قم بتمكين المنتجات من إعدادات المنتج.'}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id ?? p._id}
                    type="button"
                    onClick={() => addToCart(p)}
                    className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg text-right hover:bg-orange-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="block text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {p.name}
                    </span>
                    <span className="block text-xs font-bold text-orange-600 mt-1">
                      {formatCurrency(p.costPrice ?? p.cost ?? 0)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Cart */}
        <div className="flex flex-col min-h-0 bg-white/95 dark:bg-gray-800/95 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">رقم الفاتورة (تلقائي)</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300" title={poNumber || ''}>
                {AR_LABELS.poNumber}: <span className="text-orange-600 dark:text-orange-400 font-mono select-none">{poNumber || '...'}</span>
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-auto min-h-0 border-b border-gray-200 dark:border-gray-700">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                <tr>
                  <th className="px-2 py-2 w-[18%]">{AR_LABELS.productName}</th>
                  <th className="px-2 py-2 w-[10%]">{AR_LABELS.category}</th>
                  <th className="px-2 py-2 w-[12%]">{AR_LABELS.unitLevel}</th>
                  <th className="px-2 py-2 w-[8%]">{AR_LABELS.quantity}</th>
                  <th className="px-2 py-2 w-[10%]">{AR_LABELS.unitCost}</th>
                  <th className="px-2 py-2 w-[10%]">{AR_LABELS.sellingPrice}</th>
                  <th className="px-2 py-2 w-[8%]">نسبة الربح %</th>
                  <th className="px-2 py-2 w-[10%]">{AR_LABELS.totalAmount}</th>
                  <th className="px-2 py-2 w-[8%]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      لا توجد أصناف
                    </td>
                  </tr>
                ) : (
                  cart.map((line) => {
                    const unitSellingPrice = line.baseSellingPrice;
                    return (
                      <tr key={line.cartId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-2 py-2 font-medium">{line.productName}</td>
                        <td className="px-2 py-2 text-gray-600 dark:text-gray-400">{line.categoryName || '—'}</td>
                        <td className="px-2 py-2">
                          <select
                            value={line.unitLevelKey}
                            onChange={(e) => changeUnitLevel(line.cartId, e.target.value)}
                            className="w-full min-w-0 max-w-[120px] text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-xs py-1 px-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500/30"
                          >
                            {line.unitOptions.map((opt) => (
                              <option key={opt.key} value={opt.key}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min={0.01}
                            step="any"
                            value={formatForDisplay(line.quantity, 3)}
                            onChange={(e) => updateCartLine(line.cartId, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-16 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={formatForDisplay(line.unitCost, 3)}
                            onChange={(e) => updateCartLine(line.cartId, 'unitCost', parseFloat(e.target.value) || 0)}
                            className="w-20 text-left border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={formatForDisplay(unitSellingPrice, 3)}
                            onChange={(e) => {
                              const unitPrice = parseFloat(e.target.value) || 0;
                              updateCartLine(line.cartId, 'baseSellingPrice', unitPrice);
                            }}
                            className="w-20 text-left border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            title={AR_LABELS.sellingPrice}
                          />
                        </td>
                        <td className="px-2 py-2 tabular-nums text-gray-700 dark:text-gray-300">
                          {line.unitCost > 0
                            ? `${(((unitSellingPrice - line.unitCost) / line.unitCost) * 100).toFixed(1)}%`
                            : '—'}
                        </td>
                        <td className="px-2 py-2 font-semibold text-orange-600">{line.totalCost.toFixed(2)}</td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() => removeFromCart(line.cartId)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <DeleteIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Profit summary — 2 rows × 4 columns, pinned to bottom of Invoice div */}
          {cart.length > 0 && (
            <div className="flex-shrink-0 p-2 sm:p-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
              <table className="w-full text-right text-xs sm:text-sm table-fixed">
                <thead>
                  <tr className="text-gray-600 dark:text-gray-400">
                    <th className="py-1 px-1 font-medium w-1/4">إجمالي التكلفة</th>
                    <th className="py-1 px-1 font-medium w-1/4">إجمالي سعر البيع</th>
                    <th className="py-1 px-1 font-medium w-1/4">صافي الربح</th>
                    <th className="py-1 px-1 font-medium w-1/4">نسبة الربح %</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-1 px-1 font-semibold tabular-nums text-gray-800 dark:text-gray-200">{formatCurrency(totalCostPrice)}</td>
                    <td className="py-1 px-1 font-semibold tabular-nums text-gray-800 dark:text-gray-200">{formatCurrency(totalSellingPrice)}</td>
                    <td className={`py-1 px-1 font-semibold tabular-nums ${netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(netProfit)}
                    </td>
                    <td className={`py-1 px-1 font-semibold tabular-nums ${profitPercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {profitPercent.toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add supplier modal — two steps like Add Customer: step 1 = basic info, step 2 = opening balance */}
      {isAddSupplierOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setIsAddSupplierOpen(false);
            setShowSupplierBalanceStep(false);
            setInitialBalanceType(null);
            setInitialAmount(0);
          }}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md text-right"
            onClick={(e) => e.stopPropagation()}
          >
            {!showSupplierBalanceStep ? (
              <>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  {AR_LABELS.addNewSupplier}
                </h2>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder={AR_LABELS.supplier}
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <input
                    type="text"
                    placeholder={AR_LABELS.phone}
                    value={newSupplierPhone}
                    onChange={(e) => setNewSupplierPhone(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="flex gap-2 justify-start mt-4">
                  <button
                    type="button"
                    onClick={handleAddSupplierBasicInfo}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg"
                  >
                    متابعة
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddSupplierOpen(false);
                      setShowSupplierBalanceStep(false);
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg"
                  >
                    {AR_LABELS.cancel}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">إضافة رصيد أولي</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  اختر نوع الرصيد الأولي للمورد (يمكنك تخطي هذه الخطوة)
                </p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setInitialBalanceType('balance')}
                    className={`w-full px-4 py-3 rounded-lg text-right font-medium transition-colors ${
                      initialBalanceType === 'balance'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {AR_LABELS.journalVoucher} — عليك للمورد
                  </button>
                  <button
                    type="button"
                    onClick={() => setInitialBalanceType('debt')}
                    className={`w-full px-4 py-3 rounded-lg text-right font-medium transition-colors ${
                      initialBalanceType === 'debt'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {AR_LABELS.receiptVoucher} — للمورد عليك
                  </button>
                </div>
                {initialBalanceType && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-right">
                      {initialBalanceType === 'balance' ? AR_LABELS.journalVoucher : AR_LABELS.receiptVoucher}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={initialAmount || ''}
                      onChange={(e) => setInitialAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-right"
                    />
                  </div>
                )}
                <div className="flex gap-2 justify-start mt-4 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSupplierSkipBalance}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg"
                  >
                    تخطي
                  </button>
                  <button
                    type="button"
                    onClick={handleSupplierBalanceStepSave}
                    disabled={!initialBalanceType || initialAmount <= 0}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg disabled:opacity-50"
                  >
                    {AR_LABELS.save}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSupplierBalanceStep(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg"
                  >
                    رجوع
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
