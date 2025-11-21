import { Router } from "express";
import {
  getOverview,
  listUsers,
  deleteUser,
  listQRs,
  deleteQR,
  unlinkQR,
  scanAnalytics
} from "../controllers/adminController";

import { verifyToken, verifyAdmin } from "../middleware/authMiddleware";

const router = Router();

// all admin routes protected
router.use(verifyToken, verifyAdmin);

router.get("/overview", getOverview);
router.get("/users", listUsers);
router.delete("/users/:userId", deleteUser);

router.get("/qrs", listQRs);
router.delete("/qrs/:code", deleteQR);
router.patch("/qrs/:code/unlink", unlinkQR);

router.get("/scan-analytics", scanAnalytics);

export default router;
