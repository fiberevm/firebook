import { Router } from "express";
import type { Entry } from "@accounting/db";
import { entrySchema } from "@accounting/shared";
import logger from "../../../logger";
import { services } from "../../../services/services";
import { getRequestContext } from "../../als";
import { serializeEntry } from "../internal/serializer";

const entriesRouter = Router();
const log = logger("v1/entries");

// create one or many entries
entriesRouter.post("/entries", async (req, res) => {
  const body = Array.isArray(req.body) ? req.body : [req.body];

  const validated = entrySchema.array().safeParse(body);
  if (!validated.success) {
    log.debug("Invalid entry submitted", validated.error.issues);
    return res.status(400).json({ message: "Invalid entries", errors: validated.error.issues });
  }

  const organizationId = getRequestContext().key!.organizationId!;
  const s = services();
  const results: Entry[] = [];

  for (const entry of validated.data) {
    const result = await s.entries.create(organizationId, entry);
    if (result.isErr()) {
      return res.status(400).json({ message: result.unwrapErr() });
    }
    results.push(result.unwrap());
  }

  return res.json(await Promise.all(results.map(serializeEntry)));
});

export default entriesRouter;
