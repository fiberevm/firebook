import { describe, expect, it } from "bun:test";
import request from "supertest";
import { services } from "../../../services/services";
import { createTestJwt, createTestOrganization, createTestUser } from "../../../test/fixtures";
import { getServer } from "../../server";

describe("api keys router", () => {
  it("creates, lists and deletes keys", async () => {
    const user = await createTestUser();
    const org = await createTestOrganization(user.id);
    const jwt = await createTestJwt(user);
    const app = getServer();

    const created = await request(app).post(`/organization/${org.id}/api_keys`).set("Authorization", `Bearer ${jwt}`).send({ name: "ci" });
    expect(created.status).toBe(200);
    expect(created.body.key).toStartWith("firebooks_");

    const list = await request(app).get(`/organization/${org.id}/api_keys`).set("Authorization", `Bearer ${jwt}`);
    expect(list.body.map((k: { id: string }) => k.id)).toEqual([created.body.id]);

    const deleted = await request(app).delete(`/organization/${org.id}/api_keys/${created.body.id}`).set("Authorization", `Bearer ${jwt}`);
    expect(deleted.status).toBe(200);

    const after = await request(app).get(`/organization/${org.id}/api_keys`).set("Authorization", `Bearer ${jwt}`);
    expect(after.body).toEqual([]);

    // deleted keys can no longer authenticate
    const v1 = await request(app).post("/v1/entries").set("Authorization", `Bearer ${created.body.key}`).send({ amount: 1, currency: "usd", type: "income" });
    expect(v1.status).toBe(401);
  });

  it("does not delete a key belonging to another organization", async () => {
    const s = services();
    const victim = await createTestUser("victim@test.com");
    const victimOrg = await createTestOrganization(victim.id);
    const key = (await s.apiKeys.create(victimOrg.id, victim.id, "prod", [])).unwrap();

    const attacker = await createTestUser("attacker@test.com");
    const attackerOrg = await createTestOrganization(attacker.id);
    const jwt = await createTestJwt(attacker);

    const res = await request(getServer()).delete(`/organization/${attackerOrg.id}/api_keys/${key.id}`).set("Authorization", `Bearer ${jwt}`);
    expect(res.status).toBe(404);
    expect((await s.apiKeys.getByKey(key.key)).isOk()).toBe(true);
  });
});
