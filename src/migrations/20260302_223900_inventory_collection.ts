import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`inventory\` (
  \`id\` integer PRIMARY KEY NOT NULL,
  \`player_id\` integer NOT NULL,
  \`item_key\` text NOT NULL,
  \`quantity\` numeric DEFAULT 0 NOT NULL,
  \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  FOREIGN KEY (\`player_id\`) REFERENCES \`players\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`inventory_player_id_idx\` ON \`inventory\` (\`player_id\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`inventory_item_key_idx\` ON \`inventory\` (\`item_key\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`inventory_updated_at_idx\` ON \`inventory\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`inventory_created_at_idx\` ON \`inventory\` (\`created_at\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE IF EXISTS \`inventory\`;`)
}
