import express from "express";
import multer from "multer";
import Tesseract from "tesseract.js";
import fs from "fs";
import fetch from "node-fetch";
import sharp from "sharp";

const router = express.Router();

const upload = multer({
  dest: "uploads/"
});

router.post(
  "/image-chat",
  upload.single("image"),
  async (req, res) => {

    try {

      // =========================
      // VALIDAÇÃO
      // =========================
      if (!req.file) {

        return res.status(400).json({
          error: "Imagem não enviada"
        });

      }

      // =========================
      // DADOS FRONT
      // =========================
      const userMessage =
        req.body.userMessage || "";

      const language =
        req.body.language || "português";

      // =========================
      // OCR MELHORADO
      // =========================
      const processedImage =
        req.file.path + "-processed.png";

      await sharp(req.file.path)
        .grayscale()
        .normalize()
        .sharpen()
        .png()
        .toFile(processedImage);

      const result =
        await Tesseract.recognize(
          processedImage,
          "por+eng"
        );

      const extractedText =
        result.data.text || "";

      // =========================
      // REMOVE ARQUIVOS TEMP
      // =========================
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      if (fs.existsSync(processedImage)) {
        fs.unlinkSync(processedImage);
      }

      // =========================
      // PROMPT IA
      // =========================
      const prompt = `
Você é um professor inteligente,
prestativo e especializado em OCR.

Analise SOMENTE o conteúdo da imagem.

REGRAS IMPORTANTES:

1. Nunca diga:
- "não existe PDF"
- "nenhuma imagem enviada"
- "não há imagem"

2. A imagem JÁ foi enviada.

3. Sempre responda no idioma solicitado.

4. Se o usuário pedir:
- resumo
- exercícios
- tradução
- perguntas
- explicação

Você deve usar SOMENTE o texto da imagem.

5. Nunca invente conteúdo que não exista.

6. Formate bonito usando markdown.

7. Se o texto estiver em inglês,
você pode ensinar inglês.

8. Se o usuário pedir exercícios,
crie exercícios NOVOS baseados
na imagem.

9. Se o usuário pedir resumo,
faça resumo da imagem.

10. Se o usuário pedir em inglês,
responda totalmente em inglês.

Idioma solicitado:
${language}

Mensagem do usuário:
${userMessage}

Texto extraído da imagem:
${extractedText}
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
                  "Você analisa imagens OCR e responde corretamente no idioma solicitado."
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
        || "Não consegui analisar a imagem.";

      // =========================
      // RESPONSE FINAL
      // =========================
      res.json({
        success: true,
        text: extractedText,
        answer
      });

    } catch (err) {

      console.log(err);

      res.status(500).json({
        success: false,
        error: "Erro imagem IA"
      });

    }

  }
);

export default router;