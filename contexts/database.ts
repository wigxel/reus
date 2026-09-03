import { Effect } from "effect";
import type { ConfigError } from "effect/Config";
import { TaggedError } from "effect/Data";

/**
 * The type ID for the Database service.
 *
 * Usage:
 * ```ts
 * class A extends Context.Service<A, Interface>()(DatabaseConnectionTypeId) {}
 * ```
 **/
export const DatabaseConnectionTypeId = "DatabaseConnection";

export interface DatabaseResourceInterface<TClient> {
  readonly client: TClient;
  readonly close: () => Promise<void>;
}

/**
 * A Scoped Database Resource.
 * It connects to the Database before the effect runs
 * and automatically closed when the effect ends
 **/
export class DatabaseScope extends TaggedError("DatabaseResourceError") {
  constructor(public error: unknown) {
    super();
  }

  toString() {
    return `DatabaseResourceError: ${String(this.error)}`;
  }
}

export function createDatabaseResource<TClient>() {
  return <T extends DatabaseResourceInterface<TClient>, E extends ConfigError, R>(
    effect: Effect.Effect<T, E, R>,
  ) => {
    const acquire = Effect.gen(function* () {
      yield* Effect.logDebug("[Database] connected ✅");
      return yield* effect;
    }).pipe(
      Effect.mapError((error) => {
        if (error._tag === "ConfigError") return error;

        return new DatabaseScope(error);
      }),
    );

    const release = (res: DatabaseResourceInterface<TClient>) => {
      return Effect.promise(() => res.close()).pipe(
        Effect.tap(() => Effect.logDebug("[Database] connection closed 🚫")),
        Effect.tapError((err: unknown) =>
          Effect.logDebug(`[Database] Error closing connection ❌. Reason: ${String(err)}`),
        ),
      );
    };

    return Effect.acquireRelease(acquire, release);
  };
}

export class QueryError extends TaggedError("QueryError") {
  constructor(
    public message: string,
    public error?: Error,
  ) {
    super();
  }

  toString() {
    return this.message;
  }
}
