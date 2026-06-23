import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("app shell uses the shared customer engine module and includes dark mode", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

  assert.match(html, /全民保尊享版在线咨询/);
  assert.match(html, /html\.dark/);
  assert.match(html, /localStorage/);
  assert.match(html, /prefers-color-scheme/);
  assert.match(html, /id="themeToggle"/);
  assert.doesNotMatch(html, /<link\s/i);
  assert.match(html, /<script type="module" src="\.\/src\/customer-page\.mjs"><\/script>/);
  assert.doesNotMatch(html, /function updateCustomerProfile/);
  assert.doesNotMatch(html, /function personalizeReply/);
  assert.doesNotMatch(html, /const smartPatterns/);
  assert.match(html, /id="messageInput"/);
  assert.match(html, /id="sendBtn"/);
  assert.match(html, /id="assistantReply"/);
  assert.match(html, /data-scenario/);
  assert.match(html, /全民保尊享版：住院医疗费用补充保障/);
  assert.match(html, /投保前重点看这些/);
  assert.match(html, /您可能还想咨询/);
  assert.match(html, /父母有医保还需要吗/);
  assert.match(html, /住院自费多怎么办/);
  assert.match(html, /有高血压能买吗/);
  assert.match(html, /医保外能报吗/);
  assert.match(html, /产品速览/);
  assert.doesNotMatch(html, /你可以这样问|你可以继续这样问|你还可以这样问|你可能还想咨询|输入你的问题/);
  assert.doesNotMatch(html, /住院大额医疗风险，可以先问清楚再决定|适合先咨询这些问题|在线解答产品、价格、投保和理赔问题|输入客户问题后，这里会生成回复/);
  assert.match(html, /id="toast"/);
  assert.match(html, /全民保顾问经理-张小民/);
  assert.doesNotMatch(html, /全民保尊享版保障顾问/);
  assert.doesNotMatch(html, /\.msg\.streaming p:after/);
  assert.doesNotMatch(html, /@keyframes caret/);
  assert.doesNotMatch(html, /id="nextStepCard"/);
  assert.doesNotMatch(html, /id="quoteBtn"/);
  assert.doesNotMatch(html, /如果您主要担心家人住院后的大额自费压力/);
  assert.match(html, /height:\s*100vh/);
  assert.match(html, /overflow:\s*hidden/);
  assert.match(html, /grid-template-rows:\s*auto minmax\(0,\s*1fr\) auto auto/);
  assert.match(html, /role-line/);
  assert.match(html, /speaking/);
  assert.doesNotMatch(html, /font-size:\s*clamp/i);
  assert.doesNotMatch(html, /font-size:[^;]*vw/i);
  assert.doesNotMatch(html, /id="adminDrawer"/);
  assert.doesNotMatch(html, /管理端/);
  assert.doesNotMatch(html, /管理端独立查看/);
  assert.doesNotMatch(html, /风险等级/);
  assert.doesNotMatch(html, /知识主题/);
});

test("customer module keeps adaptive sales-assistant behavior", () => {
  const module = fs.readFileSync(path.join(root, "src", "customer-page.mjs"), "utf8");

  assert.match(module, /buildAssistantResponse/);
  assert.match(module, /known_user_state:\s*state\.profile/);
  assert.match(module, /messages:\s*recentMessagesForApi\(\)/);
  assert.match(module, /conversation_stage/);
  assert.match(module, /quick_replies/);
  assert.match(module, /streamAssistantReply/);
  assert.match(module, /您可能还想咨询/);
  assert.match(module, /全民保顾问经理-张小民/);
  assert.doesNotMatch(module, /保障顾问小民/);
  assert.match(module, /您好，在吗？有什么可以帮您？您想咨询什么产品？/);
  assert.match(module, /这边先为您保留到这里。后面您想继续了解，直接再发消息就可以。/);
  assert.match(module, /idleReminderTimer/);
  assert.match(module, /softEndTimer/);
  assert.match(module, /60_000/);
  assert.match(module, /300_000/);
  assert.match(module, /正在说话中/);
  assert.match(module, /index \+= 1/);
  assert.match(module, /typingDelayFor/);
  assert.doesNotMatch(module, /index \+= 2/);
  assert.doesNotMatch(module, /90 : 18/);
  assert.doesNotMatch(module, /正在输入/);
  assert.doesNotMatch(module, /全民保尊享版是一款一年期、月缴的住院医疗险/);
  assert.doesNotMatch(module, /你可以这样问|你可以继续这样问|真实担心的事|我会先把问题讲清楚/);
  assert.doesNotMatch(module, /function updateCustomerProfile/);
  assert.doesNotMatch(module, /function replyFor/);
  assert.doesNotMatch(module, /const smartPatterns/);
  assert.doesNotMatch(module, /每次都|固定追问/);
});

test("admin page is separated from the customer Q&A page", () => {
  const html = fs.readFileSync(path.join(root, "admin.html"), "utf8");

  assert.match(html, /全民保尊享版管理端/);
  assert.match(html, /id="knowledgeList"/);
  assert.match(html, /id="riskValue"/);
  assert.match(html, /返回客户问答/);
});

test("stylesheet contains responsive layout and risk states", () => {
  const css = fs.readFileSync(path.join(root, "src", "styles.css"), "utf8");

  assert.match(css, /content-grid/);
  assert.match(css, /risk-pill\.high/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.doesNotMatch(css, /purple|violet|#7c3aed/i);
});
