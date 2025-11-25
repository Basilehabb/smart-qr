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
  scanAnalytics
} from "../controllers/adminController";

import { createQR } from "../controllers/qrController"; // ← صح

import { verifyToken, verifyAdmin } from "../middleware/authMiddleware";

const router = Router();

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
router.post("/qrs", createQR);
router.patch("/qrs/:code/unlink", unlinkQR);
router.delete("/qrs/:code", deleteQR);

// SCAN ANALYTICS
router.get("/scan-analytics", scanAnalytics);

export default router;
