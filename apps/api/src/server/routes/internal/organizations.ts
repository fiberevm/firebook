import { Router, type Response } from "express";
import { services } from "../../../services/services";
import { getRequestContext } from "../../als";
import { serializeOrganization, serializeOrganizationUser } from "./serializer";

const organizationsRouter = Router();

// returns all the organizations for a user
organizationsRouter.get("/organizations", async (_, res) => {
  const result = await services().organizations.getAllForUser(getRequestContext().user!.id);
  if (result.isErr()) {
    return res.status(500).json({ message: result.unwrapErr() });
  }
  return res.json(result.unwrap().map(serializeOrganization));
});

// create a new organization
organizationsRouter.post("/organizations", async (req, res) => {
  const { name } = req.body ?? {};
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ message: "name is required" });
  }

  const result = await services().organizations.create(name.trim(), getRequestContext().user!.id);
  if (result.isErr()) {
    return res.status(500).json({ message: result.unwrapErr() });
  }
  return res.json(serializeOrganization(result.unwrap()));
});

// make sure the user is a member of the organization (and an admin if required).
// Sends a 403 and returns false otherwise.
async function checkMembership(orgId: string, res: Response, role?: "admin"): Promise<boolean> {
  const access = await services().organizations.hasAccess(getRequestContext().user!.id, orgId);
  if (access.isErr()) {
    res.status(403).json({ message: access.unwrapErr() });
    return false;
  }
  if (role && access.unwrap().role !== role) {
    res.status(403).json({ message: `User does not have ${role} role` });
    return false;
  }
  return true;
}

// get members for an organization
organizationsRouter.get("/organizations/:id/members", async (req, res) => {
  if (!(await checkMembership(req.params.id, res))) return;
  const s = services();
  const result = await s.organizations.getMembers(req.params.id);
  if (result.isErr()) {
    return res.status(500).json({ message: result.unwrapErr() });
  }
  return res.json(await Promise.all(result.unwrap().map((m) => serializeOrganizationUser(m, s.users))));
});

// add a member to an organization by email
organizationsRouter.post("/organizations/:id/members", async (req, res) => {
  if (!(await checkMembership(req.params.id, res, "admin"))) return;
  const { email } = req.body ?? {};
  if (typeof email !== "string" || !email) {
    return res.status(400).json({ message: "email is required" });
  }

  const s = services();
  const user = await s.users.getByEmail(email);
  if (user.isErr()) {
    return res.status(404).json({ message: user.unwrapErr() });
  }

  const result = await s.organizations.addUser(req.params.id, user.unwrap().id);
  if (result.isErr()) {
    return res.status(400).json({ message: result.unwrapErr() });
  }
  return res.json(await serializeOrganizationUser(result.unwrap(), s.users));
});

// remove a member (by user id) from an organization
organizationsRouter.delete("/organizations/:id/members/:userId", async (req, res) => {
  if (!(await checkMembership(req.params.id, res, "admin"))) return;
  const result = await services().organizations.removeUser(req.params.id, req.params.userId);
  if (result.isErr()) {
    return res.status(400).json({ message: result.unwrapErr() });
  }
  return res.json({ ok: true });
});

export default organizationsRouter;
