import jwt from "jsonwebtoken";
import request from "supertest";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import app from "../src/server.js";

function authHeader(orgId = "org-demo") {
  const token = jwt.sign({ org_id: orgId }, "dev-secret", { algorithm: "HS256" });
  return { Authorization: `Bearer ${token}` };
}

describe("graph routes", () => {
  it("requires auth", async () => {
    const response = await request(app).post("/api/v1/analyze-repo").send({ repoPath: "." });
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("unauthorized");
  });

  it("returns graph data", async () => {
    const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "devgraph-js-test-"));
    await writeFile(path.join(tmpRoot, "a.py"), "import b\n\ndef run():\n    return helper()\n\ndef helper():\n    return 1\n", "utf-8");
    await writeFile(path.join(tmpRoot, "b.py"), "def ext():\n    return 2\n", "utf-8");

    const response = await request(app)
      .post("/api/v1/analyze-repo")
      .set(authHeader())
      .send({ repoPath: tmpRoot, maxFiles: 20 });

    expect(response.status).toBe(200);
    expect(response.body.metrics.files).toBe(2);
    expect(Array.isArray(response.body.nodes)).toBe(true);
    expect(Array.isArray(response.body.edges)).toBe(true);
  });
});