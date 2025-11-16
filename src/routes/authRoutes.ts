import { Router } from "express";
import {
  register,
  login,
  createAdminIfNotExists,
  getMe, // ✅ نضيف الدالة دي
} from "../controllers/authController";

import { verifyToken } from "../middleware/authMiddleware"; // ✅ لحماية الـ /me

const router = Router();

// ✅ إنشاء حساب جديد
router.post("/register", register);

// ✅ تسجيل الدخول
router.post("/login", login);

// ✅ إنشاء الأدمن لو مش موجود (تُستخدم أول مرة فقط)
router.post("/create-admin-if-not-exists", createAdminIfNotExists);

// ✅ جلب بيانات المستخدم الحالي (محمي بالتوكن)
router.get("/me", verifyToken, getMe);

export default router;
