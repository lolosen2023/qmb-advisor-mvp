import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const conversationDir = path.join(root, "data", "conversations");

function maskSensitive(text) {
  return String(text || "")
    .replace(/\d{17}[\dXx]/g, "[身份证号]")
    .replace(/1[3-9]\d{9}/g, "[手机号]")
    .replace(/\d{12,}/g, "[长数字]");
}

function normalizeText(messages = []) {
  return messages
    .map((item) => maskSensitive(item?.text || ""))
    .join("\n")
    .toLowerCase();
}

function inferInsuredFor(text) {
  if (/父母|爸|妈|老人|老年/.test(text)) return "parent";
  if (/配偶|爱人|老公|老婆|妻子|丈夫/.test(text)) return "spouse";
  if (/孩子|小孩|儿子|女儿|子女/.test(text)) return "child";
  if (/自己|本人|我买|给我/.test(text)) return "self";
  return "unknown";
}

function inferAgeBand(text) {
  if (/6[1-9]|7[0-5]|六十|七十|老人|父母|爸|妈/.test(text)) return "61-75";
  if (/[1-5]\d岁|[1-5]\d周岁|成人|自己|配偶/.test(text)) return "0-60";
  return "unknown";
}

function inferMedicalInsurance(text) {
  if (/没有医保|无医保|医保断了|医保不在保|没交医保/.test(text)) return "no";
  if (/有医保|医保在保|医保正常|职工医保|居民医保/.test(text)) return "yes";
  return "unknown";
}

function inferConcern(text) {
  if (/父母|爸|妈|老人/.test(text)) return "parent_purchase";
  if (/多少钱|价格|保费|月缴|缴费/.test(text)) return "price";
  if (/理赔|报销|赔多少|赔不赔|发票/.test(text)) return "claim";
  if (/药|特药|靶向药|药店|领药/.test(text)) return "drug";
  if (/既往症|高血压|糖尿病|冠心病|病史/.test(text)) return "pre_existing";
  if (/保什么|保障|医保外|住院|免赔额|等待期/.test(text)) return "coverage";
  return "unknown";
}

export function buildCustomerProfile(messages = [], route = {}) {
  const text = normalizeText(messages);
  const mainConcern = inferConcern(text);
  const stageFromRoute = route?.conversation_stage || null;
  const inferredStage = (() => {
    if (route?.handoff_required) return "handoff";
    if (/投诉|退保|扣费|骗人|误导/.test(text)) return "handoff";
    if (/不划算|太贵|真的假的|骗人|靠谱吗|免费/.test(text)) return "objection";
    if (/适合|能买吗|能不能买|父母|没有医保|有医保/.test(text)) return "qualification";
    if (/多少钱|保费|购买|投保|怎么买/.test(text)) return "recommendation";
    if (/保什么|介绍|是什么|帮我什么/.test(text)) return "discovery";
    return "intro";
  })();

  return {
    insured_for: inferInsuredFor(text),
    age_band: inferAgeBand(text),
    has_medical_insurance: inferMedicalInsurance(text),
    main_concern: mainConcern,
    sales_stage: stageFromRoute || inferredStage,
  };
}

export function summarizeMessages(messages = []) {
  return messages
    .slice(-8)
    .map((item) => `${item.role === "assistant" ? "顾问" : "客户"}：${maskSensitive(item.text).slice(0, 120)}`)
    .join("\n");
}

export function logConversationTurn({ sessionId, record }) {
  fs.mkdirSync(conversationDir, { recursive: true });
  const filePath = path.join(conversationDir, `${sessionId || "local"}.jsonl`);
  fs.appendFileSync(filePath, `${JSON.stringify({ ...record, created_at: new Date().toISOString() })}\n`, "utf8");
}
