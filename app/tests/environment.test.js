import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../src/server.js";

function authHeader(orgId = "org-demo") {
  const token = jwt.sign({ org_id: orgId }, "dev-secret", { algorithm: "HS256" });
  return { Authorization: `Bearer ${token}` };
}

describe("environment routes", () => {
  it("requires auth", async () => {
    const response = await request(app).get("/api/v1/environment/health");
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("unauthorized");
  });

  it("returns report", async () => {
    const response = await request(app)
      .post("/api/v1/environment/scan")
      .set(authHeader())
      .send({ repoPath: process.cwd() });
    expect(response.status).toBe(200);
    expect(response.body.orgId).toBe("org-demo");
    expect(typeof response.body.healthScore).toBe("number");
  });
});