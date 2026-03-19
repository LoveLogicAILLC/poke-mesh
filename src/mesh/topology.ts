export interface Agent {
  id: string;
  address: string;
  lastSeen: number;
  healthy: boolean;
}

export type TopologyType = 'star' | 'ring' | 'full-mesh';

export class MeshTopology {
  private agents: Map<string, Agent> = new Map();
  private topology: TopologyType = 'star';

  register(agent: Agent): void {
    this.agents.set(agent.id, agent);
  }

  deregister(agentId: string): boolean {
    return this.agents.delete(agentId);
  }

  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  listAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getTopology(): TopologyType {
    return this.topology;
  }

  setTopology(type: TopologyType): void {
    this.topology = type;
  }

  isHealthy(): boolean {
    if (this.agents.size === 0) return true;
    const healthyCount = Array.from(this.agents.values()).filter(a => a.healthy).length;
    return healthyCount / this.agents.size >= 0.5;
  }

  agentCount(): number {
    return this.agents.size;
  }
}
