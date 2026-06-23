import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = path.join(root, "implementation-plan.html");

test("html-plan artifact is self-contained and includes dark mode", () => {
  const html = fs.readFileSync(htmlPath, "utf8");

  assert.match(html, /全民保尊享版智能销售客服/);
  assert.match(html, /html\.dark/);
  assert.match(html, /localStorage/);
  assert.match(html, /prefers-color-scheme/);
  assert.match(html, /id="themeToggle"/);
  assert.doesNotMatch(html, /<link\s/i);
  assert.doesNotMatch(html, /src="[^"]+"/i);
});

test("html-plan covers retrieval, compliance, and handoff mechanisms", () => {
  const html = fs.readFileSync(htmlPath, "utf8");

  assert.match(html, /知识检索/);
  assert.match(html, /合规后审/);
  assert.match(html, /转人工/);
  assert.match(html, /不能透露底牌/);
});

