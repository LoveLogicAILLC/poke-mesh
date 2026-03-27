import { eq, desc, and, lt } from "drizzle-orm";
import type { Database } from "./index";
import { agents, messages, meshState } from "./schema";

export async function registerAgent(db: Database, agent: typeof agents.$inferInsert) {
  return db.insert(agents).values(agent).returning();
}

export async function deregisterAgent(db: Database, agentId: string) {
  return db
    .update(agents)
    .set({ status: "terminated", updatedAt: new Date() })
    .where(eq(agents.id, agentId))
    .returning();
}

export async function getActiveAgents(db: Database) {
  return db.select().from(agents).where(eq(agents.status, "active"));
}

export async function getAgent(db: Database, agentId: string) {
  return db.select().from(agents).where(eq(agents.id, agentId));
}

export async function updateHeartbeat(db: Database, agentId: string) {
  return db
    .update(agents)
    .set({ lastHeartbeat: new Date(), updatedAt: new Date() })
    .where(eq(agents.id, agentId));
}

export async function staleAgents(db: Database, thresholdMs: number) {
  const cutoff = new Date(Date.now() - thresholdMs);
  return db
    .select()
    .from(agents)
    .where(and(eq(agents.status, "active"), lt(agents.lastHeartbeat, cutoff)));
}

export async function insertMessage(db: Database, message: typeof messages.$inferInsert) {
  return db.insert(messages).values(message).returning();
}

export async function getRecentMessages(db: Database, limit = 50) {
  return db.select().from(messages).orderBy(desc(messages.createdAt)).limit(limit);
}

export async function saveMeshSnapshot(db: Database, snapshot: typeof meshState.$inferInsert) {
  return db.insert(meshState).values(snapshot).returning();
}

export async function getLatestMeshState(db: Database) {
  return db.select().from(meshState).orderBy(desc(meshState.createdAt)).limit(1);
}
