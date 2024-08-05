import { type ConfigError, Effect } from "effect";
import { TaggedError } from "effect/Data";

/**
 * The type ID for the Database service.
 *
 * Usage:
 * ```ts
 * class A extends Context.Tag(DatabaseConnectionTypeId)(A, Interface) {}
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
  return <
    T extends DatabaseResourceInterface<TClient>,
    E extends ConfigError.ConfigError,
    R,
  >(
    effect: Effect.Effect<T, E, R>,
  ) => {
    const acquire = Effect.gen(function* (_) {
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
        Effect.tapBoth({
          onSuccess: () => {
            return Effect.logDebug("[Database] connection closed 🚫");
          },
          onFailure: (err) => {
            return Effect.logDebug(
              `[Database] Error closing connection ❌. Reason: ${String(err)}`,
            );
          },
        }),
      );
    };

    return Effect.acquireRelease(acquire, release);
  };
}
