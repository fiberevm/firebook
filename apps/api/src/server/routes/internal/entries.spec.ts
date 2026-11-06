import { describe, expect, it } from "bun:test";
import request from "supertest";
import { services } from "../../../services/services";
import { createTestJwt, createTestOrganization, createTestUser } from "../../../test/fixtures";
import { getServer } from "../../server";

async function setup() {
  const user = await createTestUser();
  const org = await createTestOrganization(user.id);
  const jwt = await createTestJwt(user);
  const s = services();
  const a = (
    await s.entries.create(org.id, {
      amount: 100,
      currency: "usd",
      type: "income",
      dateOfEntry: "2024-01-01",
      tags: ["client:acme"],
      metadata: { invoice: "A-1" },
    })
  ).unwrap();
  const b = (
    await s.entries.create(org.id, { amount: 40, currency: "usd", type: "expense", dateOfEntry: "2024-01-02", metadata: { invoice: "B-2" } })
  ).unwrap();
  return { user, org, jwt, a, b, app: getServer() };
}

describe("internal entries router", () => {
  it("lists entries with count and statement", async () => {
    const { org, jwt, app } = await setup();
    const res = await request(app).post(`/organization/${org.id}/entries`).set("Authorization", `Bearer ${jwt}`).send({});
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.entries).toHaveLength(2);
    expect(res.body.statement.income).toBe(100);
    expect(res.body.statement.expenses).toBe(40);
  });

  it("filters by tag, and returns nothing for an unknown tag", async () => {
    const { org, jwt, app, a } = await setup();
    const byTag = await request(app)
      .post(`/organization/${org.id}/entries`)
      .set("Authorization", `Bearer ${jwt}`)
      .send({ tags: ["client:acme"] });
    expect(byTag.body.entries.map((e: { id: string }) => e.id)).toEqual([a.id]);

    const unknown = await request(app)
      .post(`/organization/${org.id}/entries`)
      .set("Authorization", `Bearer ${jwt}`)
      .send({ tags: ["client:nobody"] });
    expect(unknown.status).toBe(200);
    expect(unknown.body.count).toBe(0);
    expect(unknown.body.statement.income).toBe(0);
  });

  it("filters statements by metadata", async () => {
    const { org, jwt, app } = await setup();
    const res = await request(app)
      .post(`/organization/${org.id}/statement`)
      .set("Authorization", `Bearer ${jwt}`)
      .send({ metadata: { invoice: "B-2" } });
    expect(res.status).toBe(200);
    expect(res.body.income).toBe(0);
    expect(res.body.expenses).toBe(40);
  });

  it("gets and deletes an entry", async () => {
    const { org, jwt, app, a } = await setup();
    const got = await request(app).get(`/organization/${org.id}/entries/${a.id}`).set("Authorization", `Bearer ${jwt}`);
    expect(got.status).toBe(200);
    expect(got.body.tags).toEqual(["client:acme"]);

    const del = await request(app).delete(`/organization/${org.id}/entries/${a.id}`).set("Authorization", `Bearer ${jwt}`);
    expect(del.status).toBe(200);

    const gone = await request(app).get(`/organization/${org.id}/entries/${a.id}`).set("Authorization", `Bearer ${jwt}`);
    expect(gone.status).toBe(404);
  });

  it("returns 404 for a malformed entry id", async () => {
    const { org, jwt, app } = await setup();
    const res = await request(app).get(`/organization/${org.id}/entries/not-a-uuid`).set("Authorization", `Bearer ${jwt}`);
    expect(res.status).toBe(404);
  });

  it("rejects access to another organization", async () => {
    const { org } = await setup();
    const other = await createTestUser("other@test.com");
    const jwt = await createTestJwt(other);
    const res = await request(getServer()).post(`/organization/${org.id}/entries`).set("Authorization", `Bearer ${jwt}`).send({});
    expect(res.status).toBe(403);
  });
});
