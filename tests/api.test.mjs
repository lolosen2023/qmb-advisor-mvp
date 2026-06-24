import test from "node:test";
import assert from "node:assert/strict";
import { routeApiChat, getModelHealthPayload } from "../server/server.mjs";

test("api hides internal fields unless debug is enabled", async () => {
  const modelClient = async ({ prompt }) => {
    if (prompt.includes("只做意图和风险判断")) {
      return { text: JSON.stringify({ intent: "coverage", risk_level: "low", needs_retrieval: true, handoff_required: false, topic: "coverage" }) };
    }
    return { text: "这类问题要结合保障责任和限制一起看，不能简单理解成全部都报。" };
  };

  const normal = await routeApiChat({ session_id: "api-test", message: "保什么", messages: [] }, { modelClient });
  assert.equal(normal.internal, undefined);

  const debug = await routeApiChat({ session_id: "api-test", message: "保什么", messages: [], debug: true }, { modelClient });
  assert.ok(debug.internal.agent_trace);
});

test("model health does not expose api key", () => {
  const payload = getModelHealthPayload({ API_PROVIDER: "deepseek", DEEPSEEK_API_KEY: "secret", DEEPSEEK_MODEL: "deepseek-v4-flash" });
  assert.equal(payload.has_api_key, true);
  assert.equal(JSON.stringify(payload).includes("secret"), false);
});

