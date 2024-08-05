import { Layer, Order } from "effect";
import { FilterImpl } from "~/adapters/search/filter.service";
import { safeInt } from "~/adapters/utils";
import { PaginationService } from "~/layers/search/pagination";

export const DEFAULT_PAGINATION_LIMIT = 25;

function Pagination(
  data?: { limit: number; page: number } | Record<string, unknown>,
) {
  const clamp = Order.clamp(Order.number);
  const pageSize = clamp(safeInt(data?.limit), {
    minimum: DEFAULT_PAGINATION_LIMIT,
    maximum: 100,
  });
  const page_count = clamp(safeInt(data?.page, 0), {
    minimum: 1,
    maximum: Number.POSITIVE_INFINITY,
  });

  return {
    get query() {
      return {
        pageSize,
        pageNumber: page_count - 1,
      };
    },
    get meta() {
      return {
        currentPage: page_count,
        perPage: pageSize,
        total: undefined,
      };
    },
  };
}

export const PaginationImpl = (query?: Record<string, unknown>) =>
  Layer.succeed(PaginationService, Pagination(query));

export function SearchServiceLive(query: Record<string, unknown>) {
  return Layer.merge(PaginationImpl(query), FilterImpl(query));
}
