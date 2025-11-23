import { Router } from "express";
import {
  createQR,
  getQRDetails,
  linkUserToQR,
  getMyQr
} from "../controllers/qrController";
import { verifyToken } from "../middleware/authMiddleware";

const router = Router();

// Public
router.get("/:code", getQRDetails);

// Logged-in required
router.post("/create", verifyToken as any, createQR as any);
router.post("/link", verifyToken as any, linkUserToQR as any);

// 🔥 Correction: My QR route
router.get("/my", verifyToken as any, getMyQr as any);

export default router;
