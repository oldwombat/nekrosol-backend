/**
 * Migration: Mission Engine tables + lastEnergyUpdate column
 *
 * Adds: missions, missions_rels, messages, player_mission_history tables
 * Modifies: players — adds last_energy_update column
 *
 * Uses IF NOT EXISTS throughout — safe to run even if dev-mode push already applied.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`missions\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`slug\` text NOT NULL,
    \`name\` text NOT NULL,
    \`description\` text NOT NULL,
    \`category\` text NOT NULL,
    \`primary_skill\` text NOT NULL,
    \`tier\` numeric DEFAULT 1 NOT NULL,
    \`is_active\` integer DEFAULT true,
    \`costs\` text,
    \`requirements\` text,
    \`visibility_requirements\` text,
    \`rewards\` text,
    \`npc_slug\` text DEFAULT 'sal',
    \`npc_name\` text DEFAULT 'Sal',
    \`availability_message\` text,
    \`completion_message\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );`)
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS \`missions_slug_idx\` ON \`missions\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`missions_updated_at_idx\` ON \`missions\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`missions_created_at_idx\` ON \`missions\` (\`created_at\`);`)

  await db.run(sql`CREATE TABLE IF NOT EXISTS \`missions_rels\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`order\` integer,
    \`parent_id\` integer NOT NULL,
    \`path\` text NOT NULL,
    \`missions_id\` integer,
    FOREIGN KEY (\`parent_id\`) REFERENCES \`missions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`missions_id\`) REFERENCES \`missions\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`missions_rels_order_idx\` ON \`missions_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`missions_rels_parent_idx\` ON \`missions_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`missions_rels_path_idx\` ON \`missions_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`missions_rels_missions_id_idx\` ON \`missions_rels\` (\`missions_id\`);`)

  await db.run(sql`CREATE TABLE IF NOT EXISTS \`messages\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`player_id\` integer NOT NULL,
    \`npc_slug\` text DEFAULT 'sal' NOT NULL,
    \`npc_name\` text DEFAULT 'Sal' NOT NULL,
    \`subject\` text NOT NULL,
    \`body\` text NOT NULL,
    \`type\` text DEFAULT 'general' NOT NULL,
    \`is_read\` integer DEFAULT false,
    \`metadata\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (\`player_id\`) REFERENCES \`players\`(\`id\`) ON UPDATE no action ON DELETE set null
  );`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`messages_player_idx\` ON \`messages\` (\`player_id\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`messages_is_read_idx\` ON \`messages\` (\`is_read\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`messages_updated_at_idx\` ON \`messages\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`messages_created_at_idx\` ON \`messages\` (\`created_at\`);`)

  await db.run(sql`CREATE TABLE IF NOT EXISTS \`player_mission_history\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`player_id\` integer NOT NULL,
    \`mission_slug\` text NOT NULL,
    \`completed_at\` text NOT NULL,
    \`outcome\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (\`player_id\`) REFERENCES \`players\`(\`id\`) ON UPDATE no action ON DELETE set null
  );`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`player_mission_history_player_idx\` ON \`player_mission_history\` (\`player_id\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`player_mission_history_mission_slug_idx\` ON \`player_mission_history\` (\`mission_slug\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`player_mission_history_updated_at_idx\` ON \`player_mission_history\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`player_mission_history_created_at_idx\` ON \`player_mission_history\` (\`created_at\`);`)

  // Add last_energy_update to players (no-op if already added by dev push)
  try {
    await db.run(sql`ALTER TABLE \`players\` ADD COLUMN \`last_energy_update\` text;`)
  } catch {
    // Column already exists from dev-mode push — safe to ignore
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE IF EXISTS \`player_mission_history\`;`)
  await db.run(sql`DROP TABLE IF EXISTS \`messages\`;`)
  await db.run(sql`DROP TABLE IF EXISTS \`missions_rels\`;`)
  await db.run(sql`DROP TABLE IF EXISTS \`missions\`;`)
}
