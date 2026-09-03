import { Effect, Layer } from "effect";
import type { InferResult } from "~/adapters/effect.util";
import type { LegacySearchableRepo } from "~/adapters/repository/repo.types";
import { FilterImpl, SearchFilter } from "~/adapters/search/filter.service";
import { PaginationImpl } from "~/adapters/search/pagination.service";
import { PaginationService } from "~/layers/search/pagination";
import type { FilterQuery, PaginationQuery } from "~/layers/search/primitives";

interface QueryRepo extends LegacySearchableRepo {}

export function searchByQueryRepo<TRepo extends QueryRepo>(repo: TRepo) {
  return searchByRepoWhere(repo, () => ({ where: {} }));
}

export function searchByRepoWhere<TRepo extends QueryRepo, A, E, R>(
  repo: TRepo,
  getWhereParams: (params: Partial<PaginationQuery & FilterQuery>) => {
    where: Record<string, unknown>;
  },
) {
  type ResolvedValue = InferResult<TRepo["searchByQuery"]>;

  return Effect.gen(function* () {
    const filter = yield*(SearchFilter);
    const pagination = yield*(PaginationService);

    yield* Effect.logDebug(
      `searchByQuery:: Search(${filter.search}), Cursor(${pagination.query.pageNumber}), Limit(${pagination.query.pageSize})`,
    );

    const searchParams = {
      search: filter.search,
      ...pagination.query,
    };

    const where = {
      ...getWhereParams(searchParams),
      ...searchParams,
    };

    const [total, data] = yield* Effect.all([
      repo.count(where),
      repo.searchByQuery(where),
    ]);

    return {
      data: data as ResolvedValue,
      meta: {
        ...pagination.meta,
        total,
      },
    };
  });
}

export function SearchServiceLive(query: Record<string, unknown>) {
  return Layer.merge(PaginationImpl(query), FilterImpl(query));
}
