import { Router } from "express";
import { services } from "../../../services/services";
import { getRequestContext } from "../../als";
import apiKeysRouter from "./api_keys";
import entriesRouter from "./entries";
import organizationsRouter from "./organizations";
import statementRouter from "./statement";
import userRouter from "./user";

const internalRouter = Router();

// make sure we have a user
internalRouter.use((_, res, next) => {
  if (!getRequestContext().user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
});

// make sure the user has access to the organization in the path
internalRouter.use("/organization/:org_id", async (req, res, next) => {
  const result = await services().organizations.hasAccess(getRequestContext().user!.id, req.params.org_id);
  if (result.isErr()) {
    return res.status(403).json({ message: result.unwrapErr() });
  }
  next();
});

internalRouter.use(organizationsRouter);
internalRouter.use(apiKeysRouter);
internalRouter.use(userRouter);
internalRouter.use(entriesRouter);
internalRouter.use(statementRouter);

export default internalRouter;
