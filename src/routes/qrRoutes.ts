import { Router } from "express";
import {
  createQR,
  getQRDetails,
  linkUserToQR,
} from "../controllers/qrController";
import { verifyToken } from "../middleware/authMiddleware";
import QRCodeModel from "../models/QRCode";

const router = Router();

// Public – anyone can view QR
router.get("/:code", getQRDetails as any);

// Admin create QR
router.post("/create", verifyToken as any, createQR as any);

// Link QR
router.post("/link", verifyToken as any, linkUserToQR as any);

// ⭐ Get current user's QR
router.get("/my", verifyToken as any, async (req: any, res) => {
  try {
    const qr = await QRCodeModel.findOne({ userId: req.user.id });

    if (!qr) return res.json({ code: null });

    res.json({ code: qr.code });
  } catch (err) {
    console.error("getMyQr error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
