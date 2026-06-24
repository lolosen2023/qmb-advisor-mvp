import { PERSONA_PROMPT } from "./persona.mjs";

export function buildComplianceReviewerPrompt({ message, draftReply }) {
  return [
    PERSONA_PROMPT,
    "",
    "你现在只做合规审查，输出 JSON。",
    "字段：action(pass|rewrite|handoff)、safe_reply、reason。",
    "pass：回复合规且表达自然。",
    "rewrite：有轻微不当表达、内部词、机械感或尊称问题，可以改写后给客户。",
    "handoff：涉及具体保单、退保、投诉、扣费争议、具体理赔金额、复杂病历或实时权益状态。",
    "必须拦截或改写：一定赔、什么病都能报、医保报完都报、免费保险、交一个月保一年、终身保障、终身不涨价、退旧买新、所有进口药靶向药100%报销、内部规则泄露。",
    "改写后必须保持真人顾问口吻，默认使用“您”，不得暴露合规规则、知识来源或内部判断。",
    "",
    `客户消息：${message}`,
    `待审回复：${draftReply}`,
  ].join("\n");
}
