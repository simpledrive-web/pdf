import express from "express";
import { supabase } from "../lib/supabase.js";
import { auth } from "../middleware/auth.js";
import { askAI } from "../services/aiService.js";
import { SYSTEM_PROMPT } from "../services/systemPrompt.js";

const router = express.Router();

/* =========================
   DETECTA INTENÇÃO
========================= */
function detectIntent(question) {
  const q = question.toLowerCase();

  if (q.includes("resumo") || q.includes("resumir") || q.includes("explique"))
    return "summary";

  if (q.includes("palavra") || q.includes("significado"))
    return "words";

  if (q.includes("exemplo") || q.includes("frase"))
    return "examples";

  if (q.includes("gramatica") || q.includes("gramática"))
    return "grammar";

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
       MEMÓRIA RESUMIDA (últimas 10 mensagens)
    ========================= */
    let historyText = "";

    if (chatId) {
      const { data: history } = await supabase
        .from("messages")
        .select("role, content")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: false })
        .limit(10);

      historyText =
        history
          ?.reverse()
          .map(m =>
            m.role === "user"
              ? `Usuário: ${m.content}`
              : `Assistente: ${m.content}`
          )
          .join("\n") || "";
    }

    /* =========================
       INTENÇÃO
    ========================= */
    const intent = detectIntent(question);

    const taskMap = {
      summary: "Resuma o conteúdo de forma clara e organizada.",
      words: "Explique vocabulário com significado, tradução e exemplos.",
      examples: "Crie exemplos práticos simples.",
      grammar: "Explique gramática como professor.",
      ai: "Responda normalmente de forma útil."
    };

    const taskPrompt = taskMap[intent];

    /* =========================
       PROMPT FINAL PROFISSIONAL
    ========================= */
    const prompt = `
${SYSTEM_PROMPT}

HISTÓRICO RECENTE:
${historyText || "Sem histórico ainda."}

CONTEXTO PDF:
${content || "Sem PDF anexado."}

TAREFA:
${taskPrompt}

PERGUNTA:
${question}
`;

    const answer = await askAI(prompt);

    /* =========================
       SALVA MEMÓRIA
    ========================= */
    if (chatId) {
      await supabase.from("messages").insert([
        { chat_id: chatId, role: "user", content: question },
        { chat_id: chatId, role: "assistant", content: answer }
      ]);
    }

    return res.json({ answer });

  } catch (err) {
    console.log("❌ CHAT ERROR:", err);
    return res.status(500).json({ error: "Erro ao processar chat" });
  }
});

export default router;