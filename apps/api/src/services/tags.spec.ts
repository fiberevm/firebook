import { describe, it, expect } from "bun:test";
import TagsService from "./tags";
import { createTestOrganization, createTestUser } from "../test/fixtures";

describe("TagsService", () => {
  it("should create or get a tag", async () => {
    const service = new TagsService();
    const user = await createTestUser();
    const org = await createTestOrganization(user.id);

    const result = await service.insertOrGet(org.id, "test", "test");

    expect(result.isOk()).toBe(true);

    const result2 = await service.insertOrGet(org.id, "test", "test");

    expect(result2.isOk()).toBe(true);
    expect(result.unwrap().id).toBe(result2.unwrap().id);
  });

  it("should create tags in two different organizations", async () => {
    const service = new TagsService();
    const user = await createTestUser();
    const org1 = await createTestOrganization(user.id);
    const org2 = await createTestOrganization(user.id);

    const tag1 = await service.insertOrGet(org1.id, "test1", "test1");
    const tag2 = await service.insertOrGet(org2.id, "test1", "test1");

    expect(tag1.isOk()).toBe(true);
    expect(tag2.isOk()).toBe(true);
    expect(tag1.unwrap().id).not.toBe(tag2.unwrap().id);
  });
});
