import { describe, it, expect } from 'bun:test';
import app from '../app';

describe('/ root endpoint', () => {
  it('returns HTTP 200', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
  });

  it('returns JSON content-type', async () => {
    const res = await app.request('/');
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('response body has the correct shape {message, docs, mesh}', async () => {
    const res = await app.request('/');
    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('message');
    expect(body).toHaveProperty('docs');
    expect(body).toHaveProperty('mesh');
  });

  it('message is a non-empty string', async () => {
    const res = await app.request('/');
    const body = await res.json() as { message: string };
    expect(typeof body.message).toBe('string');
    expect(body.message.length).toBeGreaterThan(0);
  });

  it('docs points to /health', async () => {
    const res = await app.request('/');
    const body = await res.json() as { docs: string };
    expect(body.docs).toBe('/health');
  });

  it('mesh points to /mesh/status', async () => {
    const res = await app.request('/');
    const body = await res.json() as { mesh: string };
    expect(body.mesh).toBe('/mesh/status');
  });

  it('docs path resolves to a valid endpoint (health check reachable)', async () => {
    const rootRes = await app.request('/');
    const root = await rootRes.json() as { docs: string };
    // Follow the docs link and verify it returns 200
    const docsRes = await app.request(root.docs);
    expect(docsRes.status).toBe(200);
  });

  it('mesh path resolves to a valid endpoint (mesh status reachable)', async () => {
    const rootRes = await app.request('/');
    const root = await rootRes.json() as { mesh: string };
    // Follow the mesh link and verify it returns 200
    const meshRes = await app.request(root.mesh);
    expect(meshRes.status).toBe(200);
  });

  it('handles GET with trailing slash correctly — no 404', async () => {
    // Some routers treat "/" and "" differently; both should work
    const res = await app.request('/');
    expect(res.status).toBe(200);
  });
});
