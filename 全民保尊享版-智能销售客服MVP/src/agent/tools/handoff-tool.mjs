export function createHandoffTicket({ sessionId, message, reason, intent }) {
  return {
    ticket_id: `mock_${Date.now().toString(36)}`,
    status: "mock_created",
    reason,
    intent,
    session_id: sessionId,
    summary: `用户问题：${message}`,
  };
}

