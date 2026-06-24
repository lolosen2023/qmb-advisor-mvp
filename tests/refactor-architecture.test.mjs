import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("project uses the new root-level agent structure and removes old formal code", () => {
  for (const required of [
    "README.md",
    "package.json",
    "app/index.html",
    "app/src/customer-page.mjs",
    "app/src/styles.css",
    "server/server.mjs",
    "server/config.mjs",
    "agent/orchestrator.mjs",
    "agent/tools/knowledge-search.mjs",
    "agent/prompts/router.mjs",
    "knowledge/scripts/build-index.mjs",
    "docs/PRODUCT_SPEC.md",
    "docs/AGENT_ARCHITECTURE.md",
  ]) {
    assert.ok(fs.existsSync(path.join(root, required)), `${required} should exist`);
  }

  assert.equal(fs.existsSync(path.join(root, "全民保尊享版-智能销售客服MVP/src/assistant-engine.mjs")), false);
  assert.equal(fs.existsSync(path.join(root, "全民保尊享版-智能销售客服MVP/admin.html")), false);
  assert.equal(fs.existsSync(path.join(root, "全民保尊享版-智能销售客服MVP/implementation-plan.html")), false);
});

test("new orchestrator does not import the old rule engine or fixed knowledge chunks", () => {
  const orchestrator = read("agent/orchestrator.mjs");
  assert.match(orchestrator, /runAgentTurn/);
  assert.doesNotMatch(orchestrator, /assistant-engine|buildAssistantResponse|answerForIntent|KNOWLEDGE_CHUNKS|INTENT_PATTERNS/);

  const filesToScan = [
    "agent/orchestrator.mjs",
    "agent/prompts/answer-composer.mjs",
    "agent/tools/knowledge-search.mjs",
  ];
  for (const file of filesToScan) {
    assert.doesNotMatch(read(file), /全民保尊享版是一款一年期、月缴的住院医疗险/);
  }
});

test("knowledge index is generated from source files and keeps source metadata", () => {
  const manifest = JSON.parse(read("knowledge/index/manifest.json"));
  const chunks = JSON.parse(read("knowledge/index/chunks.json"));
  assert.ok(manifest.documents.length >= 20, "full source markdown folder should be indexed");
  assert.ok(chunks.length > manifest.documents.length, "documents should be split into searchable chunks");
  assert.ok(manifest.documents.some((doc) => doc.source_path.includes("2.方案.md")));
  assert.ok(manifest.documents.some((doc) => doc.source_path.includes("5.投保须知.md")));
  assert.ok(manifest.documents.some((doc) => doc.source_path.includes("6.责任免除.md")));
  assert.ok(manifest.documents.some((doc) => doc.source_path.includes("3.健康服务手册")));
  assert.ok(chunks.every((chunk) => chunk.chunk_id && chunk.source_path && chunk.content));
});

