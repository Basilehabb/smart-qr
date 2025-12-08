import { Router } from "express";
import { upload } from "../middleware/upload";
import { uploadAvatar } from "../controllers/uploadController";

const router = Router();

router.post("/avatar", upload.single("file"), uploadAvatar);

export default router;
