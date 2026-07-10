"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const upload_1 = require("../middleware/upload");
const upload_2 = require("../middleware/upload");
const adminController_1 = require("../controllers/adminController");
const qrController_1 = require("../controllers/qrController");
const marketingRoutes_1 = require("./marketingRoutes");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.verifyToken, authMiddleware_1.verifyAdmin);
router.use("/marketing", marketingRoutes_1.default);
router.get("/overview", adminController_1.getOverview);
// Subscription plans
router.get("/plans", adminController_1.getPlans);
router.post("/plans", adminController_1.createPlan);
router.put("/plans/:id", adminController_1.updatePlan);
router.delete("/plans/:id", adminController_1.deletePlan);
// Bulk upload
router.post("/users/bulk-upload", upload_1.upload.single("file"), adminController_1.bulkUploadUsers);
router.get("/users/template", adminController_1.downloadTemplate);
router.post("/users/bulk-upload-avatars", upload_2.uploadMultiple.array("files"), adminController_1.bulkUploadUserAvatars);
router.post("/users/:userId/avatar", upload_1.upload.single("file"), adminController_1.uploadUserAvatarAdmin);
router.put("/users/:userId/plan", adminController_1.assignUserPlan);
// Users
router.get("/users", adminController_1.listUsers);
router.post("/users", adminController_1.createUser);
router.put("/users/:userId", adminController_1.updateUserProfileAdmin);
router.delete("/users/:userId", adminController_1.deleteUser);
router.post("/users/:userId/reset-password", adminController_1.resetPassword);
// QR Dashboard 
router.post("/qrs", qrController_1.createQR);
router.post("/qrs/bulk", qrController_1.createBulkQRs);
router.get("/qrs", adminController_1.listQRs);
router.patch("/qrs/:code/unlink", adminController_1.unlinkQR);
router.delete("/qrs/:code", adminController_1.deleteQR);
// ========== USER QR MANAGEMENT ==========
router.post("/users/:userId/qrs", qrController_1.createQRForUser); // ← Create QR for user
router.patch("/users/:userId/qrs/link", qrController_1.linkExistingQRToUser); // ← Link existing QR
// Analytics
router.get("/scan-analytics", adminController_1.scanAnalytics);
exports.default = router;
