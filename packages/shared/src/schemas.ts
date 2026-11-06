import { z } from "zod";

import { SUPPORTED_CURRENCIES } from "./currencies";

const metadataSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]));

// body accepted by POST /v1/entries (single entry or array of entries)
export const entrySchema = z.object({
  // required
  amount: z.number(),
  currency: z.enum(SUPPORTED_CURRENCIES),
  type: z.enum(["income", "expense"]),
  // optional
  dateOfEntry: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: metadataSchema.optional(),
  // free-form label for grouping entries, e.g. "payroll" or "hosting"
  category: z.string().trim().min(1).max(255).optional(),
  // total USD value of the entry; when set, it is stored as-is instead of
  // being computed from the current price of `currency`
  usdValue: z.number().nonnegative().optional(),
});

export type EntryInput = z.infer<typeof entrySchema>;

// filters accepted by the statement / entries endpoints
export const filterSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  tags: z.array(z.string()).optional(),
  metadata: metadataSchema.optional(),
  category: z.string().optional(),
  counterparty: z.string().optional(),
});

export type Filters = z.infer<typeof filterSchema>;

// body accepted by the category breakdown endpoint
export const breakdownSchema = filterSchema.extend({
  interval: z.enum(["day", "week", "month"]).default("day"),
});
