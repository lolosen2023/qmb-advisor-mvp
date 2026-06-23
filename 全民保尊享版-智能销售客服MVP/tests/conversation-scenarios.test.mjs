import test from "node:test";
import assert from "node:assert/strict";
import { buildAssistantResponse } from "../src/assistant-engine.mjs";

const bannedCustomerPhrases = /通用规则|系统判断|风险等级|命中知识|我的作用|边界|模块|根据资料|你可以这样问|你还可以这样问|你可以继续这样问|直接说一个场景|您想先看哪一块|我先帮您抓重点/;
const productRuleDump = /疾病有 30 天等待期|住院医疗有免赔额|保险公司审核为准|一年期、月缴|社保内住院医疗 400 万/;
const stiffProductPhrase = /住院大额医疗风险/;
const disrespectfulTone = /你可以|你想|你能|帮你|给你|按你的情况/;

const scenarios = [
  {
    name: "开场寒暄",
    message: "有人吗",
    intent: "greeting",
    handoff: false,
    must: /在的|您好|我听着|最关心/,
    mustNot: productRuleDump,
  },
  {
    name: "低信息确认",
    message: "好的",
    intent: "acknowledgement",
    handoff: false,
    must: /好的|您|接着说|继续/,
    mustNot: productRuleDump,
  },
  {
    name: "只发标点",
    message: "？",
    intent: "low_information",
    handoff: false,
    must: /最担心|费用|家人|医保外/,
    mustNot: productRuleDump,
  },
  {
    name: "没看懂",
    message: "我没看懂",
    intent: "clarify_plainly",
    handoff: false,
    must: /我换个说法|简单说|白话|您/,
    mustNot: /复制|上面|通用规则/,
  },
  {
    name: "要求说人话",
    message: "你说人话",
    intent: "clarify_plainly",
    handoff: false,
    must: /我说简单点|白话|别绕|您/,
    mustNot: /系统|模块|根据资料/,
  },
  {
    name: "再简单点",
    message: "再简单点",
    intent: "simplify",
    handoff: false,
    must: /简单说|一句话|先看/,
    mustNot: productRuleDump,
  },
  {
    name: "机器人身份",
    message: "你是不是机器人",
    intent: "bot_identity",
    handoff: false,
    must: /全民保顾问经理-张小民|帮您|人工/,
    mustNot: /系统提示|内部规则|大模型|AI模型/,
  },
  {
    name: "模糊继续",
    message: "再说说",
    intent: "low_information",
    handoff: false,
    must: /最担心|费用|家人|医保外/,
    mustNot: productRuleDump,
  },
  {
    name: "未知输入兜底",
    message: "我有点纠结这个东西",
    intent: "needs_discovery",
    handoff: false,
    must: /担心|住院|特药|理赔/,
    mustNot: /通用规则|系统判断|风险等级|命中知识/,
  },
  {
    name: "完全未知输入",
    message: "这东西咋整",
    intent: "unknown",
    handoff: false,
    must: /我在|最担心|顺着往下看/,
    mustNot: /通用规则|系统判断|风险等级|命中知识/,
  },
  {
    name: "退保免费扣费",
    message: "我要退保，直播间说免费为什么扣钱",
    intent: "complaint",
    handoff: true,
    must: /转人工|人工客服|不要.*身份证|敏感信息/,
    mustNot: /建议购买|投保页面|继续购买/,
  },
  {
    name: "具体理赔金额",
    message: "帮我算能赔多少",
    intent: "claim",
    handoff: true,
    must: /人工|理赔|审核/,
    mustNot: /大概能赔|一定|全报/,
  },
  {
    name: "医保后全报",
    message: "医保报完是不是都报",
    intent: "claim",
    handoff: false,
    must: /不能.*全报|不是.*全报|不能简单理解/,
    mustNot: /一定|都能报/,
  },
];

for (const item of scenarios) {
  test(`conversation scenario: ${item.name}`, () => {
    const result = buildAssistantResponse({
      session_id: `scenario-${item.name}`,
      user_message: item.message,
      channel: "landing_page",
    });

    assert.equal(result.intent, item.intent);
    assert.equal(result.handoff_required, item.handoff);
    assert.match(result.customer_reply, item.must);
    assert.doesNotMatch(result.customer_reply, item.mustNot);
    assert.doesNotMatch(result.customer_reply, bannedCustomerPhrases);
    assert.doesNotMatch(result.customer_reply, stiffProductPhrase);
    assert.doesNotMatch(result.customer_reply, disrespectfulTone);
    assert.match(result.customer_reply, /您/);
  });
}
