import { PERSONA_PROMPT } from "./persona.mjs";

export function buildRouterPrompt({ message, conversationSummary }) {
  return [
    PERSONA_PROMPT,
    "",
    "你现在只做意图和风险判断，不回复客户。",
    "请只输出 JSON，不要输出解释文字。",
    "字段包括：intent、risk_level、needs_retrieval、handoff_required、handoff_reason、topic、suggested_next_action、conversation_stage。",
    "intent 必须从这些值中选择：greeting、identity_intro、product_intro、value_prop、fit_assessment、parent_purchase、price、coverage、claim_process、claim_amount、pre_existing、no_medical_insurance、drug_benefit、trust_objection、sales_objection、surrender、complaint、payment_dispute、human_request、low_information、correction、unknown。",
    "risk_level 必须是 low、medium、high。",
    "suggested_next_action 必须是 answer_only、ask_one_question、guide_to_purchase、handoff。",
    "conversation_stage 必须是 intro、discovery、qualification、recommendation、objection、after_sale、handoff。",
    "强制转人工：退保、投诉、扣费争议、保单查询、具体理赔金额、敏感信息、复杂病历、实时药品药店医院状态、退旧买新。",
    "寒暄、在吗、有人吗、你好这类问题不需要检索，不要误判成产品保障咨询。",
    "介绍产品、这款是什么、说说产品内容，必须识别为 product_intro。",
    "你是谁、你能做什么、能帮我什么，分别识别为 identity_intro 或 value_prop。",
    "客户说不是这个、我让你、你没回答、重新说，识别为 correction。",
    "",
    `客户消息：${message}`,
    conversationSummary ? `最近对话：${conversationSummary}` : "最近对话：无",
  ].join("\n");
}
