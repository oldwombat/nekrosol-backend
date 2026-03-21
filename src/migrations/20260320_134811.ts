import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`bank_deposits\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`player_id\` integer NOT NULL,
  	\`amount\` numeric NOT NULL,
  	\`interest_rate\` numeric NOT NULL,
  	\`deposited_at\` text NOT NULL,
  	\`matures_at\` text NOT NULL,
  	\`status\` text DEFAULT 'active' NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`player_id\`) REFERENCES \`players\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`bank_deposits_player_idx\` ON \`bank_deposits\` (\`player_id\`);`)
  await db.run(sql`CREATE INDEX \`bank_deposits_updated_at_idx\` ON \`bank_deposits\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`bank_deposits_created_at_idx\` ON \`bank_deposits\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`player_npc_interactions\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`player_id\` integer NOT NULL,
  	\`npc_id\` text NOT NULL,
  	\`first_interaction_at\` text NOT NULL,
  	\`interaction_count\` numeric DEFAULT 1 NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`player_id\`) REFERENCES \`players\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`player_npc_interactions_player_idx\` ON \`player_npc_interactions\` (\`player_id\`);`)
  await db.run(sql`CREATE INDEX \`player_npc_interactions_npc_id_idx\` ON \`player_npc_interactions\` (\`npc_id\`);`)
  await db.run(sql`CREATE INDEX \`player_npc_interactions_updated_at_idx\` ON \`player_npc_interactions\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`player_npc_interactions_created_at_idx\` ON \`player_npc_interactions\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`missions\` ADD \`hide_after_completion\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`bank_deposits_id\` integer REFERENCES bank_deposits(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`player_npc_interactions_id\` integer REFERENCES player_npc_interactions(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_bank_deposits_id_idx\` ON \`payload_locked_documents_rels\` (\`bank_deposits_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_player_npc_interactions_id_idx\` ON \`payload_locked_documents_rels\` (\`player_npc_interactions_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`bank_deposits\`;`)
  await db.run(sql`DROP TABLE \`player_npc_interactions\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	\`lore_id\` integer,
  	\`media_id\` integer,
  	\`players_id\` integer,
  	\`inventory_id\` integer,
  	\`items_id\` integer,
  	\`game_events_id\` integer,
  	\`quests_id\` integer,
  	\`player_quest_progress_id\` integer,
  	\`missions_id\` integer,
  	\`messages_id\` integer,
  	\`player_mission_history_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`lore_id\`) REFERENCES \`lore\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`players_id\`) REFERENCES \`players\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`inventory_id\`) REFERENCES \`inventory\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`items_id\`) REFERENCES \`items\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`game_events_id\`) REFERENCES \`game_events\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`quests_id\`) REFERENCES \`quests\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`player_quest_progress_id\`) REFERENCES \`player_quest_progress\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`missions_id\`) REFERENCES \`missions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`messages_id\`) REFERENCES \`messages\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`player_mission_history_id\`) REFERENCES \`player_mission_history\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id", "lore_id", "media_id", "players_id", "inventory_id", "items_id", "game_events_id", "quests_id", "player_quest_progress_id", "missions_id", "messages_id", "player_mission_history_id") SELECT "id", "order", "parent_id", "path", "users_id", "lore_id", "media_id", "players_id", "inventory_id", "items_id", "game_events_id", "quests_id", "player_quest_progress_id", "missions_id", "messages_id", "player_mission_history_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_lore_id_idx\` ON \`payload_locked_documents_rels\` (\`lore_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_players_id_idx\` ON \`payload_locked_documents_rels\` (\`players_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_inventory_id_idx\` ON \`payload_locked_documents_rels\` (\`inventory_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_items_id_idx\` ON \`payload_locked_documents_rels\` (\`items_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_game_events_id_idx\` ON \`payload_locked_documents_rels\` (\`game_events_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_quests_id_idx\` ON \`payload_locked_documents_rels\` (\`quests_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_player_quest_progress_id_idx\` ON \`payload_locked_documents_rels\` (\`player_quest_progress_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_missions_id_idx\` ON \`payload_locked_documents_rels\` (\`missions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_messages_id_idx\` ON \`payload_locked_documents_rels\` (\`messages_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_player_mission_history_id_idx\` ON \`payload_locked_documents_rels\` (\`player_mission_history_id\`);`)
  await db.run(sql`ALTER TABLE \`missions\` DROP COLUMN \`hide_after_completion\`;`)
}
