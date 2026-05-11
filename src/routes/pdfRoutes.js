import express from "express";
import multer from "multer";

import {
  uploadPDF,
  listPDFs,
  getPDF
} from "../controllers/uploadController.js";

import { auth }
from "../middleware/auth.js";

const router =
  express.Router();

const upload =
  multer({
    dest:"uploads/"
  });

router.get(
  "/",
  auth,
  listPDFs
);

router.get(
  "/:id",
  auth,
  getPDF
);

router.post(
  "/upload",
  auth,
  upload.single("file"),
  uploadPDF
);

export default router;