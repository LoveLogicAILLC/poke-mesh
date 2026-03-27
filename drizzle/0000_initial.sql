-- Poke-Mesh initial migration
-- Generated for D1 (SQLite)

CREATE TABLE `agents` (
  `id`              TEXT NOT NULL PRIMARY KEY,
  `name`            TEXT NOT NULL,
  `address`         TEXT NOT NULL,
  `public_key`      TEXT,
  `status`          TEXT NOT NULL DEFAULT 'active' CHECK(`status` IN ('active', 'inactive', 'terminated')),
  `last_heartbeat`  INTEGER,
  `metadata`        TEXT,
  `created_at`      INTEGER NOT NULL,
  `updated_at`      INTEGER NOT NULL
);

CREATE TABLE `messages` (
  `id`            TEXT NOT NULL PRIMARY KEY,
  `from_agent_id` TEXT NOT NULL REFERENCES `agents`(`id`),
  `to_agent_id`   TEXT,
  `type`          TEXT NOT NULL CHECK(`type` IN ('gossip', 'direct', 'heartbeat', 'discovery')),
  `payload`       TEXT NOT NULL,
  `ttl`           INTEGER NOT NULL DEFAULT 3,
  `status`        TEXT NOT NULL DEFAULT 'pending' CHECK(`status` IN ('pending', 'delivered', 'expired', 'failed')),
  `created_at`    INTEGER NOT NULL
);

CREATE TABLE `mesh_state` (
  `id`             TEXT NOT NULL PRIMARY KEY,
  `topology`       TEXT NOT NULL DEFAULT 'star' CHECK(`topology` IN ('star', 'ring', 'full-mesh')),
  `active_agents`  INTEGER NOT NULL DEFAULT 0,
  `total_messages` INTEGER NOT NULL DEFAULT 0,
  `health_score`   REAL NOT NULL DEFAULT 1.0,
  `snapshot`       TEXT,
  `created_at`     INTEGER NOT NULL
);

-- Indexes for frequently queried columns
CREATE INDEX `agents_status_idx`        ON `agents`(`status`);
CREATE INDEX `messages_from_agent_idx`  ON `messages`(`from_agent_id`);
CREATE INDEX `messages_status_idx`      ON `messages`(`status`);
CREATE INDEX `mesh_state_created_idx`   ON `mesh_state`(`created_at`);
