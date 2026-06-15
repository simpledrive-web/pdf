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
  ) {
    return "summary";
  }

  if (
    q.includes("palavra") ||
    q.includes("significado") ||
    q.includes("vocabul") ||
    q.includes("tradu") ||
    q.includes("ingles") ||
    q.includes("inglês")
  ) {
    return "words";
  }

  if (
    q.includes("exemplo") ||
    q.includes("frase") ||
    q.includes("usar") ||
    q.includes("aplicar")
  ) {
    return "examples";
  }

  if (
    q.includes("gramatica") ||
    q.includes("gramática") ||
    q.includes("simple present") ||
    q.includes("adverb")
  ) {
    return "grammar";
  }

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
       BUSCA PDF
    ========================= */

    let content = "";

if (pdfId) {

  const { data: pdf, error } = await supabase
    .from("pdfs")
    .select("*")
    .eq("id", pdfId)
    .single();

  if (!error && pdf) {
    content = pdf.content || "";
  }

}

    const content = pdf.content || "";

    /* =========================
       INTELIGÊNCIA SIMPLES (SAAS STYLE)
    ========================= */

    const intent = detectIntent(question);

    let prompt = "";

    switch (intent) {
      case "summary":
        prompt = `
Crie um resumo simples e didático do PDF abaixo.

Regras:
- não copiar texto
- explicar com linguagem simples
- organizar em tópicos

PDF:
${content}
`;
        break;

      case "words":
        prompt = `
Explique o vocabulário do PDF de forma simples.

Inclua:
- tradução
- significado
- exemplos

PDF:
${content}

Pergunta:
${question}
`;
        break;

      case "examples":
        prompt = `
Crie exemplos práticos com base no PDF.

Regras:
- frases simples
- tradução abaixo
- explicação curta

PDF:
${content}

Pergunta:
${question}
`;
        break;

      case "grammar":
        prompt = `
Explique a gramática do PDF de forma simples.

Regras:
- explique como um professor
- dê exemplos
- não copie o PDF

PDF:
${content}

Pergunta:
${question}
`;
        break;

      default:
        prompt = `
Responda a pergunta com base no PDF.

PDF:
${content}

Pergunta:
${question}
`;
    }

    /* =========================
       IA (GROQ)
    ========================= */

    const answer = await askAI(prompt, content);

    /* =========================
       SALVA MENSAGENS
    ========================= */

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

    /* =========================
       RESPONSE
    ========================= */

    return res.json({
      answer
    });

  } catch (err) {
    console.log("❌ CHAT ERROR:", err);

    return res.status(500).json({
      error: "Erro ao processar chat"
    });
  }
});

export default router;