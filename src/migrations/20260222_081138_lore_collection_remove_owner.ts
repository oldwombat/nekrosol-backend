import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_lore\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`content\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`INSERT INTO \`__new_lore\`("id", "title", "content", "updated_at", "created_at") SELECT "id", "title", "content", "updated_at", "created_at" FROM \`lore\`;`)
  await db.run(sql`DROP TABLE \`lore\`;`)
  await db.run(sql`ALTER TABLE \`__new_lore\` RENAME TO \`lore\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`lore_updated_at_idx\` ON \`lore\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`lore_created_at_idx\` ON \`lore\` (\`created_at\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`lore\` ADD \`owner_id\` integer NOT NULL REFERENCES users(id);`)
  await db.run(sql`CREATE INDEX \`lore_owner_idx\` ON \`lore\` (\`owner_id\`);`)
}
