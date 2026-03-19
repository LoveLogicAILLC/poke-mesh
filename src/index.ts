import { Hono } from 'hono';
import { logger } from 'hono/logger';

const app = new Hono();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use('*', logger());

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * Health check endpoint.
 * Returns service name, status, and version.
 */
app.get('/health', (c) => {
  return c.json({
    service: 'poke-mesh',
    status: 'ok',
    version: '0.1.0',
  });
});

/**
 * Mesh status endpoint.
 * Returns current mesh topology, agent count, and health state.
 */
app.get('/mesh/status', (c) => {
  return c.json({
    agents: 0,
    topology: 'star',
    healthy: true,
  });
});

/**
 * Root endpoint — basic hello world.
 */
app.get('/', (c) => {
  return c.json({
    message: 'Hello from Poke-Mesh 🕸️',
    docs: '/health',
    mesh: '/mesh/status',
  });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.notFound((c) => {
  return c.json({ error: 'Not found', path: c.req.path }, 404);
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

// ── Server bootstrap (Node / Bun runtime only) ────────────────────────────────
const port = Number(process.env.PORT) || 3000;

export default {
  port,
  fetch: app.fetch,
};
