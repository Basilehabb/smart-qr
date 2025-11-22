import { Router } from "express";
import { createQR, getQRDetails, linkUserToQR } from "../controllers/qrController";
import { verifyToken } from "../middleware/authMiddleware";

const router = Router();

// Public – anyone can view QR data
router.get("/:code", getQRDetails as any);

// Logged-in only
router.post("/create", verifyToken as any, createQR as any);
router.post("/link", verifyToken as any, linkUserToQR as any);

// NEW — Get current user's QR
router.get("/my", verifyToken as any, getQRDetails);


export default router;