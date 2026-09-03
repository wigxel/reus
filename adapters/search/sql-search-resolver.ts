import type {
  Filter,
  FilterOrLogicOperator,
  LogicOperator,
  Operation,
} from "~/layers/search/primitives";
import { safeObj } from "../utils";

export interface WhereOperationResolver<T, TField> {
  eq: (field: TField, value: unknown) => T | undefined;
  neq: (field: TField, value: unknown) => T | undefined;
  gt: (field: TField, value: unknown) => T | undefined;
  lt: (field: TField, value: unknown) => T | undefined;
  gte: (field: TField, value: unknown) => T | undefined;
  lte: (field: TField, value: unknown) => T | undefined;
  like: (field: TField, value: unknown) => T | undefined;
  ilike: (field: TField, value: unknown) => T | undefined;
  in: (field: TField, value: Array<string>) => T | undefined;
  notIn: (field: TField, value: Array<string>) => T | undefined;
  or: (fields: Array<T>) => T | undefined;
  and: (fields: Array<T>) => T | undefined;
  isNull: (field: TField) => T | undefined;
  notNull: (field: TField) => T | undefined;
}

interface WhereHelpers<T, B> {
  getField: (field: string) => B;
  empty: () => T;
}

// TODO: write or generate test case
export function buildWhereQueryFilterResolver<T, B>(
  resolvers: WhereHelpers<T, B>,
  op: WhereOperationResolver<T, NonNullable<B>>,
) {
  function processFilters(filters: Array<FilterOrLogicOperator>): Array<T | undefined> {
    try {
      return filters.map((filter) => {
        if (!filter) return resolvers.empty();
        if (filter?.kind === "NONE") return resolvers.empty();

        if (SearchPredicate.isLogic(filter)) {
          const nestedFilters = processFilters(filter.filters).filter(
            (x): x is T => x !== undefined,
          );
          if (filter.logic === "AND") return op.and(nestedFilters);
          if (filter.logic === "OR") return op.or(nestedFilters);
          return resolvers.empty();
        }

        const { field: field_, operation, value } = filter;
        const field = resolvers.getField(field_);

        if (!field) return resolvers.empty();

        switch (operation) {
          case "notNull":
            return op.notNull(field);
          case "isNull":
            return op.isNull(field);
          case "eq":
            return op.eq(field, value);
          case "neq":
            return op.neq(field, value);
          case "gt":
            return op.gt(field, value);
          case "lt":
            return op.lt(field, value);
          case "gte":
            return op.gte(field, value);
          case "lte":
            return op.lte(field, value);
          case "like":
            return op.like(field, value);
          case "ilike":
            return op.ilike(field, value);
          case "in":
            return op.in(field, value as string[]);
          case "not":
            return op.notIn(field, value as string[]);
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }
      });
    } catch (err) {
      throw new Error("SearchResolverError: Generating WHERE query");
    }
  }

  return function transformFilters(filters: Array<FilterOrLogicOperator>) {
    return processFilters(filters).filter((x): x is T => x !== undefined);
  };
}

const handleOperation =
  <TValue>(operation: Operation) =>
    (field: string, value: TValue): FilterOrLogicOperator => {
      return { kind: "FILTER", field, operation, value };
    };

export const SearchOps = {
  eq: handleOperation("eq"),
  neq: handleOperation("neq"),
  gt: handleOperation("gt"),
  lt: handleOperation("lt"),
  gte: handleOperation("gte"),
  lte: handleOperation("lte"),
  like: handleOperation("like"),
  ilike: handleOperation("ilike"),
  isNull: (field: string): FilterOrLogicOperator => {
    return { kind: "FILTER", field, operation: "isNull", value: undefined };
  },
  notNull: (field: string): FilterOrLogicOperator => {
    return { kind: "FILTER", field, operation: "notNull", value: undefined };
  },
  in: handleOperation<Array<unknown>>("in"),
  not: handleOperation<Array<unknown>>("not"),
  or: (...filters: FilterOrLogicOperator[]): FilterOrLogicOperator => {
    return { kind: "LOGIC" as const, logic: "OR" as const, filters };
  },
  and: (...filters: FilterOrLogicOperator[]): FilterOrLogicOperator => {
    return { kind: "LOGIC" as const, logic: "AND" as const, filters };
  },
  none(): FilterOrLogicOperator {
    return { kind: "NONE" };
  },
  reduce(
    a: FilterOrLogicOperator | FilterOrLogicOperator[],
  ): FilterOrLogicOperator[] {
    if (Array.isArray(a)) return a;
    return [a];
  },
};

const FilterLogicSet = new Set<string>(["FILTER", "LOGIC", "NONE", "RAW"]);

export const SearchPredicate = {
  isOperation: (v: unknown): v is LogicOperator | Filter =>
    FilterLogicSet.has(safeObj(v).kind as string),

  isLogic: (v: FilterOrLogicOperator): v is LogicOperator => v.kind === "LOGIC",

  isField: (v: FilterOrLogicOperator): v is Filter => v.kind === "FILTER",

  isRaw: (v: unknown): v is LogicOperator => safeObj(v).kind === "RAW",

  filterMatches: (fn: (v: Filter) => boolean) => (e: FilterOrLogicOperator) => {
    if (e.kind === "FILTER") return fn(e);

    return false;
  },

  fieldMatches: (field: string) =>
    SearchPredicate.filterMatches((e) => e.field === field),
};


export function objectToSearchOps(object: Record<string, string>) {
  return Object.entries(safeObj(object)).map(([column, newValue]) =>
    SearchOps.eq(column, newValue),
  );
}
