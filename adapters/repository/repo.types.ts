import type { PgTableWithColumns } from "drizzle-orm/pg-core";
import type { TableConfig } from "drizzle-orm/table";
import { Effect } from "effect";
import { head, isArray } from "effect/Array";
import { isNullish, isNumber, isObject, isString } from "effect/Predicate";
import { SearchOps } from "~/adapters/search/sql-search-resolver";
import { QueryError } from "~/contexts/database";
import type {
  FilterOrLogicOperator,
  FilterQuery,
  PaginationQuery,
} from "~/contexts/search/primitives";
import {
  countWhere,
  queryFiltersToWhere,
  runDrizzleQuery,
} from "~/libs/query.helpers";

// legacy compat for adapters/search/index.ts, keep until callers migrate to RepoModel
export interface Countable {
  count(attributes?: Record<string, unknown>): Effect.Effect<number, any, any>;
}

export interface LegacySearchableRepo<TSearch = unknown> extends Countable {
  searchByQuery: (
    params: Partial<PaginationQuery & FilterQuery>,
  ) => Effect.Effect<TSearch, any, any>;
}

export interface SearchableParams extends PaginationQuery {
  where: FilterOrLogicOperator | Array<FilterOrLogicOperator>;
}

export type RepoModelIdType = string | number;

export interface RepoModel {
  count(
    params?: SearchableParams["where"],
  ): Effect.Effect<unknown, unknown, unknown>;

  create: (payload: unknown) => Effect.Effect<unknown, unknown, unknown>;

  /**
   * ```ts
   *  Model.find(1)
   *  Model.find([1,2,4])
   * ```
   */
  find(
    field: FindArg1,
    value?: FindArg2,
  ): Effect.Effect<unknown, unknown, unknown>;

  /**
   * ```ts
   *  Model.firstOrThrow(1)
   *  Model.findOrThrow({ name: "john" })
   *  Model.findOrThrow(SearchOps.eq('name', 'Johns'))
   * ```
   * @param id
   */
  firstOrThrow(
    id: RepoModelIdType | SearchableParams["where"],
  ): Effect.Effect<unknown, unknown, unknown>;

  all: (
    params: Partial<SearchableParams>,
  ) => Effect.Effect<unknown, unknown, unknown>;

  update(
    params: SearchableParams | RepoModelIdType,
    data: unknown,
  ): Effect.Effect<unknown, unknown, unknown>;

  delete: (
    params: SearchableParams["where"],
  ) => Effect.Effect<unknown, unknown, unknown>;
}

export function createRepoHelpers<T extends TableConfig>(
  table: PgTableWithColumns<T>,
) {
  type RepoAttributes = {
    columns: keyof T["columns"];
  };

  function resolveIdOrSearchParams<TRepoAttributes extends RepoAttributes>() {
    return function resolveSearchParams(
      searchableColumns: TRepoAttributes["columns"][],
      params: SearchableParams | RepoModelIdType,
    ) {
      if (typeof params === "number" || typeof params === "string") {
        return SearchOps.or(
          ...searchableColumns.map((column) =>
            SearchOps.eq(String(column), params),
          ),
        );
      }

      if (params.constructor.name === "Object") return params.where;

      throw new Error("Invalid `params` provided to resolveSearchParams");
    };
  }

  function toWhere(params: FilterOrLogicOperator | FilterOrLogicOperator[]) {
    return queryFiltersToWhere(table, params);
  }

  function find(
    primaryColumn: RepoAttributes["columns"],
    arg1: FindArg1,
    arg2?: FindArg2,
  ) {
    function resolveQuery(): FilterOrLogicOperator[] {
      if (!isNullish(arg1) && !isNullish(arg2)) {
        return [SearchOps.eq(String(arg1), arg2)];
      }

      if (isString(arg1) || isNumber(arg1)) {
        return [SearchOps.eq(String(primaryColumn), arg1)];
      }

      if (isArray(arg1)) {
        return [SearchOps.in(String(primaryColumn), arg1)];
      }

      if (isObject(arg1)) {
        return Object.keys(arg1).map((key) => SearchOps.eq(key, (arg1 as Record<string, unknown>)[key]));
      }

      return [];
    }

    return runDrizzleQuery((db: any) => {
      return db
        .select()
        .from(table)
        .where(queryFiltersToWhere(table, resolveQuery()));
    });
  }

  function firstOrThrow(
    primaryColumn: RepoAttributes["columns"],
    arg1: RepoModelIdType | SearchableParams["where"],
    arg2?: string,
  ) {
    if (Array.isArray(arg1)) {
      return Effect.fail(
        new QueryError(`Model.firstOrThrow() argument mustn't be an Array`),
      );
    }

    // ponytail: head returns Option, cast to Effect pipeline until repo types are concrete
    return find(primaryColumn, arg1, arg2).pipe(Effect.flatMap(head as any));
  }

  function deleteModel(
    where: Array<FilterOrLogicOperator> | FilterOrLogicOperator,
  ) {
    return runDrizzleQuery((db: any) => {
      return db.delete(table).where(queryFiltersToWhere(table, where));
    });
  }

  function findAll(params: Partial<SearchableParams>) {
    return runDrizzleQuery((db: any) => {
      return db
        .select()
        .from(table)
        .where(queryFiltersToWhere(table, params?.where as any))
        .limit(params?.pageSize)
        .offset(params?.pageNumber);
    });
  }

  function create(
    data: typeof table.$inferInsert | Array<typeof table.$inferInsert>,
  ) {
    return runDrizzleQuery((client: any) => {
      return (
        client
          .insert(table)
          .values(Array.isArray(data) ? data : [data])
          .returning()
      );
    });
  }

  function count(where?: SearchableParams["where"]) {
    return countWhere(table, SearchOps.reduce(where as any));
  }

  return {
    columnsEq: resolveIdOrSearchParams<RepoAttributes>(),
    toWhere: toWhere,
    find: find,
    firstOrThrow: firstOrThrow,
    delete: deleteModel,
    all: findAll,
    create: create,
    count,
  };
}

export type FindArg1 =
  | RepoModelIdType
  | Array<RepoModelIdType>
  | Record<string, unknown>
  | SearchableParams["where"];

export type FindArg2 = string | never;
