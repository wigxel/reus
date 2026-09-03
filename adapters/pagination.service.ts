import { Context, Layer, Order } from "effect";
import type { PaginationQuery } from "~/contexts/search/primitives";
// ponytail: shim for host-shared helper, inline fallback until @repo/shared is installed
const safeInt = (v: unknown, d: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

export const DEFAULT_PAGINATION_LIMIT = 25;

export function Pagination(
  data?: { limit: number; page: number } | Record<string, unknown>,
) {
  const pageSize = Order.clamp(Order.Number)(
    safeInt(data?.limit, DEFAULT_PAGINATION_LIMIT),
    { minimum: 1, maximum: Number.POSITIVE_INFINITY },
  );
  const page_count = Order.clamp(Order.Number)(safeInt(data?.page, 0), {
    minimum: 1,
    maximum: Number.POSITIVE_INFINITY,
  });

  return {
    get query(): PaginationQuery {
      return {
        pageSize,
        pageNumber: page_count - 1,
      };
    },
    get meta() {
      return {
        current_page: page_count,
        per_page: pageSize,
      };
    },
  };
}

export class PaginationService extends Context.Service<PaginationService,
  ReturnType<typeof Pagination>>()("PaginationService") {}

export const PaginationImpl = (query?: Record<string, unknown>) =>
  Layer.succeed(PaginationService, Pagination(query));
