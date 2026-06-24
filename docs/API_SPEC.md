# API 文档

## POST /api/chat

请求：

```json
{
  "session_id": "string",
  "message": "string",
  "messages": [],
  "channel": "landing_page",
  "known_user_state": {}
}
```

响应：

```json
{
  "customer_reply": "string",
  "intent": "string",
  "risk_level": "low",
  "handoff_required": false,
  "handoff_reason": null,
  "suggested_next_action": "answer_only",
  "conversation_stage": "intro",
  "quick_replies": []
}
```

debug 模式会额外返回 `internal.agent_trace`、`retrieved_chunks`、`model_calls`、`compliance_result`。

## GET /api/model-health

返回模型配置状态，不返回 API Key。
