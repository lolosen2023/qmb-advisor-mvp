import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadLocalEnv, modelConfigFromEnv, hasUsableModelConfig } from "./config.mjs";
import { runAgentTurn, toCustomerPayload } from "../agent/orchestrator.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = path.join(root, "app");
const port = Number(process.env.PORT || 4173);

loadLocalEnv(path.join(root, ".env.local"));

const types = {
  ".html": "text/html;charset=utf-8",
  ".css": "text/css;charset=utf-8",
  ".js": "text/javascript;charset=utf-8",
  ".mjs": "text/javascript;charset=utf-8",
  ".json": "application/json;charset=utf-8",
  ".png": "image/png",
};

export function parseJsonBody(req, limitBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > limitBytes) {
        reject(new Error("Request body too large"));
        req.destroy?.();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json;charset=utf-8" });
  res.end(JSON.stringify(payload));
}

export async function routeApiChat(payload, options = {}) {
  const result = await runAgentTurn(payload, options);
  if (payload?.debug === true || options.debug === true) return result;
  return toCustomerPayload(result);
}

export function getModelHealthPayload(env = process.env) {
  const config = modelConfigFromEnv(env);
  return {
    provider: config.provider,
    configured: hasUsableModelConfig(config),
    has_api_key: Boolean(config.apiKey),
    base_url: config.baseUrl,
    model: config.model,
    api_type: config.apiType,
  };
}

export const server = http.createServer(async (req, res) => {
  const route = (req.url || "/").split("?")[0];

  if (req.method === "POST" && route === "/api/chat") {
    try {
      const payload = await parseJsonBody(req);
      if (req.headers["x-qmb-debug"] === "true") payload.debug = true;
      sendJson(res, 200, await routeApiChat(payload));
    } catch (error) {
      sendJson(res, 500, {
        customer_reply: "抱歉，这次连接没有处理成功。我先建议您稍后再试，或转人工顾问确认。",
        intent: "api_error",
        risk_level: "medium",
        handoff_required: true,
        handoff_reason: error?.message || "api_error",
        suggested_next_action: "handoff",
        conversation_stage: "handoff",
        quick_replies: [],
      });
    }
    return;
  }

  if (req.method === "GET" && route === "/api/model-health") {
    sendJson(res, 200, getModelHealthPayload());
    return;
  }

  const cleanPath = route === "/" ? "/index.html" : decodeURIComponent(route);
  const filePath = path.normalize(path.join(appRoot, cleanPath));
  if (!filePath.startsWith(appRoot)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
});

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  server.listen(port, "127.0.0.1", () => {
    console.log(`QMB advisor MVP: http://127.0.0.1:${port}/`);
  });
}

