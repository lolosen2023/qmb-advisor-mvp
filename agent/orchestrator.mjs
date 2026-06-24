import { buildRouterPrompt } from "./prompts/router.mjs";
import { buildRetrievalPlan } from "./prompts/retrieval-planner.mjs";
import { buildAnswerComposerPrompt } from "./prompts/answer-composer.mjs";
import { buildComplianceReviewerPrompt } from "./prompts/compliance-reviewer.mjs";
import { callModel } from "./model/model-adapter.mjs";
import { callJsonModel } from "./model/json-call.mjs";
import { buildEvidencePack } from "./tools/knowledge-search.mjs";
import { buildHandoffReply, createHandoffTicket } from "./tools/handoff-tool.mjs";
import { buildCustomerProfile, logConversationTurn, summarizeMessages } from "./tools/memory-store.mjs";

const quickReplySets = {
  intro: [
    { label: "这款保什么", message: "这款产品主要保什么？" },
    { label: "父母能不能买", message: "我想给父母看看，应该先确认什么？" },
    { label: "一个月多少钱", message: "这款产品一个月多少钱？" },
    { label: "医保外能报吗", message: "医保外住院费用能报吗？" },
  ],
  product_intro: [
    { label: "没有医保能买吗", message: "没有医保还能买吗？" },
    { label: "免赔额是多少", message: "这款产品免赔额是多少？" },
    { label: "既往症怎么算", message: "有既往症还能买吗，哪些情况不赔？" },
    { label: "理赔怎么走", message: "如果住院了，理赔流程怎么走？" },
  ],
  parent_purchase: [
    { label: "父母年龄有限制吗", message: "父母投保年龄有限制吗？" },
    { label: "有医保还需要吗", message: "父母已经有医保，还需要看这个吗？" },
    { label: "有高血压能买吗", message: "父母有高血压，还能不能买？" },
  ],
  pre_existing: [
    { label: "哪些情况不赔", message: "既往症有哪些情况不赔？" },
    { label: "转人工确认", message: "这种病史能不能转人工帮我确认？" },
  ],
  coverage: [
    { label: "医保外能报吗", message: "医保外住院费用能报吗？" },
    { label: "免赔额是多少", message: "住院医疗免赔额是多少？" },
    { label: "等待期多久", message: "这款产品等待期多久？" },
    { label: "报销比例怎么看", message: "医保报完剩下的是不是都能报？" },
  ],
  claim_process: [
    { label: "理赔怎么走", message: "如果住院了，理赔流程怎么走？" },
    { label: "需要哪些材料", message: "住院理赔需要准备哪些材料？" },
    { label: "能不能垫付", message: "住院费用能不能申请垫付？" },
    { label: "报销多久到账", message: "理赔大概怎么审核，多久到账？" },
  ],
  no_medical_insurance: [
    { label: "医保要求是什么", message: "这款产品对医保有什么要求？" },
    { label: "有医保还需要吗", message: "已经有医保，还需要了解这个吗？" },
    { label: "医保外能报吗", message: "有医保的情况下，医保外住院费用能报吗？" },
  ],
  drug_benefit: [
    { label: "特药怎么用", message: "特药服务具体怎么用？" },
    { label: "哪些药能看", message: "是不是所有进口药和靶向药都能报？" },
    { label: "药店能确认吗", message: "某个药店现在能不能用，可以直接确认吗？" },
  ],
  price: [
    { label: "父母保费怎么看", message: "父母买的话，保费主要看哪些因素？" },
    { label: "月缴规则", message: "这款产品月缴规则是什么？" },
    { label: "先看保障内容", message: "看价格前，我应该先确认哪些保障限制？" },
  ],
  objection: [
    { label: "是不是骗人的", message: "怎么判断这款产品是不是真的？" },
    { label: "免费扣费问题", message: "直播间说免费，为什么会扣钱？" },
    { label: "要不要人工确认", message: "我这种情况是不是更适合转人工确认？" },
  ],
  handoff: [
    { label: "需要准备什么", message: "转人工前我需要准备哪些信息？" },
    { label: "先了解通用规则", message: "我还能先了解哪些通用规则？" },
  ],
};

function inferQuickReplyKey(route = {}, profile = {}, message = "") {
  if (route.handoff_required || route.conversation_stage === "handoff") return "handoff";
  const text = `${message} ${route.intent || ""} ${route.topic || ""} ${profile.main_concern || ""}`;
  if (/claim_process|理赔流程|理赔怎么|材料|住院了|报案|claim/.test(text)) return "claim_process";
  if (/claim_amount|赔多少钱|算.*赔/.test(text)) return "handoff";
  if (/no_medical_insurance|没有医保|无医保|医保不在保/.test(text)) return "no_medical_insurance";
  if (/drug_benefit|特药|靶向药|药店|领药|用药/.test(text)) return "drug_benefit";
  if (/price|多少钱|价格|保费|月缴/.test(text)) return "price";
  if (/trust_objection|sales_objection|靠谱不|骗人|真假|免费|扣费/.test(text)) return "objection";
  if (route.intent === "product_intro" || route.intent === "value_prop" || route.intent === "identity_intro" || route.intent === "correction") return "product_intro";
  if (route.intent === "parent_purchase" || profile.insured_for === "parent") return "parent_purchase";
  if (route.intent === "pre_existing" || profile.main_concern === "pre_existing" || /高血压|糖尿病|血糖|既往症|病史/.test(text)) return "pre_existing";
  if (route.intent === "coverage" || profile.main_concern === "coverage" || /医保外|保什么|保障|免赔额|等待期|报销/.test(text)) return "coverage";
  return "intro";
}

function quickRepliesFor(route = {}, profile = {}, message = "") {
  const key = inferQuickReplyKey(route, profile, message);
  const source = quickReplySets[key] || quickReplySets.intro;
  const cleanMessage = String(message || "");
  const filtered = source.filter((item) => {
    const labelCore = item.label.replace(/[吗？?]/g, "");
    if (cleanMessage.includes(labelCore)) return false;
    if (/理赔/.test(cleanMessage) && /理赔怎么走/.test(item.label)) return false;
    if (/医保外/.test(cleanMessage) && /医保外/.test(item.label)) return false;
    if (/高血压|血糖|糖尿病/.test(cleanMessage) && /高血压|既往症/.test(item.label)) return false;
    if (/父母|爸|妈/.test(cleanMessage) && /父母能不能买/.test(item.label)) return false;
    return true;
  });
  return (filtered.length ? filtered : source).slice(0, 4);
}

function hasSensitiveInfo(text) {
  return /\d{17}[\dXx]/.test(text) || /1[3-9]\d{9}/.test(text) || /银行卡|身份证|病历图片|诊断报告|上传/.test(text);
}

function forcedHandoffReason(text) {
  if (hasSensitiveInfo(text)) return "涉及敏感信息或病历资料";
  if (/退保|退钱|取消保单|投诉|骗人|误导|免费.*扣|强制扣/.test(text)) return "涉及退保、投诉或扣费争议";
  if (/退.*(旧|之前|原来).*买|之前.*保险.*退|旧保险.*退|退掉.*买这个/.test(text)) return "涉及退旧买新风险";
  if (/保单状态|查保单|订单|缴费账户|扣费状态/.test(text)) return "涉及具体保单或订单状态";
  if (/算.*赔|赔多少钱|具体.*理赔金额/.test(text)) return "涉及具体理赔金额";
  if (/哪家医院|哪个药店|药品.*库存|现在.*能不能用/.test(text)) return "涉及实时医院、药店、药品或权益状态";
  return null;
}

function safeRouteFromMessage(message) {
  if (/^(?:\d+\s*)?(你好|您好|在吗|有人吗|哈喽|hello|hi|嗨|哈喽).{0,8}$/.test(message.trim())) {
    return {
      intent: "greeting",
      risk_level: "low",
      needs_retrieval: false,
      handoff_required: false,
      handoff_reason: null,
      topic: "intro",
      suggested_next_action: "answer_only",
      conversation_stage: "intro",
    };
  }
  if (/^(好的|嗯|好|行|可以|谢谢|谢了|[？?。.!！]{1,3})$/.test(message.trim())) {
    return {
      intent: "low_information",
      risk_level: "low",
      needs_retrieval: false,
      handoff_required: false,
      handoff_reason: null,
      topic: "intro",
      suggested_next_action: "answer_only",
      conversation_stage: "intro",
    };
  }
  return null;
}

function localCompliance(reply) {
  const text = String(reply || "");
  const illegal = /一定赔|什么病都能报|医保报完.*都报|免费保险|交一个月保一年|终身保障|终身不涨价|退.*旧.*买.*新|100%报销|系统判断|风险等级|知识库|命中文档|检索片段|内部规则/.test(text);
  if (!illegal) return { action: "pass", safe_reply: text, reason: null };
  let safe = text
    .replace(/一定赔/g, "最终以保险公司审核为准")
    .replace(/什么病都能报/g, "需要看是否符合条款责任和审核结果")
    .replace(/医保报完.*都报/g, "医保结算后仍需按条款责任、免赔额和审核结果确认")
    .replace(/免费保险/g, "月缴医疗险")
    .replace(/交一个月保一年/g, "按页面和保单约定缴费")
    .replace(/终身保障|终身不涨价/g, "一年期产品，不保证续保")
    .replace(/所有进口药靶向药100%报销|100%报销/g, "符合责任范围后按条款和审核结果确认")
    .replace(/知识库|命中文档|系统判断|风险等级|检索片段|内部规则/g, "");
  if (/退.*旧.*买.*新/.test(text)) {
    safe = "这个我不建议直接这样判断。是否保留原有保障，需要结合您已有保单责任、等待期、续保和家庭情况综合看，最好让人工顾问帮您一起确认，避免保障衔接出现空档。";
  }
  return { action: "rewrite", safe_reply: safe.trim(), reason: "合规改写" };
}

function softenRepetitiveOpeners(reply) {
  let text = String(reply || "").trim();
  const openerPatterns = [
    /^您(?:问的)?这个问题(?:非常|很)?关键[，。；：,\s]*/u,
    /^您问到(?:了)?一个(?:很|非常)?关键(?:的)?点[，。；：,\s]*/u,
    /^这个问题(?:非常|很)?关键[，。；：,\s]*/u,
    /^我(?:先|来|直接)?帮您(?:把这个问题)?捋(?:清楚|一下)[，。；：,\s]*/u,
    /^我(?:先|来)?跟您(?:说|讲)清楚[，。；：,\s]*/u,
    /^我(?:先|来)?给您(?:说|讲)清楚[，。；：,\s]*/u,
  ];
  for (const pattern of openerPatterns) {
    text = text.replace(pattern, "");
  }
  text = text.replace(/\n{3,}/g, "\n\n").trim();
  return text || reply;
}

function customerPayload(result) {
  const { internal, ...publicFields } = result;
  return publicFields;
}

export async function runAgentTurn(request, options = {}) {
  const message = String(request?.message ?? request?.user_message ?? "").trim();
  const messages = Array.isArray(request?.messages) ? request.messages : [];
  const sessionId = request?.session_id || "local";
  const agentTrace = [];
  const conversationSummary = summarizeMessages(messages);
  const modelClient = options.modelClient || callModel;
  const messagesWithCurrent = [...messages, { role: "user", text: message }];

  const forcedReason = forcedHandoffReason(message);
  if (forcedReason) {
    const route = {
      intent: "handoff",
      risk_level: "high",
      handoff_required: true,
      handoff_reason: forcedReason,
      suggested_next_action: "handoff",
      conversation_stage: "handoff",
    };
    const customerProfile = buildCustomerProfile(messagesWithCurrent, route);
    const ticket = createHandoffTicket({ sessionId, message, reason: forcedReason, route, messages });
    const result = {
      customer_reply: buildHandoffReply(forcedReason),
      intent: route.intent,
      risk_level: route.risk_level,
      handoff_required: true,
      handoff_reason: forcedReason,
      suggested_next_action: "handoff",
      conversation_stage: "handoff",
      quick_replies: quickRepliesFor(route, customerProfile, message),
      internal: { agent_trace: [{ step: "forced_handoff", route }], handoff_decision: { ticket_id: ticket.ticket_id }, customer_profile: customerProfile },
    };
    logConversationTurn({ sessionId, record: { message, result: customerPayload(result) } });
    return result;
  }

  let route = safeRouteFromMessage(message);
  if (!route) {
    const routerPrompt = buildRouterPrompt({ message, conversationSummary });
    agentTrace.push({ step: "router_prompt_built" });
    try {
      const routed = await callJsonModel({
        prompt: routerPrompt,
        userMessage: message,
        modelClient,
      });
      route = {
        intent: routed.json.intent || "unknown",
        risk_level: routed.json.risk_level || "low",
        needs_retrieval: routed.json.needs_retrieval !== false,
        handoff_required: routed.json.handoff_required === true,
        handoff_reason: routed.json.handoff_reason || null,
        topic: routed.json.topic || routed.json.intent || null,
        suggested_next_action: routed.json.suggested_next_action || "answer_only",
        conversation_stage: routed.json.conversation_stage || "discovery",
      };
      agentTrace.push({ step: "router", route });
    } catch (error) {
      route = {
        intent: "model_unavailable",
        risk_level: "medium",
        needs_retrieval: false,
        handoff_required: true,
        handoff_reason: "模型暂时不可用，无法准确确认产品问题",
        suggested_next_action: "handoff",
        conversation_stage: "handoff",
      };
      agentTrace.push({ step: "router_error", error: error.message });
    }
  } else {
    agentTrace.push({ step: "local_safe_greeting", route });
  }

  const customerProfile = buildCustomerProfile(messagesWithCurrent, route);
  agentTrace.push({ step: "customer_profile", customerProfile });

  if (route.handoff_required) {
    const ticket = createHandoffTicket({ sessionId, message, reason: route.handoff_reason, route, messages });
    const result = {
      customer_reply: buildHandoffReply(route.handoff_reason),
      intent: route.intent,
      risk_level: route.risk_level,
      handoff_required: true,
      handoff_reason: route.handoff_reason,
      suggested_next_action: "handoff",
      conversation_stage: "handoff",
      quick_replies: quickRepliesFor(route, customerProfile, message),
      internal: { agent_trace: agentTrace, handoff_decision: { ticket_id: ticket.ticket_id }, customer_profile: customerProfile },
    };
    logConversationTurn({ sessionId, record: { message, result: customerPayload(result) } });
    return result;
  }

  if (route.needs_retrieval === false && route.intent === "greeting") {
    const result = {
      customer_reply: "在的，您说。我是全民保顾问经理-张小民，您想先了解这款保什么，还是想给自己或家人看看适不适合？",
      intent: route.intent,
      risk_level: route.risk_level,
      handoff_required: false,
      handoff_reason: null,
      suggested_next_action: "answer_only",
      conversation_stage: "intro",
      quick_replies: quickRepliesFor(route, customerProfile, message),
      internal: { agent_trace: agentTrace, retrieved_chunks: [], customer_profile: customerProfile },
    };
    logConversationTurn({ sessionId, record: { message, result: customerPayload(result) } });
    return result;
  }

  if (route.needs_retrieval === false && route.intent === "low_information") {
    const result = {
      customer_reply: "我在，您慢慢说。您可以直接讲最关心的点，比如想给谁看、担心住院费用，还是想先问价格。",
      intent: route.intent,
      risk_level: route.risk_level,
      handoff_required: false,
      handoff_reason: null,
      suggested_next_action: "answer_only",
      conversation_stage: "intro",
      quick_replies: quickRepliesFor(route, customerProfile, message),
      internal: { agent_trace: agentTrace, retrieved_chunks: [], customer_profile: customerProfile },
    };
    logConversationTurn({ sessionId, record: { message, result: customerPayload(result) } });
    return result;
  }

  const retrievalPlan = buildRetrievalPlan({ message, route });
  const evidencePack = buildEvidencePack(retrievalPlan);
  agentTrace.push({ step: "retrieval", query: retrievalPlan.query, topic: retrievalPlan.topic, chunk_count: evidencePack.chunks.length });

  if (!evidencePack.chunks.length) {
    const result = {
      customer_reply: "这个问题我暂时没有找到足够可靠的产品依据，不建议直接下结论。我先帮您转人工顾问进一步确认。",
      intent: route.intent,
      risk_level: "medium",
      handoff_required: true,
      handoff_reason: "未检索到可靠知识依据",
      suggested_next_action: "handoff",
      conversation_stage: "handoff",
      quick_replies: quickRepliesFor({ ...route, handoff_required: true, conversation_stage: "handoff" }, customerProfile, message),
      internal: { agent_trace: agentTrace, retrieved_chunks: [], customer_profile: customerProfile },
    };
    logConversationTurn({ sessionId, record: { message, result: customerPayload(result) } });
    return result;
  }

  const composerPrompt = buildAnswerComposerPrompt({ message, route, evidencePack, conversationSummary, customerProfile });
  const draft = await modelClient({ prompt: composerPrompt, userMessage: message, temperature: 0.35 });
  agentTrace.push({ step: "answer_composer", evidence_chunk_ids: evidencePack.chunks.map((item) => item.chunk_id) });

  let compliance = localCompliance(draft.text);
  if (options.reviewWithModel) {
    try {
      const reviewed = await callJsonModel({
        prompt: buildComplianceReviewerPrompt({ message, draftReply: draft.text }),
        userMessage: message,
        modelClient,
        fallback: compliance,
      });
      compliance = reviewed.json;
    } catch {
      // Local compliance remains the safe fallback.
    }
  }

  const result = {
    customer_reply: softenRepetitiveOpeners(compliance.safe_reply || draft.text),
    intent: route.intent,
    risk_level: route.risk_level || "low",
    handoff_required: compliance.action === "handoff",
    handoff_reason: compliance.action === "handoff" ? compliance.reason : null,
    suggested_next_action: compliance.action === "handoff" ? "handoff" : route.suggested_next_action || "answer_only",
    conversation_stage: compliance.action === "handoff" ? "handoff" : route.conversation_stage || "discovery",
    quick_replies: quickRepliesFor({ ...route, handoff_required: compliance.action === "handoff", conversation_stage: compliance.action === "handoff" ? "handoff" : route.conversation_stage }, customerProfile, message),
    internal: {
      agent_trace: agentTrace,
      retrieved_chunks: evidencePack.chunks.map((chunk) => ({
        chunk_id: chunk.chunk_id,
        source_path: chunk.source_path,
        score: chunk.score,
      })),
      compliance_result: compliance,
      customer_profile: customerProfile,
    },
  };
  logConversationTurn({ sessionId, record: { message, result: customerPayload(result) } });
  return result;
}

export function toCustomerPayload(result) {
  return customerPayload(result);
}
