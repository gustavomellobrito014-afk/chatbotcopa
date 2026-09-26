const STORAGE_KEY = "worldCupGPTModelHistory";

const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const messages = document.getElementById("messages");
const typing = document.getElementById("typing");
const welcome = document.getElementById("welcome");
const chatArea = document.getElementById("chatArea");
const yearSelect = document.getElementById("yearSelect");
const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");
const serverStatus = document.getElementById("serverStatus");

let history = loadHistory();
let sending = false;

function loadHistory() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveHistory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-50)));
}

function setWelcomeVisibility() {
  welcome.classList.toggle("hidden", history.length > 0);
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    chatArea.scrollTo({
      top: chatArea.scrollHeight,
      behavior: "smooth"
    });
  });
}

function resizeInput() {
  messageInput.style.height = "auto";
  messageInput.style.height = Math.min(messageInput.scrollHeight, 145) + "px";
}

function createMessage(role, content, save = true) {
  const message = document.createElement("div");
  message.className = `message ${role}`;

  if (role === "assistant") {
    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = "🏆";
    message.appendChild(avatar);
  }

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = content;
  message.appendChild(bubble);

  messages.appendChild(message);

  if (save) {
    history.push({ role, content });
    saveHistory();
  }

  setWelcomeVisibility();
  scrollToBottom();
}

function renderHistory() {
  messages.textContent = "";

  history.forEach((item) => {
    if (
      item &&
      (item.role === "user" || item.role === "assistant") &&
      typeof item.content === "string"
    ) {
      createMessage(item.role, item.content, false);
    }
  });

  setWelcomeVisibility();
  scrollToBottom();
}

function contextualize(question) {
  const year = yearSelect.value;

  if (!year) {
    return question;
  }

  return `Contexto selecionado: Copa do Mundo de ${year}.\n\n${question}`;
}

async function sendMessage(prefilled = null) {
  if (sending) {
    return;
  }

  const question = (prefilled ?? messageInput.value).trim();

  if (!question) {
    return;
  }

  sending = true;
  sendBtn.disabled = true;
  messageInput.disabled = true;

  const previousHistory = history.slice(-12);

  createMessage("user", question);

  messageInput.value = "";
  resizeInput();

  typing.classList.remove("hidden");
  scrollToBottom();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: contextualize(question),
        history: previousHistory
      })
    });

    const data = await response.json().catch(() => ({
      success: false,
      error: "O servidor retornou uma resposta inválida."
    }));

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Não foi possível obter resposta.");
    }

    createMessage("assistant", data.reply);
  } catch (error) {
    createMessage(
      "assistant",
      `⚠️ ${error.message || "Não foi possível falar com o servidor."}`
    );
  } finally {
    typing.classList.add("hidden");
    sending = false;
    sendBtn.disabled = false;
    messageInput.disabled = false;
    messageInput.focus();
    scrollToBottom();
  }
}

function newConversation() {
  history = [];
  saveHistory();
  messages.textContent = "";
  setWelcomeVisibility();
  sidebar.classList.remove("open");
  messageInput.focus();
}

async function checkHealth() {
  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error();
    }

    serverStatus.querySelector("span").textContent =
      data.configured ? "IA ONLINE" : "CONFIGURE .ENV";

    serverStatus.style.opacity = "1";
  } catch {
    serverStatus.querySelector("span").textContent = "OFFLINE";
    serverStatus.style.opacity = "0.65";
  }
}

function createParticles() {
  const holder = document.getElementById("particles");

  const amount = Math.min(
    38,
    Math.max(20, Math.floor(window.innerWidth / 38))
  );

  for (let index = 0; index < amount; index++) {
    const particle = document.createElement("span");

    particle.className = "particle";
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.bottom = `${-20 - Math.random() * 90}px`;
    particle.style.animationDuration = `${10 + Math.random() * 18}s`;
    particle.style.animationDelay = `${-Math.random() * 18}s`;
    particle.style.opacity = `${0.2 + Math.random() * 0.7}`;

    holder.appendChild(particle);
  }
}

document.querySelectorAll("[data-question]").forEach((button) => {
  button.addEventListener("click", () => {
    sendMessage(button.dataset.question);
    sidebar.classList.remove("open");
  });
});

document.querySelectorAll("[data-team]").forEach((button) => {
  button.addEventListener("click", () => {
    sendMessage(`Me fale sobre ${button.dataset.team} nas Copas do Mundo.`);
    sidebar.classList.remove("open");
  });
});

sendBtn.addEventListener("click", () => sendMessage());

messageInput.addEventListener("input", resizeInput);

messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

document.getElementById("newChatBtn").addEventListener("click", newConversation);

document.getElementById("clearHistoryBtn").addEventListener("click", () => {
  if (window.confirm("Deseja apagar o histórico da conversa?")) {
    newConversation();
  }
});

menuBtn.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

document.addEventListener("click", (event) => {
  if (window.innerWidth > 900) {
    return;
  }

  if (!sidebar.contains(event.target) && !menuBtn.contains(event.target)) {
    sidebar.classList.remove("open");
  }
});

renderHistory();
createParticles();
resizeInput();
checkHealth();
setInterval(checkHealth, 30000);
