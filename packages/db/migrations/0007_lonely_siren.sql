CREATE TYPE "public"."organization_plan" AS ENUM('none', 'starter', 'business');--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "plan" "organization_plan" DEFAULT 'none' NOT NULL;