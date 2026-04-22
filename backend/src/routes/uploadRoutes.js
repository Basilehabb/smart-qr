"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// path: src/routes/uploadRoutes.ts
const express_1 = require("express");
const upload_1 = require("../middleware/upload");
const uploadController_1 = require("../controllers/uploadController");
const router = (0, express_1.Router)();
router.post("/avatar", upload_1.upload.single("file"), uploadController_1.uploadAvatar);
exports.default = router;
