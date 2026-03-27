import { describe, it, expect } from 'bun:test';
import app from '../app';

describe('Error handling — unknown routes', () => {
  it('unknown route returns HTTP 404', async () => {
    const res = await app.request('/does-not-exist');
    expect(res.status).toBe(404);
  });

  it('404 response body has {error, path} shape', async () => {
    const res = await app.request('/does-not-exist');
    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('path');
  });

  it('404 error field is "Not found"', async () => {
    const res = await app.request('/does-not-exist');
    const body = await res.json() as { error: string };
    expect(body.error).toBe('Not found');
  });

  it('404 response includes the requested path', async () => {
    const res = await app.request('/does-not-exist');
    const body = await res.json() as { path: string };
    expect(body.path).toBe('/does-not-exist');
  });

  it('path field reflects deeply nested unknown routes', async () => {
    const res = await app.request('/api/v1/agents/unknown/sub/path');
    expect(res.status).toBe(404);
    const body = await res.json() as { path: string };
    expect(body.path).toBe('/api/v1/agents/unknown/sub/path');
  });

  it('404 response has JSON content-type', async () => {
    const res = await app.request('/not-here');
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('unknown POST route also returns 404', async () => {
    const res = await app.request('/no-such-resource', { method: 'POST' });
    expect(res.status).toBe(404);
    const body = await res.json() as { error: string; path: string };
    expect(body.error).toBe('Not found');
    expect(body.path).toBe('/no-such-resource');
  });

  it('known routes do NOT return 404', async () => {
    const knownRoutes = ['/', '/health', '/mesh/status'];
    for (const route of knownRoutes) {
      const res = await app.request(route);
      expect(res.status).not.toBe(404);
    }
  });

  it('path with query string returns the path without query string', async () => {
    // c.req.path strips query string by design in Hono
    const res = await app.request('/unknown-path?foo=bar');
    expect(res.status).toBe(404);
    const body = await res.json() as { path: string };
    // Hono's c.req.path does not include query parameters
    expect(body.path).toBe('/unknown-path');
  });
});
