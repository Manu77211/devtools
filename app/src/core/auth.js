import jwt from "jsonwebtoken";

import { createError } from "./errors.js";

export const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
export const JWT_ALGORITHM = process.env.JWT_ALGORITHM || "HS256";

function authError(detail) {
  return createError(401, "unauthorized", detail);
}

export function getOrgIdFromRequest(req) {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith("Bearer ")) {
    throw authError("Missing Bearer token");
  }

  const token = authorization.split(" ", 2)[1];
  let claims;
  try {
    claims = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
  } catch (_err) {
    throw authError("Invalid token");
  }

  if (!claims || !claims.org_id) {
    throw authError("Missing org_id claim");
  }
  return String(claims.org_id);
}

export function requireOrgId(req, _res, next) {
  try {
    req.orgId = getOrgIdFromRequest(req);
    next();
  } catch (err) {
    next(err);
  }
}