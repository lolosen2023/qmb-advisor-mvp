import { callModel } from "./model-adapter.mjs";

export function parseJsonFromText(text) {
  const clean = String(text || "").trim();
  const fenced = clean.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || clean.match(/\{[\s\S]*\}/)?.[0] || clean;
  return JSON.parse(candidate);
}

export async function callJsonModel({ prompt, userMessage, modelClient = callModel, fallback = null }) {
  const result = await modelClient({ prompt, userMessage, temperature: 0.1 });
  try {
    return { json: parseJsonFromText(result.text), raw: result };
  } catch (error) {
    if (fallback) return { json: fallback, raw: result, parse_error: error.message };
    throw error;
  }
}

