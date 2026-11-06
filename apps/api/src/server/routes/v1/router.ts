import { Router } from "express";
import { getRequestContext } from "../../als";
import entriesRouter from "./entries";

const v1Router = Router();

// force api key auth
v1Router.use((_, res, next) => {
  if (!getRequestContext().key) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
});

v1Router.use(entriesRouter);

export default v1Router;
