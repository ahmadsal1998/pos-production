# POS Sales Idempotency

## Overview

Sales are created in an idempotent way using a **client-generated sale ID** (`clientSaleId`). The same sale (same cart) must never result in more than one record in the database, even when:

- Finalization runs in the background and the user starts a new sale immediately
- Sync or retry sends the same sale again
- The user double-clicks or F1/Enter fires multiple times

## Architecture

1. **Frontend** generates a UUID per logical sale via `generateClientSaleId()` (or reuses the queue `saleId`).
2. **Frontend** sends `clientSaleId` in every `POST /api/sales` request for that sale.
3. **Backend** checks `(storeId, clientSaleId)` before creating; if a sale exists, it returns that sale instead of creating a new one.
4. **Queue and sync** always reuse the same `clientSaleId` for a given sale (no new UUID on retries or offline sync).

## Implementation Summary

| Layer | Behavior |
|-------|----------|
| **Frontend – new sale** | One `clientSaleId` per sale: from `prepareSaleData(..., saleId)` in queue path, or `generateClientSaleId()` for return / payment-confirmation paths. |
| **Frontend – submission lock** | Handlers set `isSubmittingInvoiceRef` true before calling `finalizeSaleWithoutTerminal`; ref prevents double-click/F1/Enter from starting a second finalization. |
| **Backend** | Unique sparse index `(storeId, clientSaleId)`; `createSale` returns existing sale when `clientSaleId` matches; on E11000 duplicate key for `clientSaleId`, returns existing sale (idempotent). |
| **Queue** | `saleRecord.id` and `saleRecord.clientSaleId` set from `saleData.clientSaleId \|\| context.saleId` so retries use the same ID. |
| **Sync** | Payload always sends `clientSaleId: sale.clientSaleId \|\| sale.id`; 409 retry reuses the same key. |
| **createSale (sync)** | When `clientSaleId` is set, record is keyed by it only (no merge by invoice number). |
| **ConstraintError** | Look up by `clientSaleId` first, then by invoice number; never generate a new `clientSaleId`. |
| **Single save path** | Only the queue saves the sale for normal flow; no duplicate background createSale. |

## Testing Checklist

- [ ] **Normal sale** – Complete a sale; confirm one sale in DB with correct items/totals.
- [ ] **Rapid consecutive sales** – Finalize sale 1, immediately start and finalize sale 2; confirm two distinct sales, no duplicate content.
- [ ] **Retries** – Simulate network failure then success; confirm only one sale for that cart (same `clientSaleId`).
- [ ] **Offline sync** – Go offline, complete a sale, come online; confirm it syncs once and no duplicate is created on backend.
- [ ] **Returns** – Create a return; confirm one return record; retry sync and confirm no duplicate return.
- [ ] **Payment confirmation** – Use payment confirmation flow; confirm one sale; retry and confirm no duplicate.
- [ ] **Double-click / F1** – Try to trigger finalize twice quickly; confirm submission lock prevents a second sale.

## Outcome

- No duplicate sales from background processing, retries, sync, or double-clicks.
- Safe offline sync and retries using the same `clientSaleId`.
- Frontend and backend remain idempotent for sale creation.
