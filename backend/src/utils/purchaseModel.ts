import { Model } from 'mongoose';
import Purchase, { IPurchase } from '../models/Purchase';
import { getModelForStore } from './trialAccountModels';

export async function getPurchaseModelForStore(
  storeId: string | null | undefined
): Promise<Model<IPurchase>> {
  if (!storeId) {
    throw new Error('Store ID is required to access purchases');
  }
  return getModelForStore<IPurchase>(Purchase, 'purchases', storeId);
}

export type { IPurchase, IPurchaseItem } from '../models/Purchase';
