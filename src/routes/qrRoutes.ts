import { Router } from "express";
import { verifyToken } from "../middleware/authMiddleware";

import {
  getQRDetails,
  linkUserToQR,
  getMyQr,
  createQR,
  createQRForUser,
  linkExistingQRToUser
} from "../controllers/qrController";

const router = Router();

// User
router.get("/my", verifyToken as any, getMyQr);
router.post("/link", verifyToken as any, linkUserToQR);

// Admin
router.post("/create", verifyToken as any, createQR);
router.post("/users/:userId/create", verifyToken as any, createQRForUser);
router.patch("/users/:userId/link", verifyToken as any, linkExistingQRToUser);

// Public Scan
router.get("/:code", getQRDetails);

export default router;
