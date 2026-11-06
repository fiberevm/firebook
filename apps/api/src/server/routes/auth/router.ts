import { Router } from "express";
import loginRouter from "./login";
import oidcRouter from "./oidc";
import registerRouter from "./register";
import settingsRouter from "./settings";

const router = Router();

router.use(loginRouter);
router.use(registerRouter);
router.use(oidcRouter);
router.use(settingsRouter);

export default router;
