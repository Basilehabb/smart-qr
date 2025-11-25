import { Router } from "express";
import {
  getOverview,
  listUsers,
  deleteUser,
  listQRs,
  deleteQR,
  unlinkQR,
  updateUser,
  createUser,
  scanAnalytics,
  createQR,
} from "../controllers/adminController";

import { verifyToken, verifyAdmin } from "../middleware/authMiddleware";

const router = Router();

// all admin routes protected
router.use(verifyToken as any, verifyAdmin as any);

// OVERVIEW
router.get("/overview", getOverview);

// USERS
router.get("/users", listUsers);
router.post("/users", createUser);
router.patch("/users/:userId", updateUser);
router.delete("/users/:userId", deleteUser);

// QRS
router.get("/qrs", listQRs);
router.post("/qrs/create", createQR); // ⬅ هنا إضافة Create QR
router.patch("/qrs/:code/unlink", unlinkQR);
router.delete("/qrs/:code", deleteQR);

// SCAN ANALYTICS
router.get("/scan-analytics", scanAnalytics);

export default router;
