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
const pdfFile = document.getElementById("pdfFile");

/* =========================
   UX HELPERS (NOVO)
========================= */
function isMobile() {
  return window.innerWidth <= 768;
}

function closeSidebar() {
  document.getElementById("sidebar")?.classList.remove("open");
}

function openSidebar() {
  document.getElementById("sidebar")?.classList.add("open");
}

/* =========================
   LOADING IA BONITO (NOVO)
========================= */
function createLoading() {
  const div = document.createElement("div");
  div.className = "message ai loading";

  let dots = 0;

  div.innerText = "IA pensando";

  const interval = setInterval(() => {
    dots = (dots + 1) % 4;
    div.innerText = "IA pensando" + ".".repeat(dots);
  }, 400);

  div._interval = interval;

  return div;
}

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
   MENSAGENS
========================= */
/* =========================
   MENSAGENS
========================= */
function addMessage(content, role, type = "text") {

  const div = document.createElement("div");

  div.className =
    role === "user"
      ? "message user"
      : "message ai";

  // IMAGEM
  if (type === "image") {

    const img = document.createElement("img");

    img.src = content;

    img.className = "chat-image";

    img.style.maxWidth = "250px";
    img.style.borderRadius = "12px";
    img.style.marginTop = "6px";

    div.appendChild(img);

  } else {

    // TEXTO NORMAL
    div.innerHTML = DOMPurify.sanitize(
  marked.parse(content)
);

  }

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

  if (isMobile()) closeSidebar();

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
    msg.role === "user" ? "user" : "ai",
    msg.type || "text"
  );

});

  if (isMobile()) closeSidebar();

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

  if (isMobile()) closeSidebar();
}

/* =========================
   PERGUNTAR
========================= */
async function askQuestion() {
  const q = questionInput.value;
  if (!q) return;

  addMessage(q, "user");
  questionInput.value = "";

  if (!currentChat) {
  const newChat = await safeFetch(
    "https://pdf-8cd2.onrender.com/api/chats",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: q.slice(0, 30)
      })
    }
  );

  if (newChat) {
    currentChat = newChat;
    activeChatId = newChat.id;
  } else {
    addMessage("Erro ao criar chat", "ai");
    return;
  }
}

  const loading = createLoading();
  chatEl.appendChild(loading);

 const data = await safeFetch(
  "https://pdf-8cd2.onrender.com/api/chat",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: q,
      pdfId: currentPDF?.id || null,
      chatId: currentChat?.id || null
    })
  }
);
  clearInterval(loading._interval);
  loading.remove();

  if (!data) {
    addMessage("Erro IA", "ai");
    return;
  }

  addMessage(data.answer, "ai");
}

/* =========================
   UPLOAD
========================= */
async function uploadPDF() {
  const file = pdfFile?.files?.[0];

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
  document.getElementById("app").style.display = "flex"; // 👈 ESSENCIAL
 const user =
  data.session.user.user_metadata || {};

const firstName = user.first_name || "";
const lastName = user.last_name || "";

const fullName =
  `${firstName} ${lastName}`.trim();

welcomeText.innerText =
  fullName
    ? `Olá, ${fullName} 👋`
    : "Olá 👋";
  loadPDFs();
}
}

async function logout() {
  await supabaseClient.auth.signOut();
  location.reload();
}

/* =========================
   ENTER FIX
========================= */
questionInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") askQuestion();
});

/* =========================
   INIT
========================= */
/* =========================
   INIT
========================= */
supabaseClient.auth.getSession().then(({ data }) => {

  if (data.session) {

    document.getElementById("authScreen").style.display = "none";
    document.getElementById("app").style.display = "flex";

    const user =
  data.session.user.user_metadata || {};

const firstName = user.first_name || "";
const lastName = user.last_name || "";

const fullName =
  `${firstName} ${lastName}`.trim();

welcomeText.innerText =
  fullName
    ? `Olá, ${fullName} 👋`
    : "Olá 👋";

    loadPDFs();

  } else {

    document.getElementById("app").style.display = "none";

  }

});


/* =========================
   CLOSE ON CLICK CHAT (MOBILE)
========================= */
document.getElementById("main")?.addEventListener("click", () => {
  if (isMobile()) closeSidebar();
});

document.getElementById("main")?.addEventListener("click", () => {
  if (window.innerWidth <= 768) {
    document.getElementById("sidebar")?.classList.remove("open");
  }
});

/* =========================
   SIDEBAR TOGGLE (MOBILE + WEB SAFE)
========================= */
function toggleSidebar() {
  const sidebar =
    document.getElementById("sidebar");

  if (!sidebar) return;

  sidebar.classList.toggle("open");
}

/* =========================
   VOLTAR PARA LISTA DE CHATS
========================= */
function backToChats() {
  currentChat = null;
  activeChatId = null;

  chatEl.innerHTML = "";

  renderChats(chats);

  // no mobile fecha sidebar automaticamente
  if (window.innerWidth <= 768) {
    document.getElementById("sidebar")?.classList.add("open");
  }
}

function backToHome() {
  currentChat = null;
  activeChatId = null;
  currentPDF = null;

  chatEl.innerHTML = "";
  historyEl.innerHTML = "";

  loadPDFs();

  statusEl.innerText = "Nenhum PDF aberto";
}

window.showSignup = function () {
  document.getElementById("loginBox").style.display = "none";
  document.getElementById("signupBox").style.display = "block";
};

window.showLogin = function () {
  document.getElementById("loginBox").style.display = "block";
  document.getElementById("signupBox").style.display = "none";
};

/* =========================
   TOGGLE PASSWORD
========================= */
function togglePassword(id) {
  const input = document.getElementById(id);

  if (!input) return;

  if (input.type === "password") {
    input.type = "text";
  } else {
    input.type = "password";
  }
}

/* =========================
   SIGNUP
========================= */
async function signup() {

  const firstName =
    document.getElementById("firstName").value;

  const lastName =
    document.getElementById("lastName").value;

  const email =
    document.getElementById("signupEmail").value;

  const password =
    document.getElementById("signupPassword").value;

  const confirm =
    document.getElementById("confirmPassword").value;

  if (!firstName || !lastName || !email || !password || !confirm) {
    alert("Preencha todos os campos");
    return;
  }

  if (password !== confirm) {
    alert("As senhas não conferem");
    return;
  }

  const { data, error } =
    await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName
        }
      }
    });

  if (error) {
    alert(error.message);
    return;
  }

  alert("Conta criada com sucesso 🚀");

  showLogin();
}

async function sendImage() {

  const file =
    document.getElementById("imageInput").files[0];

  if (!file) return;

  // pergunta digitada pelo usuário
  const userMessage =
    questionInput.value || "";

  // detecta idioma simples
  const language =
    navigator.language?.startsWith("pt")
      ? "português"
      : "english";

  const loading = createLoading();

  chatEl.appendChild(loading);

  const fd = new FormData();

  fd.append("image", file);

  // NOVO
  fd.append("userMessage", userMessage);
  fd.append("language", language);

  try {

    const response = await safeFetch(
      "https://pdf-8cd2.onrender.com/api/image-chat",
      {
        method: "POST",
        body: fd
      }
    );

    clearInterval(loading._interval);
    loading.remove();

    if (!response) {
      addMessage(
        "Erro ao analisar imagem 😭",
        "ai"
      );
      return;
    }

    const imageUrl = response.imageUrl;

    // mostra imagem
    if (imageUrl) {
      addMessage(imageUrl, "user", "image");
    }

    // resposta IA
    addMessage(
`
## Texto detectado
${response.text}

---

${response.answer}
`,
      "ai"
    );

    // limpa input
    questionInput.value = "";

  } catch (err) {

    clearInterval(loading._interval);
    loading.remove();

    addMessage(
      "Erro ao analisar imagem 😭",
      "ai"
    );

    console.log(err);
  }
}