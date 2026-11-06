import { Router } from "express";
import { config } from "../../../config";
import { services } from "../../../services/services";

const router = Router();

router.post("/login", async (req, res) => {
  if (!config().auth.password.enabled) {
    return res.status(403).json({ message: "Password sign-in is disabled on this instance" });
  }
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const s = services();
  const user = await s.auth.verifyCredentials(email, password);
  if (user.isErr()) {
    return res.status(401).json({ message: user.unwrapErr() });
  }

  const token = await s.auth.getAuthToken(user.unwrap().id);
  return res.json({ token, user: { id: user.unwrap().id } });
});

export default router;
