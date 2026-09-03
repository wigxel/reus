import { Context } from "effect";
import type { FilterOrLogicOperator } from "./primitives";

export class CollectionFilters extends Context.Service<
  CollectionFilters,
  {
    filters: Array<FilterOrLogicOperator>;
  }
>()("CollectionFilters") {}
