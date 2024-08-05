import { Context } from "effect";
import type { PaginationQuery } from "./primitives";

interface Pagination {
  query: PaginationQuery;
  meta: { currentPage: number; perPage: number; total: number | undefined };
}

export class PaginationService extends Context.Tag("Pagination")<
  PaginationService,
  Pagination
>() {}
