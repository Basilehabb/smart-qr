import { Router } from "express";
import { verifyAdmin } from "../middleware/adminAuth";
import { getOverview, createQR, listUsers } from "../controllers/adminController";

const router = Router();

router.get("/overview", verifyAdmin, getOverview);
router.post("/qr/create", verifyAdmin, createQR);
router.get("/users", verifyAdmin, listUsers);

export default router;
