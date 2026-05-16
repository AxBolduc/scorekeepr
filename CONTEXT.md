# Scorekeepr

Scorekeepr is a baseball scorekeeping platform for recording games in a digital form that preserves the language and workflow of a traditional baseball scorebook.

## Language

**Game Event**:
One recorded scoring or administrative action within a game.
_Avoid_: Log entry, action, scoring record

**Game Rules**:
The rule configuration that governs scoring and validation for a specific game.
_Avoid_: League settings, game settings

**Game Rules Change**:
A **Game Event** that changes **Game Rules** at an explicit effective point.
_Avoid_: Rule edit, settings update

**Game State**:
The current condition of a game derived from active **Game Events**.
_Avoid_: Current snapshot, live game data

**Voided Game Event**:
A **Game Event** that remains in game history but no longer contributes to **Game State**.
_Avoid_: Deleted event, removed event

**Correction Event**:
A **Game Event** that voids or replaces a prior **Game Event**.
_Avoid_: Edit, update, mutation

**Recorded Sequence**:
The order in which a **Game Event** was actually recorded.
_Avoid_: Event order, creation order

**Effective Sequence**:
The logical order in which an active **Game Event** participates in game replay.
_Avoid_: Replay order, corrected order

**Projection**:
A view derived from **Game Events**, such as a scorebook grid, box score, or play-by-play.
_Avoid_: Report, cached state

**Pitch Event**:
A **Game Event** that records one pitch thrown to the current batter.
_Avoid_: Pitch record, pitch log entry

**Batting Order**:
The ordered collection of **Lineup Spots** for a team in a game.
_Avoid_: Lineup, batting lineup

**Lineup Spot**:
A position in the batting order that may be occupied by different players over the course of a game.
_Avoid_: Batting order position, lineup row

**Substitution Event**:
A **Game Event** that records a player replacing another player in a **Lineup Spot** or fielding role.
_Avoid_: Player change, lineup change

**Defensive Alignment Event**:
A **Game Event** that records changes to fielding positions without changing batting-order membership.
_Avoid_: Position change, fielding change

**Courtesy Runner Event**:
A **Game Event** that records a temporary runner replacing another player on base without changing the batting order.
_Avoid_: Pinch runner, substitution

**Pinch Runner**:
A substitute who enters the game to run for another player as part of a **Substitution Event**.
_Avoid_: Courtesy runner

**Scorebook Row**:
A row in the scorebook grid representing a **Lineup Spot**, with player occupancy shown through substitutions.
_Avoid_: Player row, batting row

**Scorebook Cell**:
The displayed scoring notation for one **Plate Appearance Result** within a **Scorebook Row** and inning.
_Avoid_: Box, grid cell, play cell

**Scorebook Notation**:
The traditional scoring text or symbols displayed for a scored event, either generated from structured scoring data or overridden by the scorekeeper for display.
_Avoid_: Result, outcome, display text

**Plate Appearance**:
One completed turn by a batter, regardless of whether it counts as an official **At-Bat**.
_Avoid_: At-bat, batter turn

**At-Bat**:
A statistical classification for a **Plate Appearance** that counts toward batting average.
_Avoid_: Plate appearance, batter turn

**Out Detail**:
The recorded out outcome for a batter or runner, including who was put out and how the out was made.
_Avoid_: Out, out count

**Error Detail**:
The recorded defensive misplay charged to a fielder within the event that caused it, linked to the **Runner Advancements** it affected.
_Avoid_: Error, fielding error

**RBI Credit**:
The scoring credit assigned to a batter for a specific run-scoring **Runner Advancement**.
_Avoid_: RBI total, run credit

**Plate Appearance Result**:
A **Game Event** that records the completed outcome of a **Plate Appearance** and the resulting runner movement, outs, runs, and scoring notation.
_Avoid_: At-bat event, play result, batting result

**Half-Inning**:
One team's offensive turn within an inning.
_Avoid_: Side, frame half

**Inning Transition**:
A **Game Event** that records the start or end of a **Half-Inning**.
_Avoid_: Inning marker, side change

**Game Conclusion**:
A **Game Event** that records that a game has ended and why.
_Avoid_: Game over, completion

**Game Finalization**:
A **Game Event** that records that the scorekeeper has marked the scorebook complete.
_Avoid_: Game conclusion, game over

**Game Reopening**:
A **Game Event** that records that a finalized scorebook was reopened for correction.
_Avoid_: Unfinalize, unlock

**Base**:
A named location a runner can occupy or reach: home, first, second, or third.
_Avoid_: Bag, base number

**Runner Advancement**:
The recorded movement or out outcome for a runner caused by a **Plate Appearance Result**.
_Avoid_: Runner movement, advancement, base movement

**Base Running Event**:
A **Game Event** that records runner movement or a runner out while a batter's turn remains incomplete.
_Avoid_: Runner event, steal event, on-base action

## Relationships

- A **Game Event** belongs to exactly one game.
- **Game Rules** are recorded for each game so replay uses the rules active for that game.
- A **Game Rules Change** changes replay or validation rules without mutating prior **Game Rules**.
- An **Inning Transition** is generated when a **Half-Inning** starts or ends.
- A **Half-Inning** may end because of three outs or another explicit game-ending or rule-based reason.
- A **Game Conclusion** is separate from the **Inning Transition** that may immediately precede it.
- **Game Finalization** is separate from **Game Conclusion** so corrections may happen after play ends but before the scorebook is marked complete.
- After **Game Finalization**, normal scoring and correction events require a **Game Reopening**.
- **Game State** is derived from the ordered active **Game Events** for a game.
- A **Voided Game Event** remains in history but is excluded from derived **Game State**.
- A **Correction Event** changes the active event history without mutating the original **Game Event**.
- A replacement **Game Event** keeps its **Recorded Sequence** but uses the replaced event's **Effective Sequence** during replay.
- A **Projection** is derived from **Game Events** and does not replace them as the source of truth.
- A **Batting Order** contains one or more **Lineup Spots** and is not limited to nine spots.
- A **Lineup Spot** belongs to one **Batting Order** within a game.
- Batting participation and defensive participation are independent.
- A **Substitution Event** determines which player occupies a **Lineup Spot** or fielding role at a point in game history.
- A **Defensive Alignment Event** changes fielding positions without changing batting-order membership.
- A **Courtesy Runner Event** changes who is running on base without changing the **Batting Order**.
- A courtesy runner receives base-running outcomes while the original player keeps the **Plate Appearance Result** that placed them on base.
- A **Pinch Runner** is handled through a **Substitution Event**, not a **Courtesy Runner Event**.
- A **Scorebook Row** represents one **Lineup Spot**.
- A **Scorebook Cell** represents one **Plate Appearance Result**.
- **Scorebook Notation** is distinct from structured result data.
- Generated **Scorebook Notation** may be overridden for display without changing the structured scoring facts.
- A **Scorebook Row** may contain multiple **Scorebook Cells** in the same inning.
- A **Plate Appearance** is taken by a player occupying a **Lineup Spot**.
- A **Pitch Event** belongs to the current incomplete **Plate Appearance**.
- A **Pitch Event** may suggest that the **Plate Appearance** is complete, but the **Plate Appearance Result** records the confirmed outcome.
- A **Plate Appearance Result** is the primary scoring event for a completed **Plate Appearance**.
- A **Base Running Event** records runner activity while the batter's turn remains incomplete.
- A **Base Running Event** may be related to a **Pitch Event**, but remains a separate **Game Event**.
- A **Base Running Event** may include outcomes for multiple runners affected by the same incident.
- Runner movement caused by the completed batter outcome belongs to the **Plate Appearance Result**, not a separate **Base Running Event**.
- An **Out Detail** belongs to the **Game Event** that caused the out.
- A **Plate Appearance Result** includes a **Runner Advancement** for the batter-runner and for every runner already on base.
- A batter-runner out is represented both as a **Runner Advancement** and as an **Out Detail**.
- A **Runner Advancement** uses named **Bases** and an explicit outcome such as advanced, scored, out, or held.
- A held runner is recorded as an explicit **Runner Advancement** rather than omitted.
- A runner may have multiple **Runner Advancements** within the same causing **Game Event** when their movement has multiple causes.
- An **Error Detail** links only to the **Runner Advancements** affected by that defensive misplay.
- **RBI Credit** belongs to the run-scoring **Runner Advancement**, and RBI totals are derived from those credits.
- Earned-run classification is not part of the initial scoring language; the event history should preserve facts needed to classify earned runs later.

## Example dialogue

> **Dev:** "If a scorekeeper edits a play, do we update the score directly?"
> **Domain expert:** "No — we change the relevant **Game Event** history, then rebuild the **Game State** and **Projections** from that history."

## Flagged ambiguities

- "event log" is resolved as the source of truth for scored games, not merely an audit trail.
- "play" can refer to either a **Plate Appearance Result** or a **Base Running Event**; prefer the precise term when discussing the event model.
- "at-bat" is resolved as a statistical classification, not a synonym for **Plate Appearance**.
- A **Plate Appearance Result** should identify both the batter and the **Lineup Spot**.
