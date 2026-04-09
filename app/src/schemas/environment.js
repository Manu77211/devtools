import { createError } from "../core/errors.js";

export function parseEnvironmentScanRequest(body) {
  const repoPath = body?.repoPath ?? body?.repo_path ?? null;
  if (repoPath !== null && typeof repoPath !== "string") {
    throw createError(400, "invalid_request", "repoPath must be a string or null");
  }
  return { repoPath };
}