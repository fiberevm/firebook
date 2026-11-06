import { describe, it, expect } from "bun:test";
import request from "supertest";
import { getServer } from "../../server";

describe("POST /register", () => {
  it("should register a new user", async () => {
    const server = await getServer();

    const response = await request(server).post("/auth/register").send({
      email: "test@example.com",
      password: "password",
      firstName: "John",
      lastName: "Doe",
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });

  it("should return 400 if required fields are missing", async () => {
    const server = await getServer();
    const response = await request(server).post("/auth/register").send({});
    expect(response.status).toBe(400);
  });

  it("should return 400 if email is invalid", async () => {
    const server = await getServer();
    const response = await request(server).post("/auth/register").send({ email: "invalid-email" });
    expect(response.status).toBe(400);
  });
});
