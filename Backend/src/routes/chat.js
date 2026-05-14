import express from "express";
import { supabase } from "../lib/supabase.js";
import { auth } from "../middleware/auth.js";
import { askAI } from "../services/aiService.js";

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
      return res.status(400).json({
        error: "Pergunta obrigatória"
      });
    }

    /* =========================
       BUSCA PDF (OPCIONAL)
    ========================= */

    let content = "";

    if (pdfId) {
      const { data: pdf, error } = await supabase
        .from("pdfs")
        .select("content")
        .eq("id", pdfId)
        .single();

      if (!error && pdf) {
        content = pdf.content || "";
      }
    }

    /* =========================
       INTELIGÊNCIA SIMPLES
    ========================= */

    const intent = detectIntent(question);

    let prompt = "";

    switch (intent) {
      case "summary":
        prompt = `
Crie um resumo simples e didático do conteúdo abaixo.

Regras:
- não copiar texto
- linguagem simples
- tópicos claros

CONTEÚDO:
${content || "Nenhum PDF fornecido."}
`;
        break;

      case "words":
        prompt = `
Explique vocabulário de forma simples.

Inclua:
- tradução
- significado
- exemplos

CONTEÚDO:
${content || "Nenhum PDF fornecido."}

Pergunta:
${question}
`;
        break;

      case "examples":
        prompt = `
Crie exemplos práticos.

Regras:
- frases simples
- tradução
- explicação curta

CONTEÚDO:
${content || "Nenhum PDF fornecido."}

Pergunta:
${question}
`;
        break;

      case "grammar":
        prompt = `
Explique gramática de forma simples.

Regras:
- estilo professor
- exemplos
- não copiar texto

CONTEÚDO:
${content || "Nenhum PDF fornecido."}

Pergunta:
${question}
`;
        break;

      default:
        prompt = `
Responda normalmente a pergunta.

CONTEÚDO:
${content || "Nenhum PDF fornecido."}

Pergunta:
${question}
`;
    }

    /* =========================
       IA
    ========================= */

    const answer = await askAI(prompt);

    /* =========================
       SALVA MENSAGENS (SE CHAT EXISTIR)
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

    /* =========================
       RESPONSE
    ========================= */

    return res.json({ answer });

  } catch (err) {
    console.log("❌ CHAT ERROR:", err);

    return res.status(500).json({
      error: "Erro ao processar chat"
    });
  }
});

export default router;