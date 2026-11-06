import { createTestOrganization, createTestUser } from "../test/fixtures";
import ApiKeysService from "./api_keys";
import { describe, it, expect } from "bun:test";

describe("ApiKeysService", () => {
  it("should create an api key", async () => {
    const service = new ApiKeysService();
    const user = await createTestUser();
    const organization = await createTestOrganization(user.id);

    const key = await service.create(organization.id, user.id, "test", ["admin"]);

    expect(key.isOk()).toBe(true);
  });

  it("should list api keys", async () => {
    const service = new ApiKeysService();
    const user = await createTestUser();
    const organization = await createTestOrganization(user.id);

    await service.create(organization.id, user.id, "test", ["admin"]);

    const keys = await service.list(organization.id);

    expect(keys.isOk()).toBe(true);
  });
});
