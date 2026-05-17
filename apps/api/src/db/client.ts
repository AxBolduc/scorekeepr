import { PgClient } from "@effect/sql-pg";
import * as PgDrizzle from "drizzle-orm/effect-postgres";
import { Context, Layer, Redacted } from "effect";
import type { CustomTypesConfig } from "pg";
import { types } from "pg";
import type { Success } from "effect/Effect";

const databaseUrl = process.env.DATABASE_URL;

const postgresTypeParsers: CustomTypesConfig = {
  getTypeParser: (typeId, format) => {
    // Let Drizzle handle PostgreSQL date/time parsing.
    if (
      [1184, 1114, 1082, 1186, 1231, 1115, 1185, 1187, 1182].includes(typeId)
    ) {
      return (value: string) => value;
    }

    return types.getTypeParser(typeId, format);
  },
};

export const PgClientLive = PgClient.layer({
  url: Redacted.make(
    databaseUrl ?? "postgres://scorekeepr:scorekeepr@localhost:5432/scorekeepr",
  ),
  types: postgresTypeParsers,
});

const makeDatabase = PgDrizzle.makeWithDefaults();

export class Database extends Context.Service<
  Database,
  Success<typeof makeDatabase>
>()("@scorekeepr/api/Database") {}

export const DatabaseLive = Layer.effect(Database)(makeDatabase);

export const DatabaseLayer = Layer.provideMerge(DatabaseLive, PgClientLive);
