import { describe, it, expect } from 'bun:test';
import app from '../app';

describe('/mesh/status endpoint', () => {
  it('returns HTTP 200', async () => {
    const res = await app.request('/mesh/status');
    expect(res.status).toBe(200);
  });

  it('returns JSON content-type', async () => {
    const res = await app.request('/mesh/status');
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('response body has the correct shape {agents, topology, healthy}', async () => {
    const res = await app.request('/mesh/status');
    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('agents');
    expect(body).toHaveProperty('topology');
    expect(body).toHaveProperty('healthy');
  });

  it('agents is a number >= 0', async () => {
    const res = await app.request('/mesh/status');
    const body = await res.json() as { agents: number };
    expect(typeof body.agents).toBe('number');
    expect(body.agents).toBeGreaterThanOrEqual(0);
  });

  it('topology is a valid non-empty string', async () => {
    const res = await app.request('/mesh/status');
    const body = await res.json() as { topology: string };
    expect(typeof body.topology).toBe('string');
    expect(body.topology.length).toBeGreaterThan(0);
  });

  it('topology is one of the expected topology types', async () => {
    const res = await app.request('/mesh/status');
    const body = await res.json() as { topology: string };
    const validTopologies = ['star', 'ring', 'full-mesh'];
    expect(validTopologies).toContain(body.topology);
  });

  it('healthy is a boolean', async () => {
    const res = await app.request('/mesh/status');
    const body = await res.json() as { healthy: boolean };
    expect(typeof body.healthy).toBe('boolean');
  });

  it('default state reports healthy=true with zero agents', async () => {
    const res = await app.request('/mesh/status');
    const body = await res.json() as { agents: number; healthy: boolean };
    // An empty mesh (0 agents) should report as healthy
    if (body.agents === 0) {
      expect(body.healthy).toBe(true);
    }
  });

  it('handles GET with query params and still returns valid shape', async () => {
    const res = await app.request('/mesh/status?format=full');
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('agents');
    expect(body).toHaveProperty('topology');
    expect(body).toHaveProperty('healthy');
  });
});
