"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middleware/authMiddleware");
// ⬅⬅⬅ IMPORT UPLOAD & CONTROLLER
const upload_1 = require("../middleware/upload");
const uploadController_1 = require("../controllers/uploadController");
const router = (0, express_1.Router)();
// Register user
router.post("/register", authController_1.register);
router.get("/default-plan", authController_1.getDefaultPlan);
router.post("/register-and-link-qr", authController_1.registerAndLinkQr);
// Login user
router.post("/login", authController_1.login);
// Create admin (only used once during setup)
router.post("/create-admin-if-not-exists", authController_1.createAdminIfNotExists);
// Get current authenticated user
router.get("/me", authMiddleware_1.verifyToken, authController_1.getMe);
// Update user profile
router.put("/update", authMiddleware_1.verifyToken, (0, authMiddleware_1.requireFeature)("canEditProfile"), authController_1.updateProfile);
// ⭐⭐ NEW: Upload Avatar Route ⭐⭐
router.post("/upload-avatar", authMiddleware_1.verifyToken, upload_1.upload.single("file"), uploadController_1.uploadAvatar);
exports.default = router;
