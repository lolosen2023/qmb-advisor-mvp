import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeMessage,
  buildAssistantResponse,
  screenReply,
} from "../src/assistant-engine.mjs";

test("answers price questions without handoff and includes age-based premiums", () => {
  const result = buildAssistantResponse({
    session_id: "s-price",
    user_message: "这个保险多少钱一个月？",
    channel: "landing_page",
  });

  assert.equal(result.intent, "price");
  assert.equal(result.handoff_required, false);
  assert.match(result.customer_reply, /47\.8 元\/月/);
  assert.match(result.customer_reply, /89\.9 元\/月/);
  assert.match(result.customer_reply, /不保证续保|以.*规则.*为准/);
  assert.doesNotMatch(result.customer_reply, /600 万|社保内.*200 万|社保外.*100 万/);
});

test("uses updated 1000万 coverage口径 instead of legacy 600万口径", () => {
  const result = buildAssistantResponse({
    session_id: "s-coverage",
    user_message: "这个保险保什么？总保额多少？",
    channel: "landing_page",
  });

  assert.equal(result.intent, "coverage");
  assert.equal(result.handoff_required, false);
  assert.match(result.customer_reply, /最高.*1000 万|合计最高 1000 万/);
  assert.match(result.customer_reply, /社保内.*400 万/);
  assert.match(result.customer_reply, /社保外.*300 万/);
  assert.doesNotMatch(result.customer_reply, /总保额为600万|最高.*600 万/);
});

test("hands off surrender and complaint requests", () => {
  const surrender = buildAssistantResponse({
    session_id: "s-surrender",
    user_message: "我要退保，直播间说免费为什么扣钱？",
    channel: "landing_page",
  });

  assert.equal(surrender.intent, "complaint");
  assert.equal(surrender.risk_level, "high");
  assert.equal(surrender.handoff_required, true);
  assert.match(surrender.handoff_reason, /退保|投诉|误导|免费/);
  assert.match(surrender.customer_reply, /转人工/);
});

test("hands off concrete claim amount questions", () => {
  const result = buildAssistantResponse({
    session_id: "s-claim-amount",
    user_message: "我住院花了8万，医保报了3万，你帮我算一下能赔多少钱？",
    channel: "landing_page",
  });

  assert.equal(result.intent, "claim");
  assert.equal(result.handoff_required, true);
  assert.match(result.handoff_reason, /理赔金额|具体/);
  assert.match(result.customer_reply, /人工客服|保险公司审核/);
});

test("flags sensitive personal data before normal sales handling", () => {
  const analysis = analyzeMessage("我的身份证号是110101199001011234，帮我查保单");

  assert.equal(analysis.intent, "policy_status");
  assert.equal(analysis.riskLevel, "high");
  assert.equal(analysis.handoffRequired, true);
  assert.ok(analysis.complianceNotes.some((note) => note.includes("敏感信息")));
});

test("post-generation screen rewrites illegal guarantee phrases", () => {
  const screened = screenReply("这个产品什么病都能报，买了马上赔，可以终身保障。");

  assert.equal(screened.changed, true);
  assert.doesNotMatch(screened.reply, /什么病都能报|买了马上赔|终身保障/);
  assert.match(screened.reply, /符合保险责任范围|等待期|不保证续保/);
});

test("introduces itself as an advisor without dumping a product directory", () => {
  const result = buildAssistantResponse({
    session_id: "s-intro",
    user_message: "介绍一下自己",
    channel: "landing_page",
  });

  assert.equal(result.intent, "identity_intro");
  assert.equal(result.conversation_stage, "intro");
  assert.equal(result.handoff_required, false);
  assert.match(result.customer_reply, /全民保顾问经理-张小民|帮您把问题捋清楚|您可以把我当成/);
  assert.match(result.customer_reply, /具体保单|退保|投诉|理赔金额|人工顾问/);
  assert.doesNotMatch(result.customer_reply, /我的作用|边界也会说清楚|模块|系统/);
  assert.doesNotMatch(result.customer_reply, /你可以|你能|保障、价格、投保条件、理赔流程、用药权益和缴费规则/);
});

test("answers greetings naturally instead of dumping product rules", () => {
  const result = buildAssistantResponse({
    session_id: "s-greeting",
    user_message: "你好 在吗",
    channel: "landing_page",
  });

  assert.equal(result.intent, "greeting");
  assert.equal(result.conversation_stage, "intro");
  assert.equal(result.handoff_required, false);
  assert.match(result.customer_reply, /在的|您好|我听着|最关心/);
  assert.match(result.customer_reply, /您/);
  assert.doesNotMatch(result.customer_reply, /一年期|月缴|疾病有 30 天等待期|住院医疗有免赔额|通用规则/);
});

test("handles casual greeting with filler words as a greeting", () => {
  const result = buildAssistantResponse({
    session_id: "s-casual-greeting",
    user_message: "哈哈啊 你在吗",
    channel: "landing_page",
  });

  assert.equal(result.intent, "greeting");
  assert.equal(result.conversation_stage, "intro");
  assert.match(result.customer_reply, /在的|您好|我听着/);
  assert.doesNotMatch(result.customer_reply, /直接说一个场景|我先帮您抓重点|等待期|免赔额|保险公司审核/);
});

test("normalizes noisy greeting without weakening compliance priority", () => {
  const noisy = buildAssistantResponse({
    session_id: "s-noisy-greeting",
    user_message: "111 在吗",
    channel: "landing_page",
  });

  assert.equal(noisy.intent, "greeting");
  assert.match(noisy.customer_reply, /在的|我听着|有人服务/);
  assert.doesNotMatch(noisy.customer_reply, /没完全判断|一年期|等待期|免赔额/);

  const surrender = buildAssistantResponse({
    session_id: "s-surrender-greeting",
    user_message: "我要退保 在吗",
    channel: "landing_page",
  });
  assert.equal(surrender.intent, "surrender");
  assert.equal(surrender.handoff_required, true);

  const claim = buildAssistantResponse({
    session_id: "s-claim-greeting",
    user_message: "帮我算赔多少 在吗",
    channel: "landing_page",
  });
  assert.equal(claim.intent, "claim");
  assert.equal(claim.handoff_required, true);
});

test("explains customer value without classifying 给我 as self-purchase", () => {
  const result = buildAssistantResponse({
    session_id: "s-value",
    user_message: "你能给我带来什么",
    channel: "landing_page",
    known_user_state: { target: "unknown" },
  });

  assert.equal(result.intent, "value_prop");
  assert.equal(result.conversation_stage, "discovery");
  assert.equal(result.handoff_required, false);
  assert.match(result.customer_reply, /帮您少走弯路|医保外|免赔|等待期|既往症/);
  assert.doesNotMatch(result.customer_reply, /拆成几个可判断的问题|合适时我会|不适合或风险较高时/);
  assert.doesNotMatch(result.customer_reply, /给自己看|按您给自己/);
  assert.ok(result.quick_replies.some((item) => item.label === "给父母看"));
});

test("customer-facing replies use respectful advisor tone and avoid mechanical wording", () => {
  const prompts = [
    "你好 在吗",
    "介绍一下自己",
    "你能给我带来什么",
    "给我爸妈能买吗",
    "医保报完剩下是不是全报",
  ];

  for (const message of prompts) {
    const result = buildAssistantResponse({
      session_id: `tone-${message}`,
      user_message: message,
      channel: "landing_page",
    });

    assert.match(result.customer_reply, /您/);
    assert.match(result.customer_reply, /顾问|帮您|给您|建议您|您这个问题|最关心|接着说|您说|想问哪件事/);
    assert.doesNotMatch(
      result.customer_reply,
      /你可以|你能|帮你|给你|系统判断|通用规则|命中知识|住院大额医疗风险|我的作用|边界|模块/
    );
  }
});

test("handles parent purchase as qualification with premiums and key limits", () => {
  const result = buildAssistantResponse({
    session_id: "s-parent",
    user_message: "给我爸妈能买吗",
    channel: "landing_page",
  });

  assert.equal(result.intent, "parent_purchase");
  assert.equal(result.conversation_stage, "qualification");
  assert.equal(result.suggested_next_action, "ask_one_question");
  assert.match(result.customer_reply, /30 天至 75 周岁|61-75 周岁为 89\.9 元\/月|医保.*在保/);
  assert.match(result.customer_reply, /等待期|免赔额|既往症|不保证续保/);
});

test("does not guide purchase when the customer has no medical insurance", () => {
  const result = buildAssistantResponse({
    session_id: "s-no-mi",
    user_message: "没有医保能买吗",
    channel: "landing_page",
  });

  assert.equal(result.intent, "medical_insurance_check");
  assert.equal(result.suggested_next_action, "answer_only");
  assert.match(result.customer_reply, /要求.*基本医保.*在保|不建议.*继续投保|暂不适合/);
  assert.doesNotMatch(result.customer_reply, /投保页面|立即购买|可以购买/);
});

test("rejects full reimbursement wording for post-medical-insurance claims", () => {
  const result = buildAssistantResponse({
    session_id: "s-not-all",
    user_message: "医保报完剩下是不是全报",
    channel: "landing_page",
  });

  assert.equal(result.intent, "claim");
  assert.equal(result.handoff_required, false);
  assert.match(result.customer_reply, /不能.*全报|不是.*全报/);
  assert.match(result.customer_reply, /免赔额|责任范围|保险公司审核/);
});

test("blocks replacing existing insurance with this product", () => {
  const result = buildAssistantResponse({
    session_id: "s-replace-old",
    user_message: "我之前那个保险是不是可以退掉买这个",
    channel: "landing_page",
  });

  assert.equal(result.intent, "sales_objection");
  assert.equal(result.risk_level, "medium");
  assert.equal(result.suggested_next_action, "handoff");
  assert.match(result.customer_reply, /不建议.*退掉|不要.*退掉|不能建议您退掉/);
  assert.match(result.customer_reply, /人工|原保单|保障责任/);
});

test("introduces the product directly when customer asks for product introduction", () => {
  const result = buildAssistantResponse({
    session_id: "s-product-intro",
    user_message: "介绍一下这款产品",
    channel: "landing_page",
  });

  assert.equal(result.intent, "product_intro");
  assert.equal(result.handoff_required, false);
  assert.match(result.customer_reply, /直接给您介绍|全民保尊享版是一款一年期、月缴的住院医疗险/);
  assert.match(result.customer_reply, /最高合计 1000 万|社保内住院医疗 400 万|社保外住院医疗 300 万/);
  assert.match(result.customer_reply, /医保.*在保|等待期|免赔额|既往症|不保证续保/);
  assert.doesNotMatch(result.customer_reply, /您想先看哪一块|直接说一个场景|您可以直接说/);
});

test("correction requests acknowledge the miss and answer product content", () => {
  const result = buildAssistantResponse({
    session_id: "s-correction",
    user_message: "我让你介绍这款产品的内容",
    channel: "landing_page",
  });

  assert.equal(result.intent, "correction");
  assert.equal(result.handoff_required, false);
  assert.match(result.customer_reply, /抱歉|刚才|我重新给您说清楚/);
  assert.match(result.customer_reply, /全民保尊享版是一款一年期、月缴的住院医疗险/);
  assert.doesNotMatch(result.customer_reply, /您想先看哪一块|直接说一个场景/);
});
