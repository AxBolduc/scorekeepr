import {
  resolveActiveGameEvents,
  validateGameEventPayload,
  type ActorType,
  type GameEventType,
  type StoredGameEvent,
} from "@scorekeepr/shared";
import { randomUUID } from "node:crypto";

type AppendGameEventRequest = {
  commandId: string;
  actor: {
    type: ActorType;
    userId?: string;
    role?: string;
  };
  events: Array<{
    type: GameEventType;
    payloadSchemaVersion?: number;
    payload: unknown;
  }>;
};

type ApiResponse = {
  status: number;
  body: unknown;
};

export type GameEventStore = {
  append: (input: {
    gameId: string;
    commandId: string;
    actor: AppendGameEventRequest["actor"];
    events: AppendGameEventRequest["events"];
  }) => Promise<
    | {
        ok: true;
        commandId: string;
        firstRecordedSequence: number;
        lastRecordedSequence: number;
      }
    | { ok: false; status: number; error: string }
  >;
  read: (gameId: string) => Promise<StoredGameEvent[]>;
};

export const createInMemoryGameEventStore = (): GameEventStore => {
  const eventsByGameId = new Map<string, StoredGameEvent[]>();

  return {
    append: async ({ gameId, commandId, actor, events }) => {
      if (actor.type === "user" && actor.userId === undefined) {
        return { ok: false, status: 400, error: "User actor requires userId" };
      }

      if (events.length === 0) {
        return {
          ok: false,
          status: 400,
          error: "At least one Game Event is required",
        };
      }

      const validatedEvents = [] as Array<{
        type: GameEventType;
        payloadSchemaVersion: number;
        payload: unknown;
      }>;

      for (const event of events) {
        if ("recordedSequence" in event || "effectiveSequence" in event) {
          return {
            ok: false,
            status: 400,
            error:
              "Clients must not assign Recorded Sequence or Effective Sequence",
          };
        }

        const payloadSchemaVersion = event.payloadSchemaVersion ?? 1;
        const validation = validateGameEventPayload(
          event.type,
          payloadSchemaVersion,
          event.payload,
        );

        if (!validation.ok) {
          return { ok: false, status: 400, error: validation.error };
        }

        validatedEvents.push({
          type: event.type,
          payloadSchemaVersion,
          payload: validation.payload,
        });
      }

      const gameEvents = eventsByGameId.get(gameId) ?? [];
      const firstRecordedSequence = gameEvents.length + 1;
      const recordedAt = new Date().toISOString();

      const storedEvents = validatedEvents.map(
        (event, index): StoredGameEvent => {
          const recordedSequence = firstRecordedSequence + index;

          return {
            id: randomUUID(),
            gameId,
            commandId,
            type: event.type,
            payloadSchemaVersion: event.payloadSchemaVersion,
            payload: event.payload,
            recordedSequence,
            effectiveSequence: recordedSequence,
            replacesEventId: null,
            voidsEventId: null,
            recordedAt,
            recordedByActorType: actor.type,
            recordedByUserId: actor.userId ?? null,
            recordedByRole: actor.role ?? null,
          };
        },
      );

      eventsByGameId.set(gameId, [...gameEvents, ...storedEvents]);

      return {
        ok: true,
        commandId,
        firstRecordedSequence,
        lastRecordedSequence: firstRecordedSequence + storedEvents.length - 1,
      };
    },
    read: async (gameId) =>
      resolveActiveGameEvents(eventsByGameId.get(gameId) ?? []),
  };
};

const eventPathPattern = /^\/api\/games\/([^/]+)\/events$/;

const parseAppendRequest = (body: unknown): AppendGameEventRequest | null => {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const request = body as AppendGameEventRequest;

  if (
    typeof request.commandId !== "string" ||
    typeof request.actor !== "object" ||
    request.actor === null ||
    !["user", "system", "import"].includes(request.actor.type) ||
    !Array.isArray(request.events)
  ) {
    return null;
  }

  return request;
};

export const createGameEventApi = ({
  eventStore,
}: {
  eventStore: GameEventStore;
}) => ({
  request: async (
    method: string,
    path: string,
    body?: unknown,
  ): Promise<ApiResponse> => {
    const match = eventPathPattern.exec(path);

    if (match === null) {
      return { status: 404, body: { error: "Not found" } };
    }

    const gameId = match[1];

    if (method === "POST") {
      const request = parseAppendRequest(body);

      if (request === null) {
        return { status: 400, body: { error: "Invalid append request" } };
      }

      const result = await eventStore.append({ gameId, ...request });

      if (!result.ok) {
        return { status: result.status, body: { error: result.error } };
      }

      return {
        status: 201,
        body: {
          commandId: result.commandId,
          firstRecordedSequence: result.firstRecordedSequence,
          lastRecordedSequence: result.lastRecordedSequence,
        },
      };
    }

    if (method === "GET") {
      return { status: 200, body: { events: await eventStore.read(gameId) } };
    }

    return { status: 405, body: { error: "Method not allowed" } };
  },
});
