import { Router } from "express";
import { createQR, getQRDetails, linkUserToQR } from "../controllers/qrController";
import { verifyToken } from "../middleware/authMiddleware";

const router = Router();

// Public
router.get("/:code", getQRDetails);

// Logged-in only
router.post("/create", verifyToken, createQR);
router.post("/link", verifyToken, linkUserToQR);

export default router;
