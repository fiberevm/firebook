CREATE TABLE IF NOT EXISTS "current_currency_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"currency" varchar(255) NOT NULL,
	"usd_price" double precision NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
