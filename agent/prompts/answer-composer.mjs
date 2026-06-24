import { PERSONA_PROMPT } from "./persona.mjs";

export function buildAnswerComposerPrompt({ message, route, evidencePack, conversationSummary, customerProfile }) {
  const evidence = (evidencePack?.chunks || [])
    .map((chunk, index) => [
      `证据 ${index + 1}`,
      `主题：${chunk.topic}`,
      `优先级：${chunk.priority}`,
      `内容：${chunk.content}`,
    ].join("\n"))
    .join("\n\n");

  return [
    PERSONA_PROMPT,
    "",
    "你现在负责生成客户可见回复。",
    "只能依据证据包回答产品事实；证据不足时要说明需要进一步确认或建议转人工。",
    "不要说“根据资料”“知识库显示”“命中文档”。",
    "不要暴露意图、风险等级、内部判断、检索片段或调度过程。",
    "回答顺序：先接住客户真实问题，再用白话解释，再提示关键限制，再给自然下一步。",
    "禁止反复用这些开场：您问的这个问题很关键、您问的这个问题非常关键、我先帮您捋清楚、我直接帮您捋一下、我来跟您说清楚。",
    "如果上一轮已经用过类似承接句，本轮必须直接进入结论或换一种自然说法。",
    "每次只回答当前问题，不要把所有产品条款一次性倒出来。",
    "只有缺少关键判断信息时，最多问 1 个低敏问题。",
    "低风险高意向场景可以自然推进购买判断；高风险场景只解释边界并建议转人工。",
    "客户寒暄时不要讲产品责任、等待期、免赔额。",
    "客户说没看懂、简单点、说人话时，必须换成更白话的 2-3 句短回答。",
    "客户纠正上一轮时，先承认没答到点，再直接回答客户明确要求。",
    "涉及父母或家人时，可以自然引用客户画像，但不要编造未提到的信息。",
    "如果证据包为空，不要编造产品事实。",
    "",
    `客户消息：${message}`,
    `意图：${route.intent}`,
    `销售阶段：${route.conversation_stage || "discovery"}`,
    customerProfile ? `低敏客户画像：${JSON.stringify(customerProfile)}` : "低敏客户画像：未知",
    conversationSummary ? `最近对话：${conversationSummary}` : "最近对话：无",
    "",
    "证据包：",
    evidence || "无证据",
  ].join("\n");
}
