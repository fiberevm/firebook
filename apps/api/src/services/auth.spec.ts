import { services } from "./services";
import { describe, it, expect } from "bun:test";

describe("AuthService", () => {
  it("should register a user", async () => {
    const s = services();

    const result = await s.auth.register({ email: "test@test.com", password: "password", firstName: "test", lastName: "test" });

    expect(result.isOk()).toBe(true);
  });

  it("should not register a user with an existing email", async () => {
    const s = services();

    await s.auth.register({ email: "test@test.com", password: "password", firstName: "test", lastName: "test" });

    const result = await s.auth.register({ email: "test@test.com", password: "password", firstName: "test", lastName: "test" });

    expect(result.isErr()).toBe(true);
  });
});
