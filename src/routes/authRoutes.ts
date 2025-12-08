import { Router } from "express";
import {
  register,
  login,
  createAdminIfNotExists,
  getMe,
  updateProfile
} from "../controllers/authController";

import { verifyToken } from "../middleware/authMiddleware";

// ⬅⬅⬅ IMPORT UPLOAD & CONTROLLER
import { upload } from "../middleware/upload";
import { uploadAvatar } from "../controllers/uploadController";

const router = Router();

// Register user
router.post("/register", register);

// Login user
router.post("/login", login);

// Create admin (only used once during setup)
router.post("/create-admin-if-not-exists", createAdminIfNotExists);

// Get current authenticated user
router.get("/me", verifyToken as any, getMe as any);

// Update user profile
router.put("/update", verifyToken as any, updateProfile as any);

// ⭐⭐ NEW: Upload Avatar Route ⭐⭐
router.post(
  "/upload-avatar",
  verifyToken as any,
  upload.single("file"),
  uploadAvatar as any
);

export default router;
