import { buildAssistantResponse } from "./assistant-engine.mjs";

const state = {
  sessionId: "landing-demo",
  messages: [
    {
      role: "assistant",
      text: "您好，我是全民保尊享版保障顾问。可以帮您了解产品保障、价格、投保条件、理赔流程和用药权益。",
    },
  ],
  lastResult: null,
};

const els = {
  form: document.querySelector("#chatForm"),
  input: document.querySelector("#messageInput"),
  messageList: document.querySelector("#messageList"),
  resetBtn: document.querySelector("#resetBtn"),
  scenarioButtons: document.querySelectorAll("[data-scenario]"),
  assistantReply: document.querySelector("#assistantReply"),
  intentPill: document.querySelector("#intentPill"),
  riskPill: document.querySelector("#riskPill"),
  replyMode: document.querySelector("#replyMode"),
  copyBtn: document.querySelector("#copyBtn"),
  handoffBtn: document.querySelector("#handoffBtn"),
  intentValue: document.querySelector("#intentValue"),
  handoffValue: document.querySelector("#handoffValue"),
  actionValue: document.querySelector("#actionValue"),
  complianceList: document.querySelector("#complianceList"),
  handoffReason: document.querySelector("#handoffReason"),
  knowledgeList: document.querySelector("#knowledgeList"),
  flowList: document.querySelector("#flowList"),
};

function renderMessages() {
  els.messageList.innerHTML = "";
  state.messages.forEach((message) => {
    const item = document.createElement("div");
    item.className = `message ${message.role}`;
    item.innerHTML = `<span>${message.role === "customer" ? "客户" : "助手"}</span><p></p>`;
    item.querySelector("p").textContent = message.text;
    els.messageList.appendChild(item);
  });
  els.messageList.scrollTop = els.messageList.scrollHeight;
}

function riskLabel(level) {
  return {
    low: "低风险",
    medium: "中风险",
    high: "高风险",
  }[level] || "未知";
}

function actionLabel(action) {
  return {
    answer_only: "直接回复",
    ask_one_question: "追问一个低敏问题",
    guide_to_purchase: "温和引导投保页",
    handoff: "转人工处理",
  }[action] || action;
}

function renderFlow(result) {
  const steps = [...els.flowList.querySelectorAll("li")];
  const completeCount = result.handoff_required ? 2 : result.suggested_next_action === "guide_to_purchase" ? 5 : 4;
  steps.forEach((step, index) => {
    step.classList.toggle("done", index < completeCount);
    step.classList.toggle("warn", result.handoff_required && index === 4);
  });
}

function renderInspector(result) {
  els.intentValue.textContent = result.intent;
  els.handoffValue.textContent = result.handoff_required ? "是" : "否";
  els.actionValue.textContent = actionLabel(result.suggested_next_action);
  els.handoffReason.textContent = result.handoff_reason || "暂无";

  const notes =
    result.compliance_notes.length > 0
      ? result.compliance_notes
      : [result.handoff_required ? "已进入人工接管流程" : "回复通过合规后审"];
  els.complianceList.innerHTML = notes.map((note) => `<li>${note}</li>`).join("");

  els.knowledgeList.innerHTML = result.matched_knowledge
    .map(
      (item) => `
        <article class="knowledge-item">
          <div>
            <strong>${item.title}</strong>
            <span>${item.topic} · ${item.priority}</span>
          </div>
          <p>${item.content}</p>
        </article>
      `
    )
    .join("");
}

function renderResult(result) {
  state.lastResult = result;
  els.assistantReply.textContent = result.customer_reply;
  els.intentPill.textContent = `意图：${result.intent}`;
  els.riskPill.textContent = riskLabel(result.risk_level);
  els.riskPill.className = `risk-pill ${result.risk_level}`;
  els.replyMode.textContent = result.handoff_required ? "人工接管" : "可自动回复";
  els.replyMode.className = result.handoff_required ? "mode-chip handoff" : "mode-chip";
  renderInspector(result);
  renderFlow(result);
}

function submitMessage(text) {
  const cleanText = text.trim();
  if (!cleanText) return;

  state.messages.push({ role: "customer", text: cleanText });
  const result = buildAssistantResponse({
    session_id: state.sessionId,
    user_message: cleanText,
    channel: "landing_page",
    page_context: { page: "product_detail" },
    known_user_state: {
      age_band: "unknown",
      has_social_insurance: "unknown",
      customer_stage: "browsing",
    },
  });
  state.messages.push({ role: "assistant", text: result.customer_reply });
  renderMessages();
  renderResult(result);
  els.input.value = "";
}

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitMessage(els.input.value);
});

els.scenarioButtons.forEach((button) => {
  button.addEventListener("click", () => {
    els.input.value = button.dataset.scenario;
    submitMessage(button.dataset.scenario);
  });
});

els.resetBtn.addEventListener("click", () => {
  state.messages = [
    {
      role: "assistant",
      text: "您好，我是全民保尊享版保障顾问。可以帮您了解产品保障、价格、投保条件、理赔流程和用药权益。",
    },
  ];
  state.lastResult = null;
  renderMessages();
  els.assistantReply.textContent =
    "输入客户问题后，这里会生成可发给客户的合规回复。后台判断和知识命中不会展示给客户。";
  els.intentPill.textContent = "意图未识别";
  els.riskPill.textContent = "风险等级";
  els.riskPill.className = "risk-pill neutral";
  els.replyMode.textContent = "待输入";
  els.intentValue.textContent = "unknown";
  els.handoffValue.textContent = "否";
  els.actionValue.textContent = "answer_only";
  els.complianceList.innerHTML = "<li>等待客户输入</li>";
  els.handoffReason.textContent = "暂无";
  els.knowledgeList.innerHTML = "";
});

els.copyBtn.addEventListener("click", async () => {
  if (!state.lastResult) return;
  await navigator.clipboard.writeText(state.lastResult.customer_reply);
  els.copyBtn.textContent = "已复制";
  setTimeout(() => {
    els.copyBtn.textContent = "复制回复";
  }, 1200);
});

els.handoffBtn.addEventListener("click", () => {
  const text = state.lastResult?.handoff_reason || "人工复核";
  els.handoffReason.textContent = text;
  els.replyMode.textContent = "人工接管";
  els.replyMode.className = "mode-chip handoff";
});

renderMessages();

