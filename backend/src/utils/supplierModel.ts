import { Model } from 'mongoose';
import Supplier, { SupplierDocument } from '../models/Supplier';
import { getModelForStore } from './trialAccountModels';

export async function getSupplierModelForStore(
  storeId: string | null | undefined
): Promise<Model<SupplierDocument>> {
  if (!storeId) {
    throw new Error('Store ID is required to access suppliers');
  }
  return getModelForStore<SupplierDocument>(Supplier, 'suppliers', storeId);
}

export type { SupplierDocument } from '../models/Supplier';
