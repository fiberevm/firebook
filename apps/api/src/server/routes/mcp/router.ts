import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Router } from "express";
import logger from "../../../logger";
import { getRequestContext } from "../../als";
import { createMcpServer } from "./tools";

const log = logger("mcp");
const mcpRouter = Router();

// Streamable HTTP, stateless: every request gets its own server bound to the API key's organization
mcpRouter.post("/", async (req, res) => {
  const organizationId = getRequestContext().key?.organizationId;
  if (!organizationId) {
    return res.status(401).json({ jsonrpc: "2.0", error: { code: -32001, message: "Send a Firebook API key as: Authorization: Bearer <key>" }, id: null });
  }

  const server = createMcpServer(organizationId);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on("close", () => {
    void transport.close();
    void server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (e) {
    log.error("MCP request failed", e);
    if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal error" }, id: null });
  }
});

// no sessions, so no server-initiated streams to open or close
mcpRouter.all("/", (_req, res) => {
  res.setHeader("Allow", "POST");
  return res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null });
});

export default mcpRouter;
