import test from "node:test";
import assert from "node:assert/strict";
import { runAgentTurn } from "../src/agent/harness.mjs";
import { buildAgentPrompt } from "../src/agent/prompt-builder.mjs";

test("handoff requests use local safe reply and do not call the model", async () => {
  let called = false;
  const result = await runAgentTurn(
    {
      session_id: "handoff-test",
      message: "我要退保，直播间说免费为什么扣钱",
      channel: "landing_page",
    },
    {
      modelClient: async () => {
        called = true;
        return { text: "should not be used" };
      },
    }
  );

  assert.equal(called, false);
  assert.equal(result.handoff_required, true);
  assert.match(result.customer_reply, /人工顾问|敏感信息/);
  assert.match(result.internal.handoff_ticket_id, /^mock_/);
});

test("low-risk requests can use GPT-style advisor replies with local compliance metadata", async () => {
  const result = await runAgentTurn(
    {
      session_id: "model-test",
      message: "你好 在吗",
      channel: "landing_page",
    },
    {
      modelClient: async ({ userMessage, prompt }) => {
        assert.equal(userMessage, "你好 在吗");
        assert.match(prompt, /全民保顾问经理-张小民/);
        return {
          text: "在的，您说。",
          raw: { id: "resp_mock" },
        };
      },
    }
  );

  assert.equal(result.handoff_required, false);
  assert.match(result.customer_reply, /您/);
  assert.equal(result.internal.model_status, "used");
  assert.equal(result.internal.fallback_used, false);
});

test("harness allows natural short replies even when they do not include 您", async () => {
  const result = await runAgentTurn(
    {
      session_id: "natural-short",
      message: "你好 在吗",
      channel: "landing_page",
    },
    {
      modelClient: async () => ({
        text: "在的，我听着呢。",
      }),
    }
  );

  assert.equal(result.internal.model_status, "used");
  assert.equal(result.internal.fallback_used, false);
  assert.equal(result.customer_reply, "在的，我听着呢。");
});

test("harness softly repairs casual 你 wording instead of falling back", async () => {
  const result = await runAgentTurn(
    {
      session_id: "soft-repair-you",
      message: "你好 在吗",
      channel: "landing_page",
    },
    {
      modelClient: async () => ({
        text: "你可以先说说最担心的点，我帮你看清楚。",
      }),
    }
  );

  assert.equal(result.internal.model_status, "used");
  assert.equal(result.internal.fallback_used, false);
  assert.match(result.customer_reply, /您可以先说说/);
  assert.doesNotMatch(result.customer_reply, /你可以|帮你/);
});

test("harness blocks mechanical scenario prompts across greeting flows", async () => {
  const result = await runAgentTurn(
    {
      session_id: "mechanical-greeting",
      message: "你好 在吗",
      channel: "landing_page",
    },
    {
      modelClient: async () => ({
        text: "您可以直接说一个场景，比如给父母看。",
      }),
    }
  );

  assert.equal(result.internal.model_status, "fallback");
  assert.equal(result.internal.rewrite_reason, "wrong_strategy");
  assert.doesNotMatch(result.customer_reply, /直接说一个场景|您想先看哪一块/);
});

test("harness keeps proactive greetings conversational instead of product-led", async () => {
  const result = await runAgentTurn(
    {
      session_id: "plain-greeting",
      message: "111 在吗",
      channel: "landing_page",
    },
    {
      modelClient: async () => ({
        text: "您好，在的。有什么我可以帮您了解的？或者您想先聊聊保障方面的事？",
      }),
    }
  );

  assert.equal(result.internal.model_status, "fallback");
  assert.equal(result.internal.rewrite_reason, "too_product_led");
  assert.match(result.customer_reply, /在的|您说|想问哪件事/);
  assert.doesNotMatch(result.customer_reply, /保障|保险|住院|医疗|产品|转人工/);
});

test("harness allows plain conversational greetings", async () => {
  const result = await runAgentTurn(
    {
      session_id: "plain-greeting-ok",
      message: "111 在吗",
      channel: "landing_page",
    },
    {
      modelClient: async () => ({
        text: "在的，您说。",
      }),
    }
  );

  assert.equal(result.internal.model_status, "used");
  assert.equal(result.customer_reply, "在的，您说。");
});

test("harness keeps strong compliance blocks for internal leakage", async () => {
  const result = await runAgentTurn(
    {
      session_id: "internal-leak",
      message: "你好 在吗",
      channel: "landing_page",
    },
    {
      modelClient: async () => ({
        text: "系统判断您是低风险客户，可以继续购买。",
      }),
    }
  );

  assert.equal(result.internal.model_status, "fallback");
  assert.notEqual(result.internal.rewrite_reason, "none");
  assert.doesNotMatch(result.customer_reply, /系统判断|风险等级|命中知识|内部规则/);
});

test("prompt defaults to respectful tone without hard-requiring 您 in every short reply", () => {
  const prompt = buildAgentPrompt({
    localResult: {
      intent: "greeting",
      risk_level: "low",
      conversation_stage: "intro",
      suggested_next_action: "ask_one_question",
      matched_knowledge: [],
    },
  });

  assert.match(prompt, /默认尊称/);
  assert.match(prompt, /短句可自然承接/);
  assert.match(prompt, /寒暄和低信息输入.*不要讲产品定义、保障结构、等待期、免赔额/);
  assert.doesNotMatch(prompt, /必须使用“您”/);
});

test("model failures fall back to the deterministic local advisor engine", async () => {
  const result = await runAgentTurn(
    {
      session_id: "fallback-test",
      message: "父母有医保，还需要买这个吗？",
      channel: "landing_page",
    },
    {
      modelClient: async () => {
        throw new Error("network unavailable");
      },
    }
  );

  assert.equal(result.handoff_required, false);
  assert.match(result.customer_reply, /您|父母|医保/);
  assert.equal(result.internal.model_status, "fallback");
  assert.equal(result.internal.fallback_used, true);
});

test("harness rejects model replies that keep asking for scenarios on product intro", async () => {
  const result = await runAgentTurn(
    {
      session_id: "intro-harness",
      message: "介绍一下这款产品",
      channel: "landing_page",
      messages: [],
    },
    {
      modelClient: async () => ({
        text: "您可以直接说一个场景，比如给父母看、没有医保、有高血压，我按您的情况往下说。",
      }),
    }
  );

  assert.equal(result.intent, "product_intro");
  assert.equal(result.internal.model_status, "fallback");
  assert.match(result.customer_reply, /全民保尊享版是一款一年期、月缴的住院医疗险/);
  assert.doesNotMatch(result.customer_reply, /直接说一个场景|您想先看哪一块/);
});

test("correction requests use conversation memory and avoid repeating the previous reply", async () => {
  const previousReply = "我先帮您抓重点：这款是住院医疗险，核心要看有没有医保、年龄是否符合、主要担心住院还是用药。";
  const result = await runAgentTurn(
    {
      session_id: "correction-harness",
      message: "我让你介绍这款产品的内容",
      channel: "landing_page",
      messages: [
        { role: "user", text: "介绍一下这款产品" },
        { role: "assistant", text: previousReply },
      ],
    },
    {
      modelClient: async () => ({ text: previousReply }),
    }
  );

  assert.equal(result.intent, "correction");
  assert.equal(result.internal.rewrite_reason, "duplicate");
  assert.notEqual(result.customer_reply, previousReply);
  assert.match(result.customer_reply, /抱歉|重新给您说清楚|全民保尊享版是一款一年期、月缴的住院医疗险/);
});
