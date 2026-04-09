import { Router } from "express";

import { requireOrgId } from "../core/auth.js";
import { createError } from "../core/errors.js";
import { parseEnvironmentScanRequest } from "../schemas/environment.js";
import { scanEnvironment } from "../services/environmentService.js";

const router = Router();

router.post("/scan", requireOrgId, async (req, res, next) => {
  try {
    const payload = parseEnvironmentScanRequest(req.body);
    const report = await scanEnvironment(req.orgId, payload.repoPath);
    res.json(report);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Repository path")) {
      next(createError(400, "invalid_request", err.message));
      return;
    }
    next(err);
  }
});

router.get("/health", requireOrgId, async (req, res, next) => {
  try {
    const repoPath = typeof req.query.repo_path === "string"
      ? req.query.repo_path
      : typeof req.query.repoPath === "string"
        ? req.query.repoPath
        : null;
    const report = await scanEnvironment(req.orgId, repoPath);
    res.json(report);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Repository path")) {
      next(createError(400, "invalid_request", err.message));
      return;
    }
    next(err);
  }
});

export default router;