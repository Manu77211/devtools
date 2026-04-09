import cors from "cors";
import express from "express";

import authRouter from "./routers/auth.js";
import environmentRouter from "./routers/environment.js";
import graphRouter from "./routers/graph.js";
import { registerErrorHandlers } from "./core/errors.js";

function corsOrigin(origin, callback) {
  if (!origin) {
    callback(null, true);
    return;
  }

  const allowed = ["http://localhost:3000", "http://127.0.0.1:3000"];
  const localPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/u;
  if (allowed.includes(origin) || localPattern.test(origin)) {
    callback(null, true);
    return;
  }
  callback(new Error("CORS not allowed"));
}

export function createApp() {
  const app = express();

  app.use(cors({
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }));
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/environment", environmentRouter);
  app.use("/api/v1", graphRouter);

  app.get("/health", async (_req, res) => {
    res.json({ status: "ok" });
  });

  registerErrorHandlers(app);
  return app;
}

const app = createApp();
if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT || 8000);
  app.listen(port, () => {
    process.stdout.write(`DevGraph JS API listening on ${port}\n`);
  });
}

export default app;