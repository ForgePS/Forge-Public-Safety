import express from "express";
import { initStore } from "./store/firestore.js";
import routes from "./routes/index.js";

export function createServer() {
  initStore();
  const app = express();
  app.use(express.json({ limit: "2mb" }));
  app.get("/", (_req, res) => {
    res.json({
      service: "forge-integration-hub",
      api: "/api/integrations/v1",
      docs: "openapi.yaml",
    });
  });
  app.use("/api/integrations/v1", routes);
  return app;
}
