import { Router } from "express";
import { breakdownSchema, filterSchema } from "@accounting/shared";
import { services } from "../../../services/services";

const statementRouter = Router();

// get a statement for a specific time frame
statementRouter.post("/organization/:org_id/statement", async (req, res) => {
  const filters = filterSchema.safeParse(req.body ?? {});
  if (!filters.success) {
    return res.status(400).json({ message: "Invalid filters", errors: filters.error.issues });
  }

  const result = await services().entries.getStatement(req.params.org_id, filters.data);
  if (result.isErr()) {
    return res.status(500).json({ message: result.unwrapErr() });
  }
  return res.json(result.unwrap());
});

// get a daily statement
statementRouter.post("/organization/:org_id/statement/daily", async (req, res) => {
  const filters = filterSchema.safeParse(req.body ?? {});
  if (!filters.success) {
    return res.status(400).json({ message: "Invalid filters", errors: filters.error.issues });
  }

  const result = await services().entries.getDailyStatement(req.params.org_id, filters.data);
  if (result.isErr()) {
    return res.status(500).json({ message: result.unwrapErr() });
  }
  return res.json(result.unwrap());
});

// USD totals per day, week or month, split by entry type and category
statementRouter.post("/organization/:org_id/statement/categories", async (req, res) => {
  const body = breakdownSchema.safeParse(req.body ?? {});
  if (!body.success) {
    return res.status(400).json({ message: "Invalid filters", errors: body.error.issues });
  }

  const { interval, ...filters } = body.data;
  const result = await services().entries.getCategoryBreakdown(req.params.org_id, filters, interval);
  if (result.isErr()) {
    return res.status(500).json({ message: result.unwrapErr() });
  }
  return res.json(result.unwrap());
});

export default statementRouter;
