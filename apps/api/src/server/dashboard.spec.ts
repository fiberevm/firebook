import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { createTestJwt, createTestUser } from "../test/fixtures";
import { getServer } from "./server";

const browser = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
let dir = "";

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "dashboard-"));
  mkdirSync(join(dir, "assets"));
  writeFileSync(join(dir, "index.html"), "<!doctype html><title>Firebook</title>");
  writeFileSync(join(dir, "assets", "index-abc.js"), "console.log(1)");
  writeFileSync(join(dir, "favicon.svg"), "<svg/>");
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("dashboard", () => {
  it("serves index.html for client-side routes loaded in a browser", async () => {
    const app = getServer({ dashboard: dir });
    for (const path of ["/", "/signup", "/auth/callback", "/o/123/entries", "/new"]) {
      const res = await request(app).get(path).set("Accept", browser);
      expect(res.status).toBe(200);
      expect(res.text).toContain("<title>Firebook</title>");
      expect(res.headers["cache-control"]).toBe("no-cache");
    }
  });

  it("serves assets with long-lived caching, and 404s for missing ones", async () => {
    const app = getServer({ dashboard: dir });
    const asset = await request(app).get("/assets/index-abc.js");
    expect(asset.status).toBe(200);
    expect(asset.headers["cache-control"]).toContain("immutable");
    expect((await request(app).get("/favicon.svg")).status).toBe(200);
    expect((await request(app).get("/assets/missing.js").set("Accept", browser)).status).toBe(404);
  });

  it("leaves API requests alone", async () => {
    const app = getServer({ dashboard: dir });
    // the dashboard's fetch calls do not ask for HTML
    expect((await request(app).get("/user")).status).toBe(401);
    expect((await request(app).get("/auth/settings").set("Accept", "*/*")).body.password.enabled).toBe(true);
    expect((await request(app).get("/health").set("Accept", browser)).status).toBe(200);
    const user = await createTestUser();
    const me = await request(app)
      .get("/user")
      .set("Authorization", `Bearer ${await createTestJwt(user)}`);
    expect(me.status).toBe(200);
    expect(me.body.user?.email ?? me.body.email).toBe(user.email);
    // POSTs are never the dashboard
    expect((await request(app).post("/v1/entries").set("Accept", browser).send({})).status).toBe(401);
  });

  it("is skipped when there is no build", async () => {
    const res = await request(getServer({ dashboard: null }))
      .get("/")
      .set("Accept", browser);
    expect(res.status).toBe(401);
  });
});
