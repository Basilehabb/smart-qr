import { upload } from "../middleware/upload";
import { uploadAvatar } from "../controllers/uploadController";

router.post("/upload-avatar", upload.single("file"), uploadAvatar);
