import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { hasUsableModelConfig, loadLocalEnv, modelConfigFromEnv } from "./src/agent/config.mjs";
import { getModelDiagnostics, runAgentTurn, toCustomerPayload } from "./src/agent/harness.mjs";

const port = Number(process.env.PORT || 4173);
const root = path.dirname(fileURLToPath(import.meta.url));
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
    last_model_call: getModelDiagnostics(),
  };
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json;charset=utf-8" });
  res.end(JSON.stringify(payload));
}

export const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && (req.url || "").split("?")[0] === "/api/chat") {
    try {
      const payload = await parseJsonBody(req);
      if (req.headers["x-qmb-debug"] === "true") payload.debug = true;
      const response = await routeApiChat(payload);
      sendJson(res, 200, response);
    } catch (error) {
      sendJson(res, 400, {
        customer_reply: "抱歉，这次连接没有处理成功。您可以稍后再试，或先联系人工顾问确认。",
        handoff_required: true,
        handoff_reason: error?.message || "api_error",
        quick_replies: [],
      });
    }
    return;
  }

  if (req.method === "GET" && (req.url || "").split("?")[0] === "/api/model-health") {
    sendJson(res, 200, getModelHealthPayload());
    return;
  }

  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const cleanPath = urlPath === "/" ? "/index.html" : urlPath;
  let filePath = path.normalize(path.join(root, cleanPath));

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stat) => {
    if (statError) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    if (stat.isDirectory()) filePath = path.join(filePath, "index.html");

    fs.readFile(filePath, (readError, data) => {
      if (readError) {
        res.writeHead(500);
        res.end("Server error");
        return;
      }
      res.writeHead(200, {
        "Content-Type": types[path.extname(filePath)] || "application/octet-stream",
      });
      res.end(data);
    });
  });
});

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  server.listen(port, "127.0.0.1", () => {
    console.log(`全民保尊享版智能销售客服 MVP: http://127.0.0.1:${port}/`);
  });
}
