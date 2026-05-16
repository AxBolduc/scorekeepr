# Event Model Draft

Scorekeepr uses an event-sourced model for scored games. The ordered **Game Event** history is the source of truth. Current game state, scorebook grid, box score, play-by-play, and stats are derived by replaying active events.

See also:

- [`CONTEXT.md`](../CONTEXT.md)
- [`docs/adr/0001-event-log-as-source-of-truth.md`](./adr/0001-event-log-as-source-of-truth.md)

---

## Core Principles

1. **Game Events are source of truth**
   - Do not treat stored current state as authoritative.
   - Rebuild state from active events.

2. **Events are append-only**
   - Do not mutate or delete previous game events.
   - Corrections and undo are represented by additional events.

3. **Plate Appearance Result is the primary scoring event**
   - A completed batter turn is represented by one Plate Appearance Result.
   - Runner movement caused by that completed batter outcome belongs inside that event.

4. **Base Running Events handle runner movement during incomplete plate appearances**
   - Steals, caught stealing, pickoffs, wild pitches, passed balls, balks, and defensive indifference are separate Base Running Events.

5. **Pitch Events are source-of-truth events**
   - Balls, strikes, fouls, hit-by-pitch, and ball-in-play pitches are recorded as events.
   - A pitch may suggest plate appearance completion, but the scorekeeper confirms the Plate Appearance Result.

6. **Runner outcomes are explicit**
   - Every Plate Appearance Result includes a Runner Advancement for the batter-runner and for every runner already on base.
   - Held runners are recorded explicitly.

---

## Event Envelope

All game events should share a common envelope.

```ts
type GameEvent = {
  id: string
  gameId: string

  /** Order in which the event was actually recorded. */
  recordedSequence: number

  /** Logical order in which the event participates in replay. */
  effectiveSequence: number

  type: GameEventType
  recordedAt: string
  recordedByUserId: string

  payload: unknown
}
```

### Recorded vs Effective Sequence

Most events have the same recorded and effective sequence.

Replacement events created during correction keep their actual recorded sequence, but replay at the replaced event's effective sequence.

---

## Initial Event Types

```ts
type GameEventType =
  | "GAME_CREATED"
  | "GAME_RULES_RECORDED"
  | "GAME_RULES_CHANGED"
  | "BATTING_ORDER_SUBMITTED"
  | "DEFENSIVE_ALIGNMENT_CHANGED"
  | "GAME_STARTED"
  | "HALF_INNING_STARTED"
  | "PITCH_RECORDED"
  | "BASE_RUNNING_RECORDED"
  | "PLATE_APPEARANCE_RESULTED"
  | "SUBSTITUTION_RECORDED"
  | "COURTESY_RUNNER_RECORDED"
  | "HALF_INNING_ENDED"
  | "GAME_CONCLUDED"
  | "GAME_FINALIZED"
  | "GAME_REOPENED"
  | "GAME_EVENT_VOIDED"
  | "GAME_EVENT_CORRECTED"
```

Names may change during implementation, but the domain distinctions should remain.

---

## Bases and Runner Outcomes

```ts
type Base = "home" | "first" | "second" | "third"

type RunnerOutcome =
  | "advanced"
  | "scored"
  | "out"
  | "held"
```

---

## Runner Advancement

A Runner Advancement records a runner's movement or out outcome within the event that caused it.

```ts
type RunnerAdvancement = {
  id: string
  runnerId: string

  fromBase: Base
  outcome: RunnerOutcome

  /** Present for advanced, scored, and held outcomes. */
  toBase?: Base

  /** Present for out outcomes. */
  outAtBase?: Base

  /** Structured reason for this segment of movement. */
  reason: string

  /** Present when this advancement scores a run with RBI credit. */
  rbiCredit?: {
    creditedToPlayerId: string
  }
}
```

Rules:

- A Plate Appearance Result includes a Runner Advancement for the batter-runner and every runner already on base.
- Held runners are explicit.
- A runner may have multiple Runner Advancements in the same Game Event when movement has multiple causes.
- Example: first-to-third on a single, then third-to-home on an error.

---

## Out Detail

Out Detail records how an out was made and who was put out.

```ts
type OutDetail = {
  id: string
  retiredPlayerId: string
  reason: string
  outAtBase?: Base
  notation: string

  fieldingCredits?: Array<{
    fielderId: string
    credit: "putout" | "assist"
  }>

  relatedAdvancementId?: string
}
```

Rules:

- Out Detail belongs inside the Game Event that caused the out.
- Batter-runner outs are represented both as a Runner Advancement and an Out Detail.
- Multiple outs can be recorded in one event.

---

## Error Detail

Error Detail records a defensive misplay charged to a fielder.

```ts
type ErrorDetail = {
  id: string
  fielderId: string
  reason: "fielding" | "throwing" | "catching" | "other"
  notation: string

  /** Runner advancements affected by this error. */
  affectedAdvancementIds: string[]
}
```

Rules:

- One error can affect multiple Runner Advancements.
- One event can contain multiple errors.
- Error Detail links to affected Runner Advancements, not directly to only one runner.

Example:

```json
{
  "result": "single",
  "generatedNotation": "1B E8",
  "runnerAdvancements": [
    {
      "id": "adv_1",
      "runnerId": "runner_on_first",
      "fromBase": "first",
      "outcome": "advanced",
      "toBase": "third",
      "reason": "single"
    },
    {
      "id": "adv_2",
      "runnerId": "runner_on_first",
      "fromBase": "third",
      "outcome": "scored",
      "toBase": "home",
      "reason": "error"
    },
    {
      "id": "adv_3",
      "runnerId": "batter",
      "fromBase": "home",
      "outcome": "advanced",
      "toBase": "first",
      "reason": "single"
    }
  ],
  "errors": [
    {
      "id": "err_1",
      "fielderId": "center_fielder",
      "reason": "fielding",
      "notation": "E8",
      "affectedAdvancementIds": ["adv_2"]
    }
  ]
}
```

---

## Pitch Event

Pitch Events record individual pitches as source-of-truth events.

```ts
type PitchRecordedPayload = {
  pitcherId: string
  batterId: string
  lineupSpotId: string

  result:
    | "ball"
    | "called_strike"
    | "swinging_strike"
    | "foul"
    | "foul_tip"
    | "hit_by_pitch"
    | "ball_in_play"
}
```

A Pitch Event may cause the UI to prompt for a Plate Appearance Result, but it does not by itself complete the Plate Appearance.

Examples:

- Ball four prompts for walk confirmation and runner outcomes.
- Strike three prompts for strikeout confirmation and possible dropped-third-strike handling.
- Ball in play prompts for batted-ball result and runner outcomes.

---

## Plate Appearance Result

Plate Appearance Result records the completed outcome of a Plate Appearance.

```ts
type PlateAppearanceResultedPayload = {
  plateAppearanceId: string

  batterId: string
  lineupSpotId: string
  pitcherId: string

  result: PlateAppearanceResult

  generatedNotation: string
  notationOverride?: string

  runnerAdvancements: RunnerAdvancement[]
  outs: OutDetail[]
  errors: ErrorDetail[]
}
```

Possible initial results:

```ts
type PlateAppearanceResult =
  | "single"
  | "double"
  | "triple"
  | "home_run"
  | "walk"
  | "intentional_walk"
  | "hit_by_pitch"
  | "strikeout"
  | "groundout"
  | "flyout"
  | "lineout"
  | "popout"
  | "fielder_choice"
  | "reached_on_error"
  | "sacrifice_bunt"
  | "sacrifice_fly"
  | "catcher_interference"
```

Notes:

- `result` is structured scoring data.
- `generatedNotation` is display/scoring notation generated from structured data.
- `notationOverride` allows the scorekeeper to customize display without changing scoring facts.
- RBI totals are derived from RBI Credit on scoring Runner Advancements.
- Earned/unearned run classification is deferred for MVP.

---

## Base Running Event

Base Running Events record runner activity while the Plate Appearance is still incomplete.

```ts
type BaseRunningRecordedPayload = {
  kind:
    | "stolen_base"
    | "caught_stealing"
    | "pickoff"
    | "wild_pitch"
    | "passed_ball"
    | "balk"
    | "defensive_indifference"
    | "other"

  /** Optional link to the pitch associated with the incident. */
  relatedPitchEventId?: string

  runnerAdvancements: RunnerAdvancement[]
  outs: OutDetail[]
  errors: ErrorDetail[]

  generatedNotation: string
  notationOverride?: string
}
```

Rules:

- A Base Running Event may affect multiple runners.
- A Base Running Event may be related to a Pitch Event but remains separate.
- Runner movement caused by a completed batter outcome belongs to the Plate Appearance Result instead.

---

## Batting Order and Scorebook Grid

A Batting Order contains one or more Lineup Spots and is not limited to nine spots.

The scorebook grid is projected from Plate Appearance Results:

- Scorebook Row = Lineup Spot
- Scorebook Cell = one Plate Appearance Result
- Columns are inning-based in the UI
- A Scorebook Row may contain multiple Scorebook Cells in the same inning

Substitutions may cause multiple players to occupy the same Lineup Spot over time.

---

## Substitution Event

Substitution Events record one player replacing another player in a Lineup Spot or fielding role.

```ts
type SubstitutionRecordedPayload = {
  teamId: string
  outgoingPlayerId?: string
  incomingPlayerId: string

  lineupSpotId?: string
  fieldingPosition?: string

  reason?: "pinch_runner" | "pinch_hitter" | "defensive_substitution" | "injury" | "other"
}
```

A Pinch Runner is handled as a Substitution Event, not as a Courtesy Runner Event.

---

## Defensive Alignment Event

Defensive Alignment Events record fielding position changes without changing batting-order membership.

```ts
type DefensiveAlignmentChangedPayload = {
  teamId: string
  positions: Array<{
    playerId: string
    position: string
  }>
}
```

This supports defensive shuffling, pitcher changes, and youth-baseball rotations.

---

## Courtesy Runner Event

Courtesy Runner Events record a temporary runner replacing another player on base without changing the Batting Order.

```ts
type CourtesyRunnerRecordedPayload = {
  teamId: string
  originalPlayerId: string
  courtesyRunnerId: string
  base: Base
}
```

Rules:

- The original player keeps the Plate Appearance Result that placed them on base.
- The courtesy runner receives later base-running outcomes, including runs scored.
- Courtesy Runner Event is distinct from a Pinch Runner substitution.

---

## Inning Lifecycle Events

Half-inning starts and ends are explicit Game Events generated by the engine or, when necessary, by authorized manual action.

```ts
type HalfInningStartedPayload = {
  inning: number
  half: "top" | "bottom"
  battingTeamId: string
  fieldingTeamId: string
}
```

```ts
type HalfInningEndedPayload = {
  inning: number
  half: "top" | "bottom"
  reason:
    | "three_outs"
    | "run_limit"
    | "walk_off"
    | "mercy_rule"
    | "time_limit"
    | "manual"
    | "forfeit"
    | "weather"
}
```

A half-inning may end for reasons other than three outs.

---

## Game Conclusion, Finalization, and Reopening

Game Conclusion records the end of play.

```ts
type GameConcludedPayload = {
  reason:
    | "regulation"
    | "walk_off"
    | "mercy_rule"
    | "time_limit"
    | "forfeit"
    | "weather"
    | "manual"
}
```

Game Finalization records that the scorekeeper marked the scorebook complete.

```ts
type GameFinalizedPayload = {
  finalizedByUserId: string
}
```

After finalization, normal scoring and correction events require a Game Reopening.

```ts
type GameReopenedPayload = {
  reopenedByUserId: string
  reason: string
}
```

---

## Corrections and Undo

Events are not deleted or mutated.

Void an event:

```ts
type GameEventVoidedPayload = {
  voidedEventId: string
  reason: string
}
```

Correct an event:

```ts
type GameEventCorrectedPayload = {
  correctedEventId: string
  replacementEventId: string
  reason: string
}
```

Replay behavior:

- Voided events remain in history but do not contribute to Game State.
- Replacement events participate in replay at the corrected event's Effective Sequence.
- Correction metadata remains at the time it was recorded.

---

## Game Rules

Game Rules are recorded per game so replay uses the rules active for that game.

```ts
type GameRulesRecordedPayload = {
  scheduledInnings: number
  continuousBattingOrder: boolean
  runLimitPerHalfInning?: number
  mercyRule?: unknown
  courtesyRunnersAllowed: boolean
  droppedThirdStrikeRule: boolean
  stealingAllowed: boolean
  pitchCountTracked: boolean
  reEntryRule?: unknown
}
```

Rule changes are explicit events, not mutations.

```ts
type GameRulesChangedPayload = {
  changes: Partial<GameRulesRecordedPayload>
  effectiveSequence: number
  reason: string
}
```

---

## Open Questions

These still need to be resolved:

1. Exact initial result taxonomy for Plate Appearance Result.
2. Exact fielding position vocabulary.
3. How pitcher changes interact with Defensive Alignment Event vs Substitution Event.
4. Whether game setup events should include rosters or only game-specific batting orders/alignments.
5. How to model home/away team identity and team-side state.
6. How strict validation should be during live scoring vs after-the-fact correction.
