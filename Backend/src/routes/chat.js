import express from "express";
import { supabase } from "../lib/supabase.js";
import { auth } from "../middleware/auth.js";
import { askAI } from "../services/aiService.js";
import { systemPrompt } from "../services/systemPrompt.js";

const router = express.Router();

/* =========================
   DETECTA INTENÇÃO
========================= */
function detectIntent(question) {
  const q = question.toLowerCase();

  if (
    q.includes("resumo") ||
    q.includes("resumir") ||
    q.includes("explique") ||
    q.includes("sobre o que") ||
    q.includes("explicação")
  ) return "summary";

  if (
    q.includes("palavra") ||
    q.includes("significado") ||
    q.includes("vocabul") ||
    q.includes("tradu") ||
    q.includes("ingles") ||
    q.includes("inglês")
  ) return "words";

  if (
    q.includes("exemplo") ||
    q.includes("frase") ||
    q.includes("usar") ||
    q.includes("aplicar")
  ) return "examples";

  if (
    q.includes("gramatica") ||
    q.includes("gramática") ||
    q.includes("simple present") ||
    q.includes("adverb")
  ) return "grammar";

  return "ai";
}

/* =========================
   CHAT ROUTE
========================= */
router.post("/", auth, async (req, res) => {
  try {
    const { question, pdfId, chatId } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Pergunta obrigatória" });
    }

    /* =========================
       PDF (OPCIONAL)
    ========================= */
    let content = "";

    if (pdfId) {
      const { data: pdf } = await supabase
        .from("pdfs")
        .select("content")
        .eq("id", pdfId)
        .single();

      content = pdf?.content || "";
    }

    /* =========================
       MEMÓRIA DO CHAT (ÚLTIMAS 12 MSGS)
    ========================= */
    let historyText = "";

    if (chatId) {
      const { data: history } = await supabase
        .from("messages")
        .select("role, content")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true })
        .limit(12);

      historyText =
        history?.map(m =>
          m.role === "user"
            ? `Usuário: ${m.content}`
            : `Assistente: ${m.content}`
        ).join("\n") || "";
    }

    /* =========================
       INTENÇÃO
    ========================= */
    const intent = detectIntent(question);

    let taskPrompt = "";

    switch (intent) {
      case "summary":
        taskPrompt = "Resuma de forma clara e organizada em tópicos.";
        break;

      case "words":
        taskPrompt = "Explique vocabulário com significado, tradução e exemplos.";
        break;

      case "examples":
        taskPrompt = "Crie exemplos práticos com frases simples.";
        break;

      case "grammar":
        taskPrompt = "Explique gramática de forma simples como um professor.";
        break;

      default:
        taskPrompt = "Responda normalmente de forma útil e clara.";
    }

    /* =========================
       PROMPT FINAL (PROFISSIONAL)
    ========================= */
    const prompt = `
${systemPrompt}

---

HISTÓRICO DA CONVERSA:
${historyText || "Sem histórico ainda."}

---

CONTEÚDO DO PDF:
${content || "Nenhum PDF anexado."}

---

TAREFA:
${taskPrompt}

---

PERGUNTA:
${question}
`;

    /* =========================
       IA
    ========================= */
    const answer = await askAI(prompt);

    /* =========================
       SALVA MEMÓRIA
    ========================= */
    if (chatId) {
      await supabase.from("messages").insert([
        {
          chat_id: chatId,
          role: "user",
          content: question
        }
      ]);

      await supabase.from("messages").insert([
        {
          chat_id: chatId,
          role: "assistant",
          content: answer
        }
      ]);
    }

    return res.json({ answer });

  } catch (err) {
    console.log("❌ CHAT ERROR:", err);
    return res.status(500).json({
      error: "Erro ao processar chat"
    });
  }
});

export default router;