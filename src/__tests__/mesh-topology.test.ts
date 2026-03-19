import { describe, it, expect, beforeEach } from 'bun:test';
import { MeshTopology, type Agent, type TopologyType } from '../mesh/topology';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'agent-001',
    address: '10.0.0.1:4001',
    lastSeen: Date.now(),
    healthy: true,
    ...overrides,
  };
}

// ── Agent Registration ─────────────────────────────────────────────────────────

describe('MeshTopology — agent registration', () => {
  let mesh: MeshTopology;

  beforeEach(() => {
    mesh = new MeshTopology();
  });

  it('starts with zero agents', () => {
    expect(mesh.agentCount()).toBe(0);
  });

  it('register() adds an agent to the mesh', () => {
    mesh.register(makeAgent({ id: 'agent-001' }));
    expect(mesh.agentCount()).toBe(1);
  });

  it('register() multiple agents increases the count', () => {
    mesh.register(makeAgent({ id: 'a1', address: '10.0.0.1:4001' }));
    mesh.register(makeAgent({ id: 'a2', address: '10.0.0.2:4001' }));
    mesh.register(makeAgent({ id: 'a3', address: '10.0.0.3:4001' }));
    expect(mesh.agentCount()).toBe(3);
  });

  it('register() with duplicate ID overwrites the existing agent', () => {
    mesh.register(makeAgent({ id: 'agent-001', address: '10.0.0.1:4001' }));
    mesh.register(makeAgent({ id: 'agent-001', address: '192.168.1.1:9000' }));
    expect(mesh.agentCount()).toBe(1);
    expect(mesh.getAgent('agent-001')?.address).toBe('192.168.1.1:9000');
  });

  it('getAgent() returns the registered agent by ID', () => {
    const agent = makeAgent({ id: 'agent-42', address: '10.10.10.42:4001' });
    mesh.register(agent);
    const found = mesh.getAgent('agent-42');
    expect(found).toBeDefined();
    expect(found?.id).toBe('agent-42');
    expect(found?.address).toBe('10.10.10.42:4001');
  });

  it('getAgent() returns undefined for an unregistered ID', () => {
    expect(mesh.getAgent('ghost')).toBeUndefined();
  });

  it('deregister() removes an existing agent and returns true', () => {
    mesh.register(makeAgent({ id: 'agent-001' }));
    const removed = mesh.deregister('agent-001');
    expect(removed).toBe(true);
    expect(mesh.agentCount()).toBe(0);
  });

  it('deregister() returns false for a non-existent agent', () => {
    const removed = mesh.deregister('phantom-agent');
    expect(removed).toBe(false);
  });

  it('listAgents() returns all registered agents', () => {
    mesh.register(makeAgent({ id: 'a1', address: '10.0.0.1:4001' }));
    mesh.register(makeAgent({ id: 'a2', address: '10.0.0.2:4001' }));
    const agents = mesh.listAgents();
    expect(agents.length).toBe(2);
    const ids = agents.map(a => a.id);
    expect(ids).toContain('a1');
    expect(ids).toContain('a2');
  });

  it('listAgents() returns empty array when no agents registered', () => {
    expect(mesh.listAgents()).toEqual([]);
  });
});

// ── Topology Configuration ─────────────────────────────────────────────────────

describe('MeshTopology — topology calculation', () => {
  let mesh: MeshTopology;

  beforeEach(() => {
    mesh = new MeshTopology();
  });

  it('default topology is "star"', () => {
    expect(mesh.getTopology()).toBe('star');
  });

  it('setTopology() updates to "ring"', () => {
    mesh.setTopology('ring');
    expect(mesh.getTopology()).toBe('ring');
  });

  it('setTopology() updates to "full-mesh"', () => {
    mesh.setTopology('full-mesh');
    expect(mesh.getTopology()).toBe('full-mesh');
  });

  it('setTopology() can switch between all valid topology types', () => {
    const types: TopologyType[] = ['star', 'ring', 'full-mesh'];
    for (const type of types) {
      mesh.setTopology(type);
      expect(mesh.getTopology()).toBe(type);
    }
  });

  it('topology is preserved after registering agents', () => {
    mesh.setTopology('ring');
    mesh.register(makeAgent({ id: 'a1' }));
    mesh.register(makeAgent({ id: 'a2' }));
    expect(mesh.getTopology()).toBe('ring');
  });
});

// ── Mesh Health Aggregation ───────────────────────────────────────────────────

describe('MeshTopology — mesh health aggregation', () => {
  let mesh: MeshTopology;

  beforeEach(() => {
    mesh = new MeshTopology();
  });

  it('empty mesh is considered healthy', () => {
    expect(mesh.isHealthy()).toBe(true);
  });

  it('single healthy agent → mesh is healthy', () => {
    mesh.register(makeAgent({ id: 'a1', healthy: true }));
    expect(mesh.isHealthy()).toBe(true);
  });

  it('single unhealthy agent → mesh is NOT healthy', () => {
    mesh.register(makeAgent({ id: 'a1', healthy: false }));
    expect(mesh.isHealthy()).toBe(false);
  });

  it('majority healthy (2 of 3) → mesh is healthy', () => {
    mesh.register(makeAgent({ id: 'a1', healthy: true }));
    mesh.register(makeAgent({ id: 'a2', healthy: true }));
    mesh.register(makeAgent({ id: 'a3', healthy: false }));
    expect(mesh.isHealthy()).toBe(true);
  });

  it('exactly 50% healthy → mesh is healthy (>=0.5 threshold)', () => {
    mesh.register(makeAgent({ id: 'a1', healthy: true }));
    mesh.register(makeAgent({ id: 'a2', healthy: false }));
    expect(mesh.isHealthy()).toBe(true);
  });

  it('majority unhealthy (1 of 3 healthy) → mesh is NOT healthy', () => {
    mesh.register(makeAgent({ id: 'a1', healthy: true }));
    mesh.register(makeAgent({ id: 'a2', healthy: false }));
    mesh.register(makeAgent({ id: 'a3', healthy: false }));
    expect(mesh.isHealthy()).toBe(false);
  });

  it('all agents unhealthy → mesh is NOT healthy', () => {
    mesh.register(makeAgent({ id: 'a1', healthy: false }));
    mesh.register(makeAgent({ id: 'a2', healthy: false }));
    expect(mesh.isHealthy()).toBe(false);
  });

  it('mesh recovers to healthy after an unhealthy agent is deregistered', () => {
    mesh.register(makeAgent({ id: 'a1', healthy: false }));
    mesh.register(makeAgent({ id: 'a2', healthy: false }));
    expect(mesh.isHealthy()).toBe(false);

    // Remove both unhealthy agents → empty mesh is healthy
    mesh.deregister('a1');
    mesh.deregister('a2');
    expect(mesh.isHealthy()).toBe(true);
  });
});

// ── Gossip Propagation Stubs ──────────────────────────────────────────────────

describe('MeshTopology — gossip message propagation (stubs)', () => {
  /**
   * These tests define the interface contract for gossip propagation
   * that will be implemented in future iterations. They test the topology
   * structures that gossip relies on.
   */

  let mesh: MeshTopology;

  beforeEach(() => {
    mesh = new MeshTopology();
  });

  it('an empty mesh has no propagation targets', () => {
    // In a gossip protocol, there are no peers to propagate to
    expect(mesh.listAgents()).toHaveLength(0);
  });

  it('registered agents are available as gossip propagation targets', () => {
    mesh.register(makeAgent({ id: 'peer-1', address: '10.0.1.1:4001' }));
    mesh.register(makeAgent({ id: 'peer-2', address: '10.0.1.2:4001' }));
    const peers = mesh.listAgents();
    expect(peers.length).toBeGreaterThanOrEqual(2);
  });

  it('only healthy agents should be targeted for gossip', () => {
    mesh.register(makeAgent({ id: 'healthy-peer', healthy: true }));
    mesh.register(makeAgent({ id: 'dead-peer', healthy: false }));
    const healthyPeers = mesh.listAgents().filter(a => a.healthy);
    expect(healthyPeers.length).toBe(1);
    expect(healthyPeers[0]?.id).toBe('healthy-peer');
  });

  it('agents carry address information for gossip delivery', () => {
    mesh.register(makeAgent({ id: 'a1', address: '10.0.0.5:4001' }));
    const agent = mesh.getAgent('a1');
    expect(agent?.address).toBeDefined();
    expect(typeof agent?.address).toBe('string');
    expect(agent!.address.length).toBeGreaterThan(0);
  });
});
