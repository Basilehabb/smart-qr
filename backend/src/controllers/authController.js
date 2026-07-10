"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.getMe = exports.createAdminIfNotExists = exports.login = exports.registerAndLinkQr = exports.getDefaultPlan = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const userService_1 = require("../services/userService");
const planService_1 = require("../services/planService");
const Plan = require("../models/Plan").default;
const postgres_1 = require("../db/postgres");
const crypto = require("crypto");
const INTERNAL_EMAIL_DOMAIN = "phone.smartqr.local";
/*----------------------------------------
  TOKEN GENERATOR
----------------------------------------*/
const generateToken = (user) => {
    return jsonwebtoken_1.default.sign({
        id: user._id,
        isAdmin: user.isAdmin,
        email: user.email
    }, process.env.JWT_SECRET, { expiresIn: "7d" });
};
const normalizePhone = (value) => String(value || "").replace(/\D/g, "");
const buildInternalEmail = (phone) => `${normalizePhone(phone)}@${INTERNAL_EMAIL_DOMAIN}`;
const isInternalEmail = (email) => String(email || "").endsWith(`@${INTERNAL_EMAIL_DOMAIN}`);
const publicEmail = (email) => (isInternalEmail(email) ? "" : String(email || ""));
const serializeUser = async (userDoc) => {
    const userObj = userDoc.toObject();
    userObj.profile = formatProfileFromDoc(userDoc);
    const plan = await (0, planService_1.getPlanForUser)(userDoc._id || userDoc.id);
    userObj.plan = plan
        ? { key: plan.key, name: plan.name, features: plan.features }
        : null;
    delete userObj.passwordHash;
    userObj.email = publicEmail(userObj.email);
    return userObj;
};
/*----------------------------------------
  ⭐ PROFILE FORMATTER (array → object)
----------------------------------------*/
function formatProfileFromDoc(userDoc) {
    const formatted = {};
    const sections = ["contact", "social", "payment", "video", "music", "design", "gaming", "other"];
    sections.forEach((section) => {
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
function normalizeProfileForStorage(profile) {
    const normalized = {};
    const sections = ["contact", "social", "payment", "video", "music", "design", "gaming", "other"];
    for (const section of sections) {
        const values = profile?.[section];
        const entries = [];
        if (values && typeof values === "object") {
            for (const [key, value] of Object.entries(values)) {
                if (value !== undefined && value !== null && String(value).trim() !== "") {
                    entries.push({ key: String(key), value: String(value) });
                }
            }
        }
        normalized[section] = entries;
    }
    return normalized;
}
const publicPlan = (plan) => ({ key: plan.key, name: plan.name, features: plan.features || {} });
/*----------------------------------------
  REGISTER
----------------------------------------*/
const register = async (req, res) => {
    try {
        const { name, email, password, phone, job, avatar } = req.body;
        const normalizedPhone = normalizePhone(phone);
        if (!name || !password || !normalizedPhone) {
            return res.status(400).json({ message: "Name, phone, and password are required" });
        }
        const existingByPhone = await User_1.default.findOne({ phone: normalizedPhone });
        if (existingByPhone)
            return res.status(400).json({ message: "User already exists" });
        const trimmedEmail = String(email || "").trim();
        if (trimmedEmail) {
            const existingByEmail = await User_1.default.findOne({ email: trimmedEmail });
            if (existingByEmail)
                return res.status(400).json({ message: "Email already exists" });
        }
        const user = await (0, userService_1.createUserService)({
            name,
            email: trimmedEmail || buildInternalEmail(normalizedPhone),
            password,
            phone: normalizedPhone,
            job,
            avatar,
            isAdmin: false
        });
        const token = generateToken(user);
        const userObj = await serializeUser(user);
        return res.status(201).json({
            message: "User registered",
            token,
            user: {
                id: userObj._id,
                name: userObj.name,
                email: userObj.email,
                phone: userObj.phone,
                job: userObj.job,
                avatar: userObj.avatar,
                isAdmin: userObj.isAdmin,
                profile: userObj.profile,
                plan: userObj.plan
            }
        });
    }
    catch (err) {
        console.error("register error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};
exports.register = register;
/*----------------------------------------
  DEFAULT REGISTRATION PLAN
----------------------------------------*/
const getDefaultPlan = async (_req, res) => {
    try {
        const plan = await Plan.getDefault();
        if (!plan) {
            return res.status(503).json({ message: "No active default plan is available" });
        }
        return res.json({ plan: publicPlan(plan) });
    }
    catch (err) {
        console.error("getDefaultPlan error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};
exports.getDefaultPlan = getDefaultPlan;
/*----------------------------------------
  ATOMIC REGISTER + OPTIONAL QR LINK
----------------------------------------*/
const registerAndLinkQr = async (req, res) => {
    let client;
    try {
        const { name, email, password, phone, job, countryCode, profile, code } = req.body || {};
        const normalizedPhone = normalizePhone(phone);
        const trimmedName = String(name || "").trim();
        const trimmedEmail = String(email || "").trim();
        const rawPassword = String(password || "");
        const qrCode = String(code || "").trim();
        const incomingProfile = profile && typeof profile === "object" ? profile : {};
        if (!trimmedName || !rawPassword || !normalizedPhone) {
            return res.status(400).json({ message: "Name, phone, and password are required" });
        }
        client = await postgres_1.pool.connect();
        await client.query("BEGIN");
        const planResult = await client.query(
            "SELECT * FROM plans WHERE is_default = TRUE AND is_active = TRUE LIMIT 1 FOR UPDATE"
        );
        const planRow = planResult.rows[0];
        if (!planRow) {
            await client.query("ROLLBACK");
            return res.status(503).json({ message: "No active default plan is available" });
        }
        const plan = {
            id: planRow.id,
            key: planRow.key,
            name: planRow.name,
            features: typeof planRow.features === "string" ? JSON.parse(planRow.features) : (planRow.features || {}),
        };
        const restriction = (0, planService_1.validateProfileAgainstPlan)(plan, incomingProfile, {});
        if (restriction) {
            await client.query("ROLLBACK");
            return res.status(403).json({ code: "UPGRADE_REQUIRED", feature: restriction.feature });
        }
        const finalEmail = trimmedEmail || buildInternalEmail(normalizedPhone);
        const [phoneOwner, emailOwner] = await Promise.all([
            client.query("SELECT id FROM users WHERE phone = $1 LIMIT 1", [normalizedPhone]),
            client.query("SELECT id FROM users WHERE email = $1 LIMIT 1", [finalEmail]),
        ]);
        if (phoneOwner.rows[0]) {
            await client.query("ROLLBACK");
            return res.status(409).json({ message: "Phone already exists" });
        }
        if (emailOwner.rows[0]) {
            await client.query("ROLLBACK");
            return res.status(409).json({ message: "Email already exists" });
        }
        let qrId = null;
        if (qrCode) {
            const qrResult = await client.query(
                "SELECT id, user_id FROM qr_codes WHERE code = $1 LIMIT 1 FOR UPDATE",
                [qrCode]
            );
            const qr = qrResult.rows[0];
            if (!qr) {
                await client.query("ROLLBACK");
                return res.status(404).json({ message: "QR not found" });
            }
            if (qr.user_id) {
                await client.query("ROLLBACK");
                return res.status(409).json({ status: "already_linked", message: "QR already linked" });
            }
            qrId = qr.id;
        }
        const userId = crypto.randomUUID();
        const passwordHash = await bcryptjs_1.default.hash(rawPassword, 10);
        const storedProfile = normalizeProfileForStorage(incomingProfile);
        await client.query(
            `INSERT INTO users (
              id, name, email, phone, country_code, job, password_hash, avatar,
              avatar_public_id, is_admin, profile, plan_id, created_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())`,
            [
                userId,
                trimmedName,
                finalEmail,
                normalizedPhone,
                countryCode || "+20",
                job || "",
                passwordHash,
                "",
                "",
                false,
                JSON.stringify(storedProfile),
                plan.id,
            ]
        );
        if (qrId) {
            const linked = await client.query(
                "UPDATE qr_codes SET user_id = $2, updated_at = NOW() WHERE id = $1 AND user_id IS NULL RETURNING id",
                [qrId, userId]
            );
            if (!linked.rows[0]) {
                throw new Error("QR_LINK_FAILED");
            }
        }
        await client.query("COMMIT");
        const user = {
            _id: userId,
            name: trimmedName,
            email: finalEmail,
            phone: normalizedPhone,
            countryCode: countryCode || "+20",
            job: job || "",
            avatar: "",
            isAdmin: false,
            profile: storedProfile,
        };
        const token = generateToken(user);
        return res.status(201).json({
            message: qrCode ? "Account created and QR linked" : "Account created",
            token,
            user: {
                id: userId,
                name: user.name,
                email: publicEmail(user.email),
                phone: user.phone,
                job: user.job,
                avatar: user.avatar,
                isAdmin: false,
                profile: formatProfileFromDoc(user),
                plan: publicPlan(plan),
            },
            ...(qrCode ? { code: qrCode } : {}),
        });
    }
    catch (err) {
        if (client) {
            await client.query("ROLLBACK").catch(() => undefined);
        }
        console.error("registerAndLinkQr error:", err);
        if (err?.code === "23505") {
            return res.status(409).json({ message: "Phone or email already exists" });
        }
        return res.status(500).json({ message: "Could not create account" });
    }
    finally {
        client?.release();
    }
};
exports.registerAndLinkQr = registerAndLinkQr;
/*----------------------------------------
  LOGIN
----------------------------------------*/
const login = async (req, res) => {
    try {
        const { phone, email, password } = req.body;
        const rawIdentifier = String(phone || email || "").trim();
        if (!rawIdentifier || !password) {
            return res.status(400).json({ message: "Phone and password are required" });
        }
        const user = rawIdentifier.includes("@")
            ? await User_1.default.findOne({ email: rawIdentifier })
            : await User_1.default.findOne({ phone: normalizePhone(rawIdentifier) });
        if (!user)
            return res.status(404).json({ message: "User not found" });
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash || "");
        if (!isMatch)
            return res.status(400).json({ message: "Invalid credentials" });
        const token = generateToken(user);
        const userObj = await serializeUser(user);
        res.json({
            message: "Login successful",
            token,
            user: {
                id: userObj._id,
                name: userObj.name,
                email: userObj.email,
                phone: userObj.phone,
                avatar: userObj.avatar,
                isAdmin: userObj.isAdmin,
                profile: userObj.profile,
                plan: userObj.plan
            }
        });
    }
    catch (error) {
        console.error("login error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.login = login;
/*----------------------------------------
  ADMIN CREATION
----------------------------------------*/
const createAdminIfNotExists = async (req, res) => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;
        const existingAdmin = await User_1.default.findOne({ email: adminEmail });
        if (existingAdmin)
            return res.json({ message: "Admin already exists" });
        const hashed = await bcryptjs_1.default.hash(adminPassword, 10);
        const admin = await User_1.default.create({
            name: "Admin",
            email: adminEmail,
            passwordHash: hashed,
            isAdmin: true,
            avatar: "",
            profile: {
                contact: [],
                social: [],
                payment: [],
                video: [],
                music: [],
                design: [],
                gaming: [],
                other: []
            }
        });
        const adminObj = await serializeUser(admin);
        res.json({ message: "Admin created", admin: adminObj });
    }
    catch (err) {
        console.error("createAdminIfNotExists error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.createAdminIfNotExists = createAdminIfNotExists;
/*----------------------------------------
  GET ME
----------------------------------------*/
const getMe = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user.id);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        const userObj = await serializeUser(user);
        res.json({ user: userObj });
    }
    catch (error) {
        console.error("getMe error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getMe = getMe;
/*----------------------------------------
  ⭐⭐⭐ UPDATE PROFILE (يحفظ الترتيب)
----------------------------------------*/
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = req.body;
        const user = await User_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        if (data.profile && typeof data.profile === "object") {
            const restriction = await (0, planService_1.validateProfileForPlan)(user, data.profile);
            if (restriction) {
                return res.status(403).json({ code: "UPGRADE_REQUIRED", feature: restriction.feature });
            }
        }
        const nextPhone = data.phone !== undefined ? normalizePhone(data.phone) : user.phone;
        if (data.phone !== undefined && !nextPhone) {
            return res.status(400).json({ message: "Phone is required" });
        }
        if (data.phone !== undefined && nextPhone !== user.phone) {
            const phoneOwner = await User_1.default.findOne({ phone: nextPhone });
            if (phoneOwner && phoneOwner._id !== user._id) {
                return res.status(409).json({ message: "Phone already exists" });
            }
        }
        if (data.email !== undefined) {
            const trimmedEmail = String(data.email || "").trim();
            if (trimmedEmail) {
                const emailOwner = await User_1.default.findOne({ email: trimmedEmail });
                if (emailOwner && emailOwner._id !== user._id) {
                    return res.status(409).json({ message: "Email already exists" });
                }
            }
        }
        // Update basic fields
        const allowed = ["name", "email", "phone", "job", "avatar", "countryCode"];
        allowed.forEach((key) => {
            if (data[key] !== undefined) {
                if (key === "phone") {
                    user.phone = nextPhone;
                    return;
                }
                if (key === "email") {
                    const trimmedEmail = String(data.email || "").trim();
                    user.email = trimmedEmail || buildInternalEmail(nextPhone || user.phone);
                    return;
                }
                user[key] = data[key];
            }
        });
        if (data.phone !== undefined && data.email === undefined && isInternalEmail(user.email)) {
            user.email = buildInternalEmail(nextPhone || user.phone);
        }
        // Update password
        if (data.password) {
            const hashed = await bcryptjs_1.default.hash(data.password, 10);
            user.passwordHash = hashed;
        }
        // ⭐⭐⭐ Update profile sections - PRESERVE ORDER
        if (data.profile && typeof data.profile === "object") {
            if (!user.profile)
                user.profile = {};
            const sections = ["contact", "social", "payment", "video", "music", "design", "gaming", "other"];
            for (const section of sections) {
                const incomingObj = data.profile[section];
                if (!incomingObj || typeof incomingObj !== "object")
                    continue;
                // ⭐ Convert object → array (preserve exact order from frontend)
                const newArray = [];
                // IMPORTANT: Object.entries preserves the order as sent from frontend
                for (const [key, value] of Object.entries(incomingObj)) {
                    // Skip null/empty values (marked for deletion)
                    if (value === null || value === "")
                        continue;
                    newArray.push({
                        key: key,
                        value: String(value)
                    });
                }
                // ⭐ Save as array (order is now preserved!)
                user.profile[section] = newArray;
            }
            user.markModified("profile");
        }
        await user.save();
        // Return formatted response
        const userObj = await serializeUser(user);
        return res.json({ message: "Profile updated", user: userObj });
    }
    catch (err) {
        console.error("updateProfile error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.updateProfile = updateProfile;
