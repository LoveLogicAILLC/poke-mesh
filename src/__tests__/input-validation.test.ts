import { describe, expect, it } from 'bun:test';
import app from '../app';

const jsonHeaders = { 'content-type': 'application/json' };

describe('POST /agents/register — input validation', () => {
  it('registers a valid agent with 201', async () => {
    const res = await app.request('/agents/register', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ name: 'agent-a', address: '10.0.0.5:4001' }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { agent: { id: string; name: string } };
    expect(body.agent.name).toBe('agent-a');
    expect(typeof body.agent.id).toBe('string');
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await app.request('/agents/register', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ name: 'no-address' }),
    });
    expect(res.status).toBe(400);
  });

  // Regression: malformed JSON previously bubbled into the global 500 handler,
  // turning a client input error into a server error.
  it('returns 400 (not 500) on malformed JSON', async () => {
    const res = await app.request('/agents/register', {
      method: 'POST',
      headers: jsonHeaders,
      body: '{ this is not valid json',
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /mesh/gossip — input validation', () => {
  it('accepts a well-formed gossip message', async () => {
    const res = await app.request('/mesh/gossip', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ type: 'gossip', payload: { hello: 'world' } }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { received: boolean; messageId: string };
    expect(body.received).toBe(true);
  });

  it('returns 400 (not 500) on malformed JSON', async () => {
    const res = await app.request('/mesh/gossip', {
      method: 'POST',
      headers: jsonHeaders,
      body: 'not json at all',
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /mesh/status — resilient to corrupt cache', () => {
  it('returns the computed default when no KV cache is bound (local dev)', async () => {
    const res = await app.request('/mesh/status');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { agents: number; healthy: boolean };
    expect(body.agents).toBe(0);
    expect(body.healthy).toBe(true);
  });
});
