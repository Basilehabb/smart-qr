"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.linkExistingQRToUser = exports.createQRForUser = exports.createBulkQRs = exports.createQR = exports.getMyQr = exports.linkUserToQR = exports.getQRDetails = void 0;
const QRCode_1 = __importDefault(require("../models/QRCode"));
const ScanLog_1 = __importDefault(require("../models/ScanLog"));
const nanoid_1 = require("nanoid");
const INTERNAL_EMAIL_DOMAIN = "phone.smartqr.local";
/*----------------------------------------
  ⭐ PROFILE FORMATTER (array → object)
----------------------------------------*/
function formatProfile(user) {
    if (!user?.profile)
        return {};
    const sections = ["contact", "social", "payment", "video", "music", "design", "gaming", "other"];
    const out = {};
    sections.forEach((sec) => {
        const value = user.profile[sec];
        if (!value) {
            out[sec] = {};
            return;
        }
        if (Array.isArray(value)) {
            const obj = {};
            value.forEach((item) => {
                if (item?.key && item?.value !== undefined && item?.value !== null) {
                    obj[item.key] = String(item.value);
                }
            });
            out[sec] = obj;
            return;
        }
        if (typeof value === "object") {
            const obj = {};
            Object.entries(value).forEach(([key, entryValue]) => {
                if (entryValue !== undefined && entryValue !== null && String(entryValue).trim() !== "") {
                    obj[key] = String(entryValue);
                }
            });
            out[sec] = obj;
            return;
        }
        out[sec] = {};
    });
    return out;
}
const publicEmail = (email) => String(email || "").endsWith(`@${INTERNAL_EMAIL_DOMAIN}`) ? "" : String(email || "");
const generateUniqueCode = async () => {
    while (true) {
        const code = (0, nanoid_1.nanoid)(10).toUpperCase();
        const exists = await QRCode_1.default.findOne({ code });
        if (!exists)
            return code;
    }
};
/*----------------------------------------
  PUBLIC — QR Scan
----------------------------------------*/
const getQRDetails = async (req, res) => {
    try {
        const { code } = req.params;
        const qr = await QRCode_1.default.findOne({ code }).populate("userId", "-passwordHash");
        if (!qr)
            return res.status(404).json({ message: "QR not found" });
        await ScanLog_1.default.create({
            code: qr.code,
            scannedAt: new Date(),
            userAgent: req.headers["user-agent"] || "unknown"
        });
        if (!qr.userId) {
            return res.json({
                code,
                linked: false,
                user: null
            });
        }
        const user = qr.userId;
        return res.json({
            code,
            linked: true,
            user: {
                id: user._id,
                name: user.name,
                email: publicEmail(user.email),
                phone: user.phone,
                countryCode: user.countryCode || "",
                job: user.job || "",
                avatar: user.avatar || "",
                profile: formatProfile(user)
            }
        });
    }
    catch (err) {
        console.error("QR scan error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getQRDetails = getQRDetails;
/*----------------------------------------
  USER — Link QR
----------------------------------------*/
const linkUserToQR = async (req, res) => {
    try {
        const { code } = req.body;
        if (!req.user)
            return res.status(401).json({ message: "Unauthorized" });
        const qr = await QRCode_1.default.findOne({ code });
        if (!qr)
            return res.status(404).json({ message: "QR not found" });
        if (qr.userId)
            return res.status(409).json({ status: "already_linked" });
        qr.userId = req.user.id;
        await qr.save();
        res.json({ status: "linked", code });
    }
    catch (err) {
        console.error("linkUserToQR error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.linkUserToQR = linkUserToQR;
/*----------------------------------------
  USER — Get My QR Codes
----------------------------------------*/
const getMyQr = async (req, res) => {
    try {
        const qrs = await QRCode_1.default.find({ userId: req.user.id });
        res.json({ codes: qrs.map((q) => q.code) });
    }
    catch (err) {
        console.error("getMyQr error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getMyQr = getMyQr;
/*----------------------------------------
  ADMIN — Create QR
----------------------------------------*/
const createQR = async (req, res) => {
    try {
        if (!req.user?.isAdmin)
            return res.status(403).json({ message: "Admin only" });
        let { code } = req.body;
        if (!code)
            code = await generateUniqueCode();
        const exists = await QRCode_1.default.findOne({ code });
        if (exists)
            return res.status(409).json({ message: "QR already exists" });
        const qr = await QRCode_1.default.create({ code });
        res.status(201).json({ success: true, qr });
    }
    catch (err) {
        console.error("createQR error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.createQR = createQR;
/*----------------------------------------
  ADMIN - Create Bulk QRs
----------------------------------------*/
const createBulkQRs = async (req, res) => {
    try {
        if (!req.user?.isAdmin)
            return res.status(403).json({ message: "Admin only" });
        const parsedCount = Number(req.body?.count);
        if (!Number.isInteger(parsedCount) || parsedCount < 1 || parsedCount > 100) {
            return res.status(400).json({ message: "Count must be an integer between 1 and 100" });
        }
        const created = [];
        for (let i = 0; i < parsedCount; i += 1) {
            const code = await generateUniqueCode();
            const qr = await QRCode_1.default.create({ code });
            created.push(qr);
        }
        res.status(201).json({
            success: true,
            count: created.length,
            qrs: created
        });
    }
    catch (err) {
        console.error("createBulkQRs error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.createBulkQRs = createBulkQRs;
/*----------------------------------------
  ADMIN — Create QR For User
----------------------------------------*/
const createQRForUser = async (req, res) => {
    try {
        if (!req.user?.isAdmin)
            return res.status(403).json({ message: "Admin only" });
        const { userId } = req.params;
        const code = await generateUniqueCode();
        const qr = await QRCode_1.default.create({ code, userId });
        res.json({ message: "QR created and linked", qr });
    }
    catch (err) {
        console.error("createQRForUser error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.createQRForUser = createQRForUser;
/*----------------------------------------
  ADMIN — Link Existing QR
----------------------------------------*/
const linkExistingQRToUser = async (req, res) => {
    try {
        if (!req.user?.isAdmin)
            return res.status(403).json({ message: "Admin only" });
        const { userId } = req.params;
        const { code } = req.body;
        const qr = await QRCode_1.default.findOne({ code });
        if (!qr)
            return res.status(404).json({ message: "QR not found" });
        if (qr.userId)
            return res.status(409).json({ message: "QR already linked" });
        qr.userId = userId;
        await qr.save();
        res.json({ message: "QR linked", qr });
    }
    catch (err) {
        console.error("linkExistingQRToUser error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.linkExistingQRToUser = linkExistingQRToUser;
