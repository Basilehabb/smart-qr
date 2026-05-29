"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkUploadUserAvatars = exports.uploadUserAvatarAdmin = exports.resetPassword = exports.scanAnalytics = exports.deleteQR = exports.unlinkQR = exports.listQRs = exports.deleteUser = exports.updateUserProfileAdmin = exports.updateUser = exports.getUser = exports.createUser = exports.listUsers = exports.getOverview = exports.downloadTemplate = exports.bulkUploadUsers = void 0;
const User_1 = __importDefault(require("../models/User"));
const QRCode_1 = __importDefault(require("../models/QRCode"));
const ScanLog_1 = __importDefault(require("../models/ScanLog"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const XLSX = __importStar(require("xlsx"));
const userService_1 = require("../services/userService");
const INTERNAL_EMAIL_DOMAIN = "phone.smartqr.local";
/* =====================
   LINK NORMALIZER (USED IN BULK UPLOAD)
===================== */
function normalizeLink(type, value) {
    if (!value)
        return "";
    const baseType = String(type || "").split("__")[0];
    const v = String(value).trim();
    if (v.startsWith("http://") ||
        v.startsWith("https://") ||
        v.startsWith("tel:") ||
        v.startsWith("mailto:")) {
        return v;
    }
    switch (baseType) {
        case "facebook":
            return `https://www.facebook.com/${v.replace(/^@/, "")}/`;
        case "instagram":
            return `https://www.instagram.com/${v.replace(/^@/, "")}`;
        case "x":
            return `https://x.com/${v.replace(/^@/, "")}`;
        case "threads":
            return `https://www.threads.net/@${v.replace(/^@/, "")}`;
        case "linkedin":
            return `https://www.linkedin.com/in/${v.replace(/^@/, "")}`;
        case "tiktok":
            return `https://www.tiktok.com/@${v.replace(/^@/, "")}`;
        case "youtube":
            return `https://www.youtube.com/@${v.replace(/^@/, "")}`;
        case "snapchat":
            return `https://www.snapchat.com/add/${v.replace(/^@/, "")}`;
        case "whatsapp": {
            const num = v.replace(/\D/g, "").replace(/^0/, "20");
            return `https://wa.me/${num}`;
        }
        case "phone": {
            const num = v.replace(/\D/g, "").replace(/^0/, "20");
            return `tel:+${num}`;
        }
        case "email":
            return `mailto:${v}`;
        case "website":
        case "other":
            return v.startsWith("http") ? v : `https://${v}`;
        case "paypal":
            return `https://paypal.me/${v}`;
        case "instapay":
            return v.includes("@") ? "https://www.instapay.eg/" : (v.startsWith("http") ? v : `https://${v}`);
        default:
            return v;
    }
}
const splitMultiValues = (value) => String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
const getNextProfileKey = (target, baseKey) => {
    const count = Object.keys(target).filter((key) => key.split("__")[0] === baseKey).length;
    return count === 0 ? baseKey : `${baseKey}__${count + 1}`;
};
const appendProfileValues = (target, baseKey, rawValue) => {
    splitMultiValues(rawValue).forEach((item) => {
        const key = getNextProfileKey(target, baseKey);
        target[key] = normalizeLink(baseKey, item);
    });
};
/* ======================================================
   HELPER: Format Profile (Array → Object)
====================================================== */
function formatProfile(userDoc) {
    const formatted = {};
    const sections = ["contact", "social", "payment", "video", "music", "design", "gaming", "other"];
    sections.forEach(section => {
        const value = userDoc?.profile?.[section];
        if (!value) {
            formatted[section] = {};
            return;
        }
        if (Array.isArray(value)) {
            const obj = {};
            value.forEach((item) => {
                if (item?.key && item?.value !== undefined && item?.value !== null) {
                    obj[item.key] = String(item.value);
                }
            });
            formatted[section] = obj;
            return;
        }
        if (typeof value === "object") {
            const obj = {};
            Object.entries(value).forEach(([key, entryValue]) => {
                if (entryValue !== undefined && entryValue !== null && String(entryValue).trim() !== "") {
                    obj[key] = String(entryValue);
                }
            });
            formatted[section] = obj;
            return;
        }
        formatted[section] = {};
    });
    return formatted;
}
const normalizePhone = (value) => String(value || "").replace(/\D/g, "");
const buildInternalEmail = (phone) => `${normalizePhone(phone)}@${INTERNAL_EMAIL_DOMAIN}`;
const isInternalEmail = (email) => String(email || "").endsWith(`@${INTERNAL_EMAIL_DOMAIN}`);
const publicEmail = (email) => isInternalEmail(email) ? "" : String(email || "");
const serializeAdminUser = (userDoc) => {
    const userObj = typeof userDoc?.toObject === "function" ? userDoc.toObject() : { ...userDoc };
    userObj.profile = formatProfile(userDoc);
    userObj.email = publicEmail(userObj.email);
    userObj.loginPhone = userObj.phone || "";
    delete userObj.passwordHash;
    return userObj;
};
/* ======================================================
   1) BULK UPLOAD USERS
====================================================== */
const bulkUploadUsers = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);
        if (!data || data.length === 0) {
            return res.status(400).json({ message: "Excel file is empty" });
        }
        const results = {
            total: data.length,
            success: [],
            errors: [],
        };
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            try {
                if (!row.name || !row.phone) {
                    results.errors.push({
                        row: i + 2,
                        error: "Missing required fields (name, phone)",
                        data: row
                    });
                    continue;
                }
                const normalizedPhone = normalizePhone(row.phone);
                const existing = await User_1.default.findOne({ phone: normalizedPhone });
                if (existing) {
                    results.errors.push({
                        row: i + 2,
                        error: "Phone already exists",
                        data: row
                    });
                    continue;
                }
                const password = row.password !== undefined && row.password !== null
                    ? String(row.password)
                    : crypto_1.default.randomBytes(4).toString("hex");
                const passwordHash = await bcryptjs_1.default.hash(password, 10);
                const user = await (0, userService_1.createUserService)({
                    name: row.name,
                    email: row.email,
                    password,
                    phone: row.phone,
                    job: row.job,
                    avatar: row.avatar
                });
                /* =====================
           BUILD PROFILE FROM EXCEL
                  ===================== */
                const profile = {
                    social: {},
                    contact: {},
                    payment: {},
                    video: {},
                    other: {}
                };
                appendProfileValues(profile.social, "instagram", row.instagram);
                appendProfileValues(profile.social, "facebook", row.facebook);
                appendProfileValues(profile.social, "x", row.x);
                appendProfileValues(profile.social, "threads", row.threads);
                appendProfileValues(profile.social, "linkedin", row.linkedin);
                appendProfileValues(profile.social, "tiktok", row.tiktok);
                appendProfileValues(profile.social, "snapchat", row.snapchat);
                appendProfileValues(profile.video, "youtube", row.youtube);
                appendProfileValues(profile.contact, "whatsapp", row.whatsapp);
                appendProfileValues(profile.contact, "email", row.publicEmail);
                appendProfileValues(profile.contact, "phone", row.phoneLink);
                appendProfileValues(profile.payment, "paypal", row.paypal);
                appendProfileValues(profile.payment, "instapay", row.instapay);
                appendProfileValues(profile.other, "website", row.website);
                appendProfileValues(profile.other, "other", row.other);
                if (Object.values(profile).some((sec) => Object.keys(sec).length > 0)) {
                    await User_1.default.findByIdAndUpdate(user._id, {
                        profile: {
                            social: Object.entries(profile.social).map(([k, v]) => ({ key: k, value: v })),
                            contact: Object.entries(profile.contact).map(([k, v]) => ({ key: k, value: v })),
                            payment: Object.entries(profile.payment).map(([k, v]) => ({ key: k, value: v })),
                            video: Object.entries(profile.video).map(([k, v]) => ({ key: k, value: v })),
                            other: Object.entries(profile.other).map(([k, v]) => ({ key: k, value: v })),
                        }
                    });
                }
                let qr;
                if (row.qrCode) {
                    qr = await QRCode_1.default.findOne({ code: row.qrCode });
                    if (qr) {
                        if (qr.userId) {
                            results.errors.push({
                                row: i + 2,
                                error: `QR ${row.qrCode} already linked`,
                                data: row
                            });
                            await User_1.default.findByIdAndDelete(user._id);
                            continue;
                        }
                        qr.userId = user._id;
                        await qr.save();
                    }
                    else {
                        qr = await QRCode_1.default.create({
                            code: row.qrCode,
                            userId: user._id
                        });
                    }
                }
                else {
                    const code = crypto_1.default.randomBytes(5).toString("hex").toUpperCase();
                    qr = await QRCode_1.default.create({ code, userId: user._id });
                }
                results.success.push({
                    row: i + 2,
                    user: { id: user._id, name: user.name, email: publicEmail(user.email), phone: user.phone, password },
                    qrCode: qr.code
                });
            }
            catch (e) {
                results.errors.push({
                    row: i + 2,
                    error: e.message,
                    data: row
                });
            }
        }
        return res.json({
            message: "Bulk upload complete",
            results
        });
    }
    catch (error) {
        console.error("bulkUploadUsers error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
exports.bulkUploadUsers = bulkUploadUsers;
/* ======================================================
   2) DOWNLOAD TEMPLATE
====================================================== */
const downloadTemplate = async (req, res) => {
    try {
        const template = [
            {
                name: "John Doe",
                email: "john@example.com",
                phone: "01234567890",
                job: "Engineer",
                password: "",
                qrCode: "",
                instagram: "john_doe,john.doe.shop",
                facebook: "john.doe,john.doe.page",
                x: "johnx",
                threads: "johnthreads",
                linkedin: "john-doe",
                tiktok: "",
                youtube: "johnchannel,secondchannel",
                snapchat: "johnsnap",
                whatsapp: "01234567890,01022223333",
                publicEmail: "contact@example.com,sales@example.com",
                phoneLink: "01234567890,01022223333",
                paypal: "",
                instapay: "name@instapay",
                website: "example.com,store.example.com",
                other: "https://wuzzuf.net/,https://trello.com/"
            }
        ];
        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Users");
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=users_template.xlsx");
        res.send(buffer);
    }
    catch (err) {
        console.error("downloadTemplate error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.downloadTemplate = downloadTemplate;
/* ======================================================
   3) OVERVIEW
====================================================== */
const getOverview = async (req, res) => {
    try {
        res.json({
            totalUsers: await User_1.default.countDocuments(),
            totalQRs: await QRCode_1.default.countDocuments(),
            linkedQRs: await QRCode_1.default.countDocuments({ userId: { $ne: null } }),
            totalScans: await ScanLog_1.default.countDocuments(),
        });
    }
    catch {
        res.status(500).json({ message: "Server error" });
    }
};
exports.getOverview = getOverview;
/* ======================================================
   4) USERS LIST (WITH FORMATTED PROFILE)
====================================================== */
const listUsers = async (req, res) => {
    try {
        // Parse query params
        const { search, isAdmin, hasQR, job, phoneExists, createdFrom, createdTo, sort, } = req.query;
        const page = Math.max(1, parseInt(req.query.page || "1")) || 1;
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || "20"))) || 20;
        // Build Mongo filter
        const filter = {};
        if (search && String(search).trim()) {
            const s = String(search).trim();
            filter.$or = [
                { name: { $regex: s, $options: "i" } },
                { email: { $regex: s, $options: "i" } },
                { phone: { $regex: s, $options: "i" } },
                { job: { $regex: s, $options: "i" } },
            ];
        }
        if (isAdmin === "true")
            filter.isAdmin = true;
        else if (isAdmin === "false")
            filter.isAdmin = false;
        if (job && String(job).trim())
            filter.job = String(job).trim();
        if (phoneExists === "true")
            filter.phone = { $exists: true, $ne: "" };
        else if (phoneExists === "false")
            filter.$or = (filter.$or || []).concat([{ phone: "" }, { phone: { $exists: false } }]);
        // createdAt range
        if (createdFrom || createdTo) {
            filter.createdAt = {};
            if (createdFrom)
                filter.createdAt.$gte = new Date(String(createdFrom));
            if (createdTo) {
                const d = new Date(String(createdTo));
                // include end of day if user passed date-only
                d.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = d;
            }
        }
        // Count total (for pagination) — apply same filter
        const total = await User_1.default.countDocuments(filter);
        // Sorting
        let sortObj = { createdAt: -1 };
        switch (sort) {
            case "oldest":
                sortObj = { createdAt: 1 };
                break;
            case "name_asc":
                sortObj = { name: 1 };
                break;
            case "name_desc":
                sortObj = { name: -1 };
                break;
            case "email_asc":
                sortObj = { email: 1 };
                break;
            case "email_desc":
                sortObj = { email: -1 };
                break;
            default:
                sortObj = { createdAt: -1 };
        }
        // Fetch users with pagination
        const users = await User_1.default.find(filter)
            .select("-passwordHash")
            .sort(sortObj)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        // If hasQR filter applied, we need to filter by QR join
        let qrs = [];
        if (hasQR === "true" || hasQR === "false") {
            qrs = await QRCode_1.default.find({ userId: { $ne: null } }).lean();
        }
        else {
            qrs = await QRCode_1.default.find().lean();
        }
        // Enrich users with qrCount and format profile
        const enriched = users.map((u) => {
            const qrCount = qrs.filter((q) => q.userId && String(q.userId) === String(u._id)).length;
            const out = serializeAdminUser(u);
            out.qrCount = qrCount;
            return out;
        });
        // If hasQR filter true => keep only users with qrCount > 0
        let final = enriched;
        if (hasQR === "true")
            final = enriched.filter((x) => x.qrCount > 0);
        else if (hasQR === "false")
            final = enriched.filter((x) => x.qrCount === 0);
        // Note: if we filtered by hasQR after pagination it could shrink page size — better approach would be aggregation; this is simple and acceptable for moderate dataset.
        return res.json({
            users: final,
            meta: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit) || 1,
            },
        });
    }
    catch (err) {
        console.error("listUsers error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.listUsers = listUsers;
/* ======================================================
   5) CREATE USER
====================================================== */
const createUser = async (req, res) => {
    try {
        const { name, email, phone, job, password } = req.body;
        if (!name || !phone || !password)
            return res.status(400).json({ message: "Missing fields" });
        if (await User_1.default.findOne({ phone: normalizePhone(phone) }))
            return res.status(409).json({ message: "Phone exists" });
        if (email && await User_1.default.findOne({ email }))
            return res.status(409).json({ message: "Email exists" });
        const user = await (0, userService_1.createUserService)({
            name,
            email: String(email || "").trim() || buildInternalEmail(phone),
            password,
            phone,
            job,
            isAdmin: true
        });
        const userObj = serializeAdminUser(user);
        return res.json({ user: userObj });
    }
    catch (err) {
        console.error("createUser error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.createUser = createUser;
/* ======================================================
   6) GET USER (WITH PROFILE + LINKED QR CODES)
====================================================== */
const getUser = async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await User_1.default.findById(userId).select("-passwordHash");
        if (!user)
            return res.status(404).json({ message: "User not found" });
        // ⭐ Get all QR codes linked to this user
        const qrCodes = await QRCode_1.default.find({ userId }).select("code createdAt");
        // ⭐ Format profile correctly
        const userObj = serializeAdminUser(user);
        // ⭐ Include linked QR codes in response
        userObj.qrCodes = qrCodes;
        return res.json({ user: userObj });
    }
    catch (err) {
        console.error("getUser error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getUser = getUser;
/* ======================================================
   7) UPDATE USER (BASIC FIELDS ONLY - NO PROFILE)
====================================================== */
const updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const data = req.body;
        const user = await User_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        // Basic fields only
        const editable = ["name", "email", "phone", "job", "avatar", "isAdmin"];
        editable.forEach((field) => {
            if (data[field] !== undefined) {
                if (field === "phone") {
                    user.phone = normalizePhone(data.phone);
                    return;
                }
                if (field === "email") {
                    const nextPhone = normalizePhone(data.phone !== undefined ? data.phone : user.phone);
                    user.email = String(data.email || "").trim() || buildInternalEmail(nextPhone || user.phone);
                    return;
                }
                user[field] = data[field];
            }
        });
        if (data.password) {
            user.passwordHash = await bcryptjs_1.default.hash(String(data.password), 10);
        }
        await user.save();
        const userObj = serializeAdminUser(user);
        return res.json({ user: userObj });
    }
    catch (err) {
        console.error("updateUser error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.updateUser = updateUser;
/* ======================================================
   8) UPDATE USER PROFILE (ADMIN VERSION)
   ⭐ Converts object → array & preserves order
====================================================== */
const updateUserProfileAdmin = async (req, res) => {
    try {
        const { userId } = req.params;
        const data = req.body;
        const user = await User_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        // Update basic fields
        const editable = ["name", "email", "phone", "job", "avatar", "countryCode", "isAdmin"];
        editable.forEach(k => {
            if (data[k] !== undefined) {
                if (k === "phone") {
                    user.phone = normalizePhone(data.phone);
                    return;
                }
                if (k === "email") {
                    const nextPhone = normalizePhone(data.phone !== undefined ? data.phone : user.phone);
                    user.email = String(data.email || "").trim() || buildInternalEmail(nextPhone || user.phone);
                    return;
                }
                user[k] = data[k];
            }
        });
        if (data.password) {
            user.passwordHash = await bcryptjs_1.default.hash(String(data.password), 10);
        }
        // Update profile sections (object → array)
        if (data.profile && typeof data.profile === "object") {
            const sections = ["contact", "social", "payment", "video", "music", "design", "gaming", "other"];
            for (const section of sections) {
                const incoming = data.profile[section];
                if (incoming && typeof incoming === "object") {
                    const arr = [];
                    for (const [key, value] of Object.entries(incoming)) {
                        if (value !== null && value !== "") {
                            arr.push({ key, value: String(value) });
                        }
                    }
                    user.profile[section] = arr;
                }
            }
            user.markModified("profile");
        }
        await user.save();
        const userObj = serializeAdminUser(user);
        return res.json({ user: userObj });
    }
    catch (err) {
        console.error("updateUserProfileAdmin error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.updateUserProfileAdmin = updateUserProfileAdmin;
/* ======================================================
   9) DELETE USER
====================================================== */
const deleteUser = async (req, res) => {
    try {
        await User_1.default.findByIdAndDelete(req.params.userId);
        await QRCode_1.default.updateMany({ userId: req.params.userId }, { userId: null });
        res.json({ message: "User deleted" });
    }
    catch {
        res.status(500).json({ message: "Server error" });
    }
};
exports.deleteUser = deleteUser;
/* ======================================================
   10) QR MANAGEMENT
====================================================== */
const listQRs = async (req, res) => {
    const qrs = await QRCode_1.default.find().populate("userId", "name email phone");
    res.json(qrs.map((qr) => {
        const out = typeof qr?.toObject === "function" ? qr.toObject() : { ...qr };
        if (out.userId) {
            out.userId.email = publicEmail(out.userId.email);
        }
        return out;
    }));
};
exports.listQRs = listQRs;
const unlinkQR = async (req, res) => {
    try {
        await QRCode_1.default.findOneAndUpdate({ code: req.params.code }, { userId: null });
        res.json({ message: "QR unlinked" });
    }
    catch {
        res.status(500).json({ message: "Server error" });
    }
};
exports.unlinkQR = unlinkQR;
const deleteQR = async (req, res) => {
    try {
        await QRCode_1.default.deleteOne({ code: req.params.code });
        res.json({ message: "QR deleted" });
    }
    catch {
        res.status(500).json({ message: "Server error" });
    }
};
exports.deleteQR = deleteQR;
/* ======================================================
   11) SCAN ANALYTICS
====================================================== */
const scanAnalytics = async (req, res) => {
    try {
        const logs = await ScanLog_1.default
            .find()
            .sort({ scannedAt: -1 })
            .limit(100);
        res.json(logs);
    }
    catch {
        res.status(500).json({ message: "Server error" });
    }
};
exports.scanAnalytics = scanAnalytics;
/* ======================================================
   12) RESET PASSWORD
====================================================== */
const resetPassword = async (req, res) => {
    try {
        const { userId } = req.params;
        const tempPassword = crypto_1.default.randomBytes(4).toString("hex");
        const passwordHash = await bcryptjs_1.default.hash(tempPassword, 10);
        await User_1.default.findByIdAndUpdate(userId, { passwordHash });
        res.json({
            success: true,
            tempPassword,
            message: "Temporary password generated"
        });
    }
    catch (err) {
        console.error("reset password error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.resetPassword = resetPassword;
// ======================================================
// 13) UPLOAD USER AVATAR (ADMIN ONLY)
// ======================================================
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const streamifier_1 = __importDefault(require("streamifier"));
const uploadUserAvatarAdmin = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        // امسح الصورة القديمة لو موجودة
        if (user.avatarPublicId) {
            await cloudinary_1.default.uploader.destroy(user.avatarPublicId);
        }
        const uploadStream = cloudinary_1.default.uploader.upload_stream({ folder: "avatars", resource_type: "image" }, async (error, result) => {
            if (error || !result) {
                return res.status(500).json({ message: "Upload failed" });
            }
            user.avatar = result.secure_url;
            user.avatarPublicId = result.public_id;
            await user.save();
            return res.json({ url: result.secure_url });
        });
        streamifier_1.default.createReadStream(req.file.buffer).pipe(uploadStream);
    }
    catch (err) {
        console.error("uploadUserAvatarAdmin error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.uploadUserAvatarAdmin = uploadUserAvatarAdmin;
/* ======================================================
   14) BULK UPLOAD USER AVATARS (ADMIN)
====================================================== */
const bulkUploadUserAvatars = async (req, res) => {
    console.log("🔥 bulkUploadUserAvatars HIT");
    console.log("files:", req.files);
    console.log("headers:", req.headers["content-type"]);
    try {
        if (!req.files || !req.files.length) {
            return res.status(400).json({ message: "No files uploaded" });
        }
        const results = {
            success: [],
            failed: [],
        };
        const uploads = req.files.map((file) => {
            return new Promise(async (resolve) => {
                const originalName = file.originalname;
                const email = originalName.replace(/\.(jpg|jpeg|png|webp)$/i, "");
                const user = await User_1.default.findOne({ email });
                if (!user) {
                    results.failed.push({
                        file: originalName,
                        error: "User not found",
                    });
                    return resolve();
                }
                const uploadStream = cloudinary_1.default.uploader.upload_stream({ folder: "avatars", resource_type: "image" }, async (error, result) => {
                    if (error || !result) {
                        results.failed.push({
                            file: originalName,
                            error: "Upload failed",
                        });
                        return resolve();
                    }
                    user.avatar = result.secure_url;
                    user.avatarPublicId = result.public_id;
                    await user.save();
                    results.success.push({
                        email,
                        avatar: result.secure_url,
                    });
                    resolve();
                });
                streamifier_1.default.createReadStream(file.buffer).pipe(uploadStream);
            });
        });
        // 🔥 استنى كل الصور تترفع
        await Promise.all(uploads);
        return res.json({
            message: "Bulk avatar upload finished",
            results,
        });
    }
    catch (err) {
        console.error("bulkUploadUserAvatars error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.bulkUploadUserAvatars = bulkUploadUserAvatars;
