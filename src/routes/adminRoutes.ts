import { Router } from "express";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware";
import { upload } from "../middleware/upload";
import { uploadMultiple } from "../middleware/upload";

import {
  bulkUploadUsers,
  bulkUploadUserAvatars,
  getOverview,
  listUsers,
  createUser,
  updateUserProfileAdmin,
  deleteUser,
  listQRs,
  unlinkQR,
  deleteQR,
  scanAnalytics,
  resetPassword,
  downloadTemplate,
  uploadUserAvatarAdmin
} from "../controllers/adminController";

import {
  createQR,
  createQRForUser,
  linkExistingQRToUser
} from "../controllers/qrController";

const router = Router();

router.use(verifyToken as any, verifyAdmin as any);
router.get("/overview", getOverview);


// Users
router.get("/users", listUsers);
router.post("/users", createUser);
router.put("/users/:userId", updateUserProfileAdmin);
router.delete("/users/:userId", deleteUser);
router.post("/users/:userId/reset-password", resetPassword);
router.post(
  "/users/:userId/avatar",
  upload.single("file"),
  uploadUserAvatarAdmin
);
router.post(
  "/users/bulk-upload-avatars",
  uploadMultiple.array("files"),
  bulkUploadUserAvatars
);




// QR Dashboard 
router.post("/qrs", createQR); 
router.get("/qrs", listQRs);
router.patch("/qrs/:code/unlink", unlinkQR);
router.delete("/qrs/:code", deleteQR);


// ========== USER QR MANAGEMENT ==========
router.post("/users/:userId/qrs", createQRForUser); // ← Create QR for user
router.patch("/users/:userId/qrs/link", linkExistingQRToUser); // ← Link existing QR

// Analytics
router.get("/scan-analytics", scanAnalytics);

export default router;

// Bulk upload
router.post("/users/bulk-upload", upload.single("file"), bulkUploadUsers);
router.get("/users/template", downloadTemplate);