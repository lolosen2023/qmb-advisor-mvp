import { buildAssistantResponse } from "./assistant-engine.mjs";

const WELCOME_TEXT = "您好，我是全民保顾问经理-张小民，有什么可以帮您？";
const IDLE_REMINDER_TEXT = "您好，在吗？有什么可以帮您？您想咨询什么产品？";
const SOFT_END_TEXT = "这边先为您保留到这里。后面您想继续了解，直接再发消息就可以。";

const state = {
  messages: [
    {
      role: "assistant",
      text: WELCOME_TEXT,
    },
  ],
  lastResult: null,
  isStreaming: false,
  hasUserInteracted: false,
  idleReminderSent: false,
  sessionSoftEnded: false,
  profile: {
    target: "unknown",
    ageBand: "unknown",
    hasMedicalInsurance: "unknown",
    concern: "unknown",
    conditions: [],
  },
};

const $ = (id) => document.getElementById(id);
let toastTimer = null;
let idleReminderTimer = null;
let softEndTimer = null;

function showToast(text) {
  const toast = $("toast");
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
}

function clearIdleTimers() {
  clearTimeout(idleReminderTimer);
  clearTimeout(softEndTimer);
  idleReminderTimer = null;
  softEndTimer = null;
}

function appendAdvisorNotice(text) {
  state.messages.push({ role: "assistant", text });
  renderMessages();
}

function markUserInteracted() {
  state.hasUserInteracted = true;
  state.sessionSoftEnded = false;
  clearIdleTimers();
}

function startInitialIdleTimers() {
  clearIdleTimers();
  idleReminderTimer = setTimeout(() => {
    if (state.hasUserInteracted || state.idleReminderSent) return;
    state.idleReminderSent = true;
    appendAdvisorNotice(IDLE_REMINDER_TEXT);
  }, 60_000);

  softEndTimer = setTimeout(() => {
    if (state.hasUserInteracted || state.sessionSoftEnded) return;
    state.sessionSoftEnded = true;
    appendAdvisorNotice(SOFT_END_TEXT);
  }, 300_000);
}

function renderMessages() {
  const box = $("messageList");
  box.innerHTML = "";
  state.messages.forEach((message) => {
    const item = document.createElement("div");
    item.className = `msg ${message.role === "customer" ? "customer" : "assistant"}${message.streaming ? " streaming" : ""}`;
    item.innerHTML = '<span class="role-line"><span class="role-name"></span></span><p></p>';
    item.querySelector(".role-name").textContent = message.role === "customer" ? "您" : "全民保顾问经理-张小民";
    if (message.streaming) {
      const speaking = document.createElement("span");
      speaking.className = "speaking";
      speaking.textContent = "正在说话中";
      item.querySelector(".role-line").appendChild(speaking);
    }
    item.querySelector("p").textContent = message.text;
    box.appendChild(item);
  });
  box.scrollTop = box.scrollHeight;
}

function saveSession(result, userText) {
  localStorage.setItem(
    "qmb-last-session",
    JSON.stringify({
      updated_at: new Date().toISOString(),
      user_message: userText,
      customer_reply: result.customer_reply,
      intent: result.intent,
      risk_level: result.risk_level,
      handoff_required: result.handoff_required,
      handoff_reason: result.handoff_reason,
      suggested_next_action: result.suggested_next_action,
      conversation_stage: result.conversation_stage,
      notes: result.compliance_notes || [],
      profile: state.profile,
      matched_knowledge: result.matched_knowledge || [],
      quick_replies: result.quick_replies || [],
    })
  );
}

function defaultQuickReplies() {
  return [
    { label: "父母有医保还需要吗", message: "父母有医保，还需要买这个吗？" },
    { label: "住院自费多怎么办", message: "主要担心住院自费多，这个能解决什么？" },
    { label: "有高血压能买吗", message: "有高血压糖尿病能买吗？" },
    { label: "医保外能报吗", message: "医保外住院费用能报吗？" },
  ];
}

function quickRepliesFor(result) {
  return result?.quick_replies?.length ? result.quick_replies : defaultQuickReplies();
}

function updateSmartSuggestions(result) {
  const list = quickRepliesFor(result);
  $("quickTitle").textContent = "您可能还想咨询";
  $("quickList").innerHTML = list
    .map((item) => `<button class="chip" type="button" data-scenario="${item.message}">${item.label}</button>`)
    .join("");
  bindScenarioButtons();
}

function renderResult(result, userText) {
  state.lastResult = result;
  if (result.profile) state.profile = result.profile;
  $("assistantReply").textContent = result.customer_reply;
  $("handoffCard").classList.toggle("show", result.handoff_required);
  saveSession(result, userText);
  updateSmartSuggestions(result);
}

function recentMessagesForApi() {
  return state.messages
    .filter((message) => !message.streaming && message.text)
    .slice(-8)
    .map((message) => ({
      role: message.role === "customer" ? "user" : "assistant",
      text: message.text,
    }));
}

async function callAssistantApi(clean) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: "landing-page-local",
      message: clean,
      messages: recentMessagesForApi(),
      channel: "landing_page",
      known_user_state: state.profile,
    }),
  });

  if (!response.ok) throw new Error(`chat api failed: ${response.status}`);
  return response.json();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function typingDelayFor(char) {
  if (char === "\n") return 180;
  if ("。！？；".includes(char)) return 140;
  if ("，、：".includes(char)) return 90;
  return 42;
}

function setBusy(isBusy) {
  state.isStreaming = isBusy;
  $("sendBtn").disabled = isBusy || $("messageInput").value.trim().length === 0;
  $("clearInputBtn").disabled = isBusy || $("messageInput").value.length === 0;
  document.querySelectorAll("[data-scenario]").forEach((button) => {
    button.disabled = isBusy;
  });
  $("messageInput").disabled = isBusy;
}

async function streamAssistantReply(result, assistantMessage) {
  const text = result.customer_reply;
  assistantMessage.text = "";
  assistantMessage.streaming = true;
  renderMessages();
  for (let index = 0; index < text.length; index += 1) {
    assistantMessage.text = text.slice(0, index + 1);
    renderMessages();
    await sleep(typingDelayFor(text[index]));
  }
  assistantMessage.text = text;
  assistantMessage.streaming = false;
  renderMessages();
}

async function submit(text) {
  if (state.isStreaming) return;
  const clean = text.trim();
  if (!clean) return;

  markUserInteracted();
  $("handoffCard").classList.remove("show");
  state.messages.push({ role: "customer", text: clean });
  const assistantMessage = { role: "assistant", text: "", streaming: true };
  state.messages.push(assistantMessage);
  renderMessages();

  $("messageInput").value = "";
  syncComposer();
  setBusy(true);
  let result;
  try {
    result = await callAssistantApi(clean);
  } catch {
    result = buildAssistantResponse({
      session_id: "landing-page-local",
      user_message: clean,
      channel: "landing_page",
      known_user_state: state.profile,
    });
  }
  await streamAssistantReply(result, assistantMessage);
  setBusy(false);
  renderResult(result, clean);
  if (result.handoff_required) showToast("这个问题我先帮您转给人工顾问确认");
}

function syncComposer() {
  const value = $("messageInput").value;
  $("inputMeta").textContent = `${value.length}/300`;
  $("sendBtn").disabled = state.isStreaming || value.trim().length === 0;
  $("clearInputBtn").disabled = state.isStreaming || value.length === 0;
}

function setScenarioActive(button) {
  document.querySelectorAll("[data-scenario]").forEach((item) => {
    item.classList.toggle("active", item === button);
  });
}

function bindScenarioButtons() {
  document.querySelectorAll("[data-scenario]").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.isStreaming) return;
      setScenarioActive(button);
      $("messageInput").value = button.dataset.scenario;
      syncComposer();
      submit(button.dataset.scenario);
    });
  });
}

$("chatForm").addEventListener("submit", (event) => {
  event.preventDefault();
  submit($("messageInput").value);
});

$("messageInput").addEventListener("input", () => {
  if ($("messageInput").value.trim()) markUserInteracted();
  syncComposer();
  setScenarioActive(null);
});

$("clearInputBtn").addEventListener("click", () => {
  if (state.isStreaming) return;
  $("messageInput").value = "";
  syncComposer();
  setScenarioActive(null);
  $("messageInput").focus();
});

$("contactAdvisorBtn").addEventListener("click", () => showToast("已记录人工联系意向"));

const themeToggle = $("themeToggle");
function syncThemeText() {
  themeToggle.textContent = document.documentElement.classList.contains("dark") ? "切换亮色" : "切换暗色";
}
syncThemeText();
themeToggle.addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");
  localStorage.setItem("qmb-theme", document.documentElement.classList.contains("dark") ? "dark" : "light");
  syncThemeText();
});

syncComposer();
updateSmartSuggestions(null);
renderMessages();
startInitialIdleTimers();
