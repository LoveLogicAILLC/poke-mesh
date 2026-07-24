export interface Env {
  // D1 Database
  DB: D1Database;
  // KV Namespace for mesh state cache
  MESH_CACHE: KVNamespace;
  // Environment variables
  MESH_GOSSIP_INTERVAL_MS: string;
  MESH_MAX_AGENTS: string;
  LOG_LEVEL: string;
}
