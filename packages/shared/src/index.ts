import * as Schema from "effect/Schema"

export const Base = Schema.Literals(["home", "first", "second", "third"] as const)
export type Base = typeof Base.Type

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
] as const)
export type GameEventKind = typeof GameEventKind.Type

export const HealthResponse = Schema.Struct({
  service: Schema.Literal("scorekeepr-api"),
  ok: Schema.Boolean,
  version: Schema.String,
})
export type HealthResponse = typeof HealthResponse.Type

export const createHealthResponse = (version = "0.0.0"): HealthResponse => ({
  service: "scorekeepr-api",
  ok: true,
  version,
})
