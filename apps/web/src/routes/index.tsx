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
    <main className="box-border min-h-screen bg-scorebook-paper px-6 py-16 text-scorebook-ink sm:px-10 lg:px-20">
      <section className="max-w-5xl rounded-3xl border-2 border-scorebook-green bg-scorebook-card p-6 shadow-[12px_12px_0_#1f3d24] sm:p-10 lg:p-12">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-scorebook-gold">Scorekeepr</p>
        <h1 className="max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.05em] sm:text-7xl lg:text-8xl">
          Traditional baseball scorekeeping, built for the web.
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-scorebook-ink/85">
          This TanStack Start frontend is wired into the Effect backend scaffold. Next up:
          model Game Events, derive Game State, and render scorebook Projections.
        </p>
        <div
          className={[
            "mt-6 inline-flex items-center gap-2 rounded-full px-4 py-3 font-bold",
            ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800",
          ].join(" ")}
        >
          <span aria-hidden="true">{ok ? "●" : "○"}</span>
          {ok ? `API online (${health.service})` : "API offline — start @scorekeepr/api"}
        </div>
      </section>
    </main>
  )
}
