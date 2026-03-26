import React, { useEffect, useState, useCallback, useRef } from 'react';
import { XIcon } from '@/shared/assets/icons';
import { productsApi } from '@/lib/api/client';
import type { PosDynamicPricing, PosQuantityOffer } from '@/features/sales/hooks/usePricing';

export type POSProductLike = {
    id: number;
    originalId?: string;
    name: string;
    price: number;
    posDynamicPricing?: PosDynamicPricing;
};

type Row = { id: string; quantity: string; offerPrice: string };

/** Parse user-entered decimal text (avoids NaN from empty; supports comma). */
const parseDecimalField = (raw: string): number => {
    const s = raw.trim().replace(',', '.');
    if (s === '') return NaN;
    return Number(s);
};

const newRow = (): Row => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    quantity: '',
    offerPrice: '',
});

interface ProductEditModalProps {
    isOpen: boolean;
    product: POSProductLike | null;
    onClose: () => void;
    /** Called with normalized product fields after successful save + refresh */
    onSaved: (updated: POSProductLike) => void;
    onError?: (message: string) => void;
}

const ProductEditModal: React.FC<ProductEditModalProps> = ({ isOpen, product, onClose, onSaved, onError }) => {
    const [basePrice, setBasePrice] = useState('');
    const [rows, setRows] = useState<Row[]>([newRow()]);
    const [dateEnabled, setDateEnabled] = useState(false);
    const [dateOfferPrice, setDateOfferPrice] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [saving, setSaving] = useState(false);
    const [localError, setLocalError] = useState('');

    const resetFromProduct = useCallback(() => {
        if (!product) return;
        setBasePrice(String(product.price ?? ''));
        const q = product.posDynamicPricing?.quantityOffers;
        if (q && q.length > 0) {
            setRows(
                q.map((r) => ({
                    id: `${r.quantity}-${r.offerPrice}-${Math.random()}`,
                    quantity: String(r.quantity),
                    offerPrice: String(r.offerPrice),
                }))
            );
        } else {
            setRows([newRow()]);
        }
        const d = product.posDynamicPricing?.dateOffer;
        if (d && d.startDate && d.endDate) {
            setDateEnabled(true);
            setDateOfferPrice(String(d.offerPrice ?? ''));
            const sd = d.startDate.includes('T') ? d.startDate.slice(0, 10) : d.startDate;
            const ed = d.endDate.includes('T') ? d.endDate.slice(0, 10) : d.endDate;
            setStartDate(sd);
            setEndDate(ed);
        } else {
            setDateEnabled(false);
            setDateOfferPrice('');
            setStartDate('');
            setEndDate('');
        }
        setLocalError('');
    }, [product]);

    /** Only hydrate from `product` when the modal opens or the edited product identity changes — not on every parent re-render (avoids wiping typed values). */
    const lastSyncedProductKeyRef = useRef<string | null>(null);
    const productKey = product ? `${product.id}-${product.originalId ?? ''}` : '';
    useEffect(() => {
        if (!isOpen || !product) {
            lastSyncedProductKeyRef.current = null;
            return;
        }
        if (lastSyncedProductKeyRef.current === productKey) {
            return;
        }
        lastSyncedProductKeyRef.current = productKey;
        resetFromProduct();
    }, [isOpen, product, productKey, resetFromProduct]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        if (isOpen) window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    const validateAndBuildPricing = (): PosDynamicPricing | undefined => {
        const quantityOffers: PosQuantityOffer[] = [];
        for (const row of rows) {
            const q = parseDecimalField(row.quantity);
            const p = parseDecimalField(row.offerPrice);
            const qEmpty = row.quantity.trim() === '';
            const pEmpty = row.offerPrice.trim() === '';
            if (qEmpty && pEmpty) continue;
            if (qEmpty !== pEmpty) {
                throw new Error('أكمل حقل الكمية وحقل إجمالي المجموعة معاً لكل صف تستخدمه.');
            }
            if (!Number.isFinite(q) || q <= 0 || !Number.isFinite(p) || p < 0) {
                throw new Error('أدخل قيم صحيحة لعروض الكمية (كمية أكبر من صفر وسعر غير سالب).');
            }
            quantityOffers.push({ quantity: q, offerPrice: p });
        }

        let dateOffer: PosDynamicPricing['dateOffer'] = undefined;
        if (dateEnabled) {
            const op = parseDecimalField(dateOfferPrice);
            if (!Number.isFinite(op) || op < 0) {
                throw new Error('أدخل سعر صحيح للعرض المؤقت.');
            }
            if (!startDate || !endDate) {
                throw new Error('حدد تاريخ البداية والنهاية للعرض المؤقت.');
            }
            const s = new Date(startDate);
            const e = new Date(endDate);
            if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
                throw new Error('تواريخ غير صالحة.');
            }
            if (s > e) {
                throw new Error('تاريخ البداية يجب أن يكون قبل تاريخ النهاية.');
            }
            dateOffer = {
                offerPrice: op,
                startDate: new Date(startDate).toISOString(),
                endDate: new Date(endDate).toISOString(),
            };
        }

        const out: PosDynamicPricing = {};
        if (quantityOffers.length > 0) out.quantityOffers = quantityOffers;
        if (dateOffer !== undefined) out.dateOffer = dateOffer;
        return Object.keys(out).length > 0 ? out : undefined;
    };

    const handleSave = async () => {
        if (!product?.originalId) {
            const msg = 'لا يمكن الحفظ: معرف المنتج غير متوفر.';
            setLocalError(msg);
            onError?.(msg);
            return;
        }
        const bp = parseDecimalField(basePrice);
        if (!Number.isFinite(bp) || bp < 0) {
            const msg = 'أدخل سعراً أساسياً صحيحاً.';
            setLocalError(msg);
            return;
        }
        let posDynamicPricing: PosDynamicPricing | undefined;
        try {
            posDynamicPricing = validateAndBuildPricing();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'خطأ في التحقق';
            setLocalError(msg);
            return;
        }

        setSaving(true);
        setLocalError('');
        try {
            const res = await productsApi.updateProduct(String(product.originalId), {
                price: bp,
                posDynamicPricing: posDynamicPricing ?? null,
            });
            const body = res.data as { data?: { product?: { name?: string; price?: number } } };
            const raw = body?.data?.product;
            onSaved({
                id: product.id,
                originalId: product.originalId,
                name: raw?.name ?? product.name,
                price: raw?.price != null && Number.isFinite(Number(raw.price)) ? Number(raw.price) : bp,
                posDynamicPricing: posDynamicPricing ?? undefined,
            });
            onClose();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'فشل الحفظ';
            setLocalError(msg);
            onError?.(msg);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen || !product) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">تعديل المنتج والأسعار</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                        aria-label="إغلاق"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto p-4 space-y-5 text-right">
                    {localError && (
                        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 text-sm px-3 py-2">{localError}</div>
                    )}

                    <section>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">معلومات أساسية</h3>
                        <label className="block text-xs text-gray-500 mb-1">اسم المنتج</label>
                        <input
                            type="text"
                            readOnly
                            value={product.name}
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200"
                        />
                        <label className="block text-xs text-gray-500 mt-3 mb-1">السعر الأساسي</label>
                        <input
                            type="number"
                            min={0}
                            step="any"
                            autoComplete="off"
                            value={basePrice}
                            onChange={(e) => setBasePrice(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                        />
                    </section>

                    <section>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">عروض الكمية</h3>
                            <button
                                type="button"
                                onClick={() => setRows((r) => [...r, newRow()])}
                                className="text-xs font-medium text-orange-600 hover:text-orange-700"
                            >
                                + صف
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">
                            «سعر العرض» هو إجمالي المجموعة وليس سعر القطعة (مثال: 3 قطع = 18 إجمالي). يُختار أعلى عرض حيث حجم المجموعة ≤ الكمية؛ الكسور تُحسب بالسعر الأساسي.
                        </p>
                        <div className="space-y-2">
                            {rows.map((row) => (
                                <div key={row.id} className="flex flex-wrap gap-2 items-center">
                                    <input
                                        type="number"
                                        min={0}
                                        step="any"
                                        autoComplete="off"
                                        placeholder="الكمية"
                                        value={row.quantity}
                                        onChange={(e) =>
                                            setRows((prev) => prev.map((x) => (x.id === row.id ? { ...x, quantity: e.target.value } : x)))
                                        }
                                        className="flex-1 min-w-[100px] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
                                    />
                                    <input
                                        type="number"
                                        min={0}
                                        step="any"
                                        autoComplete="off"
                                        placeholder="إجمالي المجموعة"
                                        value={row.offerPrice}
                                        onChange={(e) =>
                                            setRows((prev) => prev.map((x) => (x.id === row.id ? { ...x, offerPrice: e.target.value } : x)))
                                        }
                                        className="flex-1 min-w-[100px] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => rows.length > 1 && setRows((prev) => prev.filter((x) => x.id !== row.id))}
                                        disabled={rows.length <= 1}
                                        className="text-red-600 text-xs disabled:opacity-30"
                                    >
                                        حذف
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section>
                        <label className="flex items-center gap-2 mb-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={dateEnabled}
                                onChange={(e) => setDateEnabled(e.target.checked)}
                                className="rounded border-gray-300"
                            />
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">عرض مؤقت حسب التاريخ</span>
                        </label>
                        {dateEnabled && (
                            <div className="space-y-2 pl-1">
                                <input
                                    type="number"
                                    min={0}
                                    step="any"
                                    autoComplete="off"
                                    placeholder="سعر العرض"
                                    value={dateOfferPrice}
                                    onChange={(e) => setDateOfferPrice(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                                />
                                <div className="flex gap-2 flex-wrap">
                                    <div className="flex-1 min-w-[140px]">
                                        <label className="text-xs text-gray-500">من</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-[140px]">
                                        <label className="text-xs text-gray-500">إلى</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                </div>

                <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleSave()}
                        disabled={saving}
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
                    >
                        {saving ? 'جاري الحفظ...' : 'حفظ'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductEditModal;
