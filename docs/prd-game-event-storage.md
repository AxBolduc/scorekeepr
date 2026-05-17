# PRD: Game Event Storage

_Label: ready-for-agent_

## Problem Statement

Scorekeepr needs a durable way to store scored baseball games so scorekeepers can record pitches, Plate Appearance Results, Base Running Events, substitutions, Inning Transitions, corrections, and finalization history without losing the accuracy and editability expected from a digital scorebook.

The platform has already decided that the ordered Game Event history is the source of truth. The remaining problem is to implement a storage layer that preserves that event history, supports safe replay, prevents accidental mutation, handles corrections, supports idempotent retries, and remains flexible while the event model continues to evolve.

## Solution

Build a PostgreSQL-backed Game Event store using a single append-only event table. Store the event envelope in relational columns and event-specific bodies in validated JSONB payloads. Assign per-game Recorded Sequence values under database protection, use Effective Sequence for replay and corrections, and support atomic event batches through a command table that also acts as an idempotency mechanism.

The MVP should not persist Scorebook, Game State, stats, or play-by-play projections. Instead, it should expose a reliable event append/read foundation and pure projection/replay modules that derive those views on demand. Persisted projections and snapshots can be added later if performance requires them.

## User Stories

1. As a scorekeeper, I want every scoring action saved reliably, so that I can resume a game without losing scorekeeping history.
2. As a scorekeeper, I want pitches saved as Pitch Events, so that balls, strikes, pitch count, and the current Plate Appearance can be reconstructed.
3. As a scorekeeper, I want completed batter outcomes saved as Plate Appearance Results, so that the scorebook grid can be rebuilt accurately.
4. As a scorekeeper, I want steals, pickoffs, wild pitches, passed balls, balks, and defensive indifference saved as Base Running Events, so that runner movement during incomplete Plate Appearances is preserved.
5. As a scorekeeper, I want substitutions saved as Game Events, so that replay knows which player occupied each Lineup Spot or fielding role at every point.
6. As a scorekeeper, I want Defensive Alignment Events saved, so that position changes and pitcher changes can be reconstructed.
7. As a scorekeeper, I want Courtesy Runner Events saved separately from substitutions, so that temporary runners do not alter the Batting Order.
8. As a scorekeeper, I want Inning Transitions saved as explicit Game Events, so that half-inning starts and ends are clear during replay.
9. As a scorekeeper, I want Game Conclusion stored separately from Game Finalization, so that play can end before the scorebook is locked.
10. As a scorekeeper, I want Game Reopening stored explicitly, so that corrections after finalization are visible in history.
11. As a scorekeeper, I want corrections to append new events instead of modifying old events, so that the scorekeeping history remains trustworthy.
12. As a scorekeeper, I want replacement events to replay at the corrected event's Effective Sequence, so that earlier mistakes can correctly affect later Game State.
13. As a scorekeeper, I want undo/void actions to preserve the original event in history, so that accidental entries can be excluded without being erased.
14. As a scorekeeper, I want a retried save action not to duplicate events, so that network failures do not corrupt the event stream.
15. As a scorekeeper, I want stale scoring submissions to be rejected, so that a browser tab with old Game State cannot append impossible events.
16. As a scorekeeper, I want a single scoring command to save all resulting events atomically, so that a third out cannot be saved without the matching Inning Transition.
17. As a scorekeeper, I want system-generated events saved in the same history as user events, so that the event stream tells the full story of the game.
18. As a scorekeeper, I want the app to rebuild the current Game State from Game Events, so that corrections produce accurate count, bases, outs, score, inning, and current batter.
19. As a scorekeeper, I want the scorebook grid derived from active Game Events, so that corrections are reflected consistently.
20. As a team admin, I want finalized games protected from normal scoring changes, so that completed scorebooks are not accidentally modified.
21. As a team admin, I want finalized games reopenable through an explicit Game Reopening, so that legitimate corrections can still be made.
22. As a developer, I want one ordered event stream per game, so that replay is simple and deterministic.
23. As a developer, I want event identity, type, sequence, actor, schema version, and correction relationships in relational columns, so that core invariants are queryable and enforceable.
24. As a developer, I want event-specific payloads stored in JSONB, so that the event model can evolve without immediately creating many detail tables.
25. As a developer, I want payloads validated in application code, so that each event type and schema version has a tested decoder/validator.
26. As a developer, I want database constraints for envelope invariants, so that invalid event ownership, actor metadata, event type, and sequence data cannot be inserted.
27. As a developer, I want event type stored as text with a check constraint, so that the system is safer than free text but easier to evolve than a PostgreSQL enum.
28. As a developer, I want a payload schema version column, so that historical events can be decoded after payload shapes evolve.
29. As a developer, I want a global insertion sequence, so that support and debugging can inspect platform-wide append order without using it for domain replay.
30. As a developer, I want per-game Recorded Sequence assigned by the database-protected append flow, so that concurrent appends cannot create duplicate or out-of-order events.
31. As a developer, I want Effective Sequence to be non-unique within a game, so that replacement events can share the corrected event's logical replay position.
32. As a developer, I want structured correction relationship columns, so that replay does not have to inspect JSONB to determine voided or replaced events.
33. As a developer, I want a command table for accepted append batches, so that idempotency and batch sequence ranges are explicit.
34. As a developer, I want command IDs shared by all events created from one command, so that user actions and system follow-up events can be traced together.
35. As a developer, I want failed/stale commands excluded from MVP persistence, so that the first implementation stays minimal.
36. As a developer, I want append-only enforcement before production, so that application bugs or scripts cannot silently mutate scoring history.
37. As a developer, I want no persisted projections in MVP, so that duplicated state does not complicate early correctness work.
38. As a developer, I want snapshots deferred, so that correction invalidation complexity does not block the MVP.
39. As a support operator, I want actor metadata on events, so that I can see whether a user, system process, or import created an event.
40. As a support operator, I want command sequence ranges recorded, so that I can diagnose retry behavior and event batches.
41. As a future stats developer, I want the event store to preserve facts even when stats are not persisted, so that projections can be rebuilt later.
42. As a future mobile/offline developer, I want clear expected-version semantics, so that synchronization conflicts can be handled safely later.

## Implementation Decisions

- Build a PostgreSQL-backed Game Event store.
- Store all Game Events in one append-only event table rather than event-type-specific tables.
- Store the event envelope in relational columns: event ID, game ID, command ID, event type, payload schema version, Recorded Sequence, Effective Sequence, correction relationships, timestamp, and actor metadata.
- Store event-specific data in a JSONB payload column.
- Validate JSONB payloads in application code using shared schemas keyed by event type and payload schema version.
- Use database constraints for core envelope invariants rather than relying only on application code.
- Store event type as text with a check constraint, not as a PostgreSQL enum.
- Include a payload schema version column rather than relying on timestamps or payload-embedded version fields.
- Use per-game Recorded Sequence as the authoritative append order within a game.
- Assign Recorded Sequence values inside a database-protected transaction; clients must not assign them.
- Include a platform-wide global insertion sequence for operational audit/debugging only.
- Use Effective Sequence as the logical replay position.
- Allow replacement events to share the replaced event's Effective Sequence; therefore Effective Sequence is not unique per game.
- Store correction relationships in structured nullable columns rather than only inside JSONB.
- Store voiding relationships in structured nullable columns rather than only inside JSONB.
- Enforce uniqueness of Recorded Sequence per game.
- Do not enforce uniqueness of Effective Sequence per game.
- Store actor metadata as structured columns: actor type, optional user ID, and optional role.
- Treat system-generated Game Events as normal event rows with system actor metadata.
- Support atomic event batches so one command can append multiple Game Events in one transaction.
- Add a command table for accepted append batches.
- Use command ID as the idempotency key for append requests.
- Store command status, expected last Recorded Sequence, first/last Recorded Sequence, actor metadata, creation time, and completion time.
- Store successful commands only in MVP; failed or stale commands are returned as errors but not persisted.
- Require user-scoring append requests to include expected last Recorded Sequence.
- Reject stale expected-version appends instead of blindly merging them.
- Defer persisted projections for MVP; derive Game State, Scorebook, play-by-play, and stats on demand from active Game Events.
- Defer snapshots for MVP while keeping sequencing compatible with future snapshots.
- Before production, enforce append-only behavior using database permissions, triggers, or restricted maintenance roles.
- Align shared schema vocabulary with the documented event type vocabulary. The current shared package uses early kebab-case event-kind names; implementation should standardize on the documented event types or deliberately revise the docs and schemas together.

### Major Modules

- **Event Store**: deep module that appends and reads Game Events through a small interface. It owns database transactions, expected-version checks, sequence assignment, command creation, and idempotent retry behavior.
- **Event Payload Codec Registry**: deep module that validates and decodes event payloads by event type and payload schema version. It should be shared by API write validation and replay/projection code.
- **Active Event Resolver**: deep module that turns stored event rows into the active replay stream by excluding voided/replaced originals and including replacements at their Effective Sequence.
- **Replay/Game State Projector**: deep module that derives Game State from active Game Events. It should expose a stable function that accepts events and returns Game State.
- **Scorebook Projector**: deep module that derives Scorebook Rows and Scorebook Cells from active Game Events.
- **Append Command Handler**: application service that receives a command, validates expected version, validates event payloads, invokes the Event Store, and returns the inserted sequence range.
- **Database Migration Layer**: schema definitions for the event table, command table, constraints, and indexes.
- **API Routes**: endpoints for appending event batches and reading a game's event stream/current derived state.
- **Shared Contracts**: shared TypeScript/Effect schemas for event envelopes, payloads, append requests, append responses, and replay-facing event types.

## Testing Decisions

- Good tests should verify externally observable behavior rather than implementation details. For the event store, tests should assert accepted events, sequence ranges, idempotency behavior, stale-version rejection, and active replay behavior rather than private helper calls.
- Test the **Event Store** as a deep module with database-backed integration tests or a close PostgreSQL test harness. Critical behaviors include sequence assignment, atomic batches, idempotent retry, stale expected-version rejection, and correction relationship storage.
- Test the **Event Payload Codec Registry** with table-driven unit tests for each event type and schema version. Valid payloads should decode; invalid payloads should fail with useful errors.
- Test the **Active Event Resolver** with pure unit tests. Scenarios should include normal events, voided events, replaced events, replacement events sharing Effective Sequence, and deterministic ordering.
- Test the **Replay/Game State Projector** with pure unit tests built from Game Event fixtures. Scenarios should cover Pitch Events, Plate Appearance Results, Base Running Events, Inning Transitions, corrections, and Game Finalization/Reopening rules.
- Test the **Scorebook Projector** with pure unit tests. Scenarios should cover Lineup Spot-based Scorebook Rows, multiple Scorebook Cells in the same inning, substitutions, and notation overrides.
- Test the **Append Command Handler** with service-level tests. Scenarios should include a user command that creates one event, a user command that creates multiple events, system-generated events in the same batch, and stale command rejection.
- Test database constraints with migration/integration tests where feasible: unique Recorded Sequence per game, actor metadata requirements, event type check constraint, command/event relationships, and correction foreign keys.
- Existing codebase prior art is minimal: the current API has only health and placeholder games routes, and the shared package has initial Effect Schema definitions. Tests for this feature will likely establish the first meaningful testing patterns.

## Out of Scope

- User authentication and authorization beyond storing actor metadata.
- Full team, roster, player, and game setup CRUD.
- The full scorekeeping UI.
- Persisted Game State, Scorebook, stats, box score, or play-by-play projections.
- Snapshot storage and snapshot invalidation.
- Automatic earned/unearned run classification.
- Fully normalized tables for Runner Advancements, Out Details, Error Details, or other event payload internals.
- Database foreign keys for player/team IDs nested inside JSONB payloads.
- Failed command audit storage.
- Offline conflict resolution and multi-device synchronization beyond expected-version rejection.
- Import pipelines, even though actor metadata reserves an `import` actor type.
- Production operations such as backup/restore, archival, and compaction exports.

## Further Notes

- This PRD follows the domain glossary in `CONTEXT.md` and the architectural decisions recorded in ADR 0001 and ADR 0002.
- The event storage design is documented separately in the event storage design doc and should be treated as the implementation baseline.
- The issue tracker integration and triage label configuration were not available in this environment, so this PRD has been written to the repository and marked with `ready-for-agent` in the document header instead of being published externally.
