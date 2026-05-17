import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createGameEventApi,
  createInMemoryGameEventStore,
} from "../src/game-events/api.ts";

const validAppendRequest = {
  commandId: "11111111-1111-4111-8111-111111111111",
  actor: {
    type: "user",
    userId: "22222222-2222-4222-8222-222222222222",
    role: "scorekeeper",
  },
  events: [
    {
      type: "PITCH_RECORDED",
      payloadSchemaVersion: 1,
      payload: {
        pitcherId: "33333333-3333-4333-8333-333333333333",
        batterId: "44444444-4444-4444-8444-444444444444",
        lineupSpotId: "55555555-5555-4555-8555-555555555555",
        result: "called_strike",
      },
    },
  ],
};

test("a client can append and read one validated Pitch Event", async () => {
  const api = createGameEventApi({
    eventStore: createInMemoryGameEventStore(),
  });

  const appendResponse = await api.request(
    "POST",
    "/api/games/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/events",
    validAppendRequest,
  );

  assert.equal(appendResponse.status, 201);
  assert.deepEqual(appendResponse.body, {
    commandId: validAppendRequest.commandId,
    firstRecordedSequence: 1,
    lastRecordedSequence: 1,
  });

  const readResponse = await api.request(
    "GET",
    "/api/games/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/events",
  );

  assert.equal(readResponse.status, 200);
  assert.equal(readResponse.body.events.length, 1);
  assert.deepEqual(readResponse.body.events[0], {
    id: readResponse.body.events[0].id,
    gameId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    commandId: validAppendRequest.commandId,
    type: "PITCH_RECORDED",
    payloadSchemaVersion: 1,
    payload: validAppendRequest.events[0].payload,
    recordedSequence: 1,
    effectiveSequence: 1,
    replacesEventId: null,
    voidsEventId: null,
    recordedAt: readResponse.body.events[0].recordedAt,
    recordedByActorType: "user",
    recordedByUserId: validAppendRequest.actor.userId,
    recordedByRole: "scorekeeper",
  });
  assert.match(readResponse.body.events[0].id, /^[0-9a-f-]{36}$/);
  assert.match(readResponse.body.events[0].recordedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("invalid Pitch Event payloads fail before insertion with a useful error", async () => {
  const api = createGameEventApi({
    eventStore: createInMemoryGameEventStore(),
  });

  const appendResponse = await api.request(
    "POST",
    "/api/games/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/events",
    {
      ...validAppendRequest,
      events: [
        {
          type: "PITCH_RECORDED",
          payloadSchemaVersion: 1,
          payload: {
            pitcherId: "33333333-3333-4333-8333-333333333333",
            batterId: "44444444-4444-4444-8444-444444444444",
            lineupSpotId: "55555555-5555-4555-8555-555555555555",
            result: "not_a_pitch_result",
          },
        },
      ],
    },
  );

  assert.equal(appendResponse.status, 400);
  assert.deepEqual(appendResponse.body, {
    error: "Invalid PITCH_RECORDED payload",
  });

  const readResponse = await api.request(
    "GET",
    "/api/games/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/events",
  );

  assert.deepEqual(readResponse.body, { events: [] });
});

test("client-assigned sequence fields are rejected", async () => {
  const api = createGameEventApi({
    eventStore: createInMemoryGameEventStore(),
  });

  const appendResponse = await api.request(
    "POST",
    "/api/games/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/events",
    {
      ...validAppendRequest,
      events: [
        {
          ...validAppendRequest.events[0],
          recordedSequence: 99,
          effectiveSequence: 99,
        },
      ],
    },
  );

  assert.equal(appendResponse.status, 400);
  assert.deepEqual(appendResponse.body, {
    error: "Clients must not assign Recorded Sequence or Effective Sequence",
  });
});
