import { safeInt } from "@repo/shared/src/data.helpers";
import { Context, Layer, Order } from "effect";
import type { PaginationQuery } from "~/types/types";

export const DEFAULT_PAGINATION_LIMIT = 25;

export function Pagination(
  data?: { limit: number; page: number } | Record<string, unknown>,
) {
  const pageSize = Order.clamp(Order.number)(
    safeInt(data?.limit, DEFAULT_PAGINATION_LIMIT),
    { minimum: 1, maximum: Number.POSITIVE_INFINITY },
  );
  const page_count = Order.clamp(Order.number)(safeInt(data?.page, 0), {
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

export class PaginationService extends Context.Tag("PaginationService")<
  PaginationService,
  ReturnType<typeof Pagination>
>() {}

export const PaginationImpl = (query?: Record<string, unknown>) =>
  Layer.succeed(PaginationService, Pagination(query));
