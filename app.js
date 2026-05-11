/* =========================
   SUPABASE
========================= */
const supabaseClient = window.supabase.createClient(
  "https://yaknoxndlcopqvigeuzf.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlha25veG5kbGNvcHF2aWdldXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NTk1NjgsImV4cCI6MjA5MzEzNTU2OH0.u6rPw3_pusyoPjuhhBdYrrChhPKlV85j0tij_L9cuDI"
);

/* =========================
   STATE
========================= */
let pdfs = [];
let chats = [];
let currentPDF = null;
let currentChat = null;
let activeChatId = null;

/* =========================
   ELEMENTOS
========================= */
const chatEl = document.getElementById("chat");
const historyEl = document.getElementById("history");
const questionInput = document.getElementById("question");
const statusEl = document.getElementById("status");
const welcomeText = document.getElementById("welcomeText");

/* =========================
   FETCH SEGURO
========================= */
async function safeFetch(url, options = {}) {
  try {
    const { data: { session } } =
      await supabaseClient.auth.getSession();

    const token = session?.access_token;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`
      }
    });

    const text = await response.text();

    try {
      return JSON.parse(text);
    } catch {
      console.log("Resposta inválida:", text);
      return null;
    }

  } catch (err) {
    console.log("Erro fetch:", err);
    return null;
  }
}

/* =========================
   MENSAGEM
========================= */
function addMessage(content, role) {
  const div = document.createElement("div");

  div.className = "message " + role;

  div.innerHTML = marked.parse(content || "");

  chatEl.appendChild(div);

  chatEl.scrollTop = chatEl.scrollHeight;
}

/* =========================
   PDFS
========================= */
async function loadPDFs() {
  const data = await safeFetch("https://pdf-8cd2.onrender.com/api/pdfs");

  pdfs = Array.isArray(data) ? data : [];

  renderHistory();
}

function renderHistory() {
  historyEl.innerHTML = "";

  pdfs.forEach(pdf => {
    const div = document.createElement("div");

    div.className = "history-item";

    div.innerText = "📄 " + pdf.file_name;

    div.onclick = () => openPDF(pdf);

    historyEl.appendChild(div);
  });
}

/* =========================
   OPEN PDF
========================= */
async function openPDF(pdf) {
  currentPDF = pdf;

  statusEl.innerText = pdf.file_name;

  chatEl.innerHTML = "";

  const chatsData = await loadChats(pdf.id);

  chats = chatsData;

  renderChats(chats);

  if (chats.length > 0) {
    openChat(chats[0]);
  }
}

/* =========================
   CHATS
========================= */
async function loadChats(pdfId) {
  const data = await safeFetch(
    `https://pdf-8cd2.onrender.com/api/chats/${pdfId}`
  );

  return Array.isArray(data) ? data : [];
}

function renderChats(chatsList) {
  historyEl.innerHTML = "";

  chatsList.forEach(chat => {
    const div = document.createElement("div");

    div.className =
      "history-item" +
      (activeChatId === chat.id ? " active" : "");

    div.innerText = "💬 " + (chat.title || "Chat");

    div.onclick = () => openChat(chat);

    historyEl.appendChild(div);
  });
}

/* =========================
   OPEN CHAT
========================= */
async function openChat(chat) {
  currentChat = chat;
  activeChatId = chat.id;

  chatEl.innerHTML = "";

  const messages = await safeFetch(
    `https://pdf-8cd2.onrender.com/api/messages/${chat.id}`
  );

  if (!Array.isArray(messages)) return;

  messages.forEach(msg => {
    addMessage(
      msg.content,
      msg.role === "user" ? "user" : "ai"
    );
  });

  renderChats(chats);
}

/* =========================
   NOVO CHAT
========================= */
function newChat() {
  currentChat = null;
  activeChatId = null;

  chatEl.innerHTML = "";

  addMessage("Novo chat iniciado 🚀", "ai");
}

/* =========================
   PERGUNTAR
========================= */
async function askQuestion() {
  const q = questionInput.value;

  if (!q || !currentPDF) return;

  addMessage(q, "user");

  questionInput.value = "";

  if (!currentChat) {
    const newChat = await safeFetch(
      "https://pdf-8cd2.onrender.com/api/chats",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pdfId: currentPDF.id,
          title: q.slice(0, 30)
        })
      }
    );

    currentChat = newChat;
    activeChatId = newChat?.id;
  }

  const loading = document.createElement("div");
  loading.className = "message ai loading";
  loading.innerText = "IA pensando...";

  chatEl.appendChild(loading);

  const data = await safeFetch(
    "https://pdf-8cd2.onrender.com/api/chat",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question: q,
        pdfId: currentPDF.id,
        chatId: currentChat.id
      })
    }
  );

  loading.remove();

  if (!data) {
    addMessage("Erro IA", "ai");
    return;
  }

  addMessage(data.answer, "ai");
}

/* =========================
   UPLOAD PDF
========================= */
async function uploadPDF() {
  const file = pdfFile.files[0];

  if (!file) return alert("Escolha um PDF");

  const fd = new FormData();
  fd.append("file", file);

  await safeFetch(
    "https://pdf-8cd2.onrender.com/api/pdfs/upload",
    {
      method: "POST",
      body: fd
    }
  );

  loadPDFs();
}

/* =========================
   AUTH
========================= */
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (data?.session) {
    document.getElementById("authScreen").style.display = "none";

    welcomeText.innerText = `Olá 👋`;

    loadPDFs();
  }
}

async function logout() {
  await supabaseClient.auth.signOut();
  location.reload();
}

/* =========================
   ENTER
========================= */
questionInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") askQuestion();
});

/* =========================
   INIT
========================= */
supabaseClient.auth.getSession().then(({ data }) => {
  if (data.session) {
    document.getElementById("authScreen").style.display = "none";
    loadPDFs();
  }
});