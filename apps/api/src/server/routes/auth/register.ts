import { Router } from "express";
import { config } from "../../../config";
import { services } from "../../../services/services";

const router = Router();

router.post("/register", async (req, res) => {
  if (!config().auth.password.signup) {
    return res.status(403).json({ message: "Sign up is disabled on this instance" });
  }
  const { email, password, firstName, lastName } = req.body ?? {};
  const s = services();

  const result = await s.auth.register({ email, password, firstName, lastName });
  if (result.isErr()) {
    return res.status(400).json({ message: result.unwrapErr() });
  }

  const user = result.unwrap();
  const token = await s.auth.getAuthToken(user.id);
  return res.status(200).json({ token, user: { id: user.id } });
});

export default router;
