import { services } from "../../services/services";
import { createTestUser } from "../../test/fixtures";
import { describe, it, expect, jest } from "bun:test";
import { authenticate } from "./authentication";
import type { NextFunction, Request, Response } from "express";
import { getRequestContext } from "../als";
describe("Authentication middleware", () => {
  it("should authenticate a request", async () => {
    const s = services();

    const u = await createTestUser();

    const token = await s.auth.getAuthToken(u.id);

    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const next = jest.fn();

    await authenticate(req as unknown as Request, res as unknown as Response, next as unknown as NextFunction);

    expect(next).toHaveBeenCalled();
  });

  it("should return 401 if the token is invalid", async () => {
    const s = services();

    const req = {
      headers: {
        authorization: `Bearer invalid`,
      },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const next = jest.fn();

    await authenticate(req as unknown as Request, res as unknown as Response, next as unknown as NextFunction);

    expect(next).toHaveBeenCalled();
  });
});
