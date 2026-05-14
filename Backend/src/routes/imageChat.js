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

      if (!req.file) {

        return res.status(400).json({
          error: "Imagem não enviada"
        });

      }

      // mensagem opcional do usuário
      const userMessage =
        req.body.message || "";

      // idioma opcional
      const language =
        req.body.language || "";

      // =========================
      // PROCESSAMENTO OCR
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
        result.data.text;

      // remove arquivos temporários
      fs.unlinkSync(req.file.path);
      fs.unlinkSync(processedImage);

      // =========================
      // PROMPT IA
      // =========================

      const prompt = `
Você é um professor inteligente e prestativo.

Analise o texto extraído da imagem e:

1. Explique resumidamente o conteúdo
2. Identifique o tema da atividade
3. Crie um exercício NOVO baseado no conteúdo
4. O exercício DEVE ser criado no idioma solicitado pelo usuário
5. Use markdown bonito
6. Nunca diga que não existe PDF
7. Nunca invente informações fora da imagem

IMPORTANTE:
- Se o usuário pedir inglês, responda em inglês
- Se pedir português, responda em português
- Se não pedir idioma, use o idioma predominante da conversa

Idioma solicitado:
${language || "automático"}

Mensagem do usuário:
${userMessage}

Texto detectado:
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
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.7
          })
        }
      );

      const data = await response.json();

      console.log(data);

      const answer =
        data.choices?.[0]?.message?.content
        || "Não consegui analisar.";

      // =========================
      // RESPOSTA
      // =========================

      res.json({
        text: extractedText,
        answer
      });

    } catch (err) {

      console.log(err);

      res.status(500).json({
        error: "Erro imagem IA"
      });

    }

  }
);

export default router;