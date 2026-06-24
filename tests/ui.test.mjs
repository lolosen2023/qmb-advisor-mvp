import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("customer UI keeps advisor experience without product logic", () => {
  const html = fs.readFileSync("app/index.html", "utf8");
  const js = fs.readFileSync("app/src/customer-page.mjs", "utf8");
  assert.match(html, /全民保顾问经理-张小民/);
  assert.match(js, /正在说话中/);
  assert.match(js, /thinking-bubble/);
  assert.match(js, /typing-dots/);
  assert.match(js, /60_000/);
  assert.match(js, /300_000/);
  assert.doesNotMatch(js, /assistant-engine|KNOWLEDGE_CHUNKS|answerForIntent|INTENT_PATTERNS/);
});
