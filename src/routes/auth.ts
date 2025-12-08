import { upload } from "../middleware/upload";
import { uploadAvatar } from "../controllers/uploadController";
import { Router } from "express";

const router = Router();

router.post("/upload-avatar", upload.single("file"), uploadAvatar);
