import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`articles\` ADD \`review_status\` text DEFAULT 'writing';`)
  await db.run(sql`ALTER TABLE \`_articles_v\` ADD \`version_review_status\` text DEFAULT 'writing';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`articles\` DROP COLUMN \`review_status\`;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` DROP COLUMN \`version_review_status\`;`)
}
