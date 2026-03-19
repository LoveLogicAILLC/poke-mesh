import { describe, it, expect, beforeEach } from 'bun:test';
import { GossipProtocol, type GossipMessage } from '../mesh/gossip';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMessage(overrides: Partial<GossipMessage> = {}): GossipMessage {
  return {
    id: 'msg-001',
    from: 'agent-001',
    payload: { type: 'ping' },
    timestamp: Date.now(),
    ttl: 3,
    ...overrides,
  };
}

// ── shouldPropagate ───────────────────────────────────────────────────────────

describe('GossipProtocol — shouldPropagate()', () => {
  let gossip: GossipProtocol;

  beforeEach(() => {
    gossip = new GossipProtocol();
  });

  it('propagates a fresh message with ttl > 0', () => {
    const msg = makeMessage({ id: 'fresh-msg', ttl: 3 });
    expect(gossip.shouldPropagate(msg)).toBe(true);
  });

  it('does NOT propagate a message with ttl === 0', () => {
    const msg = makeMessage({ id: 'expired-msg', ttl: 0 });
    expect(gossip.shouldPropagate(msg)).toBe(false);
  });

  it('does NOT propagate a message with ttl < 0', () => {
    const msg = makeMessage({ id: 'neg-ttl', ttl: -1 });
    expect(gossip.shouldPropagate(msg)).toBe(false);
  });

  it('does NOT propagate an already-seen message', () => {
    const msg = makeMessage({ id: 'seen-msg', ttl: 3 });
    gossip.markSeen(msg.id);
    expect(gossip.shouldPropagate(msg)).toBe(false);
  });

  it('propagates the same logical message only once — second call returns false after markSeen', () => {
    const msg = makeMessage({ id: 'once-only', ttl: 2 });
    expect(gossip.shouldPropagate(msg)).toBe(true);
    gossip.markSeen(msg.id);
    expect(gossip.shouldPropagate(msg)).toBe(false);
  });

  it('ttl=1 message still propagates (boundary: exactly 1 hop left)', () => {
    const msg = makeMessage({ id: 'last-hop', ttl: 1 });
    expect(gossip.shouldPropagate(msg)).toBe(true);
  });
});

// ── markSeen / seenCount / clearSeen ─────────────────────────────────────────

describe('GossipProtocol — seen tracking', () => {
  let gossip: GossipProtocol;

  beforeEach(() => {
    gossip = new GossipProtocol();
  });

  it('seenCount() starts at 0', () => {
    expect(gossip.seenCount()).toBe(0);
  });

  it('markSeen() increments seenCount', () => {
    gossip.markSeen('id-1');
    expect(gossip.seenCount()).toBe(1);
  });

  it('markSeen() with the same ID multiple times does not increment beyond 1 (Set semantics)', () => {
    gossip.markSeen('dup-id');
    gossip.markSeen('dup-id');
    gossip.markSeen('dup-id');
    expect(gossip.seenCount()).toBe(1);
  });

  it('markSeen() with different IDs increments correctly', () => {
    gossip.markSeen('id-1');
    gossip.markSeen('id-2');
    gossip.markSeen('id-3');
    expect(gossip.seenCount()).toBe(3);
  });

  it('clearSeen() resets seenCount to 0', () => {
    gossip.markSeen('id-1');
    gossip.markSeen('id-2');
    expect(gossip.seenCount()).toBe(2);
    gossip.clearSeen();
    expect(gossip.seenCount()).toBe(0);
  });

  it('shouldPropagate() returns true again after clearSeen()', () => {
    const msg = makeMessage({ id: 'revive-msg', ttl: 2 });
    gossip.markSeen(msg.id);
    expect(gossip.shouldPropagate(msg)).toBe(false);
    gossip.clearSeen();
    expect(gossip.shouldPropagate(msg)).toBe(true);
  });
});

// ── decrementTTL ──────────────────────────────────────────────────────────────

describe('GossipProtocol — decrementTTL()', () => {
  let gossip: GossipProtocol;

  beforeEach(() => {
    gossip = new GossipProtocol();
  });

  it('returns a new message with ttl decremented by 1', () => {
    const msg = makeMessage({ ttl: 3 });
    const decremented = gossip.decrementTTL(msg);
    expect(decremented.ttl).toBe(2);
  });

  it('does not mutate the original message (immutability)', () => {
    const msg = makeMessage({ ttl: 3 });
    gossip.decrementTTL(msg);
    expect(msg.ttl).toBe(3);
  });

  it('ttl can reach 0 after decrement', () => {
    const msg = makeMessage({ ttl: 1 });
    const decremented = gossip.decrementTTL(msg);
    expect(decremented.ttl).toBe(0);
  });

  it('decrementTTL preserves all other message fields', () => {
    const msg = makeMessage({ id: 'preserve-me', from: 'source-agent', ttl: 5 });
    const decremented = gossip.decrementTTL(msg);
    expect(decremented.id).toBe(msg.id);
    expect(decremented.from).toBe(msg.from);
    expect(decremented.payload).toBe(msg.payload);
    expect(decremented.timestamp).toBe(msg.timestamp);
  });

  it('chained decrement correctly reaches 0', () => {
    let msg = makeMessage({ ttl: 3 });
    msg = gossip.decrementTTL(msg);
    msg = gossip.decrementTTL(msg);
    msg = gossip.decrementTTL(msg);
    expect(msg.ttl).toBe(0);
    expect(gossip.shouldPropagate(msg)).toBe(false);
  });
});

// ── createMessage ─────────────────────────────────────────────────────────────

describe('GossipProtocol — createMessage()', () => {
  let gossip: GossipProtocol;

  beforeEach(() => {
    gossip = new GossipProtocol(3);
  });

  it('creates a message with the correct from field', () => {
    const msg = gossip.createMessage('agent-007', { hello: 'world' });
    expect(msg.from).toBe('agent-007');
  });

  it('creates a message with the provided payload', () => {
    const payload = { type: 'status-update', data: { healthy: true } };
    const msg = gossip.createMessage('agent-1', payload);
    expect(msg.payload).toEqual(payload);
  });

  it('creates a message with ttl set to maxTTL', () => {
    const msg = gossip.createMessage('agent-1', 'ping');
    expect(msg.ttl).toBe(3);
  });

  it('uses custom maxTTL when protocol is configured with it', () => {
    const customGossip = new GossipProtocol(7);
    const msg = customGossip.createMessage('agent-1', 'ping');
    expect(msg.ttl).toBe(7);
  });

  it('creates a message with a UUID-format id', () => {
    const msg = gossip.createMessage('agent-1', 'test');
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(msg.id).toMatch(uuidPattern);
  });

  it('each created message has a unique id', () => {
    const msg1 = gossip.createMessage('agent-1', 'a');
    const msg2 = gossip.createMessage('agent-1', 'b');
    expect(msg1.id).not.toBe(msg2.id);
  });

  it('creates a message with a timestamp close to Date.now()', () => {
    const before = Date.now();
    const msg = gossip.createMessage('agent-1', 'timing-test');
    const after = Date.now();
    expect(msg.timestamp).toBeGreaterThanOrEqual(before);
    expect(msg.timestamp).toBeLessThanOrEqual(after);
  });

  it('newly created message passes shouldPropagate check', () => {
    const msg = gossip.createMessage('agent-1', 'propagate-me');
    expect(gossip.shouldPropagate(msg)).toBe(true);
  });
});

// ── Full propagation lifecycle ────────────────────────────────────────────────

describe('GossipProtocol — full message lifecycle', () => {
  it('message propagates correctly through a 3-hop chain', () => {
    const node1 = new GossipProtocol(3);
    const node2 = new GossipProtocol(3);
    const node3 = new GossipProtocol(3);

    // Node1 creates and sends a message
    const original = node1.createMessage('node-1', { event: 'hello' });
    expect(node1.shouldPropagate(original)).toBe(true);
    node1.markSeen(original.id);

    // Node2 receives and propagates
    expect(node2.shouldPropagate(original)).toBe(true);
    node2.markSeen(original.id);
    const hop1 = node2.decrementTTL(original);
    expect(hop1.ttl).toBe(2);

    // Node3 receives and propagates
    expect(node3.shouldPropagate(hop1)).toBe(true);
    node3.markSeen(hop1.id);
    const hop2 = node3.decrementTTL(hop1);
    expect(hop2.ttl).toBe(1);
  });

  it('message stops propagating after exhausting TTL', () => {
    const gossip = new GossipProtocol(2);
    let msg = gossip.createMessage('origin', 'broadcast');

    // Hop 1
    expect(gossip.shouldPropagate(msg)).toBe(true);
    msg = gossip.decrementTTL(msg); // ttl=1

    // Hop 2
    expect(gossip.shouldPropagate(msg)).toBe(true);
    msg = gossip.decrementTTL(msg); // ttl=0

    // Should no longer propagate
    expect(gossip.shouldPropagate(msg)).toBe(false);
  });

  it('duplicate message is rejected on the same node regardless of TTL', () => {
    const gossip = new GossipProtocol(10);
    const msg = gossip.createMessage('agent-1', 'duplicate-test');

    gossip.markSeen(msg.id);
    // Even with high TTL, already-seen messages are rejected
    const highTTLMsg = { ...msg, ttl: 10 };
    expect(gossip.shouldPropagate(highTTLMsg)).toBe(false);
  });
});
