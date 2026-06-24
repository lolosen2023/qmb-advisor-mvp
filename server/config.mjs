import fs from "node:fs";

export function loadLocalEnv(envPath) {
  if (!envPath || !fs.existsSync(envPath)) return {};
  const parsed = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    parsed[key] = value;
    if (process.env[key] === undefined) process.env[key] = value;
  }
  return parsed;
}

export function modelConfigFromEnv(env = process.env) {
  const provider = (env.API_PROVIDER || env.MODEL_PROVIDER || "openai").toLowerCase();
  if (provider === "deepseek") {
    return {
      provider,
      apiKey: env.DEEPSEEK_API_KEY || "",
      baseUrl: (env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, ""),
      model: env.DEEPSEEK_MODEL || env.MODEL_NAME || "deepseek-v4-flash",
      apiType: "chat_completions",
    };
  }
  return {
    provider,
    apiKey: env.OPENAI_API_KEY || "",
    baseUrl: (env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
    model: env.MODEL_NAME || "gpt-5.5",
    apiType: env.MODEL_API_TYPE || "responses",
  };
}

export function hasUsableModelConfig(config) {
  return Boolean(config?.apiKey && !/^replace_with_/i.test(config.apiKey));
}

