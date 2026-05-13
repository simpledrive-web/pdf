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

      // OCR
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

      fs.unlinkSync(req.file.path);
      fs.unlinkSync(processedImage);

      // PROMPT IA
      const prompt = `
Você é uma IA inteligente.

Analise o conteúdo abaixo extraído de uma imagem.

Explique de forma útil e natural.

Se for exercício:
- resolva
- explique

Se for anúncio:
- resuma
- explique produto

Se for texto:
- faça resumo

Conteúdo:
${extractedText}
`;

      // GROQ
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
            ]
          })
        }
      );

      const data = await response.json();

      console.log(data);

      const answer =
        data.choices?.[0]?.message?.content
        || "Não consegui analisar.";

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