import { createTestUser } from "../test/fixtures";
import OrganizationsService from "./organizations";
import { describe, it, expect } from "bun:test";

describe("OrganizationsService", () => {
  it("should create an organization", async () => {
    const service = new OrganizationsService();
    const user = await createTestUser();

    const organization = await service.create("test", user.id);

    expect(organization.isOk()).toBe(true);
  });

  it("should get all organizations for a user", async () => {
    const service = new OrganizationsService();
    const user = await createTestUser();

    const org = await service.create("test", user.id);

    const organizations = await service.getAllForUser(user.id);

    if (organizations.isErr()) {
      console.error("Could not get organizations", organizations.unwrapErr());
    }

    expect(organizations.isOk()).toBe(true);
    expect(organizations.unwrap().length).toBe(1);
    expect(organizations.unwrap()[0].id).toBe(org.unwrap().id);
  });
});
