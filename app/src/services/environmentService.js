import { access, readFile, statfs } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

const execFileAsync = promisify(execFile);

async function runVersion(command, args, fallback) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, { timeout: 3000 });
    const firstLine = `${stdout}${stderr}`.trim().split(/\r?\n/u)[0];
    return firstLine || fallback;
  } catch (_err) {
    return fallback;
  }
}

function parseRequirementName(raw) {
  const cleaned = raw.trim();
  if (!cleaned || cleaned.startsWith("#")) {
    return null;
  }
  const name = cleaned.split("==", 1)[0].split(">=", 1)[0].split("[", 1)[0].trim().toLowerCase();
  return name || null;
}

async function collectPythonRequirements(repoRoot) {
  const backendReq = path.join(repoRoot, "backend", "requirements.txt");
  const rootReq = path.join(repoRoot, "requirements.txt");
  let selected = backendReq;

  try {
    await access(backendReq);
  } catch (_err) {
    selected = rootReq;
  }

  let content;
  try {
    content = await readFile(selected, "utf-8");
  } catch (_err) {
    return new Set();
  }

  const names = new Set();
  for (const line of content.split(/\r?\n/u)) {
    const parsed = parseRequirementName(line);
    if (parsed) {
      names.add(parsed);
    }
  }
  return names;
}

async function collectNodeRequirements(repoRoot) {
  const frontendPackage = path.join(repoRoot, "frontend", "package.json");
  const rootPackage = path.join(repoRoot, "package.json");
  let selected = frontendPackage;

  try {
    await access(frontendPackage);
  } catch (_err) {
    selected = rootPackage;
  }

  let parsed;
  try {
    const content = await readFile(selected, "utf-8");
    parsed = JSON.parse(content);
  } catch (_err) {
    return new Set();
  }

  const deps = Object.keys(parsed.dependencies || {});
  const devDeps = Object.keys(parsed.devDependencies || {});
  return new Set([...deps, ...devDeps].map((value) => value.toLowerCase()));
}

async function installedPythonPackages() {
  const commands = [
    ["python", ["-m", "pip", "freeze"]],
    ["py", ["-m", "pip", "freeze"]]
  ];

  for (const [command, args] of commands) {
    try {
      const { stdout } = await execFileAsync(command, args, { timeout: 10000 });
      const names = stdout
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.split("==", 1)[0].toLowerCase());
      return new Set(names);
    } catch (_err) {
      continue;
    }
  }

  return new Set();
}

async function nodeModuleExists(baseDir, packageName) {
  const parts = packageName.startsWith("@") ? packageName.split("/") : [packageName];
  const candidate = path.join(baseDir, "node_modules", ...parts);
  try {
    await access(candidate);
    return true;
  } catch (_err) {
    return false;
  }
}

async function installedNodePackages(repoRoot, required) {
  const frontendRoot = path.join(repoRoot, "frontend");
  const installed = new Set();
  for (const name of required) {
    const inFrontend = await nodeModuleExists(frontendRoot, name);
    const inRoot = inFrontend ? true : await nodeModuleExists(repoRoot, name);
    if (inFrontend || inRoot) {
      installed.add(name);
    }
  }
  return installed;
}

async function resolveRepoRoot(repoPath) {
  const defaultRoot = process.env.DEVGRAPH_REPO_ROOT || process.cwd();
  const resolved = path.resolve(repoPath || defaultRoot);
  try {
    const info = await import("node:fs/promises").then((fs) => fs.stat(resolved));
    if (!info.isDirectory()) {
      throw new Error("not-dir");
    }
    return resolved;
  } catch (_err) {
    throw new Error("Repository path must be an existing directory");
  }
}

async function systemInfo(repoRoot) {
  const ramGb = Number((os.totalmem() / (1024 ** 3)).toFixed(2));
  let freeDiskGb = 0;
  try {
    const stats = await statfs(repoRoot);
    freeDiskGb = Number(((stats.bavail * stats.bsize) / (1024 ** 3)).toFixed(2));
  } catch (_err) {
    freeDiskGb = 0;
  }

  return {
    os: `${os.type()} ${os.release()}`,
    ramGb,
    freeDiskGb
  };
}

function buildIssues(missingPython, missingNode, tools) {
  const issues = [];
  if (tools.node === "missing") {
    issues.push({
      kind: "tool",
      manager: "system",
      name: "node",
      detail: "Node.js is not installed or not in PATH"
    });
  }

  if (tools.git === "missing") {
    issues.push({
      kind: "tool",
      manager: "system",
      name: "git",
      detail: "Git is not installed or not in PATH"
    });
  }

  for (const name of missingPython) {
    issues.push({ kind: "dependency", manager: "pip", name, detail: "Declared in requirements but not installed" });
  }
  for (const name of missingNode) {
    issues.push({ kind: "dependency", manager: "npm", name, detail: "Declared in package.json but not installed" });
  }
  return issues;
}

export async function scanEnvironment(orgId, repoPath) {
  const root = await resolveRepoRoot(repoPath);
  const tools = {
    python: await runVersion("python", ["--version"], "missing"),
    node: await runVersion("node", ["--version"], "missing"),
    git: await runVersion("git", ["--version"], "missing")
  };

  const requiredPython = await collectPythonRequirements(root);
  const requiredNode = await collectNodeRequirements(root);
  const installedPython = await installedPythonPackages();
  const installedNode = await installedNodePackages(root, requiredNode);
  const missingPython = [...requiredPython].filter((name) => !installedPython.has(name)).sort();
  const missingNode = [...requiredNode].filter((name) => !installedNode.has(name)).sort();
  const issues = buildIssues(missingPython, missingNode, tools);
  const healthScore = Math.max(0, 100 - issues.length * 10);

  return {
    orgId,
    repository: root,
    healthScore,
    issues,
    tools,
    system: await systemInfo(root),
    dependencies: {
      requiredPython: requiredPython.size,
      installedPython: [...requiredPython].filter((name) => installedPython.has(name)).length,
      missingPython,
      requiredNode: requiredNode.size,
      installedNode: [...requiredNode].filter((name) => installedNode.has(name)).length,
      missingNode
    },
    summary: `Environment score ${healthScore}. Missing ${missingPython.length} Python and ${missingNode.length} Node dependencies.`
  };
}