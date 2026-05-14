import express from "express";
import multer from "multer";
import Tesseract from "tesseract.js";
import fs from "fs";
import fetch from "node-fetch";
import sharp from "sharp";

const router = express.Router();

/* =========================
   MULTER
========================= */
const upload = multer({
  dest: "uploads/"
});

/* =========================
   IMAGE CHAT
========================= */
router.post(
  "/image-chat",
  upload.single("image"),
  async (req, res) => {

    try {

      /* =========================
         VALIDAR IMAGEM
      ========================= */
      if (!req.file) {
        return res.status(400).json({
          error: "Imagem não enviada"
        });
      }

      /* =========================
         DADOS FRONT
      ========================= */
      const userMessage =
        req.body.userMessage || "";

      const language =
        req.body.language || "";

      /* =========================
         PROCESSAMENTO OCR
      ========================= */
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

      /* =========================
         CONVERTER IMAGEM BASE64
      ========================= */
      const imageBuffer =
        fs.readFileSync(req.file.path);

      const imageBase64 =
        `data:${req.file.mimetype};base64,${imageBuffer.toString("base64")}`;

      /* =========================
         APAGAR ARQUIVOS
      ========================= */
      fs.unlinkSync(req.file.path);
      fs.unlinkSync(processedImage);

      /* =========================
         PROMPT IA
      ========================= */
      const prompt = `
Você é um professor inteligente, moderno e prestativo.

Analise o texto extraído da imagem e:

1. Explique resumidamente o conteúdo
2. Identifique o tema da atividade
3. Crie exercícios NOVOS baseados no conteúdo da imagem
4. O exercício DEVE ser criado no idioma solicitado pelo usuário
5. Use markdown bonito
6. Nunca diga que não existe PDF ou imagem
7. Nunca peça a imagem novamente
8. Nunca invente conteúdo fora da imagem
9. Sempre use o OCR abaixo como contexto principal
10. Se o usuário pedir exercícios, crie diretamente
11. Se o usuário pedir tradução, traduza
12. Se o usuário pedir resumo, resuma

Idioma solicitado:
${language || "mesmo idioma da conversa"}

Mensagem do usuário:
${userMessage || "Explique a imagem"}

Texto extraído da imagem:
${extractedText}
`;

      /* =========================
         GROQ
      ========================= */
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
        data?.choices?.[0]?.message?.content
        || "Não consegui analisar a imagem.";

      /* =========================
         RESPOSTA
      ========================= */
      res.json({
        success: true,
        imageUrl: imageBase64,
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