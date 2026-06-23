import test from "node:test";
import assert from "node:assert/strict";
import { parseJsonBody, routeApiChat, getModelHealthPayload } from "../server.mjs";

test("parseJsonBody parses valid JSON payloads", async () => {
  const req = {
    on(event, handler) {
      if (event === "data") handler(Buffer.from(JSON.stringify({ message: "你好" })));
      if (event === "end") handler();
      return this;
    },
  };

  const body = await parseJsonBody(req);
  assert.deepEqual(body, { message: "你好" });
});

test("routeApiChat returns customer payload without internal fields", async () => {
  const response = await routeApiChat(
    {
      session_id: "api-test",
      message: "你好 在吗",
      channel: "landing_page",
    },
    {
      modelClient: async () => ({
        text: "在的，您直接说就好。是想了解这款产品保什么，还是想帮自己或家人看看适不适合？",
      }),
    }
  );

  assert.match(response.customer_reply, /您/);
  assert.equal(response.handoff_required, false);
  assert.ok(Array.isArray(response.quick_replies));
  assert.equal(Object.hasOwn(response, "internal"), false);
});

test("routeApiChat exposes internal diagnostics only in debug mode", async () => {
  const response = await routeApiChat(
    {
      session_id: "api-debug-test",
      message: "你好 在吗",
      channel: "landing_page",
      debug: true,
    },
    {
      modelClient: async () => ({
        text: "在的，我听着呢。",
      }),
    }
  );

  assert.equal(response.customer_reply, "在的，我听着呢。");
  assert.equal(response.internal.model_status, "used");
  assert.equal(response.internal.fallback_used, false);
  assert.equal(response.internal.local_intent, "greeting");
});

test("model health payload reports config without exposing API key", () => {
  const health = getModelHealthPayload({
    OPENAI_API_KEY: "sk-test-secret-value",
    OPENAI_BASE_URL: "https://api.example.test/v1/",
    MODEL_NAME: "gpt-5.5",
    MODEL_API_TYPE: "responses",
  });

  assert.equal(health.configured, true);
  assert.equal(health.provider, "openai");
  assert.equal(health.has_api_key, true);
  assert.equal(health.base_url, "https://api.example.test/v1");
  assert.equal(health.model, "gpt-5.5");
  assert.equal(Object.hasOwn(health, "api_key"), false);
  assert.doesNotMatch(JSON.stringify(health), /sk-test-secret-value/);
});

test("model health supports DeepSeek provider without leaking API key", () => {
  const health = getModelHealthPayload({
    API_PROVIDER: "deepseek",
    DEEPSEEK_API_KEY: "sk-deepseek-secret-value",
    DEEPSEEK_BASE_URL: "https://api.deepseek.com/",
    MODEL_NAME: "deepseek-v4-flash",
  });

  assert.equal(health.provider, "deepseek");
  assert.equal(health.configured, true);
  assert.equal(health.has_api_key, true);
  assert.equal(health.base_url, "https://api.deepseek.com");
  assert.equal(health.model, "deepseek-v4-flash");
  assert.equal(health.api_type, "chat_completions");
  assert.doesNotMatch(JSON.stringify(health), /sk-deepseek-secret-value/);
});
