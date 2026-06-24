const WELCOME_TEXT = "您好，我是全民保顾问经理-张小民，有什么可以帮您？";
const IDLE_REMINDER_TEXT = "您好，在吗？有什么可以帮您？您想咨询什么产品？";
const SOFT_END_TEXT = "这边先为您保留到这里。后面您想继续了解，直接再发消息就可以。";

const state = {
  messages: [{ role: "assistant", text: WELCOME_TEXT }],
  isStreaming: false,
  hasUserInteracted: false,
  idleReminderSent: false,
  sessionSoftEnded: false,
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

function defaultQuickReplies() {
  return [
    { label: "父母能不能买", message: "我想给父母看看，应该先确认什么？" },
    { label: "医保外能报吗", message: "医保外住院费用能报吗？" },
    { label: "有既往症能买吗", message: "有高血压或糖尿病还能买吗？" },
    { label: "理赔怎么走", message: "如果住院了，理赔流程怎么走？" },
  ];
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
    const bubble = item.querySelector("p");
    if (message.streaming && !message.text) {
      bubble.className = "thinking-bubble";
      bubble.innerHTML = '<span class="typing-dots" aria-label="正在说话"><i></i><i></i><i></i></span>';
    } else {
      bubble.textContent = message.text;
    }
    box.appendChild(item);
  });
  box.scrollTop = box.scrollHeight;
}

function updateQuickReplies(replies = defaultQuickReplies()) {
  $("quickTitle").textContent = "您可能还想咨询";
  $("quickList").innerHTML = replies
    .map((item) => `<button class="chip" type="button" data-scenario="${item.message}">${item.label}</button>`)
    .join("");
  document.querySelectorAll("[data-scenario]").forEach((button) => {
    button.addEventListener("click", () => submit(button.dataset.scenario));
  });
}

function recentMessagesForApi() {
  return state.messages
    .filter((message) => !message.streaming && message.text)
    .slice(-10)
    .map((message) => ({
      role: message.role === "customer" ? "user" : "assistant",
      text: message.text,
    }));
}

async function callChatApi(message) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: "landing-page-local",
      message,
      messages: recentMessagesForApi(),
      channel: "landing_page",
    }),
  });
  if (!response.ok) throw new Error(`chat failed: ${response.status}`);
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
  $("messageInput").disabled = isBusy;
  document.querySelectorAll("[data-scenario]").forEach((button) => {
    button.disabled = isBusy;
  });
}

async function streamAssistantReply(text, assistantMessage) {
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
  const clean = String(text || "").trim();
  if (!clean) return;
  markUserInteracted();
  state.messages.push({ role: "customer", text: clean });
  const assistantMessage = { role: "assistant", text: "", streaming: true };
  state.messages.push(assistantMessage);
  renderMessages();
  $("messageInput").value = "";
  syncComposer();
  setBusy(true);
  try {
    const result = await callChatApi(clean);
    await streamAssistantReply(result.customer_reply, assistantMessage);
    updateQuickReplies(result.quick_replies);
    if (result.handoff_required) showToast("我先帮您转人工顾问进一步确认");
  } catch {
    await streamAssistantReply("抱歉，这次连接没有处理成功。您可以稍后再试，或先联系人工顾问确认。", assistantMessage);
  } finally {
    setBusy(false);
  }
}

function syncComposer() {
  const value = $("messageInput").value;
  $("inputMeta").textContent = `${value.length}/300`;
  $("sendBtn").disabled = state.isStreaming || value.trim().length === 0;
  $("clearInputBtn").disabled = state.isStreaming || value.length === 0;
}

$("chatForm").addEventListener("submit", (event) => {
  event.preventDefault();
  submit($("messageInput").value);
});

$("messageInput").addEventListener("input", () => {
  if ($("messageInput").value.trim()) markUserInteracted();
  syncComposer();
});

$("clearInputBtn").addEventListener("click", () => {
  if (state.isStreaming) return;
  $("messageInput").value = "";
  syncComposer();
  $("messageInput").focus();
});

syncComposer();
updateQuickReplies();
renderMessages();
startInitialIdleTimers();
