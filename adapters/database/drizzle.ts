import { type PostgresJsDatabase, drizzle } from "drizzle-orm/postgres-js";
import { Config, Context, Effect, Layer } from "effect";
import postgres from "postgres";
import {
  DatabaseConnectionTypeId,
  createDatabaseResource,
} from "~/layers/database";

// UNCOMMENT and add link to the drizzle schema
// import * as schema from '~/migrations/schema.ts'
const schema = {};

export type DrizzleClient = PostgresJsDatabase<typeof schema>;

const setupClient = Config.string("DB_URL").pipe(
  Effect.map((db_uri) => {
    const sql = postgres(db_uri);
    const client = drizzle(sql, { schema });

    return {
      client: client,
      async close() {
        await sql.end({ timeout: 1 });
      },
    };
  }),
);

export class DrizzleDBConnection extends Context.Tag(DatabaseConnectionTypeId)<
  DrizzleDBConnection,
  DrizzleClient
>() {}

export const DrizzleDatabaseResource =
  createDatabaseResource<DrizzleClient>()(setupClient);

export const DatabaseLive = setupClient.pipe(
  Effect.map((e) => Layer.succeed(DrizzleDBConnection, e.client)),
  Layer.unwrapEffect,
);
