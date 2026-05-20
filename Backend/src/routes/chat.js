import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.post(
  "/chat",
  async (req, res) => {

    try {

      // =========================
      // BODY
      // =========================
      const {
        question,
        pdfId,
        chatId,
        imageContext
      } = req.body;

      // =========================
      // VALIDAÇÃO
      // =========================
      if (!question) {

        return res.status(400).json({
          error: "Pergunta não enviada"
        });

      }

      // =========================
      // PROMPT
      // =========================
      const prompt = `
Você é uma IA inteligente,
prestativa e contextual.

REGRAS IMPORTANTES:

1. Responda sempre baseado no contexto disponível.

2. Se existir contexto OCR/imagem,
use ele como base principal.

3. Nunca diga:
- "não existe PDF"
- "nenhuma imagem enviada"
- "não há contexto"

4. Se o usuário pedir:
- resumo
- tradução
- exercícios
- perguntas
- explicação

Use o contexto da imagem.

5. Se o conteúdo estiver em inglês,
você pode ensinar inglês.

6. Se o usuário pedir exercícios,
crie exercícios NOVOS baseados no conteúdo.

7. Formate bonito usando markdown.

8. Nunca invente conteúdo fora do contexto.

=========================

CONTEXTO DA IMAGEM OCR:

${imageContext || "Nenhum"}

=========================

ID DO PDF:
${pdfId || "Nenhum"}

ID DO CHAT:
${chatId || "Nenhum"}

=========================

PERGUNTA DO USUÁRIO:

${question}
`;

      // =========================
      // GROQ
      // =========================
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:
              `Bearer ${process.env.GROQ_API_KEY}`
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content:
                  "Você responde usando contexto OCR e PDFs."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 1200
          })
        }
      );

      const data = await response.json();

      console.log(data);

      // =========================
      // RESPOSTA IA
      // =========================
      const answer =
        data?.choices?.[0]?.message?.content
        || "Não consegui responder.";

      // =========================
      // RESPONSE
      // =========================
      res.json({
        success: true,
        answer
      });

    } catch (err) {

      console.log(err);

      res.status(500).json({
        success: false,
        error: "Erro IA chat"
      });

    }

  }
);

export default router;