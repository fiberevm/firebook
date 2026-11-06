import { createTestUser } from "../test/fixtures";
import { services } from "./services";
import { describe, it, expect } from "bun:test";

describe("UsersService", () => {
  it("should get a user", async () => {
    const s = services();
    const u = await createTestUser();

    const user = await s.users.get(u.id);

    expect(user.isOk()).toBe(true);
    expect(user.unwrap().id).toBe(u.id);
  });

  it("should return an error if the user does not exist", async () => {
    const s = services();

    const user = await s.users.get("229377c5-932f-4624-948e-8c8730f8f4ad");

    expect(user.isErr()).toBe(true);
  });
});
