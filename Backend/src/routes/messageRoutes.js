import express from "express";

import { supabase }
from "../lib/supabase.js";

import { auth }
from "../middleware/auth.js";

const router =
  express.Router();

/* ===== BUSCAR MENSAGENS ===== */

router.get(
  "/:chatId",
  auth,
  async (req, res) => {

    try{

      /* ===== VERIFICA CHAT ===== */

      const {
        data: chat,
        error: chatError
      } = await supabase
        .from("chats")
        .select("*")
        .eq(
          "id",
          req.params.chatId
        )
        .eq(
          "user_id",
          req.user.id
        )
        .single();

      if(chatError || !chat){

        return res
          .status(403)
          .json({
            error:
              "Acesso negado"
          });
      }

      /* ===== BUSCA MENSAGENS ===== */

      const {
        data,
        error
      } = await supabase
        .from("messages")
        .select("*")
        .eq(
          "chat_id",
          req.params.chatId
        )
        .order(
          "created_at",
          {
            ascending:true
          }
        );

      if(error){

        return res
          .status(500)
          .json({
            error:
              error.message
          });
      }

      res.json(data);

    }catch(err){

      console.log(err);

      res.status(500).json({
        error:
          "Erro ao buscar mensagens"
      });
    }
  }
);

export default router;