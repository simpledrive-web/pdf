import fs from "fs";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

import { supabase }
from "../lib/supabase.js";

import { setCurrentPDF }
from "../lib/store.js";

/* =========================
   UPLOAD PDF
========================= */

export async function uploadPDF(
  req,
  res
){

  try{

    console.log(
      "🚀 Upload iniciado"
    );

    if(!req.file){

      return res
        .status(400)
        .json({
          error:
            "Nenhum arquivo enviado"
        });
    }

    const filePath =
      req.file.path;

    console.log(
      "📁 Arquivo:",
      filePath
    );

    /* =========================
       LER PDF
    ========================= */

    const data =
      new Uint8Array(
        fs.readFileSync(filePath)
      );

    const pdf =
      await pdfjsLib
        .getDocument({
          data
        })
        .promise;

    let text = "";

    for(
      let i = 1;
      i <= pdf.numPages;
      i++
    ){

      const page =
        await pdf.getPage(i);

      const content =
        await page.getTextContent();

      const strings =
        content.items.map(
          item => item.str
        );

      text +=
        strings.join(" ")
        + "\n";
    }

    console.log(
      "📄 TEXTO EXTRAÍDO:",
      text.slice(0, 200)
    );

    /* =========================
       SALVAR PDF
    ========================= */

   const { data: pdfData, error } =
  await supabase
    .from("pdfs")
    .insert([
      {
        file_name: req.file.originalname,
        content: text,
        user_id: req.user.id
      }
    ])
    .select()
    .single();

    if(error){

      console.error(error);

      return res
        .status(500)
        .json({
          error:error.message
        });
    }

    /* =========================
       STORE
    ========================= */

    setCurrentPDF({
      id:pdfData.id,
      text
    });

    return res.json({

      message:
        "PDF carregado com sucesso",

      pdf:
        pdfData
    });

  }catch(err){

    console.error(
      "❌ upload error:",
      err
    );

    return res
      .status(500)
      .json({
        error:
          "Erro ao processar PDF"
      });
  }
}

/* =========================
   LISTAR PDFs
========================= */

/* =========================
   PEGAR PDF
========================= */

export async function getPDF(
  req,
  res
){

  try{

    const {
      data,
      error
    } =
      await supabase
        .from("pdfs")
        .select("*")
        .eq(
          "id",
          req.params.id
        )
        .eq(
          "user_id",
          req.user.id
        )
        .single();

    if(error){

      return res
        .status(404)
        .json(error);
    }

    return res.json(data);

  }catch(err){

    console.log(err);

    return res
      .status(500)
      .json({
        error:
          "Erro ao buscar PDF"
      });
  }
}

export async function listPDFs(req, res){

  try{

    const { data, error } =
      await supabase
        .from("pdfs")
        .select("*")
        .eq("user_id", req.user.id)
        .order("created_at", { ascending:false });

    if(error){

      return res.status(500).json({
        error:error.message
      });
    }

    res.json(data);

  }catch(err){

    console.log(err);

    res.status(500).json({
      error:"Erro ao listar PDFs"
    });
  }
}

