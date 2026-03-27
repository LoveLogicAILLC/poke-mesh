import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { timing } from "hono/timing";
import type { Env } from "./types/env";

const app = new Hono<{ Bindings: Env }>();

// ── Middleware ─────────────────────────────
app.use("*", logger());
app.use("*", cors());
app.use("*", timing());

// ── Health ────────────────────────────────
app.get("/health", (c) => {
  return c.json({
    service: "poke-mesh",
    status: "ok",
    version: "0.1.0",
    environment: c.env?.LOG_LEVEL ?? "unknown",
  });
});

// ── Mesh Status ───────────────────────────
app.get("/mesh/status", async (c) => {
  // Try to read cached mesh state from KV
  let cachedState: string | null = null;
  try {
    if (c.env?.MESH_CACHE) {
      cachedState = await c.env.MESH_CACHE.get("mesh:latest-state");
    }
  } catch {
    // KV not available (local dev)
  }

  if (cachedState) {
    return c.json(JSON.parse(cachedState));
  }

  return c.json({
    agents: 0,
    topology: "star",
    healthy: true,
    maxAgents: Number(c.env?.MESH_MAX_AGENTS ?? 100),
    gossipIntervalMs: Number(c.env?.MESH_GOSSIP_INTERVAL_MS ?? 5000),
  });
});

// ── Agent Registration ────────────────────
app.post("/agents/register", async (c) => {
  const body = await c.req.json();
  const { name, address } = body;

  if (!name || !address) {
    return c.json({ error: "name and address are required" }, 400);
  }

  const agent = {
    id: crypto.randomUUID(),
    name,
    address,
    status: "active",
    registeredAt: new Date().toISOString(),
  };

  // TODO: persist to D1 once schema is wired up
  return c.json({ agent }, 201);
});

// ── Agent Deregistration ──────────────────
app.delete("/agents/:id", async (c) => {
  const agentId = c.req.param("id");
  // TODO: deregister from D1
  return c.json({ deregistered: agentId });
});

// ── List Agents ───────────────────────────
app.get("/agents", async (c) => {
  // TODO: query from D1
  return c.json({ agents: [], total: 0 });
});

// ── Gossip Endpoint ───────────────────────
app.post("/mesh/gossip", async (c) => {
  const message = await c.req.json();
  // TODO: validate and propagate gossip message
  return c.json({ received: true, messageId: crypto.randomUUID() });
});

// ── Root ──────────────────────────────────
app.get("/", (c) => {
  return c.json({
    service: "poke-mesh",
    version: "0.1.0",
    endpoints: {
      health: "/health",
      meshStatus: "/mesh/status",
      agents: "/agents",
      register: "POST /agents/register",
      gossip: "POST /mesh/gossip",
    },
  });
});

// ── 404 ───────────────────────────────────
app.notFound((c) => {
  return c.json({ error: "Not found", path: c.req.path }, 404);
});

// ── Error handler ─────────────────────────
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
export { app };
