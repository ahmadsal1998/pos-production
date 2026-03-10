import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import Store from '../models/Store';
import * as salesReportsService from '../services/salesReports.service';

function getStoreId(req: AuthenticatedRequest): string | null {
  const userStoreId = req.user?.storeId || null;
  const userRole = req.user?.role || null;
  const queryStoreId = req.query.storeId as string | undefined;
  if (userRole === 'Admin' && queryStoreId) return queryStoreId.toLowerCase().trim();
  return userStoreId ? userStoreId.toLowerCase().trim() : null;
}

async function resolveStoreId(req: AuthenticatedRequest): Promise<string> {
  const storeId = getStoreId(req);
  if (storeId) return storeId;
  const first = await Store.findOne().lean();
  if (!first) throw new Error('No stores available');
  return first.storeId;
}

const parseFilters = (req: AuthenticatedRequest): salesReportsService.ReportFilters => ({
  startDate: (req.query.startDate as string) || undefined,
  endDate: (req.query.endDate as string) || undefined,
  productId: (req.query.productId as string) || undefined,
  customerId: (req.query.customerId as string) || undefined,
  categoryId: (req.query.categoryId as string) || undefined,
  userId: (req.query.userId as string) || undefined,
  period: (req.query.period as salesReportsService.ReportPeriod) || undefined,
});

export const getSalesByPeriod = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = await resolveStoreId(req);
  const filters = parseFilters(req);
  const data = await salesReportsService.getSalesByPeriod(storeId, filters);
  res.json({ success: true, data });
});

export const getSalesByProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = await resolveStoreId(req);
  const data = await salesReportsService.getSalesByProduct(storeId, parseFilters(req));
  res.json({ success: true, data });
});

export const getSalesByCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = await resolveStoreId(req);
  const data = await salesReportsService.getSalesByCategory(storeId, parseFilters(req));
  res.json({ success: true, data });
});

export const getSalesByPaymentMethod = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = await resolveStoreId(req);
  const data = await salesReportsService.getSalesByPaymentMethod(storeId, parseFilters(req));
  res.json({ success: true, data });
});

export const getSalesByUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = await resolveStoreId(req);
  const data = await salesReportsService.getSalesByUser(storeId, parseFilters(req));
  res.json({ success: true, data });
});

export const getProfitByPeriod = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = await resolveStoreId(req);
  const data = await salesReportsService.getProfitByPeriod(storeId, parseFilters(req));
  res.json({ success: true, data });
});

export const getProfitByProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = await resolveStoreId(req);
  const data = await salesReportsService.getProfitByProduct(storeId, parseFilters(req));
  res.json({ success: true, data });
});

export const getTopCustomers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = await resolveStoreId(req);
  const data = await salesReportsService.getTopCustomers(storeId, parseFilters(req));
  res.json({ success: true, data });
});

export const getCustomerDebtReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = await resolveStoreId(req);
  const data = await salesReportsService.getCustomerDebtReport(storeId, parseFilters(req));
  res.json({ success: true, data });
});

export const getCustomerStatement = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = await resolveStoreId(req);
  const customerId = req.query.customerId as string;
  if (!customerId) return res.status(400).json({ success: false, message: 'customerId is required' });
  const data = await salesReportsService.getCustomerStatement(storeId, customerId, parseFilters(req));
  res.json({ success: true, data });
});

export const getBestSellingProducts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = await resolveStoreId(req);
  const data = await salesReportsService.getBestSellingProducts(storeId, parseFilters(req));
  res.json({ success: true, data });
});

export const getLeastSellingProducts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = await resolveStoreId(req);
  const data = await salesReportsService.getLeastSellingProducts(storeId, parseFilters(req));
  res.json({ success: true, data });
});

export const getProductsNotSold = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = await resolveStoreId(req);
  const data = await salesReportsService.getProductsNotSold(storeId, parseFilters(req));
  res.json({ success: true, data });
});

export const getCurrentStockReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = await resolveStoreId(req);
  const data = await salesReportsService.getCurrentStockReport(storeId, parseFilters(req));
  res.json({ success: true, data });
});

export const getLowStockReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = await resolveStoreId(req);
  const data = await salesReportsService.getLowStockReport(storeId, parseFilters(req));
  res.json({ success: true, data });
});

export const getStockMovementReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = await resolveStoreId(req);
  const data = await salesReportsService.getStockMovementReport(storeId, parseFilters(req));
  res.json({ success: true, data });
});

export const getDailyCashReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = await resolveStoreId(req);
  const data = await salesReportsService.getDailyCashReport(storeId, parseFilters(req));
  res.json({ success: true, data });
});

export const getDiscountReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = await resolveStoreId(req);
  const data = await salesReportsService.getDiscountReport(storeId, parseFilters(req));
  res.json({ success: true, data });
});

export const getReturnsReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = await resolveStoreId(req);
  const data = await salesReportsService.getReturnsReport(storeId, parseFilters(req));
  res.json({ success: true, data });
});
