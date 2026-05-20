import express from "express";

import { supabase }
from "../lib/supabase.js";

import { auth }
from "../middleware/auth.js";

const router = express.Router();

/* =========================
   LISTAR CHATS SEM PDF
========================= */
router.get(
  "/",
  auth,
  async (req, res) => {

    try {

      const {
        data,
        error
      } = await supabase
        .from("chats")
        .select("*")
        .is("pdf_id", null)
        .eq("user_id", req.user.id)
        .order("created_at", {
          ascending: false
        });

      if (error) {

        console.log(error);

        return res.status(500).json({
          error: error.message
        });

      }

      res.json(data);

    } catch (err) {

      console.log(err);

      res.status(500).json({
        error: "Erro ao buscar chats"
      });

    }

  }
);

/* =========================
   LISTAR CHATS DO PDF
========================= */
router.get(
  "/:pdfId",
  auth,
  async (req, res) => {

    try {

      const {
        data,
        error
      } = await supabase
        .from("chats")
        .select("*")
        .eq("pdf_id", req.params.pdfId)
        .eq("user_id", req.user.id)
        .order("created_at", {
          ascending: false
        });

      if (error) {

        console.log(error);

        return res.status(500).json({
          error: error.message
        });

      }

      res.json(data);

    } catch (err) {

      console.log(err);

      res.status(500).json({
        error: "Erro ao buscar chats"
      });

    }

  }
);

/* =========================
   CRIAR CHAT
========================= */
router.post(
  "/",
  auth,
  async (req, res) => {

    try {

      const {
        pdfId = null,
        title
      } = req.body;

      const {
        data,
        error
      } = await supabase
        .from("chats")
        .insert([
          {
            pdf_id: pdfId,
            title: title || "Novo Chat",
            user_id: req.user.id
          }
        ])
        .select()
        .single();

      console.log("CHAT:", data);
      console.log("ERROR:", error);

      if (error) {

        return res.status(500).json({
          error: error.message
        });

      }

      res.json(data);

    } catch (err) {

      console.log(err);

      res.status(500).json({
        error: "Erro ao criar chat"
      });

    }

  }
);

export default router;