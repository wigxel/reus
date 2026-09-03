import { Effect } from "effect";
import type { InferResult } from "../effect.util";
import type { RepoModel } from "./repo.types";

import { PaginationService } from "../../contexts/search/pagination";
import type {
  FilterOrLogicOperator,
  FilterQuery,
  PaginationQuery,
} from "../../contexts/search/primitives";

export function searchRepo<TRepo extends RepoModel, A, E, R>(
  repo: TRepo,
  getWhereParams: (params: Partial<PaginationQuery & FilterQuery>) => {
    where: FilterOrLogicOperator | FilterOrLogicOperator[];
  },
) {
  type ResolvedValue = InferResult<TRepo["find"]>;

  return Effect.gen(function* () {
    const pagination = yield* PaginationService;

    yield* Effect.logDebug(
      `searchByQuery:: Cursor(${pagination.query.pageNumber}), Limit(${pagination.query.pageSize})`,
    );

    const params = {
      ...getWhereParams(pagination.query),
      ...pagination.query,
    };

    const [total, data] = yield* Effect.all([
      repo.count(params.where),
      repo.all(params),
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
