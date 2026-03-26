import { useCallback, useMemo } from 'react';

/**
 * Quantity offer: `quantity` = bundle size, `offerPrice` = **total price for that bundle** (not per unit).
 * Example: 3 items for 18 → quantity: 3, offerPrice: 18.
 */
export type PosQuantityOffer = { quantity: number; offerPrice: number };

export type PosDateOffer = {
    offerPrice: number;
    startDate: string;
    endDate: string;
};

export type PosDynamicPricing = {
    quantityOffers?: PosQuantityOffer[];
    dateOffer?: PosDateOffer | null;
};

function endOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
}

function roundMoney(n: number): number {
    return Math.round(n * 100) / 100;
}

export type PosLinePricingResult = {
    /** Authoritative line total (before per-line discount on cart item). */
    lineTotal: number;
    /** For display: lineTotal / lineQuantity */
    effectiveUnitPrice: number;
};

/**
 * Full POS line pricing:
 *
 * 1) **Quantity offers** — `offerPrice` is the bundle total for `quantity` items. Pick the rule with the
 *    **largest** `quantity` such that `lineQuantity >= quantity`. Then:
 *    `lineTotal = floor(q / bundleSize) * offerPrice + (q % bundleSize) * baseUnitPrice`
 *
 * 2) Else **date offer** — `offerPrice` is **per unit** while the date range is active.
 *
 * 3) Else **base** unit price × quantity.
 */
export function resolvePosLinePricing(
    baseUnitPrice: number,
    lineQuantity: number,
    pricing: PosDynamicPricing | undefined | null,
    at: Date = new Date()
): PosLinePricingResult {
    const q = Number(lineQuantity);
    if (!Number.isFinite(baseUnitPrice) || baseUnitPrice < 0) {
        return { lineTotal: 0, effectiveUnitPrice: 0 };
    }
    if (!Number.isFinite(q) || q <= 0) {
        return { lineTotal: 0, effectiveUnitPrice: baseUnitPrice };
    }

    const offers = (pricing?.quantityOffers || []).filter(
        (r) =>
            r &&
            Number.isFinite(r.quantity) &&
            r.quantity > 0 &&
            Number.isFinite(r.offerPrice) &&
            r.offerPrice >= 0
    );

    if (offers.length > 0 && q > 0) {
        const sorted = [...offers].sort((a, b) => b.quantity - a.quantity);
        const rule = sorted.find((r) => q >= r.quantity);
        if (rule) {
            const bundleSize = rule.quantity;
            const bundleTotal = rule.offerPrice;
            const bundles = Math.floor(q / bundleSize);
            const remainder = q % bundleSize;
            const lineTotal = roundMoney(bundles * bundleTotal + remainder * baseUnitPrice);
            const effectiveUnitPrice = roundMoney(lineTotal / q);
            return { lineTotal, effectiveUnitPrice };
        }
    }

    let unitPrice = baseUnitPrice;
    const d = pricing?.dateOffer;
    if (
        d &&
        d.offerPrice >= 0 &&
        Number.isFinite(d.offerPrice) &&
        d.startDate &&
        d.endDate
    ) {
        const start = new Date(d.startDate);
        const end = endOfDay(new Date(d.endDate));
        if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && at >= start && at <= end) {
            unitPrice = d.offerPrice;
        }
    }

    const lineTotal = roundMoney(unitPrice * q);
    const effectiveUnitPrice = roundMoney(lineTotal / q);
    return { lineTotal, effectiveUnitPrice };
}

/**
 * @deprecated Use `resolvePosLinePricing` — kept for callers that only need a single effective unit price.
 * Returns effective unit price for the line (lineTotal / quantity).
 */
export function applyPosDynamicPricing(
    baseUnitPrice: number,
    lineQuantity: number,
    pricing: PosDynamicPricing | undefined | null,
    at: Date = new Date()
): number {
    return resolvePosLinePricing(baseUnitPrice, lineQuantity, pricing, at).effectiveUnitPrice;
}

export function normalizePosDynamicPricing(raw: unknown): PosDynamicPricing | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const o = raw as Record<string, unknown>;
    const quantityOffers = Array.isArray(o.quantityOffers)
        ? o.quantityOffers
              .map((row) => {
                  if (!row || typeof row !== 'object') return null;
                  const r = row as Record<string, unknown>;
                  const quantity = Number(r.quantity);
                  const offerPrice = Number(r.offerPrice);
                  if (!Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(offerPrice) || offerPrice < 0) {
                      return null;
                  }
                  return { quantity, offerPrice };
              })
              .filter(Boolean) as PosQuantityOffer[]
        : [];

    let dateOffer: PosDateOffer | null | undefined = undefined;
    if (o.dateOffer === null) {
        dateOffer = null;
    } else if (o.dateOffer && typeof o.dateOffer === 'object') {
        const d = o.dateOffer as Record<string, unknown>;
        const offerPrice = Number(d.offerPrice);
        const startDate = d.startDate != null ? String(d.startDate) : '';
        const endDate = d.endDate != null ? String(d.endDate) : '';
        if (Number.isFinite(offerPrice) && offerPrice >= 0 && startDate && endDate) {
            dateOffer = { offerPrice, startDate, endDate };
        }
    }

    const result: PosDynamicPricing = {};
    if (quantityOffers.length > 0) result.quantityOffers = quantityOffers;
    if (dateOffer !== undefined) result.dateOffer = dateOffer;
    return Object.keys(result).length > 0 ? result : undefined;
}

/** Stable callback wrapper for components that prefer a hook. */
export function usePosPricing() {
    const resolve = useCallback(
        (baseUnitPrice: number, lineQuantity: number, pricing: PosDynamicPricing | undefined | null, at?: Date) =>
            resolvePosLinePricing(baseUnitPrice, lineQuantity, pricing, at ?? new Date()),
        []
    );
    return useMemo(() => ({ resolvePosLinePricing: resolve }), [resolve]);
}
