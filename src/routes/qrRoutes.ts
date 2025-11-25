import { Router } from "express";
import {
  getQRDetails,
  linkUserToQR,
  getMyQr
} from "../controllers/qrController";

import { verifyToken } from "../middleware/authMiddleware";

const router = Router();

// ======================
// Logged-in Routes
// ======================
router.get("/my", verifyToken as any, getMyQr as any);
router.post("/link", verifyToken as any, linkUserToQR as any);

// ======================
// Public QR Scan
// ======================
router.get("/:code", getQRDetails);

export default router;
