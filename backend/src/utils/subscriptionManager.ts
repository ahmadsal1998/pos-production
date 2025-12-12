import Store from '../models/Store';

/**
 * Checks if a store's subscription has expired and deactivates it if needed
 * @param storeId - The store ID to check
 * @returns Object with isActive status and subscription info
 */
export async function checkAndUpdateStoreSubscription(storeId: string): Promise<{
  isActive: boolean;
  subscriptionEndDate: Date;
  subscriptionExpired: boolean;
}> {
  const store = await Store.findOne({ storeId: storeId.toLowerCase() });

  if (!store) {
    throw new Error('Store not found');
  }

  const now = new Date();
  const isExpired = store.subscriptionEndDate < now;
  const wasActive = store.isActive;

  // If subscription expired and store is still active, deactivate it
  if (isExpired && wasActive) {
    store.isActive = false;
    await store.save();
    console.log(`⚠️ Store ${storeId} subscription expired and has been deactivated`);
  }

  // If subscription is valid and store is inactive, keep it inactive (manual reactivation required)
  // This allows admins to manually reactivate stores after renewal

  return {
    isActive: store.isActive,
    subscriptionEndDate: store.subscriptionEndDate,
    subscriptionExpired: isExpired,
  };
}

/**
 * Checks all stores and deactivates expired subscriptions
 * This can be called periodically (e.g., via cron job)
 */
export async function checkAllExpiredSubscriptions(): Promise<number> {
  const now = new Date();
  const expiredStores = await Store.find({
    subscriptionEndDate: { $lt: now },
    isActive: true,
  });

  if (expiredStores.length > 0) {
    await Store.updateMany(
      {
        subscriptionEndDate: { $lt: now },
        isActive: true,
      },
      {
        $set: { isActive: false },
      }
    );

    console.log(`⚠️ Deactivated ${expiredStores.length} expired store subscriptions`);
  }

  return expiredStores.length;
}

/**
 * Manually reactivate a store (for renewal)
 * @param storeId - The store ID to reactivate
 * @param newEndDate - Optional new subscription end date
 */
export async function reactivateStore(
  storeId: string,
  newEndDate?: Date
): Promise<void> {
  const store = await Store.findOne({ storeId: storeId.toLowerCase() });

  if (!store) {
    throw new Error('Store not found');
  }

  if (newEndDate) {
    store.subscriptionEndDate = newEndDate;
    store.subscriptionStartDate = new Date();
  }

  store.isActive = true;
  await store.save();
  console.log(`✅ Store ${storeId} has been reactivated`);
}

