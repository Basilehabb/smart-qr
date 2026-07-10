"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.getMe = exports.createAdminIfNotExists = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const userService_1 = require("../services/userService");
const planService_1 = require("../services/planService");
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
