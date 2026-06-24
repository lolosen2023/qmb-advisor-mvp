import test from "node:test";
import assert from "node:assert/strict";
import { searchKnowledge } from "../agent/tools/knowledge-search.mjs";

test("retrieval finds updated plan and exemption/service documents", () => {
  const coverage = searchKnowledge({ query: "医保外住院费用能报吗", topK: 8 });
  assert.ok(coverage.some((item) => item.source_path.includes("2.方案.md") || item.topic === "coverage"));

  const preExisting = searchKnowledge({ query: "有高血压糖尿病能买吗", topK: 8 });
  assert.ok(preExisting.some((item) => item.source_path.includes("6.责任免除.md") || item.topic === "pre_existing"));

  const drug = searchKnowledge({ query: "怎么领药 特药服务", topK: 8 });
  assert.ok(drug.some((item) => item.source_path.includes("02-特药服务") || item.topic === "drug_benefit"));
});

