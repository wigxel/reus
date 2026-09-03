import { Context, Layer } from "effect";
import { isEmpty } from "effect/String";

/** @deprecated use the collection filter instead **/
export class SearchFilter extends Context.Service<SearchFilter,
  { search: string }>()("SearchFilter") {}

export const FilterImpl = (query?: Record<string, unknown>) => {
  const search_str = (query?.search as string) ?? "";

  return Layer.succeed(SearchFilter, {
    search: isEmpty(search_str) ? "" : search_str,
  });
};
