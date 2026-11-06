import { getServer } from "../../server";
import request from "supertest";
import { describe, it, expect } from "bun:test";
import { services } from "../../../services/services";

describe("POST /login", () => {
  it("should login a user", async () => {
    const server = await getServer();
    const s = services();

    await s.auth.register({ email: "test@test.com", password: "password", firstName: "test", lastName: "test" });

    const response = await request(server).post("/auth/login").send({ email: "test@test.com", password: "password" });

    expect(response.status).toBe(200);
  });

  it("should return 401 if invalid password", async () => {
    const server = await getServer();
    const s = services();

    await s.auth.register({ email: "test@test.com", password: "password", firstName: "test", lastName: "test" });

    const response = await request(server).post("/auth/login").send({ email: "test@test.com", password: "invalid" });

    expect(response.status).toBe(401);
  });

  it("should return 401 if invalid email", async () => {
    const server = await getServer();

    const response = await request(server).post("/auth/login").send({ email: "invalid@test.com", password: "password" });

    expect(response.status).toBe(401);
  });
});
