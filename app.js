/* =========================
   SUPABASE
========================= */
const supabaseClient = window.supabase.createClient(
  "https://yaknoxndlcopqvigeuzf.supabase.co",
  "SUA_CHAVE_SUPABASE"
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

const sidebarEl = document.querySelector(".sidebar");
const mainEl = document.querySelector(".main");

const backBtn = document.getElementById("backBtn");

/* =========================
   FETCH SEGURO
========================= */
async function safeFetch(url, options = {}) {
  try {

    const {
      data: { session }
    } = await supabaseClient.auth.getSession();

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
   MENSAGENS
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

  const data = await safeFetch(
    "https://pdf-8cd2.onrender.com/api/pdfs"
  );

  pdfs = Array.isArray(data) ? data : [];

  renderHistory();
}

function renderHistory() {

  historyEl.innerHTML = "";

  pdfs.forEach(pdf => {

    const div = document.createElement("div");

    div.className = "history-item";

    div.innerHTML = `
      <span>📄 ${pdf.file_name}</span>
    `;

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

  if (window.innerWidth <= 768) {
    sidebarEl.style.display = "flex";
    mainEl.style.display = "none";
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

    div.innerHTML = `
      <span>💬 ${chat.title || "Chat"}</span>
      <button class="menu-btn">⋮</button>
    `;

    div.onclick = () => openChat(chat);

    const menuBtn = div.querySelector(".menu-btn");

    menuBtn.onclick = async (e) => {

      e.stopPropagation();

      const confirmar =
        confirm("Excluir conversa?");

      if (!confirmar) return;

      await safeFetch(
        `https://pdf-8cd2.onrender.com/api/chats/${chat.id}`,
        {
          method: "DELETE"
        }
      );

      chats = chats.filter(c => c.id !== chat.id);

      renderChats(chats);

      chatEl.innerHTML = "";
    };

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
      msg.role === "user"
        ? "user"
        : "ai"
    );

  });

  renderChats(chats);

  /* MOBILE */
  if (window.innerWidth <= 768) {

    sidebarEl.style.display = "none";

    mainEl.style.display = "flex";
  }
}

/* =========================
   VOLTAR
========================= */
backBtn.onclick = () => {

  currentChat = null;

  activeChatId = null;

  chatEl.innerHTML = "";

  renderChats(chats);

  sidebarEl.style.display = "flex";

  mainEl.style.display = "none";
};

/* =========================
   NOVO CHAT
========================= */
function newChat() {

  currentChat = null;

  activeChatId = null;

  chatEl.innerHTML = "";

  addMessage(
    "Novo chat iniciado 🚀",
    "ai"
  );
}

/* =========================
   PERGUNTAR
========================= */
async function askQuestion() {

  const q = questionInput.value;

  if (!q || !currentPDF) return;

  addMessage(q, "user");

  questionInput.value = "";

  /* NOVO CHAT */
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

  /* LOADING */
  const loading =
    document.createElement("div");

  loading.className =
    "message ai loading";

  let dots = 0;

  loading.innerText = "IA pensando";

  const interval = setInterval(() => {

    dots = (dots + 1) % 4;

    loading.innerText =
      "IA pensando" +
      ".".repeat(dots);

  }, 400);

  chatEl.appendChild(loading);

  chatEl.scrollTop =
    chatEl.scrollHeight;

  /* FETCH IA */
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

  clearInterval(interval);

  loading.remove();

  if (!data) {

    addMessage("Erro IA", "ai");

    return;
  }

  addMessage(data.answer, "ai");

  renderChats(chats);
}

/* =========================
   UPLOAD PDF
========================= */
async function uploadPDF() {

  const file = pdfFile.files[0];

  if (!file)
    return alert("Escolha um PDF");

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

  const email =
    document.getElementById("email").value;

  const password =
    document.getElementById("password").value;

  const { data } =
    await supabaseClient.auth
      .signInWithPassword({
        email,
        password
      });

  if (data?.session) {

    document.getElementById(
      "authScreen"
    ).style.display = "none";

    welcomeText.innerText = "Olá 👋";

    loadPDFs();

    if (window.innerWidth <= 768) {
      mainEl.style.display = "none";
    }
  }
}

async function logout() {

  await supabaseClient.auth.signOut();

  location.reload();
}

/* =========================
   ENTER
========================= */
questionInput.addEventListener(
  "keydown",
  (e) => {

    if (e.key === "Enter") {

      askQuestion();

    }

  }
);

/* =========================
   INIT
========================= */
supabaseClient.auth
  .getSession()
  .then(({ data }) => {

    if (data.session) {

      document.getElementById(
        "authScreen"
      ).style.display = "none";

      loadPDFs();

      if (window.innerWidth <= 768) {
        mainEl.style.display = "none";
      }
    }

  });