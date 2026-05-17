import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
});

export const games = pgTable("games", {
  id: uuid("id").primaryKey(),
});

export const gameEventCommands = pgTable(
  "game_event_commands",
  {
    id: uuid("id").primaryKey(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id),
    status: text("status").notNull(),
    expectedLastRecordedSequence: integer("expected_last_recorded_sequence"),
    firstRecordedSequence: integer("first_recorded_sequence"),
    lastRecordedSequence: integer("last_recorded_sequence"),
    requestedByActorType: text("requested_by_actor_type").notNull(),
    requestedByUserId: uuid("requested_by_user_id").references(() => users.id),
    requestedByRole: text("requested_by_role"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    unique("game_event_commands_game_id_id_unique").on(table.gameId, table.id),
    check(
      "game_event_commands_status_check",
      sql`${table.status} in ('completed')`,
    ),
    check(
      "game_event_commands_actor_type_check",
      sql`${table.requestedByActorType} in ('user', 'system', 'import')`,
    ),
    check(
      "game_event_commands_user_actor_check",
      sql`(${table.requestedByActorType} = 'user' and ${table.requestedByUserId} is not null) or (${table.requestedByActorType} <> 'user')`,
    ),
  ],
);

export const gameEvents = pgTable(
  "game_events",
  {
    id: uuid("id").primaryKey(),
    globalSequence: bigint("global_sequence", { mode: "number" })
      .notNull()
      .generatedAlwaysAsIdentity(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id),
    commandId: uuid("command_id")
      .notNull()
      .references(() => gameEventCommands.id),
    type: text("type").notNull(),
    payloadSchemaVersion: integer("payload_schema_version")
      .notNull()
      .default(1),
    payload: jsonb("payload").notNull(),
    recordedSequence: integer("recorded_sequence").notNull(),
    effectiveSequence: integer("effective_sequence").notNull(),
    replacesEventId: uuid("replaces_event_id"),
    voidsEventId: uuid("voids_event_id"),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    recordedByActorType: text("recorded_by_actor_type").notNull(),
    recordedByUserId: uuid("recorded_by_user_id").references(() => users.id),
    recordedByRole: text("recorded_by_role"),
  },
  (table) => [
    unique("game_events_recorded_sequence_unique").on(
      table.gameId,
      table.recordedSequence,
    ),
    check(
      "game_events_actor_type_check",
      sql`${table.recordedByActorType} in ('user', 'system', 'import')`,
    ),
    check(
      "game_events_user_actor_check",
      sql`(${table.recordedByActorType} = 'user' and ${table.recordedByUserId} is not null) or (${table.recordedByActorType} <> 'user')`,
    ),
    check(
      "game_events_type_check",
      sql`${table.type} in (
        'GAME_CREATED',
        'GAME_RULES_RECORDED',
        'GAME_RULES_CHANGED',
        'BATTING_ORDER_SUBMITTED',
        'DEFENSIVE_ALIGNMENT_CHANGED',
        'GAME_STARTED',
        'HALF_INNING_STARTED',
        'PITCH_RECORDED',
        'BASE_RUNNING_RECORDED',
        'PLATE_APPEARANCE_RESULTED',
        'SUBSTITUTION_RECORDED',
        'COURTESY_RUNNER_RECORDED',
        'HALF_INNING_ENDED',
        'GAME_CONCLUDED',
        'GAME_FINALIZED',
        'GAME_REOPENED',
        'GAME_EVENT_VOIDED',
        'GAME_EVENT_CORRECTED'
      )`,
    ),
    index("game_events_game_recorded_sequence_idx").on(
      table.gameId,
      table.recordedSequence,
    ),
    index("game_events_game_effective_sequence_idx").on(
      table.gameId,
      table.effectiveSequence,
      table.recordedSequence,
    ),
    index("game_events_game_type_idx").on(table.gameId, table.type),
    index("game_events_replaces_event_id_idx").on(table.replacesEventId),
    index("game_events_voids_event_id_idx").on(table.voidsEventId),
    index("game_events_command_id_idx").on(table.commandId),
  ],
);
