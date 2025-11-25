import { Router } from "express";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware";

import {
  getOverview,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  listQRs,
  unlinkQR,
  deleteQR,
  scanAnalytics
} from "../controllers/adminController";

const router = Router();

router.use(verifyToken as any, verifyAdmin as any);
router.get("/overview", getOverview);

// Users
router.get("/users", listUsers);
router.post("/users", createUser);
router.patch("/users/:userId", updateUser);
router.delete("/users/:userId", deleteUser);

// QR Dashboard (no linking here)
router.get("/qrs", listQRs);
router.patch("/qrs/:code/unlink", unlinkQR);
router.delete("/qrs/:code", deleteQR);

// Analytics
router.get("/scan-analytics", scanAnalytics);

export default router;
