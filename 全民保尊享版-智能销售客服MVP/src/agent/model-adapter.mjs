import { hasUsableModelConfig, modelConfigFromEnv } from "./config.mjs";

function extractResponsesText(payload) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  const parts = [];
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && content.text) parts.push(content.text);
      if (content?.type === "text" && content.text) parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

function extractChatText(payload) {
  return payload?.choices?.[0]?.message?.content || "";
}

export async function callOpenAIModel({ prompt, userMessage, config = modelConfigFromEnv() }) {
  if (!hasUsableModelConfig(config)) {
    throw new Error(`${config.provider || "model"} API key is not configured`);
  }

  if (config.apiType === "chat_completions") {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.4,
      }),
    });

    if (!response.ok) throw new Error(`${config.provider || "model"} chat request failed: ${response.status}`);
    const raw = await response.json();
    return { text: extractChatText(raw), raw };
  }

  const response = await fetch(`${config.baseUrl}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: prompt }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: userMessage }],
        },
      ],
      temperature: 0.4,
    }),
  });

  if (!response.ok) throw new Error(`${config.provider || "model"} responses request failed: ${response.status}`);
  const raw = await response.json();
  return { text: extractResponsesText(raw), raw };
}
