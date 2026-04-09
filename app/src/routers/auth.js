import jwt from "jsonwebtoken";
import { Router } from "express";

import { JWT_ALGORITHM, JWT_SECRET } from "../core/auth.js";

const router = Router();

router.get("/dev-token", async (_req, res, next) => {
  try {
    const payload = {
      org_id: "org-demo",
      sub: "dev-user",
      exp: Math.floor(Date.now() / 1000) + 6 * 60 * 60
    };
    const token = jwt.sign(payload, JWT_SECRET, { algorithm: JWT_ALGORITHM });
    res.json({ token });
  } catch (err) {
    next(err);
  }
});

export default router;