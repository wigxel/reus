import { Effect } from "effect";
import type { InferResult } from "~/adapters/effect.util";
import type { RepoModel } from "~/adapters/repository/repo.types";

import { PaginationService } from "~/layers/search/pagination";
import type {
  FilterOrLogicOperator,
  FilterQuery,
  PaginationQuery,
} from "~/layers/search/primitives";

export function searchRepo<TRepo extends RepoModel, A, E, R>(
  repo: TRepo,
  getWhereParams: (params: Partial<PaginationQuery & FilterQuery>) => {
    where: FilterOrLogicOperator | FilterOrLogicOperator[];
  },
) {
  type ResolvedValue = InferResult<TRepo["find"]>;

  return Effect.gen(function* (_) {
    const pagination = yield* _(PaginationService);

    yield* Effect.logDebug(
      `searchByQuery:: Cursor(${pagination.query.pageNumber}), Limit(${pagination.query.pageSize})`,
    );

    const params = {
      ...getWhereParams(pagination.query),
      ...pagination.query,
    };

    const [total, data] = yield* _(
      Effect.all([repo.count(params.where), repo.all(params)]),
    );

    return {
      data: data as ResolvedValue,
      meta: {
        ...pagination.meta,
        total,
      },
    };
  });
}
