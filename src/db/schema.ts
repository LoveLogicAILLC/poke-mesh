import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// Agents table — registered mesh participants
export const agents = sqliteTable("agents", {
  id: text("id").primaryKey(), // UUID
  name: text("name").notNull(),
  address: text("address").notNull(), // hostname:port or worker URL
  publicKey: text("public_key"), // mTLS public key fingerprint
  status: text("status", { enum: ["active", "inactive", "terminated"] }).notNull().default("active"),
  lastHeartbeat: integer("last_heartbeat", { mode: "timestamp" }),
  metadata: text("metadata", { mode: "json" }), // arbitrary agent metadata
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Messages table — mesh gossip messages
export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(), // UUID
  fromAgentId: text("from_agent_id").notNull().references(() => agents.id),
  toAgentId: text("to_agent_id"), // null = broadcast
  type: text("type", { enum: ["gossip", "direct", "heartbeat", "discovery"] }).notNull(),
  payload: text("payload", { mode: "json" }).notNull(),
  ttl: integer("ttl").notNull().default(3),
  status: text("status", { enum: ["pending", "delivered", "expired", "failed"] }).notNull().default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Mesh state table — snapshot of mesh topology at a point in time
export const meshState = sqliteTable("mesh_state", {
  id: text("id").primaryKey(),
  topology: text("topology", { enum: ["star", "ring", "full-mesh"] }).notNull().default("star"),
  activeAgents: integer("active_agents").notNull().default(0),
  totalMessages: integer("total_messages").notNull().default(0),
  healthScore: real("health_score").notNull().default(1.0),
  snapshot: text("snapshot", { mode: "json" }), // full mesh topology snapshot
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
