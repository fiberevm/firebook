import { Router } from "express";
import { services } from "../../../services/services";
import { getRequestContext } from "../../als";
import { serializeOrganization, serializeUser } from "./serializer";

const userRouter = Router();

// current user, with their organizations
userRouter.get("/user", async (_, res) => {
  const user = getRequestContext().user!;
  const orgs = await services().organizations.getAllForUser(user.id);
  if (orgs.isErr()) {
    return res.status(500).json({ message: orgs.unwrapErr() });
  }
  return res.json({
    ...serializeUser(user),
    organizations: orgs.unwrap().map(serializeOrganization),
  });
});

export default userRouter;
