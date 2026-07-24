export interface GossipMessage {
  id: string;
  from: string;
  payload: unknown;
  timestamp: number;
  ttl: number;
}

export class GossipProtocol {
  private seen: Set<string> = new Set();
  private maxTTL: number;

  constructor(maxTTL = 3) {
    this.maxTTL = maxTTL;
  }

  shouldPropagate(message: GossipMessage): boolean {
    if (this.seen.has(message.id)) return false;
    if (message.ttl <= 0) return false;
    return true;
  }

  markSeen(messageId: string): void {
    this.seen.add(messageId);
  }

  decrementTTL(message: GossipMessage): GossipMessage {
    return { ...message, ttl: message.ttl - 1 };
  }

  createMessage(from: string, payload: unknown): GossipMessage {
    return {
      id: crypto.randomUUID(),
      from,
      payload,
      timestamp: Date.now(),
      ttl: this.maxTTL,
    };
  }

  seenCount(): number {
    return this.seen.size;
  }

  clearSeen(): void {
    this.seen.clear();
  }
}
