import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tokenize } from "../../knowledge/scripts/build-index.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const indexDir = path.join(root, "knowledge", "index");

const priorityWeight = {
  official_updated: 8,
  curated: 7,
  compliance: 7,
  service_manual: 6,
  source: 4,
  legacy_faq: 2,
};

const topicHints = {
  coverage: ["保什么", "保障", "医保外", "社保内", "住院", "免赔额", "等待期", "保额"],
  pre_existing: ["既往症", "高血压", "糖尿病", "冠心病", "能买", "赔不赔"],
  drug_benefit: ["药", "特药", "靶向药", "领药", "药店", "用药"],
  claim: ["理赔", "赔多少", "报销", "报案", "发票", "费用清单"],
  compliance: ["退保", "投诉", "免费", "扣费", "误导", "骗人"],
  service: ["垫付", "绿通", "服务", "权益"],
  payment: ["多少钱", "保费", "缴费", "月缴", "价格"],
};

function readJson(fileName, fallback) {
  const filePath = path.join(indexDir, fileName);
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function inferTopic(query) {
  for (const [topic, hints] of Object.entries(topicHints)) {
    if (hints.some((hint) => query.includes(hint))) return topic;
  }
  return null;
}

function scoreChunk(chunk, terms, topic) {
  const haystack = `${chunk.document_title} ${chunk.section_path} ${chunk.content}`.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (!term) continue;
    if (haystack.includes(term)) score += term.length > 1 ? 2 : 0.5;
  }
  if (topic && chunk.topic === topic) score += 6;
  score += priorityWeight[chunk.priority] || 0;
  if (chunk.updated_or_legacy === "updated") score += 3;
  if (chunk.priority === "legacy_faq") score -= 2;
  return score;
}

export function searchKnowledge({ query, topic = null, topK = 8 }) {
  const chunks = readJson("chunks.json", []);
  const detectedTopic = topic || inferTopic(query);
  const terms = [...new Set([...tokenize(query), ...Object.values(topicHints).flat().filter((hint) => query.includes(hint))])];

  return chunks
    .map((chunk) => ({
      ...chunk,
      score: scoreChunk(chunk, terms, detectedTopic),
    }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export function buildEvidencePack({ query, topic, topK = 8 }) {
  const results = searchKnowledge({ query, topic, topK });
  return {
    query,
    topic: topic || inferTopic(query),
    chunks: results.map((item) => ({
      chunk_id: item.chunk_id,
      source_path: item.source_path,
      document_title: item.document_title,
      section_path: item.section_path,
      topic: item.topic,
      priority: item.priority,
      risk_level: item.risk_level,
      content: item.content.slice(0, 1400),
      score: item.score,
    })),
  };
}

