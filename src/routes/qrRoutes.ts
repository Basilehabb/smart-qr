import { Router } from "express";
import {
  createQR,
  getQRDetails,
  linkUserToQR,
  getMyQr
} from "../controllers/qrController";
import { verifyToken } from "../middleware/authMiddleware";

const router = Router();

// ======================
// Logged-in routes FIRST
// ======================
router.get("/my", verifyToken as any, getMyQr as any);
router.post("/create", verifyToken as any, createQR as any);
router.post("/link", verifyToken as any, linkUserToQR as any);

// ======================
// Public QR Scan
// ======================
router.get("/:code", getQRDetails);

export default router;
