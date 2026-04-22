"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const qrController_1 = require("../controllers/qrController");
const router = (0, express_1.Router)();
// User
router.get("/my", authMiddleware_1.verifyToken, qrController_1.getMyQr);
router.post("/link", authMiddleware_1.verifyToken, qrController_1.linkUserToQR);
// Public Scan
router.get("/:code", qrController_1.getQRDetails);
exports.default = router;
