import express from "express";
import { supabase } from "../lib/supabase.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// LISTAR CHATS
router.get("/:pdfId", auth, async (req, res) => {

  const { data, error } = await supabase
    .from("chats")
    .select("*")
    .eq("pdf_id", req.params.pdfId)
    .eq("user_id", req.user.id);

  if (error) return res.status(500).json(error);

  res.json(data);
});

// CRIAR CHAT
router.post("/", auth, async (req, res) => {

  const { pdfId, title } = req.body;

  if (!pdfId) {
    return res.status(400).json({ error: "pdfId obrigatório" });
  }

  const { data, error } = await supabase
    .from("chats")
    .insert([
      {
        pdf_id: pdfId,
        title,
        user_id: req.user.id
      }
    ])
    .select()
    .single();

  if (error) return res.status(500).json(error);

  res.json(data);
});

export default router;