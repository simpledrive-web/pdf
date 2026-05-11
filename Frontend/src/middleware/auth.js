import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function auth(req, res, next){

  try{

    console.log("===== AUTH =====");

    const authHeader =
      req.headers.authorization;

    console.log("HEADER:", authHeader);

    if(!authHeader){

      console.log("SEM TOKEN");

      return res.status(401).json({
        error:"Token não enviado"
      });
    }

    const token =
      authHeader.replace(
        "Bearer ",
        ""
      );

    console.log(
      "TOKEN:",
      token.slice(0, 30)
    );

    const {
      data,
      error
    } =
      await supabase.auth
        .getUser(token);

    console.log("USER:", data.user);
    console.log("ERROR:", error);

    if(error || !data.user){

      return res.status(401).json({
        error:"Token inválido"
      });
    }

    req.user =
      data.user;

    next();

  }catch(err){

    console.log(
      "AUTH ERROR:",
      err
    );

    res.status(500).json({
      error:"Erro auth"
    });
  }
}