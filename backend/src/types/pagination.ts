/**
 * Standard pagination shape for list APIs.
 * Use across products, users, customers, sales for consistent responses.
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;
export const MAX_PAGE_SIZE_LIGHT = 500; // For "light" list endpoints (e.g. customer dropdowns)

export function parsePaginationQuery(query: {
  page?: string;
  limit?: string;
}, maxLimit: number = MAX_PAGE_SIZE): { page: number; limit: number; skip: number } {
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit as string, 10) || DEFAULT_PAGE_SIZE));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
