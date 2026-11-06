import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { AddressInfo } from "node:net";
import { Currency } from "../../../services/currencies";
import { services } from "../../../services/services";
import { createTestOrganization, createTestUser } from "../../../test/fixtures";
import { getServer } from "../../server";

let server: ReturnType<typeof getServer>;
let url: URL;

beforeAll(async () => {
  server = getServer({ dashboard: null });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  url = new URL(`http://localhost:${(server.address() as AddressInfo).port}/mcp`);
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

beforeEach(async () => {
  await services().currencies.updateCurrentPrice(Currency.ETH, 3000);
});

async function connect(key?: string) {
  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(url, key ? { requestInit: { headers: { Authorization: `Bearer ${key}` } } } : undefined));
  return client;
}

async function setup() {
  const user = await createTestUser(`${crypto.randomUUID()}@test.com`);
  const org = await createTestOrganization(user.id);
  const key = (await services().apiKeys.create(org.id, user.id, "mcp", [])).unwrap();
  return { org, client: await connect(key.key) };
}

const result = (r: Awaited<ReturnType<Client["callTool"]>>) => JSON.parse((r.content as { text: string }[])[0]!.text);

describe("MCP server", () => {
  it("requires an API key", async () => {
    await expect(connect()).rejects.toThrow();
    await expect(connect("not-a-key")).rejects.toThrow();
  });

  it("lists its tools with instructions", async () => {
    const { client } = await setup();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["delete_entry", "get_category_breakdown", "get_statement", "list_entries", "record_entries"]);
    expect(tools.find((t) => t.name === "delete_entry")!.annotations?.destructiveHint).toBe(true);
    expect(client.getInstructions()).toContain("record_entries");
  });

  it("records entries, then reports them in statements, lists and breakdowns", async () => {
    const { client } = await setup();
    const recorded = await client.callTool({
      name: "record_entries",
      arguments: {
        entries: [
          { amount: 2, currency: "eth", type: "income", category: "consulting", tags: ["client:acme"], dateOfEntry: "2026-10-05" },
          { amount: 10, currency: "sol", type: "expense", category: "hosting", usdValue: 1500, dateOfEntry: "2026-10-20" },
        ],
      },
    });
    expect(recorded.isError).toBeFalsy();
    const entries = result(recorded);
    expect(entries.map((e: { valueAtDate: number }) => e.valueAtDate)).toEqual([6000, 1500]);
    expect(entries[0].category).toBe("consulting");

    const statement = result(await client.callTool({ name: "get_statement", arguments: { from: "2026-10-01", to: "2026-10-31" } }));
    expect([statement.income, statement.expenses, statement.net]).toEqual([6000, 1500, 4500]);

    const listed = result(await client.callTool({ name: "list_entries", arguments: { tags: ["client:acme"] } }));
    expect(listed.count).toBe(1);
    expect(listed.entries[0].id).toBe(entries[0].id);

    const breakdown = result(await client.callTool({ name: "get_category_breakdown", arguments: { interval: "month" } }));
    expect(breakdown.rows).toEqual(
      expect.arrayContaining([
        { period: "2026-10-01", type: "income", category: "consulting", sumUsd: 6000 },
        { period: "2026-10-01", type: "expense", category: "hosting", sumUsd: 1500 },
      ]),
    );

    const deleted = await client.callTool({ name: "delete_entry", arguments: { id: entries[1].id } });
    expect(deleted.isError).toBeFalsy();
    expect(result(await client.callTool({ name: "get_statement", arguments: {} })).expenses).toBe(0);
  });

  it("explains failures instead of throwing", async () => {
    const { client } = await setup();
    const unpriced = await client.callTool({ name: "record_entries", arguments: { entries: [{ amount: 1, currency: "sol", type: "income" }] } });
    expect(unpriced.isError).toBe(true);
    expect((unpriced.content as { text: string }[])[0]!.text).toContain("usdValue");

    const badDate = await client.callTool({ name: "get_statement", arguments: { from: "not a date" } });
    expect(badDate.isError).toBe(true);

    const missing = await client.callTool({ name: "delete_entry", arguments: { id: "nope" } });
    expect(missing.isError).toBe(true);
  });

  it("only sees the API key's own organization", async () => {
    const a = await setup();
    const b = await setup();
    const [entry] = result(await a.client.callTool({ name: "record_entries", arguments: { entries: [{ amount: 5, currency: "usd", type: "income" }] } }));
    expect(result(await b.client.callTool({ name: "list_entries", arguments: {} })).count).toBe(0);
    expect((await b.client.callTool({ name: "delete_entry", arguments: { id: entry.id } })).isError).toBe(true);
    expect(result(await a.client.callTool({ name: "list_entries", arguments: {} })).count).toBe(1);
  });
});
