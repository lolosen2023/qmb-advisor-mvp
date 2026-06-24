import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const handoffDir = path.join(root, "data", "handoff-tickets");

export function buildHandoffReply(reason) {
  return [
    "这个问题需要人工顾问帮您进一步确认，我先帮您转人工处理。",
    "您可以准备订单页面、保单号或投保手机号后四位；注意不要在对话里发送完整身份证号、银行卡号等敏感信息。",
    reason ? `原因我也会同步给人工顾问：${reason}` : "",
  ].filter(Boolean).join("\n");
}

export function createHandoffTicket({ sessionId, message, reason, route, messages = [] }) {
  fs.mkdirSync(handoffDir, { recursive: true });
  const ticket = {
    ticket_id: `handoff-${Date.now()}`,
    created_at: new Date().toISOString(),
    session_id: sessionId || "local",
    user_message: message,
    reason,
    route,
    recent_messages: messages.slice(-10),
  };
  fs.writeFileSync(path.join(handoffDir, `${ticket.ticket_id}.json`), JSON.stringify(ticket, null, 2), "utf8");
  return ticket;
}

