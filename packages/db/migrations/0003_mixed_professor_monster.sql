ALTER TABLE "tags" RENAME COLUMN "name" TO "key";--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "value" varchar(255) NOT NULL;