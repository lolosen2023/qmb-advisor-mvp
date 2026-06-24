import test from "node:test";
import assert from "node:assert/strict";
import { runAgentTurn } from "../agent/orchestrator.mjs";
import { buildCustomerProfile } from "../agent/tools/memory-store.mjs";

function scriptedModel({ intent = "coverage", topic = "coverage", stage = "discovery", reply }) {
  return async ({ prompt }) => {
    if (prompt.includes("只做意图和风险判断")) {
      return { text: JSON.stringify({
        intent,
        risk_level: "low",
        needs_retrieval: true,
        handoff_required: false,
        topic,
        suggested_next_action: "answer_only",
        conversation_stage: stage
      }) };
    }
    return { text: reply || "我先帮您用白话说清楚。这个问题要结合保障责任和关键限制一起看，不能简单下结论。" };
  };
}

test("high risk requests are handed off before model sales flow", async () => {
  let called = false;
  const result = await runAgentTurn(
    { session_id: "test", message: "我要退保，直播间说免费为什么扣钱", messages: [] },
    { modelClient: async () => { called = true; return { text: "{}" }; } }
  );
  assert.equal(called, false);
  assert.equal(result.handoff_required, true);
  assert.equal(result.suggested_next_action, "handoff");
  assert.ok(result.quick_replies.some((item) => item.label.includes("准备")));
});

test("product questions use retrieval evidence and composer model", async () => {
  const calls = [];
  const result = await runAgentTurn(
    { session_id: "test", message: "医保外住院费用能报吗", messages: [] },
    {
      modelClient: async ({ prompt }) => {
        calls.push(prompt);
        if (prompt.includes("只做意图和风险判断")) {
          return { text: JSON.stringify({
            intent: "coverage",
            risk_level: "medium",
            needs_retrieval: true,
            handoff_required: false,
            topic: "coverage",
            suggested_next_action: "answer_only",
            conversation_stage: "discovery"
          }) };
        }
        assert.match(prompt, /证据包/);
        return { text: "可以帮您看。医保外住院费用要看是否符合产品责任、是否经过审核，也要注意等待期、免赔额和既往症限制。" };
      }
    }
  );
  assert.equal(result.handoff_required, false);
  assert.match(result.customer_reply, /医保外住院费用/);
  assert.ok(result.internal.retrieved_chunks.length > 0);
  assert.equal(calls.length, 2);
});

test("repetitive advisor openers are softened before customer output", async () => {
  const result = await runAgentTurn(
    { session_id: "test", message: "高血压血糖高还能买吗", messages: [] },
    { modelClient: scriptedModel({
      intent: "pre_existing",
      topic: "pre_existing",
      stage: "qualification",
      reply: "您问的这个问题非常关键，我先帮您捋清楚：高血压和血糖高要分开看，能投保不等于相关疾病后续一定能赔。"
    }) }
  );
  assert.doesNotMatch(result.customer_reply, /问题.*关键|捋清楚/);
  assert.match(result.customer_reply, /高血压|血糖/);
});

test("greeting is natural and does not dump product rules", async () => {
  let called = false;
  const result = await runAgentTurn(
    { session_id: "test", message: "你好在吗", messages: [] },
    { modelClient: async () => { called = true; return { text: "{}" }; } }
  );
  assert.equal(called, false);
  assert.equal(result.intent, "greeting");
  assert.match(result.customer_reply, /张小民/);
  assert.doesNotMatch(result.customer_reply, /等待期|免赔额|保险责任/);
  assert.ok(result.quick_replies.some((item) => item.label === "这款保什么"));
});

test("identity and value style requests are handled through the advisor prompt", async () => {
  const result = await runAgentTurn(
    { session_id: "test", message: "你是谁，能帮我什么", messages: [] },
    { modelClient: scriptedModel({
      intent: "identity_intro",
      topic: "service",
      stage: "intro",
      reply: "您好，我是全民保顾问经理-张小民。您可以把我当成投保前帮您把问题捋清楚的人，我会先帮您看保障、价格、医保要求和理赔注意点；涉及具体保单或理赔金额，我会建议您转人工确认。"
    }) }
  );
  assert.equal(result.handoff_required, false);
  assert.match(result.customer_reply, /全民保顾问经理-张小民/);
  assert.doesNotMatch(result.customer_reply, /系统判断|知识库|风险等级/);
});

test("product intro and correction do not fall back to generic questioning", async () => {
  const result = await runAgentTurn(
    {
      session_id: "test",
      message: "我让你介绍产品内容",
      messages: [
        { role: "user", text: "介绍一下这款产品" },
        { role: "assistant", text: "您想先看哪一块？" }
      ]
    },
    { modelClient: scriptedModel({
      intent: "correction",
      topic: "coverage",
      stage: "discovery",
      reply: "抱歉，刚才没有直接说到产品内容。我直接给您捋一下：这款主要看住院医疗费用补充，医保要求、等待期、免赔额、既往症限制和不保证续保都需要提前看清楚。"
    }) }
  );
  assert.match(result.customer_reply, /抱歉|直接/);
  assert.match(result.customer_reply, /住院医疗费用/);
  assert.doesNotMatch(result.customer_reply, /您想先看哪一块/);
});

test("parent purchase profile drives qualification quick replies", async () => {
  const result = await runAgentTurn(
    { session_id: "test", message: "给我爸妈能买吗", messages: [] },
    { modelClient: scriptedModel({
      intent: "parent_purchase",
      topic: "coverage",
      stage: "qualification",
      reply: "可以先看，但建议您先确认父母大概年龄和医保是否在保。满足基础条件后，再看保费、等待期、免赔额、既往症限制和不保证续保。"
    }) }
  );
  assert.equal(result.internal.customer_profile.insured_for, "parent");
  assert.ok(result.quick_replies.some((item) => item.label.includes("父母年龄")));
  assert.match(result.customer_reply, /年龄|医保/);
});

test("quick replies change by conversation topic", async () => {
  const claim = await runAgentTurn(
    { session_id: "test", message: "如果住院了，理赔流程怎么走？", messages: [] },
    { modelClient: scriptedModel({
      intent: "claim_process",
      topic: "claim",
      stage: "discovery",
      reply: "住院后先报案，再按要求准备理赔材料，具体审核以保险公司为准。"
    }) }
  );
  assert.ok(claim.quick_replies.some((item) => item.label.includes("材料") || item.label.includes("垫付")));
  assert.equal(claim.quick_replies.some((item) => item.label === "父母能不能买"), false);
  assert.equal(claim.quick_replies.some((item) => item.label === "理赔怎么走"), false);

  const preExisting = await runAgentTurn(
    { session_id: "test", message: "高血压血糖高", messages: [] },
    { modelClient: scriptedModel({
      intent: "pre_existing",
      topic: "pre_existing",
      stage: "qualification",
      reply: "高血压和血糖高都要看既往症及并发症限制，不能只看能不能买。"
    }) }
  );
  assert.ok(preExisting.quick_replies.some((item) => item.label.includes("哪些情况")));

  const handoff = await runAgentTurn(
    { session_id: "test", message: "帮我算能赔多少钱", messages: [] },
    { modelClient: async () => ({ text: "{}" }) }
  );
  assert.ok(handoff.quick_replies.some((item) => item.label.includes("准备")));
});

test("no medical insurance and pre-existing conditions stay compliant", async () => {
  const noInsurance = await runAgentTurn(
    { session_id: "test", message: "没有医保能买吗", messages: [] },
    { modelClient: scriptedModel({
      intent: "no_medical_insurance",
      topic: "coverage",
      stage: "qualification",
      reply: "如果现在没有基本医保，或者医保不在保，这款就不建议往购买方向看。这个点先确认清楚，比直接看价格更重要。"
    }) }
  );
  assert.match(noInsurance.customer_reply, /不建议/);

  const preExisting = await runAgentTurn(
    { session_id: "test", message: "有高血压糖尿病能买吗", messages: [] },
    { modelClient: scriptedModel({
      intent: "pre_existing",
      topic: "pre_existing",
      stage: "qualification",
      reply: "这类情况要分开看：能不能投保，和相关疾病后续能不能赔，不是一回事。既往症及并发症限制要重点看，不能只看能不能买。"
    }) }
  );
  assert.match(preExisting.customer_reply, /不能只看能不能买|既往症/);
  assert.ok(preExisting.quick_replies.some((item) => item.label.includes("哪些情况")));
});

test("claim amount and replacement-risk requests are handed off", async () => {
  for (const message of ["帮我算能赔多少钱", "之前保险是不是可以退掉买这个"]) {
    let called = false;
    const result = await runAgentTurn(
      { session_id: "test", message, messages: [] },
      { modelClient: async () => { called = true; return { text: "{}" }; } }
    );
    assert.equal(called, false);
    assert.equal(result.handoff_required, true);
    assert.equal(result.suggested_next_action, "handoff");
  }
});

test("customer profile extracts only low-sensitivity sales context", () => {
  const profile = buildCustomerProfile([
    { role: "user", text: "我想给父母看看，有医保，主要担心高血压住院" }
  ]);
  assert.deepEqual(profile, {
    insured_for: "parent",
    age_band: "61-75",
    has_medical_insurance: "yes",
    main_concern: "parent_purchase",
    sales_stage: "qualification",
  });
});
