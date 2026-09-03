import { Context } from "effect";
import type { FilterOrLogicOperator } from "~/layers/search/primitives";

export class CollectionFilters extends Context.Service<CollectionFilters,
  {
    filters: Array<FilterOrLogicOperator>;
  }>()("CollectionFilters") {}
