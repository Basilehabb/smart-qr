import { Router } from "express";
import { verifyToken } from "../middleware/authMiddleware";

import {
  getQRDetails,
  linkUserToQR,
  getMyQr,
} from "../controllers/qrController";

const router = Router();

// User
router.get("/my", verifyToken as any, getMyQr);
router.post("/link", verifyToken as any, linkUserToQR);


// Public Scan
router.get("/:code", getQRDetails);

export default router;
