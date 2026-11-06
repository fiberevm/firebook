import { apiKeyAuth } from "./api_key_auth";
import type { Request, Response } from "express";
import { describe, it, expect, jest } from "bun:test";

describe("apiKeyAuth", () => {
  it("should not set the key in the context for an invalid api key", async () => {
    const req = { headers: { authorization: "Bearer 1234567890" } } as Request;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const next = jest.fn();

    await apiKeyAuth(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalled();
  });
});
