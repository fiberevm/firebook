import { describe, it, expect } from "bun:test";
import { services } from "../../../services/services";
import { createTestJwt, createTestOrganization, createTestUser } from "../../../test/fixtures";
import { getServer } from "../../server";
import request from "supertest";

describe("statement", () => {
  it("should return a daily statement", async () => {
    const s = services();
    const user = await createTestUser();
    const org = await createTestOrganization(user.id);
    const jwt = await createTestJwt(user);

    const a = await s.entries.create(org.id, {
      amount: 100,
      currency: "usd",
      dateOfEntry: "2024-01-01",
      type: "income",
    });

    const app = getServer();

    const req = await request(app)
      .post(`/organization/${org.id}/statement/daily`)
      .set("Authorization", `Bearer ${jwt}`)
      .send({
        from: new Date("2024-01-01"),
        to: new Date("2024-01-02"),
      });

    expect(req.status).toBe(200);
    expect(req.body.incomePerDay).toEqual([{ date: "2024-01-01", sum: 100 }]);
    expect(req.body.expensesPerDay).toEqual([]);
    expect(req.body.incomeByCurrencyPerDay).toEqual([
      {
        date: "2024-01-01",
        currency: "usd",
        sumUsd: 100,
        sum: 100,
      },
    ]);
    expect(req.body.expensesByCurrencyPerDay).toEqual([]);
  });

  it("breaks totals down by category per day, week and month", async () => {
    const s = services();
    const user = await createTestUser();
    const org = await createTestOrganization(user.id);
    const jwt = await createTestJwt(user);
    const entry = (dateOfEntry: string, type: "income" | "expense", amount: number, category?: string) =>
      s.entries.create(org.id, { amount, currency: "usd", type, dateOfEntry, category });

    // 2024-01-01 is a Monday
    await entry("2024-01-01", "income", 100, "sales");
    await entry("2024-01-03", "income", 50, "sales");
    await entry("2024-01-03", "expense", 30, "hosting");
    await entry("2024-01-08", "expense", 10);
    await entry("2024-02-01", "income", 5, "sales");

    const app = getServer();
    const post = (body: object) => request(app).post(`/organization/${org.id}/statement/categories`).set("Authorization", `Bearer ${jwt}`).send(body);

    const weekly = await post({ interval: "week", to: "2024-01-31" });
    expect(weekly.status).toBe(200);
    expect(weekly.body.interval).toBe("week");
    expect(weekly.body.rows).toEqual(
      expect.arrayContaining([
        { period: "2024-01-01", type: "income", category: "sales", sumUsd: 150 },
        { period: "2024-01-01", type: "expense", category: "hosting", sumUsd: 30 },
        { period: "2024-01-08", type: "expense", category: null, sumUsd: 10 },
      ]),
    );
    expect(weekly.body.rows).toHaveLength(3);

    const monthly = await post({ interval: "month" });
    expect(monthly.body.rows).toEqual(
      expect.arrayContaining([
        { period: "2024-01-01", type: "income", category: "sales", sumUsd: 150 },
        { period: "2024-02-01", type: "income", category: "sales", sumUsd: 5 },
      ]),
    );

    const daily = await post({});
    expect(daily.body.interval).toBe("day");
    expect(daily.body.rows).toHaveLength(5);

    // the category filter applies too
    const hosting = await post({ interval: "month", category: "hosting" });
    expect(hosting.body.rows).toEqual([{ period: "2024-01-01", type: "expense", category: "hosting", sumUsd: 30 }]);

    expect((await post({ interval: "year" })).status).toBe(400);
  });
});
