import * as Schema from "effect/Schema";

export const Base = Schema.Literals([
  "home",
  "first",
  "second",
  "third",
] as const);
export type Base = typeof Base.Type;

export const GameEventKind = Schema.Literals([
  "game-rules-change",
  "pitch-event",
  "plate-appearance-result",
  "base-running-event",
  "substitution-event",
  "defensive-alignment-event",
  "courtesy-runner-event",
  "inning-transition",
  "game-conclusion",
  "game-finalization",
  "game-reopening",
  "correction-event",
] as const);
export type GameEventKind = typeof GameEventKind.Type;

export const GameEventType = Schema.Literals([
  "GAME_CREATED",
  "GAME_RULES_RECORDED",
  "GAME_RULES_CHANGED",
  "BATTING_ORDER_SUBMITTED",
  "DEFENSIVE_ALIGNMENT_CHANGED",
  "GAME_STARTED",
  "HALF_INNING_STARTED",
  "PITCH_RECORDED",
  "BASE_RUNNING_RECORDED",
  "PLATE_APPEARANCE_RESULTED",
  "SUBSTITUTION_RECORDED",
  "COURTESY_RUNNER_RECORDED",
  "HALF_INNING_ENDED",
  "GAME_CONCLUDED",
  "GAME_FINALIZED",
  "GAME_REOPENED",
  "GAME_EVENT_VOIDED",
  "GAME_EVENT_CORRECTED",
] as const);
export type GameEventType = typeof GameEventType.Type;

export type ActorType = "user" | "system" | "import";

export type StoredGameEvent = {
  id: string;
  gameId: string;
  commandId: string;
  type: GameEventType;
  payloadSchemaVersion: number;
  payload: unknown;
  recordedSequence: number;
  effectiveSequence: number;
  replacesEventId: string | null;
  voidsEventId: string | null;
  recordedAt: string;
  recordedByActorType: ActorType;
  recordedByUserId: string | null;
  recordedByRole: string | null;
};

const correctionMetadataTypes = new Set<GameEventType>([
  "GAME_EVENT_VOIDED",
  "GAME_EVENT_CORRECTED",
]);

export const resolveActiveGameEvents = (
  events: ReadonlyArray<StoredGameEvent>,
): StoredGameEvent[] => {
  const inactiveEventIds = new Set<string>();

  for (const event of events) {
    if (event.voidsEventId !== null) {
      inactiveEventIds.add(event.voidsEventId);
    }

    if (event.replacesEventId !== null) {
      inactiveEventIds.add(event.replacesEventId);
    }
  }

  return [...events]
    .filter((event) => !inactiveEventIds.has(event.id))
    .filter((event) => !correctionMetadataTypes.has(event.type))
    .sort(
      (left, right) =>
        left.effectiveSequence - right.effectiveSequence ||
        left.recordedSequence - right.recordedSequence,
    );
};

export const HealthResponse = Schema.Struct({
  service: Schema.Literal("scorekeepr-api"),
  ok: Schema.Boolean,
  version: Schema.String,
});
export type HealthResponse = typeof HealthResponse.Type;

export const createHealthResponse = (version = "0.0.0"): HealthResponse => ({
  service: "scorekeepr-api",
  ok: true,
  version,
});
