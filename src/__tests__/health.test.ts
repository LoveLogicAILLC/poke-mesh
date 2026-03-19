import { describe, it, expect } from 'bun:test';
import app from '../app';

describe('/health endpoint', () => {
  it('returns HTTP 200', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
  });

  it('returns JSON content-type', async () => {
    const res = await app.request('/health');
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('response body has the correct shape {service, status, version}', async () => {
    const res = await app.request('/health');
    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('service');
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('version');
  });

  it('service is "poke-mesh"', async () => {
    const res = await app.request('/health');
    const body = await res.json() as { service: string };
    expect(body.service).toBe('poke-mesh');
  });

  it('status is "ok"', async () => {
    const res = await app.request('/health');
    const body = await res.json() as { status: string };
    expect(body.status).toBe('ok');
  });

  it('version matches semver pattern (e.g. 0.1.0)', async () => {
    const res = await app.request('/health');
    const body = await res.json() as { version: string };
    // Semver: major.minor.patch with optional pre-release/build metadata
    const semverPattern = /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/;
    expect(body.version).toMatch(semverPattern);
  });

  it('response body contains no extra unexpected fields', async () => {
    const res = await app.request('/health');
    const body = await res.json() as Record<string, unknown>;
    const keys = Object.keys(body);
    expect(keys).toContain('service');
    expect(keys).toContain('status');
    expect(keys).toContain('version');
    // Exactly these three keys
    expect(keys.length).toBe(3);
  });

  it('handles GET with query params and still returns 200', async () => {
    const res = await app.request('/health?verbose=true&ts=12345');
    expect(res.status).toBe(200);
    const body = await res.json() as { service: string; status: string };
    expect(body.service).toBe('poke-mesh');
    expect(body.status).toBe('ok');
  });

  it('HEAD request to /health returns 200 (no body required)', async () => {
    const res = await app.request('/health', { method: 'HEAD' });
    expect(res.status).toBe(200);
  });
});
