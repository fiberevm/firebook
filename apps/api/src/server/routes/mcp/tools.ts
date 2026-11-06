// The Firebook MCP server: tools for AI agents to record and query an organization's books.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { entrySchema, filterSchema, SUPPORTED_CURRENCIES, type Filters } from "@accounting/shared";
import { z } from "zod";
import { services } from "../../../services/services";
import { serializeEntry } from "../internal/serializer";

const date = z.string().describe("ISO 8601 date or date-time, e.g. 2026-11-01. Dates are UTC");

// filters shared by the read tools
const filterShape = {
  from: date.optional().describe("Only entries on or after this date"),
  to: date.optional().describe("Only entries on or before this date"),
  tags: z.array(z.string()).optional().describe('Only entries with all of these "key:value" tags'),
  category: z.string().optional().describe("Only entries in this category (exact match)"),
};

// tool results are JSON text, which every MCP client can read
const json = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] });
const fail = (message: string) => ({ content: [{ type: "text" as const, text: message }], isError: true });

function parseFilters(input: Record<string, unknown>): { ok: true; filters: Filters } | { ok: false; message: string } {
  const parsed = filterSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: `Invalid filters: ${z.prettifyError(parsed.error)}` };
  for (const key of ["from", "to"] as const) {
    if (parsed.data[key] && Number.isNaN(parsed.data[key]!.getTime())) return { ok: false, message: `Invalid ${key} date` };
  }
  return { ok: true, filters: parsed.data };
}

export const MCP_INSTRUCTIONS = `Firebook is the accounting ledger of one organization. Each entry is income or an expense in a currency (${SUPPORTED_CURRENCIES.join(", ")}), with its USD value at the time it was recorded.
- Record payments with record_entries. usd and eth are valued automatically at the current price; for other currencies, or when the exact USD value is known, pass usdValue.
- Use category for the kind of income or expense (e.g. "payroll", "hosting") and tags ("key:value") for anything you want to filter by later (e.g. "client:acme").
- get_statement answers "how much did we make / spend"; get_category_breakdown answers "where did it go, over time".`;

export function createMcpServer(organizationId: string) {
  const server = new McpServer({ name: "firebook", version: "1.0.0" }, { instructions: MCP_INSTRUCTIONS });

  server.registerTool(
    "record_entries",
    {
      title: "Record entries",
      description:
        "Record one or more income or expense entries in the books. Each is stored with its USD value: the current market price × amount, or usdValue when given. Returns the created entries.",
      inputSchema: {
        entries: z
          .array(
            entrySchema.extend({
              amount: z.number().describe("Amount in the entry's currency, e.g. 0.5 for half an ETH"),
              type: z.enum(["income", "expense"]),
              dateOfEntry: date.optional().describe("When the payment happened. Defaults to now"),
              category: z.string().trim().min(1).max(255).optional().describe('Kind of income or expense, e.g. "payroll", "hosting"'),
              tags: z.array(z.string()).optional().describe('Labels in "key:value" format, e.g. "client:acme"'),
              usdValue: z.number().nonnegative().optional().describe("Total USD value of the entry. Required for currencies other than usd and eth"),
            }),
          )
          .min(1)
          .max(100),
      },
      annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ entries }) => {
      const s = services();
      const created = [];
      // one by one, so a failure reports which entry was wrong and what was already recorded
      for (const [i, entry] of entries.entries()) {
        const result = await s.entries.create(organizationId, entry);
        if (result.isErr()) {
          const recorded = created.length ? ` Entries before it were recorded: ${created.map((e) => e.id).join(", ")}.` : "";
          return fail(`Entry ${i + 1} was not recorded: ${result.unwrapErr()}.${recorded}`);
        }
        created.push(result.unwrap());
      }
      return json(await Promise.all(created.map(serializeEntry)));
    },
  );

  server.registerTool(
    "list_entries",
    {
      title: "List entries",
      description: "List entries, newest first, with the total number of entries matching the filters.",
      inputSchema: { ...filterShape, limit: z.number().int().min(1).max(100).default(25).describe("Maximum number of entries to return") },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ limit, ...input }) => {
      const parsed = parseFilters(input);
      if (!parsed.ok) return fail(parsed.message);
      const s = services();
      const [entries, count] = await Promise.all([s.entries.find(organizationId, parsed.filters, limit), s.entries.count(organizationId, parsed.filters)]);
      if (entries.isErr()) return fail(entries.unwrapErr());
      if (count.isErr()) return fail(count.unwrapErr());
      return json({ count: count.unwrap(), entries: await Promise.all(entries.unwrap().map(serializeEntry)) });
    },
  );

  server.registerTool(
    "get_statement",
    {
      title: "Get statement",
      description:
        "Total income, expenses and net in USD for the matching entries, with a breakdown per currency (amounts in the original currency and in USD).",
      inputSchema: filterShape,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (input) => {
      const parsed = parseFilters(input);
      if (!parsed.ok) return fail(parsed.message);
      const statement = await services().entries.getStatement(organizationId, parsed.filters);
      if (statement.isErr()) return fail(statement.unwrapErr());
      const { income, expenses, incomeByCurrency, expensesByCurrency } = statement.unwrap();
      // USD totals to the cent, so float sums read cleanly
      const cents = (n: number) => Math.round(n * 100) / 100;
      return json({ income: cents(income), expenses: cents(expenses), net: cents(income - expenses), incomeByCurrency, expensesByCurrency });
    },
  );

  server.registerTool(
    "get_category_breakdown",
    {
      title: "Get category breakdown",
      description:
        "USD totals per category and entry type, per day, week (starting Monday) or month. Entries without a category are reported with category null.",
      inputSchema: { ...filterShape, interval: z.enum(["day", "week", "month"]).default("month") },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ interval, ...input }) => {
      const parsed = parseFilters(input);
      if (!parsed.ok) return fail(parsed.message);
      const breakdown = await services().entries.getCategoryBreakdown(organizationId, parsed.filters, interval);
      if (breakdown.isErr()) return fail(breakdown.unwrapErr());
      return json(breakdown.unwrap());
    },
  );

  server.registerTool(
    "delete_entry",
    {
      title: "Delete entry",
      description: "Delete an entry by id, e.g. one recorded by mistake. It no longer counts in statements.",
      inputSchema: { id: z.string().describe("Entry id, from record_entries or list_entries") },
      annotations: { destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ id }) => {
      const result = await services().entries.delete(organizationId, id);
      if (result.isErr()) return fail(result.unwrapErr().includes("uuid") ? "Entry not found" : result.unwrapErr());
      return result.unwrap() ? json({ deleted: id }) : fail("Entry not found");
    },
  );

  return server;
}
