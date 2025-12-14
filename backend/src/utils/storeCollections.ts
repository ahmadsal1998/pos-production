/**
 * @deprecated This file is deprecated. All collections now use unified collections with storeId.
 * 
 * This file is kept for backward compatibility but all functions are no-ops or return empty results.
 * All models now use unified collections:
 * - Product, Customer, Category, Brand, Unit, Sale, Warehouse all use unified collections with storeId
 * - Collections are created automatically by Mongoose when first document is inserted
 * 
 * DO NOT USE THESE FUNCTIONS FOR NEW CODE.
 * Use the unified models directly from ../models/
 */

import mongoose, { Connection } from 'mongoose';
import { getDatabaseConnection, getDatabaseName } from './databaseManager';

/**
 * @deprecated No longer needed - collections are unified with storeId
 */
export function getStoreCollectionName(prefix: string, collectionType: string): string {
  console.warn('⚠️ getStoreCollectionName is deprecated. Use unified collections with storeId instead.');
  return `${prefix.toLowerCase()}_${collectionType}`;
}

/**
 * @deprecated No longer needed - use unified models directly
 */
export async function getStoreModel<T extends mongoose.Document>(
  prefix: string,
  collectionType: string,
  schema: mongoose.Schema,
  databaseId: number
): Promise<mongoose.Model<T>> {
  console.warn('⚠️ getStoreModel is deprecated. Use unified models directly from ../models/');
  throw new Error('getStoreModel is deprecated. Use unified models with storeId instead.');
}

/**
 * Get the database instance for a specific database
 * @param databaseId - Database ID (1-5)
 * @returns MongoDB database instance
 */
export async function getDatabase(databaseId: number) {
  const connection = await getDatabaseConnection(databaseId);
  return connection.db;
}

/**
 * @deprecated No longer needed - collections are unified with storeId
 */
export async function collectionExists(
  prefix: string,
  collectionType: string,
  databaseId: number
): Promise<boolean> {
  console.warn('⚠️ collectionExists is deprecated. Collections are now unified with storeId.');
  return false;
}

/**
 * @deprecated No longer needed - collections are created automatically by Mongoose
 */
export async function ensureCollectionExists(
  prefix: string,
  collectionType: string,
  databaseId: number
): Promise<void> {
  console.warn('⚠️ ensureCollectionExists is deprecated. Collections are created automatically by Mongoose.');
  // No-op - collections are created automatically
}

/**
 * @deprecated No longer needed - collections are unified with storeId and created automatically
 */
export async function createStoreCollections(
  prefix: string,
  databaseId: number,
  storeId?: string
): Promise<void> {
  console.warn('⚠️ createStoreCollections is deprecated. All collections are now unified with storeId and created automatically by Mongoose.');
  // No-op - collections are created automatically when first document is inserted
}

