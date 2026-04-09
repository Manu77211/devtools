import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const BLOCKED_DIRS = new Set([".git", "node_modules", ".next", "venv", ".venv", "__pycache__"]);

async function collectPythonFiles(dir, maxFiles, output) {
  if (output.length >= maxFiles) {
    return;
  }

  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (output.length >= maxFiles) {
      return;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!BLOCKED_DIRS.has(entry.name)) {
        await collectPythonFiles(fullPath, maxFiles, output);
      }
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".py")) {
      output.push(fullPath);
    }
  }
}

function moduleNameFromPath(filePath, repoRoot) {
  const relative = path.relative(repoRoot, filePath).replace(/\\/gu, "/");
  return relative.replace(/\.py$/u, "").split("/").join(".");
}

function extractCalls(line) {
  const calls = [];
  const matcher = /\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/gu;
  for (const match of line.matchAll(matcher)) {
    const name = match[1];
    if (!["if", "for", "while", "return", "print", "with", "def", "class"].includes(name)) {
      calls.push(name);
    }
  }
  return calls;
}

function parsePythonModule(source, moduleName, relativePath) {
  const classes = new Set();
  const functions = new Set();
  const imports = new Set();
  const calls = [];
  const classStack = [];
  const functionStack = [];
  const lines = source.split(/\r?\n/gu);

  for (const line of lines) {
    const indent = line.length - line.trimStart().length;
    while (classStack.length && indent <= classStack[classStack.length - 1].indent) {
      classStack.pop();
    }
    while (functionStack.length && indent <= functionStack[functionStack.length - 1].indent) {
      functionStack.pop();
    }

    const importMatch = line.match(/^\s*import\s+([A-Za-z0-9_.,\s]+)/u);
    if (importMatch) {
      const names = importMatch[1].split(",").map((value) => value.trim().split(" ")[0]).filter(Boolean);
      for (const name of names) {
        imports.add(name);
      }
    }

    const fromMatch = line.match(/^\s*from\s+([A-Za-z0-9_.]+)\s+import\s+/u);
    if (fromMatch) {
      imports.add(fromMatch[1]);
    }

    const classMatch = line.match(/^\s*class\s+([A-Za-z_][A-Za-z0-9_]*)/u);
    if (classMatch) {
      classes.add(classMatch[1]);
      classStack.push({ name: classMatch[1], indent });
      continue;
    }

    const functionMatch = line.match(/^\s*(?:async\s+)?def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/u);
    if (functionMatch) {
      const localName = functionMatch[1];
      const scoped = classStack.length ? `${classStack[classStack.length - 1].name}.${localName}` : localName;
      functions.add(scoped);
      functionStack.push({ name: scoped, indent });
      continue;
    }

    if (functionStack.length) {
      const caller = functionStack[functionStack.length - 1].name;
      for (const callee of extractCalls(line)) {
        calls.push([caller, callee]);
      }
    }
  }

  return {
    path: relativePath,
    module: moduleName,
    classes,
    functions,
    imports,
    calls
  };
}

async function collectModules(repoRoot, maxFiles) {
  const files = [];
  await collectPythonFiles(repoRoot, maxFiles, files);
  const modules = [];

  for (const filePath of files) {
    try {
      const source = await readFile(filePath, "utf-8");
      const relativePath = path.relative(repoRoot, filePath).replace(/\\/gu, "/");
      const moduleName = moduleNameFromPath(filePath, repoRoot);
      modules.push(parsePythonModule(source, moduleName, relativePath));
    } catch (_err) {
      continue;
    }
  }
  return modules;
}

function toGraph(modules) {
  const nodes = new Map();
  const edges = new Map();
  const moduleToFile = new Map();
  const moduleDefs = new Map();
  let importEdges = 0;
  let callEdges = 0;

  for (const module of modules) {
    const fileId = `file:${module.path}`;
    moduleToFile.set(module.module, fileId);
    nodes.set(fileId, { id: fileId, label: module.path, type: "file" });
  }

  for (const module of modules) {
    const fileId = moduleToFile.get(module.module);
    const defs = new Map();
    for (const cls of [...module.classes].sort()) {
      const id = `class:${module.module}:${cls}`;
      nodes.set(id, { id, label: cls, type: "class" });
      edges.set(`${fileId}->${id}:defines`, { source: fileId, target: id, relation: "defines" });
      defs.set(cls, id);
    }

    for (const fn of [...module.functions].sort()) {
      const id = `function:${module.module}:${fn}`;
      nodes.set(id, { id, label: fn, type: "function" });
      edges.set(`${fileId}->${id}:defines`, { source: fileId, target: id, relation: "defines" });
      defs.set(fn, id);
      const shortName = fn.includes(".") ? fn.split(".").slice(-1)[0] : fn;
      if (!defs.has(shortName)) {
        defs.set(shortName, id);
      }
    }
    moduleDefs.set(module.module, defs);
  }

  for (const module of modules) {
    const source = moduleToFile.get(module.module);
    for (const imported of module.imports) {
      const target = moduleToFile.get(imported);
      if (target && source !== target) {
        edges.set(`${source}->${target}:imports`, { source, target, relation: "imports" });
        importEdges += 1;
      }
    }
  }

  for (const module of modules) {
    const defs = moduleDefs.get(module.module) || new Map();
    for (const [caller, callee] of module.calls) {
      const source = defs.get(caller);
      const target = defs.get(callee);
      if (source && target && source !== target) {
        edges.set(`${source}->${target}:calls`, { source, target, relation: "calls" });
        callEdges += 1;
      }
    }
  }

  return {
    nodes: [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...edges.values()].sort((a, b) => `${a.source}${a.target}${a.relation}`.localeCompare(`${b.source}${b.target}${b.relation}`)),
    importEdges,
    callEdges
  };
}

export async function analyzeRepository(repoPath, maxFiles, orgId) {
  const root = path.resolve(repoPath);
  let info;
  try {
    info = await stat(root);
  } catch (_err) {
    throw new Error("Repository path must be an existing directory");
  }

  if (!info.isDirectory()) {
    throw new Error("Repository path must be an existing directory");
  }

  const modules = await collectModules(root, maxFiles);
  const graph = toGraph(modules);
  const metrics = {
    files: modules.length,
    functions: modules.reduce((acc, module) => acc + module.functions.size, 0),
    classes: modules.reduce((acc, module) => acc + module.classes.size, 0),
    importEdges: graph.importEdges,
    callEdges: graph.callEdges
  };

  return {
    orgId,
    repository: root,
    summary: `Parsed ${metrics.files} files into ${graph.nodes.length} nodes and ${graph.edges.length} edges.`,
    nodes: graph.nodes,
    edges: graph.edges,
    metrics
  };
}