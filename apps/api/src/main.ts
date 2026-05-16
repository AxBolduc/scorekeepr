import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { createHealthResponse } from "@scorekeepr/shared"
import { Effect, Layer } from "effect"
import { HttpRouter, HttpServerResponse } from "effect/unstable/http"
import { createServer } from "node:http"

const port = Number.parseInt(process.env.PORT ?? "4000", 10)

const json = (body: unknown) =>
  HttpServerResponse.text(JSON.stringify(body), {
    contentType: "application/json",
  })

const Routes = Layer.mergeAll(
  HttpRouter.add(
    "GET",
    "/health",
    Effect.succeed(json(createHealthResponse(process.env.npm_package_version ?? "0.0.0"))),
  ),
  HttpRouter.add("GET", "/api/games", Effect.succeed(json({ games: [] }))),
)

const HttpServerLive = HttpRouter.serve(Routes).pipe(
  Layer.provide(NodeHttpServer.layer(createServer, { port })),
)

Layer.launch(HttpServerLive).pipe(NodeRuntime.runMain)
