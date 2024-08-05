import { Effect, Layer, pipe } from "effect";
import { lensPath, set } from "ramda";
import { safeObj } from "~/adapters/utils";
import { CollectionFilters } from "~/layers/search/collection";
import type { FilterOrLogicOperator } from "~/layers/search/primitives";

export const CollectionFilter = (payload: string) => {
  const parseFilters = pipe(
    Effect.logDebug(`CollectionFilter/Input: ${payload}`),
    Effect.flatMap(() => Effect.try(() => JSON.parse(payload))),
    Effect.map(parse),
    Effect.matchEffect({
      onFailure: () => Effect.succeed([]),
      onSuccess: (v) => Effect.succeed(v),
    }),
    Effect.tap((filters) =>
      Effect.logDebug(
        "CollectionFilter/Output: ",
        JSON.stringify(filters, undefined, 2),
      ),
    ),
    Effect.map((filters) => ({ filters })),
  );

  return Layer.effect(CollectionFilters, parseFilters);
};

export function parse(payload: unknown): Array<FilterOrLogicOperator> {
  if (payload?.constructor.name === "Object") {
    const some_data = safeObj(payload);
    return parseObject(some_data);
  }

  return [];

  function parseObject(
    object: Record<string, unknown>,
  ): Array<FilterOrLogicOperator> {
    const records = [];

    for (const field in object) {
      const value = safeObj(object[field]);

      if (field === "$or") {
        records.push({
          kind: "LOGIC",
          logic: "OR",
          filters: parseObject(value),
        } satisfies FilterOrLogicOperator);
        continue;
      }

      if (field === "$and") {
        records.push({
          kind: "LOGIC",
          logic: "AND",
          filters: parseObject(value),
        } satisfies FilterOrLogicOperator);
        continue;
      }

      records.push(mapFieldOperation(field, value));
    }

    return records;

    function resolveOperation(key: string, values: unknown) {
      const value = safeObj(values)[key];

      if (key === "eq") return { operation: "eq", value: value } as const;
      if (key === "neq") return { operation: "neq", value: value } as const;

      if (key === "ilike")
        return { operation: "ilike", value: `%${value}%` } as const;
      if (key === "like")
        return { operation: "like", value: `%${value}%` } as const;

      if (key === "lt") return { operation: "lt", value: value } as const;
      if (key === "gt") return { operation: "gt", value: value } as const;
      if (key === "gte") return { operation: "gte", value: value } as const;
      if (key === "lte") return { operation: "lte", value: value } as const;

      if (key === "in") return { operation: "in", value: value } as const;
      if (key === "not") return { operation: "not", value: value } as const;

      return { operation: "none" } as const;
    }

    function mapFieldOperation(
      field_name: string,
      value: unknown,
    ): FilterOrLogicOperator {
      if (value?.constructor?.name !== "Object") {
        return {
          kind: "FILTER",
          field: field_name,
          operation: "eq",
          value: value,
        };
      }

      const filters: Array<FilterOrLogicOperator> = [];

      for (const key in value) {
        const { operation, value: newValue } = resolveOperation(
          key.trim(),
          value,
        );

        if (operation === "none") continue;

        filters.push({
          kind: "FILTER",
          field: field_name,
          operation: operation,
          value: newValue,
        } satisfies FilterOrLogicOperator);
      }

      return {
        kind: "LOGIC",
        logic: "AND",
        filters: filters,
      };
    }
  }
}

/** TODO: FORMAT DOESN'T WORK FOR $OR OR $AND GROUPS **/
export function format(filters: Array<FilterOrLogicOperator>) {
  function reduce(filters: Array<FilterOrLogicOperator>) {
    const ops = [];
    for (const filter of filters) {
      if (filter.kind !== "FILTER") continue;
      ops.push(set(lensPath([filter.field, filter.operation]), filter.value));
    }
    // @ts-expect-error
    return pipe({}, ...ops);
  }

  return reduce(
    filters.flatMap((e) => {
      if (e.kind === "LOGIC") return e.filters;
      return [e];
    }),
  );
}
