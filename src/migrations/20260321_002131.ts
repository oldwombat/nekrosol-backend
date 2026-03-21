import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`players\` ADD \`last_radiation_update\` text;`)
  await db.run(sql`ALTER TABLE \`players\` ADD \`display_title\` text;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`players\` DROP COLUMN \`last_radiation_update\`;`)
  await db.run(sql`ALTER TABLE \`players\` DROP COLUMN \`display_title\`;`)
}
