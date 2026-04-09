import { createError } from "../core/errors.js";

function parseMaxFiles(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 500) {
    throw createError(400, "invalid_request", "max_files must be between 1 and 500");
  }
  return parsed;
}

export function parseAnalyzeRepoRequest(body) {
  const repoPath = body?.repoPath ?? body?.repo_path;
  if (typeof repoPath !== "string" || repoPath.trim().length < 1) {
    throw createError(400, "invalid_request", "repoPath is required");
  }

  const maxFiles = parseMaxFiles(body?.maxFiles ?? body?.max_files, 120);
  return { repoPath: repoPath.trim(), maxFiles };
}

export function parseAnalyzeSourceRequest(body, file) {
  const githubUrl = typeof body?.github_url === "string"
    ? body.github_url.trim()
    : typeof body?.githubUrl === "string"
      ? body.githubUrl.trim()
      : "";
  const branch = typeof body?.branch === "string" ? body.branch.trim() : null;
  const maxFiles = parseMaxFiles(body?.max_files ?? body?.maxFiles, 120);
  const hasUrl = githubUrl.length > 0;
  const hasArchive = Boolean(file);

  if (hasUrl === hasArchive) {
    throw createError(400, "invalid_request", "Provide exactly one source: github_url or archive");
  }

  return {
    githubUrl: hasUrl ? githubUrl : null,
    branch,
    maxFiles
  };
}