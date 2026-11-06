import { createTestOrganization, createTestUser } from "../../../test/fixtures";
import { getServer } from "../../server";
import { beforeEach, describe, it, expect } from "bun:test";
import { Currency } from "../../../services/currencies";
import request from "supertest";
import { services } from "../../../services/services";

describe("entries router", () => {
  // seed a fresh price so tests do not depend on the RPC
  beforeEach(async () => {
    await services().currencies.updateCurrentPrice(Currency.ETH, 3000);
  });

  it("should create an entry", async () => {
    const s = services();
    const user = await createTestUser();
    const organization = await createTestOrganization(user.id);
    const apiKey = await s.apiKeys.create(organization.id, user.id, "test", ["entries:create"]);

    const app = getServer();

    const response = await request(app)
      .post("/v1/entries")
      .set("Authorization", `Bearer ${apiKey.unwrap().key}`)
      .send([
        {
          amount: 100.31,
          currency: "eth",
          dateOfEntry: "2024-01-01",
          type: "income",
          tags: ["test:me"],
          metadata: {
            test: "me",
          },
        },
      ]);

    expect(response.status).toBe(200);
    expect(response.body[0].id).toBeDefined();
    expect(response.body[0].amount).toBe(100.31);
    expect(response.body[0].currency).toBe("eth");
    expect(response.body[0].valueAtDate).toBeCloseTo(100.31 * 3000);
    expect(response.body[0].dateOfEntry).toBe("2024-01-01T00:00:00.000Z");
    expect(response.body[0].type).toBe("income");
    expect(response.body[0].tags).toEqual(["test:me"]);
    expect(response.body[0].metadata).toEqual({ test: "me" });
  });

  it("should accept number and booleans metadata", async () => {
    const s = services();
    const user = await createTestUser();
    const organization = await createTestOrganization(user.id);
    const apiKey = await s.apiKeys.create(organization.id, user.id, "test", ["entries:create"]);

    const app = getServer();

    const response = await request(app)
      .post("/v1/entries")
      .set("Authorization", `Bearer ${apiKey.unwrap().key}`)
      .send([
        {
          amount: 100.31,
          currency: "eth",
          dateOfEntry: "2024-01-01",
          type: "income",
          tags: ["test:me"],
          metadata: {
            number: 123,
            boolean: true,
          },
        },
      ]);

    expect(response.status).toBe(200);
    expect(response.body[0].id).toBeDefined();
    expect(response.body[0].metadata).toEqual({ number: 123, boolean: true });
  });

  it("should set date of entry to now if not provided", async () => {
    const s = services();
    const user = await createTestUser();
    const organization = await createTestOrganization(user.id);
    const apiKey = await s.apiKeys.create(organization.id, user.id, "test", ["entries:create"]);

    const app = getServer();

    const response = await request(app)
      .post("/v1/entries")
      .set("Authorization", `Bearer ${apiKey.unwrap().key}`)
      .send([
        {
          amount: 100.31,
          currency: "eth",
          type: "income",
        },
      ]);

    expect(response.status).toBe(200);
    expect(response.body[0].dateOfEntry).toBeDefined();
    expect(new Date(response.body[0].dateOfEntry).getTime()).toBeGreaterThan(Date.now() - 3000);
  });

  describe("usdValue", () => {
    const post = async (body: object) => {
      const s = services();
      const user = await createTestUser(`${crypto.randomUUID()}@test.com`);
      const organization = await createTestOrganization(user.id);
      const apiKey = (await s.apiKeys.create(organization.id, user.id, "test", [])).unwrap();
      return request(getServer()).post("/v1/entries").set("Authorization", `Bearer ${apiKey.key}`).send(body);
    };

    it("uses the provided value instead of the current price", async () => {
      const response = await post({ amount: 2, currency: "eth", type: "income", usdValue: 5100.25 });
      expect(response.status).toBe(200);
      // the seeded price (3000) would give 6000
      expect(response.body[0].valueAtDate).toBe(5100.25);
    });

    it("allows currencies without a price source", async () => {
      const response = await post({ amount: 10, currency: "sol", type: "expense", usdValue: 1450 });
      expect(response.status).toBe(200);
      expect(response.body[0].valueAtDate).toBe(1450);
    });

    it("explains how to fix an unpriced currency without usdValue", async () => {
      const response = await post({ amount: 10, currency: "sol", type: "expense" });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain("usdValue");
    });

    it("accepts zero", async () => {
      const response = await post({ amount: 1, currency: "eth", type: "income", usdValue: 0 });
      expect(response.status).toBe(200);
      expect(response.body[0].valueAtDate).toBe(0);
    });

    it("rejects negative or non-numeric values", async () => {
      expect((await post({ amount: 1, currency: "eth", type: "income", usdValue: -5 })).status).toBe(400);
      expect((await post({ amount: 1, currency: "eth", type: "income", usdValue: "100" })).status).toBe(400);
    });
  });

  describe("category", () => {
    const post = async (body: object) => {
      const s = services();
      const user = await createTestUser(`${crypto.randomUUID()}@test.com`);
      const organization = await createTestOrganization(user.id);
      const apiKey = (await s.apiKeys.create(organization.id, user.id, "test", [])).unwrap();
      return request(getServer()).post("/v1/entries").set("Authorization", `Bearer ${apiKey.key}`).send(body);
    };

    it("stores and returns the category, trimmed", async () => {
      const response = await post({ amount: 1, currency: "usd", type: "expense", category: "  hosting " });
      expect(response.status).toBe(200);
      expect(response.body[0].category).toBe("hosting");
    });

    it("defaults to null", async () => {
      const response = await post({ amount: 1, currency: "usd", type: "expense" });
      expect(response.status).toBe(200);
      expect(response.body[0].category).toBeNull();
    });

    it("rejects empty, too long or non-string values", async () => {
      expect((await post({ amount: 1, currency: "usd", type: "income", category: " " })).status).toBe(400);
      expect((await post({ amount: 1, currency: "usd", type: "income", category: "x".repeat(256) })).status).toBe(400);
      expect((await post({ amount: 1, currency: "usd", type: "income", category: 5 })).status).toBe(400);
    });
  });
});
