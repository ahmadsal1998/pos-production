/** Generic account summary for both customer and supplier accounts */
export interface AccountSummary {
  entityId: string;
  entityName: string;
  address?: string;
  totalDebt: number;
  totalPaid: number;
  balance: number;
  lastPaymentDate: string | null;
}

/** Minimal entity shape for list display (customer or supplier) */
export interface AccountEntity {
  id: string;
  name: string;
  phone?: string;
  address?: string;
}

/** Labels for the accounts module (customer vs supplier) */
export interface AccountsLabels {
  searchPlaceholder: string;
  addNewEntity: string;
  entityName: string;
  statementTitle: string;
  totalDebt: string;
  totalPayments: string;
  balance: string;
  lastPayment: string;
  actions: string;
  addPayment: string;
  allFilter: string;
  debtorFilter: string;
  creditorFilter: string;
  totalCount: string;
  totalDueAmount: string;
  countWithDebt: string;
  receiptVoucherCount: string;
  receiptVoucherTotal: string;
  noResults: string;
  noEntities: string;
  noResultsHint: string;
  noEntitiesHint: string;
  confirmDeleteMessage: string;
  deleteSuccess: string;
  deleteFailed: string;
  updateFailed: string;
  onlyPaymentTransactionsEditable: string;
  selectTransactionToEditOrDelete: string;
  editTransaction: string;
  deleteTransaction: string;
  confirmDeletePaymentTitle: string;
  confirmDeletePaymentMessage: string;
  printReceipt: string;
  printSummaryOnly: string;
}
