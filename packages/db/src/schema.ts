import { sql } from "drizzle-orm";
import { boolean, doublePrecision, jsonb, numeric, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  icon: varchar("icon", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  // null for users who only sign in with single sign-on
  passwordHash: varchar("password_hash", { length: 255 }),
  organizationId: uuid("organization_id").references(() => organizationsTable.id),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const organizationRoles = pgEnum("organization_role", ["admin", "member"]);

export const organizationPlans = pgEnum("organization_plan", ["none", "starter", "business"]);

export const organizationsTable = pgTable("organizations", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar({ length: 255 }).notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
  plan: organizationPlans("plan").notNull().default("none"),
});

export const organizationUsersTable = pgTable("organization_users", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizationsTable.id),
  userId: uuid("user_id").references(() => usersTable.id),
  role: organizationRoles("role").notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const entryTypes = pgEnum("entry_type", ["income", "expense"]);

// categories are a way to group entries
export const categoriesTable = pgTable("categories", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  organizationId: uuid().references(() => organizationsTable.id),
  name: varchar("name", { length: 255 }).notNull(),
});

// counter parties are a way to group entries
export const counterPartiesTable = pgTable("counter_parties", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  organizationId: uuid().references(() => organizationsTable.id),
  name: varchar("name", { length: 255 }).notNull(),
});

// tags are a way to group entries
export const tagsTable = pgTable("tags", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  organizationId: uuid().references(() => organizationsTable.id),
  key: varchar("key", { length: 255 }).notNull(),
  value: varchar("value", { length: 255 }).notNull(),
  createdAt: timestamp().notNull().defaultNow(),
});

// accounting entries that are either income or expense
export const entriesTable = pgTable("entries", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  organizationId: uuid().references(() => organizationsTable.id),
  // amount is a floating point number with up to 16 decimal places
  amount: doublePrecision("amount").notNull(),
  // currency used for the amount
  currency: varchar("currency", { length: 255 }).notNull(),
  // value at date of entry
  valueAtDate: doublePrecision("value_at_date").notNull(),
  // date of entry, can be different from createdAt if backdated
  dateOfEntry: timestamp("date_of_entry").notNull(),
  // income or expense
  type: entryTypes("type").notNull(),
  // free-form category set by the caller, e.g. "payroll"
  category: varchar("category", { length: 255 }),
  // counter party, who is either paying or who is being paid
  counterParty: uuid("counter_party").references(() => counterPartiesTable.id),
  // tags is an array of strings
  tags: text("tags").array(),
  // metadata is a map of strings to strings
  metadata: jsonb("metadata").$type<Record<string, string | number | boolean>>(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
  deletedAt: timestamp(),
});

// trades are a way to move money between accounts
export const tradesTable = pgTable("trades", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  organizationId: uuid().references(() => organizationsTable.id),
  // from amount
  fromAmount: numeric("from_amount", { precision: 16, scale: 16 }).notNull(),
  // to amount
  toAmount: numeric("to_amount", { precision: 16, scale: 16 }).notNull(),
  // from currency
  fromCurrency: varchar("from_currency", { length: 255 }).notNull(),
  // to currency
  toCurrency: varchar("to_currency", { length: 255 }).notNull(),
  // exchange
  exchange: varchar("exchange", { length: 255 }).notNull(),
  // metadata is a map of strings to strings
  metadata: jsonb("metadata").$type<Record<string, string>>(),
  // tags is an array of strings
  tags: text("tags").array(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

// api keys
export const apiKeysTable = pgTable("api_keys", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  organizationId: uuid().references(() => organizationsTable.id),
  createdById: uuid().references(() => usersTable.id),
  key: varchar("key", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  roles: text("roles").array(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
  deletedAt: timestamp(),
});

// current currency prices
export const currentCurrencyPricesTable = pgTable("current_currency_prices", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  currency: varchar("currency", { length: 255 }).notNull(),
  usdPrice: doublePrecision("usd_price").notNull(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
export type ApiKey = typeof apiKeysTable.$inferSelect;
export type Organization = typeof organizationsTable.$inferSelect;
export type OrganizationUser = typeof organizationUsersTable.$inferSelect;
export type OrganizationRole = (typeof organizationRoles.enumValues)[number];
export type Entry = typeof entriesTable.$inferSelect;
export type Tag = typeof tagsTable.$inferSelect;
