CREATE TABLE "game_event_commands" (
	"id" uuid PRIMARY KEY,
	"game_id" uuid NOT NULL,
	"status" text NOT NULL,
	"expected_last_recorded_sequence" integer,
	"first_recorded_sequence" integer,
	"last_recorded_sequence" integer,
	"requested_by_actor_type" text NOT NULL,
	"requested_by_user_id" uuid,
	"requested_by_role" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "game_event_commands_game_id_id_unique" UNIQUE("game_id","id"),
	CONSTRAINT "game_event_commands_status_check" CHECK ("status" in ('completed')),
	CONSTRAINT "game_event_commands_actor_type_check" CHECK ("requested_by_actor_type" in ('user', 'system', 'import')),
	CONSTRAINT "game_event_commands_user_actor_check" CHECK (("requested_by_actor_type" = 'user' and "requested_by_user_id" is not null) or ("requested_by_actor_type" <> 'user'))
);
--> statement-breakpoint
CREATE TABLE "game_events" (
	"id" uuid PRIMARY KEY,
	"global_sequence" bigint GENERATED ALWAYS AS IDENTITY (sequence name "game_events_global_sequence_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"game_id" uuid NOT NULL,
	"command_id" uuid NOT NULL,
	"type" text NOT NULL,
	"payload_schema_version" integer DEFAULT 1 NOT NULL,
	"payload" jsonb NOT NULL,
	"recorded_sequence" integer NOT NULL,
	"effective_sequence" integer NOT NULL,
	"replaces_event_id" uuid,
	"voids_event_id" uuid,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recorded_by_actor_type" text NOT NULL,
	"recorded_by_user_id" uuid,
	"recorded_by_role" text,
	CONSTRAINT "game_events_recorded_sequence_unique" UNIQUE("game_id","recorded_sequence"),
	CONSTRAINT "game_events_actor_type_check" CHECK ("recorded_by_actor_type" in ('user', 'system', 'import')),
	CONSTRAINT "game_events_user_actor_check" CHECK (("recorded_by_actor_type" = 'user' and "recorded_by_user_id" is not null) or ("recorded_by_actor_type" <> 'user')),
	CONSTRAINT "game_events_type_check" CHECK ("type" in (
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
      ))
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY
);
--> statement-breakpoint
CREATE INDEX "game_events_game_recorded_sequence_idx" ON "game_events" ("game_id","recorded_sequence");--> statement-breakpoint
CREATE INDEX "game_events_game_effective_sequence_idx" ON "game_events" ("game_id","effective_sequence","recorded_sequence");--> statement-breakpoint
CREATE INDEX "game_events_game_type_idx" ON "game_events" ("game_id","type");--> statement-breakpoint
CREATE INDEX "game_events_replaces_event_id_idx" ON "game_events" ("replaces_event_id");--> statement-breakpoint
CREATE INDEX "game_events_voids_event_id_idx" ON "game_events" ("voids_event_id");--> statement-breakpoint
CREATE INDEX "game_events_command_id_idx" ON "game_events" ("command_id");--> statement-breakpoint
ALTER TABLE "game_event_commands" ADD CONSTRAINT "game_event_commands_game_id_games_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id");--> statement-breakpoint
ALTER TABLE "game_event_commands" ADD CONSTRAINT "game_event_commands_requested_by_user_id_users_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_game_id_games_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id");--> statement-breakpoint
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_command_id_game_event_commands_id_fkey" FOREIGN KEY ("command_id") REFERENCES "game_event_commands"("id");--> statement-breakpoint
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_recorded_by_user_id_users_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id");