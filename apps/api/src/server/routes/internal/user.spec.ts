import request from "supertest";
import { createTestJwt, createTestUser } from "../../../test/fixtures";
import { getServer } from "../../server";
import { describe, it, expect } from "bun:test";

describe("user router", () => {
  it("should return the current user", async () => {
    const user = await createTestUser();
    const jwt = await createTestJwt(user);

    const app = getServer();
    const res = await request(app).get("/user").set("Authorization", `Bearer ${jwt}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(user.id);
  });

  it("should return 401 if no authorization header is present", async () => {
    const app = getServer();
    const res = await request(app).get("/user");

    expect(res.status).toBe(401);
  });
});
