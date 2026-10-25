import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_writer_notes_status" AS ENUM('open', 'resolved');
  CREATE TABLE "writer_notes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"article_id" integer NOT NULL,
  	"text" varchar NOT NULL,
  	"status" "enum_writer_notes_status" DEFAULT 'open',
  	"created_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "writer_notes_id" integer;
  ALTER TABLE "writer_notes" ADD CONSTRAINT "writer_notes_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "writer_notes" ADD CONSTRAINT "writer_notes_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "writer_notes_article_idx" ON "writer_notes" USING btree ("article_id");
  CREATE INDEX "writer_notes_created_by_idx" ON "writer_notes" USING btree ("created_by_id");
  CREATE INDEX "writer_notes_updated_at_idx" ON "writer_notes" USING btree ("updated_at");
  CREATE INDEX "writer_notes_created_at_idx" ON "writer_notes" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_writer_notes_fk" FOREIGN KEY ("writer_notes_id") REFERENCES "public"."writer_notes"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_writer_notes_id_idx" ON "payload_locked_documents_rels" USING btree ("writer_notes_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "writer_notes" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "writer_notes" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_writer_notes_fk";
  
  DROP INDEX "payload_locked_documents_rels_writer_notes_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "writer_notes_id";
  DROP TYPE "public"."enum_writer_notes_status";`)
}
