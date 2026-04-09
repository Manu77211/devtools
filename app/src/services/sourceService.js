import AdmZip from "adm-zip";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { createError } from "../core/errors.js";

const execFileAsync = promisify(execFile);

function isGithubUrl(url) {
  return url.startsWith("https://github.com/") || url.startsWith("http://github.com/");
}

function ensureZipArchive(file) {
  const filename = file?.originalname || "";
  if (!filename.toLowerCase().endsWith(".zip")) {
    throw createError(400, "invalid_request", "Upload must be a .zip archive");
  }
}

async function safeExtractZip(buffer, destination) {
  const zip = new AdmZip(buffer);
  const root = path.resolve(destination);

  for (const entry of zip.getEntries()) {
    const target = path.resolve(destination, entry.entryName);
    if (!target.startsWith(root)) {
      throw createError(400, "invalid_request", "Archive contains unsafe paths");
    }
  }

  zip.extractAllTo(destination, true);
}

async function pickRepoRoot(baseDir) {
  const entries = await readdir(baseDir, { withFileTypes: true });
  const dirs = entries.filter((item) => item.isDirectory());
  if (dirs.length === 1) {
    return path.join(baseDir, dirs[0].name);
  }
  return baseDir;
}

async function cloneRepo(url, branch, destination) {
  const args = ["clone", "--depth", "1"];
  if (branch) {
    args.push("--branch", branch);
  }
  args.push(url, destination);

  try {
    await execFileAsync("git", args, { timeout: 60000 });
  } catch (err) {
    throw createError(400, "invalid_request", `Unable to clone repository: ${err.message}`);
  }
}

async function prepareFromArchive(archiveFile) {
  ensureZipArchive(archiveFile);
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "devgraph-zip-"));
  try {
    await safeExtractZip(archiveFile.buffer, tempDir);
  } catch (err) {
    await rm(tempDir, { recursive: true, force: true });
    throw err;
  }

  const repoRoot = await pickRepoRoot(tempDir);
  return {
    repoRoot,
    cleanup: async () => rm(tempDir, { recursive: true, force: true })
  };
}

async function prepareFromGithub(githubUrl, branch) {
  if (!isGithubUrl(githubUrl)) {
    throw createError(400, "invalid_request", "Only GitHub repository links are supported");
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "devgraph-git-"));
  const repoDir = path.join(tempDir, "repo");
  await mkdir(repoDir, { recursive: true });
  await cloneRepo(githubUrl, branch, repoDir);
  return {
    repoRoot: repoDir,
    cleanup: async () => rm(tempDir, { recursive: true, force: true })
  };
}

export async function prepareRepositorySource({ githubUrl, branch, archiveFile }) {
  const hasUrl = Boolean(githubUrl && githubUrl.trim());
  const hasArchive = Boolean(archiveFile);
  if (hasUrl === hasArchive) {
    throw createError(400, "invalid_request", "Provide exactly one source: github_url or archive");
  }

  if (hasArchive) {
    return prepareFromArchive(archiveFile);
  }
  return prepareFromGithub(githubUrl.trim(), branch);
}