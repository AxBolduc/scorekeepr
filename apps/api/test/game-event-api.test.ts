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
  expectedLastRecordedSequence: 0,
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

test("one append command can persist multiple valid Game Events atomically", async () => {
  const api = createGameEventApi({
    eventStore: createInMemoryGameEventStore(),
  });
  const gamePath = "/api/games/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/events";

  const appendResponse = await api.request("POST", gamePath, {
    ...validAppendRequest,
    events: [
      validAppendRequest.events[0],
      {
        ...validAppendRequest.events[0],
        payload: {
          ...validAppendRequest.events[0].payload,
          result: "ball",
        },
      },
    ],
  });

  assert.equal(appendResponse.status, 201);
  assert.deepEqual(appendResponse.body, {
    commandId: validAppendRequest.commandId,
    firstRecordedSequence: 1,
    lastRecordedSequence: 2,
  });

  const readResponse = await api.request("GET", gamePath);

  assert.equal(readResponse.status, 200);
  assert.equal(readResponse.body.events.length, 2);
  assert.deepEqual(
    readResponse.body.events.map((event) => ({
      commandId: event.commandId,
      recordedSequence: event.recordedSequence,
      effectiveSequence: event.effectiveSequence,
    })),
    [
      {
        commandId: validAppendRequest.commandId,
        recordedSequence: 1,
        effectiveSequence: 1,
      },
      {
        commandId: validAppendRequest.commandId,
        recordedSequence: 2,
        effectiveSequence: 2,
      },
    ],
  );
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

test("a batch with any invalid Game Event persists no events", async () => {
  const api = createGameEventApi({
    eventStore: createInMemoryGameEventStore(),
  });
  const gamePath = "/api/games/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/events";

  const appendResponse = await api.request("POST", gamePath, {
    ...validAppendRequest,
    events: [
      validAppendRequest.events[0],
      {
        ...validAppendRequest.events[0],
        payload: {
          ...validAppendRequest.events[0].payload,
          result: "not_a_pitch_result",
        },
      },
    ],
  });

  assert.equal(appendResponse.status, 400);
  assert.deepEqual(appendResponse.body, {
    error: "Invalid PITCH_RECORDED payload",
  });

  const readResponse = await api.request("GET", gamePath);

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

test("user append requests require the expected last Recorded Sequence", async () => {
  const api = createGameEventApi({
    eventStore: createInMemoryGameEventStore(),
  });

  const appendResponse = await api.request(
    "POST",
    "/api/games/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/events",
    {
      ...validAppendRequest,
      expectedLastRecordedSequence: undefined,
    },
  );

  assert.equal(appendResponse.status, 400);
  assert.deepEqual(appendResponse.body, {
    error: "User append requests require expectedLastRecordedSequence",
  });
});

test("stale user append requests are rejected before insertion and can be retried with the current Recorded Sequence", async () => {
  const api = createGameEventApi({
    eventStore: createInMemoryGameEventStore(),
  });
  const gamePath = "/api/games/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/events";

  const firstAppendResponse = await api.request(
    "POST",
    gamePath,
    validAppendRequest,
  );
  assert.equal(firstAppendResponse.status, 201);

  const staleAppendResponse = await api.request("POST", gamePath, {
    ...validAppendRequest,
    commandId: "66666666-6666-4666-8666-666666666666",
    expectedLastRecordedSequence: 0,
  });

  assert.equal(staleAppendResponse.status, 409);
  assert.deepEqual(staleAppendResponse.body, {
    error:
      "Stale append request: expected last Recorded Sequence 0 but current is 1",
  });

  const readAfterStaleResponse = await api.request("GET", gamePath);
  assert.equal(readAfterStaleResponse.body.events.length, 1);

  const retryAppendResponse = await api.request("POST", gamePath, {
    ...validAppendRequest,
    commandId: "66666666-6666-4666-8666-666666666666",
    expectedLastRecordedSequence: 1,
  });

  assert.equal(retryAppendResponse.status, 201);
  assert.deepEqual(retryAppendResponse.body, {
    commandId: "66666666-6666-4666-8666-666666666666",
    firstRecordedSequence: 2,
    lastRecordedSequence: 2,
  });
});

test("retrying a completed command returns the existing sequence range without duplicating events", async () => {
  const api = createGameEventApi({
    eventStore: createInMemoryGameEventStore(),
  });
  const gamePath = "/api/games/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/events";
  const request = {
    ...validAppendRequest,
    events: [
      validAppendRequest.events[0],
      {
        ...validAppendRequest.events[0],
        payload: {
          ...validAppendRequest.events[0].payload,
          result: "ball",
        },
      },
    ],
  };

  const appendResponse = await api.request("POST", gamePath, request);
  assert.equal(appendResponse.status, 201);
  assert.deepEqual(appendResponse.body, {
    commandId: validAppendRequest.commandId,
    firstRecordedSequence: 1,
    lastRecordedSequence: 2,
  });

  const retryResponse = await api.request("POST", gamePath, request);

  assert.equal(retryResponse.status, 201);
  assert.deepEqual(retryResponse.body, {
    commandId: validAppendRequest.commandId,
    firstRecordedSequence: 1,
    lastRecordedSequence: 2,
  });

  const readResponse = await api.request("GET", gamePath);

  assert.equal(readResponse.body.events.length, 2);
});
