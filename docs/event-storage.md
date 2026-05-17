# Event Storage Design

Scorekeepr stores scored game history in PostgreSQL. The **Game Event** stream is the source of truth; derived state, scorebook views, box scores, and stats are computed from active events.

See also:

- [`CONTEXT.md`](../CONTEXT.md)
- [`docs/event-model.md`](./event-model.md)
- [`docs/adr/0001-event-log-as-source-of-truth.md`](./adr/0001-event-log-as-source-of-truth.md)
- [`docs/adr/0002-postgresql-game-event-store.md`](./adr/0002-postgresql-game-event-store.md)

---

## Storage Principles

1. **PostgreSQL owns the event store**
   - The platform uses PostgreSQL for the game event stream and related application data.

2. **One table stores all Game Events**
   - All event types are appended to one `game_events` table.
   - Replay uses one ordered stream per game.

3. **Event envelope is relational**
   - Identity, game ownership, type, ordering, actor metadata, schema version, and correction relationships are structured columns.

4. **Event payload is JSONB**
   - Event-specific details live in `payload jsonb`.
   - Payloads are validated by application code before insertion.
   - Core replay/order/correction fields should not live only inside JSONB.

5. **Append-only**
   - Game history changes through new events, not updates or deletes.
   - Production should enforce append-only behavior at the database level.

6. **Database-protected sequencing**
   - Clients do not assign event sequence numbers.
   - The append transaction assigns recorded/effective sequences safely.

7. **No persisted projections in MVP**
   - The MVP stores events and derives game state/scorebook views on demand.
   - Persisted projections and snapshots can be added later if performance demands them.

---

## Proposed Tables

### `game_events`

Stores all accepted Game Events.

```sql
create table game_events (
  id uuid primary key,

  -- Operational insertion order across the platform.
  global_sequence bigint generated always as identity unique,

  game_id uuid not null references games(id),
  command_id uuid not null references game_event_commands(id),

  type text not null,
  payload_schema_version integer not null default 1,
  payload jsonb not null,

  -- Order in which the event was actually recorded within the game.
  recorded_sequence integer not null,

  -- Logical order in which the event participates in replay.
  effective_sequence integer not null,

  -- Correction relationships. These are structured because replay depends on them.
  replaces_event_id uuid null references game_events(id),
  voids_event_id uuid null references game_events(id),

  recorded_at timestamptz not null default now(),

  recorded_by_actor_type text not null,
  recorded_by_user_id uuid null references users(id),
  recorded_by_role text null,

  constraint game_events_recorded_sequence_unique
    unique (game_id, recorded_sequence),

  constraint game_events_actor_type_check
    check (recorded_by_actor_type in ('user', 'system', 'import')),

  constraint game_events_user_actor_check
    check (
      (recorded_by_actor_type = 'user' and recorded_by_user_id is not null)
      or
      (recorded_by_actor_type <> 'user')
    ),

  constraint game_events_type_check
    check (type in (
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
```

Notes:

- `recorded_sequence` is unique per game.
- `effective_sequence` is intentionally **not** unique per game because replacement events may share the replaced event's effective position.
- `global_sequence` is for operational audit/debugging only; replay should use per-game effective ordering.
- IDs inside `payload` are validated by application/replay logic for MVP, not by database foreign keys.

---

### `game_event_commands`

Tracks accepted append batches and provides idempotency for client retries.

```sql
create table game_event_commands (
  id uuid primary key,
  game_id uuid not null references games(id),

  status text not null,

  expected_last_recorded_sequence integer null,
  first_recorded_sequence integer null,
  last_recorded_sequence integer null,

  requested_by_actor_type text not null,
  requested_by_user_id uuid null references users(id),
  requested_by_role text null,

  created_at timestamptz not null default now(),
  completed_at timestamptz null,

  constraint game_event_commands_game_id_id_unique
    unique (game_id, id),

  constraint game_event_commands_status_check
    check (status in ('completed')),

  constraint game_event_commands_actor_type_check
    check (requested_by_actor_type in ('user', 'system', 'import')),

  constraint game_event_commands_user_actor_check
    check (
      (requested_by_actor_type = 'user' and requested_by_user_id is not null)
      or
      (requested_by_actor_type <> 'user')
    )
);
```

MVP stores successful commands only. Failed commands, stale expected-version attempts, and validation errors are returned to the client but not persisted.

---

## Event Type Storage

Use `type text` with a check constraint rather than a PostgreSQL enum.

Reasons:

- Easier to evolve during early development.
- Still prevents invalid event type strings.
- Avoids PostgreSQL enum migration friction.

---

## Payload Storage

Event-specific bodies are stored in `payload jsonb`.

Examples:

- Pitch result details
- Plate Appearance Result details
- Runner Advancements
- Out Details
- Error Details
- Game Rules
- Courtesy runner details

Rules:

- Payload shape is validated in application code before insertion.
- Payload validation should dispatch by `(type, payload_schema_version)`.
- Do not depend on JSONB for core event ordering, ownership, actor, correction, or schema-version data.
- Do not query JSONB as the primary way to replay a game.

---

## Payload Schema Versioning

Each event row includes:

```sql
payload_schema_version integer not null default 1
```

This allows the replay engine to select the correct decoder/validator for historical event payloads.

Do not infer payload shape from timestamps.

---

## Sequencing

### Per-game recorded sequence

`recorded_sequence` is the order in which events were actually recorded for a game.

Rules:

- Assigned by the database-protected append flow.
- Unique within a game.
- Not assigned by clients.

### Per-game effective sequence

`effective_sequence` is the logical order in which events participate in replay.

Rules:

- Usually equal to `recorded_sequence`.
- Replacement events use the replaced event's `effective_sequence`.
- Not unique within a game.

### Global sequence

`global_sequence` is a platform-wide insertion order.

Rules:

- Useful for audit/debugging/support.
- Does not drive domain replay.

---

## Correction Storage

Corrections are represented through appended events and structured relationships.

### Voiding an event

A `GAME_EVENT_VOIDED` row has:

```text
voids_event_id = original_event_id
```

The voided event remains in history but is excluded from active replay.

### Replacing an event

A replacement event has:

```text
replaces_event_id = original_event_id
effective_sequence = original.effective_sequence
recorded_sequence = newly assigned sequence
```

The original event remains in history but is excluded from active replay once replaced.

### Correction reason

Human-facing correction details, such as reason text, live in the correction event payload.

---

## Active Replay Concept

Replay should use active events only:

- Include normal events that have not been voided or replaced.
- Include replacement events at their effective sequence.
- Consume structured `voids_event_id` / `replaces_event_id` relationships before projection.
- Exclude `GAME_EVENT_VOIDED` / `GAME_EVENT_CORRECTED` metadata events from baseball Game State projection while preserving them in full history.

Conceptual query shape:

```sql
select *
from game_events e
where e.game_id = $1
  and not exists (
    select 1
    from game_events v
    where v.game_id = e.game_id
      and v.voids_event_id = e.id
  )
  and not exists (
    select 1
    from game_events r
    where r.game_id = e.game_id
      and r.replaces_event_id = e.id
  )
order by e.effective_sequence, e.recorded_sequence;
```

The Active Event Resolver is the replay-facing preprocessor. It returns only active events for Game State and Projection code: original events referenced by void/replacement relationships are excluded, correction metadata events are excluded from baseball state, and remaining active events are ordered by `(effective_sequence, recorded_sequence)` so replacement events can share the replaced event's Effective Sequence deterministically.

---

## Indexes

Recommended initial indexes:

```sql
create index game_events_game_recorded_sequence_idx
  on game_events (game_id, recorded_sequence);

create index game_events_game_effective_sequence_idx
  on game_events (game_id, effective_sequence, recorded_sequence);

create index game_events_game_type_idx
  on game_events (game_id, type);

create index game_events_replaces_event_id_idx
  on game_events (replaces_event_id)
  where replaces_event_id is not null;

create index game_events_voids_event_id_idx
  on game_events (voids_event_id)
  where voids_event_id is not null;

create index game_events_command_id_idx
  on game_events (command_id);
```

---

## Append Flow

Append requests support atomic batches.

A single command can create multiple Game Events, such as:

1. `PLATE_APPEARANCE_RESULTED`
2. `HALF_INNING_ENDED`
3. `HALF_INNING_STARTED`

All events in the batch share the same `command_id`.

### Expected version

User-scoring append requests include:

```ts
expectedLastRecordedSequence: number;
```

If the current game stream has advanced beyond that sequence, the append is rejected and the client must reload/reconcile.

### Transaction outline

1. Begin transaction.
2. Acquire a PostgreSQL transaction-scoped advisory lock keyed by `game_id`.
   - This is the MVP default per-game append lock.
   - The lock is held only for the append transaction and protects current-version checks plus Recorded Sequence assignment.
   - Clients still never assign sequence values.
3. Check current last recorded sequence.
4. Compare to `expectedLastRecordedSequence` for user commands.
5. Validate event payloads in application code.
6. Insert `game_event_commands` row.
7. Assign consecutive `recorded_sequence` values.
8. Assign `effective_sequence` values.
   - Normal events: same as recorded sequence.
   - Replacement events: replaced event's effective sequence.
9. Insert all `game_events` rows.
10. Update command row with first/last recorded sequence and completed timestamp.
11. Commit transaction.

---

## Idempotency

`game_event_commands.id` acts as the idempotency key for append requests.

Rules:

- A retry with the same command ID for a completed command should return the existing event sequence range.
- A command may produce multiple events.
- `game_events.command_id` links each event to the accepted command.
- MVP stores successful commands only.
- Failed validation attempts and stale expected-version attempts are returned as errors and are not persisted in the MVP command table.

---

## Actor Metadata

Events and commands include actor metadata.

```sql
recorded_by_actor_type text not null
recorded_by_user_id uuid null
recorded_by_role text null
```

Supported actor types:

- `user`
- `system`
- `import`

Rules:

- User actor events require `recorded_by_user_id`.
- System-generated events, such as Inning Transitions, are stored as normal Game Events with system actor metadata.

---

## Append-only Enforcement

During early development, migrations and resets may need flexibility.

Before production, enforce append-only behavior for `game_events` using one or more of:

- Database permissions that deny application `UPDATE` and `DELETE`
- Triggers that reject updates/deletes
- Restricted maintenance roles for migrations only

Corrections must append new events instead of mutating existing rows.

---

## Projection Strategy

MVP should avoid persisted projections unless performance forces them.

Initial approach:

- Store Game Events.
- Derive Game State on demand during scoring.
- Derive scorebook grid on demand from events.
- Derive play-by-play from events.
- Delay persisted stats projections until stat rules stabilize.

Future persisted projections may include:

- Current game state
- Scorebook cells
- Line score
- Box score
- Player game stats
- Season stats

Persisted projections must be rebuildable from Game Events.

---

## Snapshot Strategy

No snapshots for MVP.

Design considerations for later:

- Store derived Game State at a specific recorded/effective sequence.
- Replay from latest valid snapshot plus later events.
- Corrections to earlier events may invalidate later snapshots.

Because game event streams are expected to be manageable initially, full replay is acceptable for MVP.

---

## Open Questions

1. When persisted projections are added, should they update synchronously in the append transaction or asynchronously after commit?
2. Should archived/finalized games get compacted exports or remain only as event streams plus rebuildable projections?

Resolved for MVP:

- Per-game append locking uses a PostgreSQL transaction-scoped advisory lock keyed by `game_id`.
- Active replay uses an Active Event Resolver preprocessor that consumes structured correction relationships, excludes correction metadata from baseball Game State projection, and sorts by `(effective_sequence, recorded_sequence)`.
- `game_event_commands` stores successful commands only; failed/stale command attempts are returned as errors and not persisted for MVP.
