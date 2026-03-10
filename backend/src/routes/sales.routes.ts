import { Router } from 'express';
import {
  createSale,
  createSimpleSale,
  getSales,
  getSalesSummary,
  getSale,
  updateSale,
  deleteSale,
  processReturn,
  getNextInvoiceNumber,
  getCurrentInvoiceNumber,
  getPublicInvoice,
} from '../controllers/sales.controller';
import {
  getSalesByPeriod,
  getSalesByProduct,
  getSalesByCategory,
  getSalesByPaymentMethod,
  getSalesByUser,
  getProfitByPeriod,
  getProfitByProduct,
  getTopCustomers,
  getCustomerDebtReport,
  getCustomerStatement,
  getBestSellingProducts,
  getLeastSellingProducts,
  getProductsNotSold,
  getCurrentStockReport,
  getLowStockReport,
  getStockMovementReport,
  getDailyCashReport,
  getDiscountReport,
  getReturnsReport,
} from '../controllers/salesReports.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireStoreAccess } from '../middleware/storeIsolation.middleware';

const router = Router();

// Public route (no authentication required) - must be before auth middleware
router.get('/public/invoice', getPublicInvoice);

// All other sales routes require authentication and store access
router.use(authenticate);
router.use(requireStoreAccess);

// Report routes (must be before /:id)
router.get('/reports/sales-by-period', getSalesByPeriod);
router.get('/reports/sales-by-product', getSalesByProduct);
router.get('/reports/sales-by-category', getSalesByCategory);
router.get('/reports/sales-by-payment-method', getSalesByPaymentMethod);
router.get('/reports/sales-by-user', getSalesByUser);
router.get('/reports/profit-by-period', getProfitByPeriod);
router.get('/reports/profit-by-product', getProfitByProduct);
router.get('/reports/top-customers', getTopCustomers);
router.get('/reports/customer-debt', getCustomerDebtReport);
router.get('/reports/customer-statement', getCustomerStatement);
router.get('/reports/best-selling-products', getBestSellingProducts);
router.get('/reports/least-selling-products', getLeastSellingProducts);
router.get('/reports/products-not-sold', getProductsNotSold);
router.get('/reports/current-stock', getCurrentStockReport);
router.get('/reports/low-stock', getLowStockReport);
router.get('/reports/stock-movement', getStockMovementReport);
router.get('/reports/daily-cash', getDailyCashReport);
router.get('/reports/discounts', getDiscountReport);
router.get('/reports/returns', getReturnsReport);

router.get('/current-invoice-number', getCurrentInvoiceNumber);
router.get('/next-invoice-number', getNextInvoiceNumber);
router.post('/simple', createSimpleSale); // Simplified sale for "Other" store type
router.post('/', createSale);
router.post('/return', processReturn);
router.get('/summary', getSalesSummary);
router.get('/', getSales);
router.get('/:id', getSale);
router.put('/:id', updateSale);
router.delete('/:id', deleteSale);

export default router;
