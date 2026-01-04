# Queue Refactoring Plan for finalizeSaleWithoutTerminal

## Current Structure
The function is ~600 lines with:
1. Validation and cart snapshot creation
2. Invoice number locking
3. Optimistic stock updates
4. Background stock update task
5. Background product sync
6. Background sale save task (starts at line ~4304)

## Refactoring Strategy

### Phase 1: Extract Sale Data Preparation
- Extract sale data preparation logic into a helper function
- This includes: points redemption, payment calculations, sale data formatting

### Phase 2: Integrate Queue Service
- Create IsolatedSaleContext with UUID before queueing
- Prepare sale data BEFORE queueing
- Enqueue sale instead of background processing
- Create new cart immediately after queueing
- Remove strict locking

### Phase 3: Update UI
- Show queue status
- Update button states based on queue status

## Key Changes

1. **Remove locking checks** (lines 3784-3794)
2. **Create isolated context** with UUID
3. **Prepare sale data early** (extract from background task)
4. **Enqueue sale** instead of background processing
5. **Create new cart immediately** after queueing (not after processing)
6. **Keep stock updates** as background task (they're already async)

