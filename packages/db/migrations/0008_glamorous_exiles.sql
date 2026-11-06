ALTER TABLE "entries" DROP CONSTRAINT "entries_category_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "entries" ALTER COLUMN "category" SET DATA TYPE varchar(255);