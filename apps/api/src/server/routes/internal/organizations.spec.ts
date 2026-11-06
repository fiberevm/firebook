import { createTestJwt, createTestOrganization, createTestUser } from "../../../test/fixtures";
import { getServer } from "../../server";
import request from "supertest";
import { describe, it, expect } from "bun:test";

describe("organizations router", () => {
  it("should return all organizations for a user", async () => {
    const user = await createTestUser();
    const org = await createTestOrganization(user.id);
    const jwt = await createTestJwt(user);

    const app = getServer();

    const res = await request(app).get("/organizations").set("Authorization", `Bearer ${jwt}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe(org.id);
  });

  it("should create an organization", async () => {
    const user = await createTestUser();
    const jwt = await createTestJwt(user);

    const app = getServer();

    const res = await request(app).post("/organizations").set("Authorization", `Bearer ${jwt}`).send({
      name: "Test Organization",
    });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Test Organization");
  });

  it("adds and removes members by user id", async () => {
    const admin = await createTestUser();
    const org = await createTestOrganization(admin.id);
    const member = await createTestUser("member@test.com");
    const jwt = await createTestJwt(admin);
    const app = getServer();

    const added = await request(app).post(`/organizations/${org.id}/members`).set("Authorization", `Bearer ${jwt}`).send({ email: "MEMBER@test.com" });
    expect(added.status).toBe(200);
    expect(added.body.user.id).toBe(member.id);
    expect(added.body.role).toBe("member");

    const duplicate = await request(app).post(`/organizations/${org.id}/members`).set("Authorization", `Bearer ${jwt}`).send({ email: "member@test.com" });
    expect(duplicate.status).toBe(400);

    const removed = await request(app).delete(`/organizations/${org.id}/members/${member.id}`).set("Authorization", `Bearer ${jwt}`);
    expect(removed.status).toBe(200);

    const members = await request(app).get(`/organizations/${org.id}/members`).set("Authorization", `Bearer ${jwt}`);
    expect(members.body.map((m: { user: { id: string } }) => m.user.id)).toEqual([admin.id]);
  });

  it("does not remove the last admin", async () => {
    const admin = await createTestUser();
    const org = await createTestOrganization(admin.id);
    const jwt = await createTestJwt(admin);
    const res = await request(getServer()).delete(`/organizations/${org.id}/members/${admin.id}`).set("Authorization", `Bearer ${jwt}`);
    expect(res.status).toBe(400);
  });
});
