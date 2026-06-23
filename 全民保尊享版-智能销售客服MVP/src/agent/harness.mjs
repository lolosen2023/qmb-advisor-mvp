import { buildAssistantResponse, screenReply } from "../assistant-engine.mjs";
import { callOpenAIModel } from "./model-adapter.mjs";
import { buildAgentPrompt } from "./prompt-builder.mjs";
import { createHandoffTicket } from "./tools/handoff-tool.mjs";
import fs from "node:fs";
import path from "node:path";

let lastModelDiagnostics = {
  status: "not_called",
  fallback_used: null,
  rewrite_reason: null,
  model_error: null,
  updated_at: null,
};

function recordModelDiagnostics(update) {
  lastModelDiagnostics = {
    ...lastModelDiagnostics,
    ...update,
    updated_at: new Date().toISOString(),
  };
}

function writeModelFailureLog(error, context = {}) {
  try {
    const outputDir = path.resolve(process.cwd(), "output");
    fs.mkdirSync(outputDir, { recursive: true });
    fs.appendFileSync(
      path.join(outputDir, "model-diagnostics.log"),
      `${new Date().toISOString()} ${JSON.stringify({
        status: "fallback",
        intent: context.intent,
        message: context.message,
        error: error?.message || String(error || "unknown"),
      })}\n`,
      "utf8"
    );
  } catch {
    // Diagnostics must never break customer replies.
  }
}

export function getModelDiagnostics() {
  return { ...lastModelDiagnostics };
}

export function replySignature(text) {
  return String(text || "")
    .replace(/[\s，。、“”‘’：:；;,.!?！？（）()]/g, "")
    .slice(0, 120);
}

function lastAssistantMessage(messages = []) {
  return [...messages].reverse().find((item) => item?.role === "assistant")?.text || "";
}

function summarizeConversation(messages = []) {
  return messages
    .slice(-6)
    .map((item) => `${item.role === "assistant" ? "顾问" : "用户"}：${String(item.text || "").slice(0, 80)}`)
    .join(" / ");
}

function asksForScenarioInsteadOfAnswer(reply) {
  return /直接说一个场景|您想先看哪一块|您可以直接说一个场景|比如“给父母看”|比如给父母看/.test(reply);
}

function shouldBlockScenarioPrompt(intent) {
  return [
    "product_intro",
    "correction",
    "greeting",
    "identity_intro",
    "low_information",
    "acknowledgement",
    "bot_identity",
  ].includes(intent);
}

function softlyRepairAdvisorTone(reply) {
  return String(reply || "")
    .replace(/^(根据资料|根据知识库|根据内部资料)[，,:：\s]*/g, "")
    .replace(/你(?=可以|先|直接|要|想|能|会|方便|把|告诉|接着|说|看|问|担心|需要|有|是|在|这边|那边)/g, "您")
    .replace(/帮你/g, "帮您")
    .replace(/给你/g, "给您")
    .replace(/为你/g, "为您")
    .replace(/按你的/g, "按您的")
    .replace(/你的/g, "您的");
}

function hasUnfriendlySecondPerson(reply) {
  return /你自己看|你去问人工|你自己去|你不懂|你先搞清楚|自己看条款/.test(reply);
}

function isProductLedGreeting(reply, intent) {
  if (!["greeting", "acknowledgement", "low_information"].includes(intent)) return false;
  return /保障|保险|住院|医疗|产品|投保|理赔|转人工|人工顾问/.test(reply);
}

function sanitizeModelReply(text, fallback, context = {}) {
  const clean = String(text || "").trim();
  if (!clean) return { reply: fallback, fallbackUsed: true };
  const repaired = softlyRepairAdvisorTone(clean);
  const screened = screenReply(repaired);
  if (/系统判断|风险等级|命中知识|内部规则|知识库来源|检索结果|通用规则|住院大额医疗风险/.test(screened.reply)) {
    return { reply: fallback, fallbackUsed: true, rewriteReason: "internal_leak" };
  }
  if (hasUnfriendlySecondPerson(screened.reply)) {
    return { reply: fallback, fallbackUsed: true, rewriteReason: "tone" };
  }
  if (isProductLedGreeting(screened.reply, context.intent)) {
    return { reply: fallback, fallbackUsed: true, rewriteReason: "too_product_led" };
  }
  if (shouldBlockScenarioPrompt(context.intent) && asksForScenarioInsteadOfAnswer(screened.reply)) {
    return { reply: fallback, fallbackUsed: true, rewriteReason: "wrong_strategy" };
  }
  if (context.lastAssistantReply && replySignature(screened.reply) === replySignature(context.lastAssistantReply)) {
    return { reply: fallback, fallbackUsed: true, rewriteReason: "duplicate" };
  }
  return { reply: screened.reply, fallbackUsed: false };
}

function publicResponse(result) {
  return {
    customer_reply: result.customer_reply,
    intent: result.intent,
    risk_level: result.risk_level,
    handoff_required: result.handoff_required,
    handoff_reason: result.handoff_reason,
    suggested_next_action: result.suggested_next_action,
    conversation_stage: result.conversation_stage,
    quick_replies: result.quick_replies || [],
    profile: result.profile,
    compliance_notes: result.compliance_notes || [],
    internal: result.internal,
  };
}

export async function runAgentTurn(request, options = {}) {
  const userMessage = request?.message ?? request?.user_message ?? "";
  const messages = Array.isArray(request?.messages) ? request.messages : [];
  const lastReply = lastAssistantMessage(messages);
  const localResult = buildAssistantResponse({
    session_id: request?.session_id,
    user_message: userMessage,
    channel: request?.channel || "landing_page",
    known_user_state: request?.known_user_state,
  });

  if (localResult.handoff_required) {
    const ticket = createHandoffTicket({
      sessionId: request?.session_id || "local",
      message: userMessage,
      reason: localResult.handoff_reason,
      intent: localResult.intent,
    });
    return publicResponse({
      ...localResult,
        internal: {
          model_status: "skipped_handoff",
          fallback_used: true,
          local_intent: localResult.intent,
          handoff_ticket_id: ticket.ticket_id,
          matched_knowledge_ids: (localResult.matched_knowledge || []).map((item) => item.chunk_id),
        },
    });
  }

  const prompt = buildAgentPrompt({
    localResult,
    conversationSummary: summarizeConversation(messages),
    lastAssistantReply: lastReply,
  });
  const modelClient = options.modelClient || callOpenAIModel;

  try {
    const modelResult = await modelClient({
      prompt,
      userMessage,
      localResult,
      request,
      config: options.modelConfig,
    });
    const sanitized = sanitizeModelReply(modelResult.text, localResult.customer_reply, {
      intent: localResult.intent,
      lastAssistantReply: lastReply,
    });
    recordModelDiagnostics({
      status: sanitized.fallbackUsed ? "fallback" : "used",
      fallback_used: sanitized.fallbackUsed,
      rewrite_reason: sanitized.rewriteReason || (sanitized.fallbackUsed ? "compliance" : "none"),
      model_error: null,
    });
    return publicResponse({
      ...localResult,
      customer_reply: sanitized.reply,
      internal: {
        model_status: sanitized.fallbackUsed ? "fallback" : "used",
        fallback_used: sanitized.fallbackUsed,
        rewrite_reason: sanitized.rewriteReason || (sanitized.fallbackUsed ? "compliance" : "none"),
        local_intent: localResult.intent,
        reply_signature: replySignature(sanitized.reply),
        matched_knowledge_ids: (localResult.matched_knowledge || []).map((item) => item.chunk_id),
      },
    });
  } catch (error) {
    recordModelDiagnostics({
      status: "fallback",
      fallback_used: true,
      rewrite_reason: "model_error",
      model_error: error?.message || "model unavailable",
    });
    writeModelFailureLog(error, { intent: localResult.intent, message: userMessage });
    return publicResponse({
      ...localResult,
      internal: {
        model_status: "fallback",
        fallback_used: true,
        model_error: error?.message || "model unavailable",
        local_intent: localResult.intent,
        matched_knowledge_ids: (localResult.matched_knowledge || []).map((item) => item.chunk_id),
      },
    });
  }
}

export function toCustomerPayload(result) {
  const { internal, matched_knowledge, internal_notes, ...customer } = result;
  return customer;
}
