import { Router } from "express";
import {
  getOverview,
  listUsers,
  deleteUser,
  listQRs,
  deleteQR,
  unlinkQR,
  updateUser,
  scanAnalytics
} from "../controllers/adminController";

import { verifyToken, verifyAdmin } from "../middleware/authMiddleware";

const router = Router();

// all admin routes protected
router.use(verifyToken as any, verifyAdmin as any);

router.get("/overview", getOverview);
router.get("/users", listUsers);
router.delete("/users/:userId", deleteUser);
router.patch("/users/:userId", updateUser);

router.get("/qrs", listQRs);
router.delete("/qrs/:code", deleteQR);
router.patch("/qrs/:code/unlink", unlinkQR);

router.get("/scan-analytics", scanAnalytics);

export default router;
