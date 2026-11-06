import { createTestOrganization, createTestUser } from "../test/fixtures";
import EntriesService from "./entries";
import { describe, it, expect } from "bun:test";

describe("EntriesService", () => {
  it("should find entries", async () => {
    const entryService = new EntriesService();

    // create organization
    const user = await createTestUser();
    const org = await createTestOrganization(user.id);

    const entry = await entryService.create(org.id, {
      amount: 100,
      currency: "usd",
      dateOfEntry: new Date().toISOString(),
      type: "income",
      tags: ["type:a"],
    });

    expect(entry.isOk()).toBe(true);

    const found = await entryService.find(org.id, {
      tags: ["type:a"],
    });

    expect(found.isOk()).toBe(true);
    expect(found.unwrap().length).toBe(1);
    expect(found.unwrap()[0].id).toBe(entry.unwrap().id);

    const notfound = await entryService.find(org.id, {
      tags: ["type:b"],
    });

    expect(notfound.isOk()).toBe(true);
    expect(notfound.unwrap().length).toBe(0);
  });

  it("should find entries by metadata", async () => {
    const entryService = new EntriesService();
    // create organization
    const user = await createTestUser();
    const org = await createTestOrganization(user.id);

    const entry = await entryService.create(org.id, {
      amount: 100,
      currency: "usd",
      dateOfEntry: new Date().toISOString(),
      type: "income",
      metadata: {
        test: "test",
      },
    });

    const found = await entryService.find(org.id, {
      metadata: {
        test: "test",
      },
    });

    expect(found.isOk()).toBe(true);
    expect(found.unwrap().length).toBe(1);
    expect(found.unwrap()[0].id).toBe(entry.unwrap().id);

    const notfound = await entryService.find(org.id, {
      metadata: {
        test: "notfound",
      },
    });

    expect(notfound.isOk()).toBe(true);
    expect(notfound.unwrap().length).toBe(0);
  });
});

describe("timestamps", () => {
  it("stores database-defaulted timestamps in UTC", async () => {
    const user = await createTestUser();
    const org = await createTestOrganization(user.id);
    const before = Date.now();
    const entry = (await new EntriesService().create(org.id, { amount: 1, currency: "usd", type: "income" })).unwrap();
    // createdAt comes from defaultNow(), dateOfEntry from the app: both must agree
    expect(Math.abs(entry.createdAt.getTime() - before)).toBeLessThan(5_000);
    expect(Math.abs(entry.createdAt.getTime() - entry.dateOfEntry.getTime())).toBeLessThan(5_000);
  });
});
