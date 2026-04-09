import { Router } from "express";
import multer from "multer";

import { requireOrgId } from "../core/auth.js";
import { createError } from "../core/errors.js";
import { parseAnalyzeRepoRequest, parseAnalyzeSourceRequest } from "../schemas/graph.js";
import { analyzeRepository } from "../services/graphService.js";
import { prepareRepositorySource } from "../services/sourceService.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const router = Router();

router.post("/analyze-repo", requireOrgId, async (req, res, next) => {
  try {
    const payload = parseAnalyzeRepoRequest(req.body);
    const result = await analyzeRepository(payload.repoPath, payload.maxFiles, req.orgId);
    res.json(result);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Repository path")) {
      next(createError(400, "invalid_request", err.message));
      return;
    }
    next(err);
  }
});

router.post("/analyze-source", requireOrgId, upload.single("archive"), async (req, res, next) => {
  let prepared = null;

  try {
    const payload = parseAnalyzeSourceRequest(req.body, req.file);
    prepared = await prepareRepositorySource({
      githubUrl: payload.githubUrl,
      branch: payload.branch,
      archiveFile: req.file || null
    });
    const result = await analyzeRepository(prepared.repoRoot, payload.maxFiles, req.orgId);
    res.json(result);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Repository path")) {
      next(createError(400, "invalid_request", err.message));
      return;
    }
    next(err);
  } finally {
    if (prepared) {
      await prepared.cleanup();
    }
  }
});

export default router;