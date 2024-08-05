import { Context } from "effect";
import type { FilterOrLogicOperator } from "~/layers/search/primitives";

export class CollectionFilters extends Context.Tag("CollectionFilters")<
  CollectionFilters,
  {
    filters: Array<FilterOrLogicOperator>;
  }
>() {}
