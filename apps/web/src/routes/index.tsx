import { createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import type { HealthResponse } from "@scorekeepr/shared"

const getApiBaseUrl = () => process.env.VITE_API_URL ?? "http://localhost:4000"

const getApiHealth = createServerFn({ method: "GET" }).handler(async (): Promise<HealthResponse | null> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/health`)
    if (!response.ok) return null
    return (await response.json()) as HealthResponse
  } catch {
    return null
  }
})

export const Route = createFileRoute("/")({
  component: Home,
  loader: () => getApiHealth(),
})

function Home() {
  const health = Route.useLoaderData()
  const ok = health?.ok === true

  return (
    <main className="page">
      <section className="card">
        <p className="eyebrow">Scorekeepr</p>
        <h1>Traditional baseball scorekeeping, built for the web.</h1>
        <p>
          This TanStack Start frontend is wired into the Effect backend scaffold. Next up:
          model Game Events, derive Game State, and render scorebook Projections.
        </p>
        <div className="status" data-ok={ok}>
          <span aria-hidden="true">{ok ? "●" : "○"}</span>
          {ok ? `API online (${health.service})` : "API offline — start @scorekeepr/api"}
        </div>
      </section>
    </main>
  )
}
