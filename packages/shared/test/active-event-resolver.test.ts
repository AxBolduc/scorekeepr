import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveActiveGameEvents, type StoredGameEvent } from "../src/index.ts";

const event = (
  overrides: Partial<StoredGameEvent> &
    Pick<
      StoredGameEvent,
      "id" | "type" | "recordedSequence" | "effectiveSequence"
    >,
): StoredGameEvent => ({
  gameId: "game-1",
  commandId: "command-1",
  payloadSchemaVersion: 1,
  payload: {},
  recordedAt: "2026-05-17T00:00:00.000Z",
  recordedByActorType: "user",
  recordedByUserId: "user-1",
  recordedByRole: "scorekeeper",
  replacesEventId: null,
  voidsEventId: null,
  ...overrides,
});

test("active Game Events exclude voided originals and correction metadata", () => {
  const pitch = event({
    id: "event-1",
    type: "PITCH_RECORDED",
    recordedSequence: 1,
    effectiveSequence: 1,
  });

  const voidPitch = event({
    id: "event-2",
    type: "GAME_EVENT_VOIDED",
    recordedSequence: 2,
    effectiveSequence: 2,
    voidsEventId: pitch.id,
    payload: { reason: "mistap" },
  });

  assert.deepEqual(resolveActiveGameEvents([pitch, voidPitch]), []);
});

test("replacement Game Events replay at the replaced Effective Sequence with deterministic ordering", () => {
  const originalPitch = event({
    id: "event-1",
    type: "PITCH_RECORDED",
    recordedSequence: 1,
    effectiveSequence: 1,
    payload: { result: "ball" },
  });

  const followingPitch = event({
    id: "event-2",
    type: "PITCH_RECORDED",
    recordedSequence: 2,
    effectiveSequence: 2,
    payload: { result: "strike" },
  });

  const correctedPitch = event({
    id: "event-3",
    type: "PITCH_RECORDED",
    recordedSequence: 3,
    effectiveSequence: originalPitch.effectiveSequence,
    replacesEventId: originalPitch.id,
    payload: { result: "called-strike" },
  });

  const correctionMetadata = event({
    id: "event-4",
    type: "GAME_EVENT_CORRECTED",
    recordedSequence: 4,
    effectiveSequence: 4,
    payload: { reason: "pitch result correction" },
  });

  assert.deepEqual(
    resolveActiveGameEvents([
      followingPitch,
      correctionMetadata,
      correctedPitch,
      originalPitch,
    ]).map((activeEvent) => activeEvent.id),
    ["event-3", "event-2"],
  );
});
