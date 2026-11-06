import { Router } from "express";
import { filterSchema } from "@accounting/shared";
import { services } from "../../../services/services";
import { serializeEntry } from "./serializer";

const entriesRouter = Router();

// list entries matching the filters in the body, with a count and a statement
entriesRouter.post("/organization/:org_id/entries", async (req, res) => {
  const filters = filterSchema.safeParse(req.body ?? {});
  if (!filters.success) {
    return res.status(400).json({ message: "Invalid filters", errors: filters.error.issues });
  }

  const s = services();
  const orgId = req.params.org_id;
  const [entries, count, statement] = await Promise.all([
    s.entries.find(orgId, filters.data),
    s.entries.count(orgId, filters.data),
    s.entries.getStatement(orgId, filters.data),
  ]);

  if (entries.isErr()) return res.status(500).json({ message: entries.unwrapErr() });
  if (count.isErr()) return res.status(500).json({ message: count.unwrapErr() });
  if (statement.isErr()) return res.status(500).json({ message: statement.unwrapErr() });

  return res.json({
    entries: await Promise.all(entries.unwrap().map(serializeEntry)),
    count: count.unwrap(),
    statement: statement.unwrap(),
  });
});

// get one entry
entriesRouter.get("/organization/:org_id/entries/:id", async (req, res) => {
  const entry = await services().entries.getById(req.params.id);
  if (entry.isErr() || entry.unwrap().organizationId !== req.params.org_id) {
    return res.status(404).json({ message: "Entry not found" });
  }
  return res.json(await serializeEntry(entry.unwrap()));
});

// delete one entry
entriesRouter.delete("/organization/:org_id/entries/:id", async (req, res) => {
  const result = await services().entries.delete(req.params.org_id, req.params.id);
  if (result.isErr()) {
    return res.status(500).json({ message: result.unwrapErr() });
  }
  if (!result.unwrap()) {
    return res.status(404).json({ message: "Entry not found" });
  }
  return res.json({ ok: true });
});

export default entriesRouter;
