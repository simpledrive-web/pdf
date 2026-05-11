import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import pdfRoutes from "./routes/pdfRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import chatAIRoutes from "./routes/chat.js";

dotenv.config();

const app = express();

app.use(cors());

app.use(express.json());

/* ROUTES */

app.use("/api/pdfs", pdfRoutes);

app.use("/api/chats", chatRoutes);

app.use("/api/messages", messageRoutes);

app.use("/api/chat", chatAIRoutes);

/* 404 */

app.use((req, res) => {

  res.status(404).json({
    error:"Rota não encontrada"
  });
});

app.listen(
  process.env.PORT || 5000,
  () => {

    console.log(
      `🚀 Backend rodando em http://localhost:${process.env.PORT || 5000}`
    );
  }
);