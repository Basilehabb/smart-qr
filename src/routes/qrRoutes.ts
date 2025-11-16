import { Router } from "express";
import { createQR, getQRDetails, linkUserToQR } from "../controllers/qrController";
const router = Router();

router.post("/create", createQR);
router.get("/:code", getQRDetails);
router.post("/link", linkUserToQR);

export default router;
