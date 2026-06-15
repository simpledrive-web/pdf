import express from "express";
import multer from "multer";
import Tesseract from "tesseract.js";
import fs from "fs";

const router = express.Router();

const upload = multer({
  dest: "uploads/"
});

router.post(
  "/analyze-image",
  upload.single("image"),
  async (req, res) => {

    try {

      if (!req.file) {
        return res.status(400).json({
          error: "Imagem não enviada"
        });
      }

      const result =
        await Tesseract.recognize(
          req.file.path,
          "por+eng",
          {
            logger: m => console.log(m)
          }
        );

      const extractedText =
        result.data.text;

      fs.unlinkSync(req.file.path);

      res.json({
        text: extractedText
      });

    } catch (err) {

      console.log(err);

      res.status(500).json({
        error: "Erro OCR"
      });

    }

  }
);

export default router;