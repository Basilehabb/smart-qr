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
/*----------------------------------------
  ⭐ PROFILE FORMATTER (array → object)
----------------------------------------*/
function formatProfileFromDoc(userDoc) {
    const formatted = {};
    const sections = ["contact", "social", "payment", "video", "music", "design", "gaming", "other"];
    sections.forEach((section) => {
        const arr = userDoc?.profile?.[section];
        if (!arr || !Array.isArray(arr)) {
            formatted[section] = {};
            return;
        }
        // ⭐ Convert array to object while preserving order
        const obj = {};
        arr.forEach((item) => {
            if (item.key && item.value) {
                obj[item.key] = item.value;
            }
        });
        formatted[section] = obj;
    });
    return formatted;
}
/*----------------------------------------
  REGISTER
----------------------------------------*/
const register = async (req, res) => {
    try {
        const { name, email, password, phone, job, avatar } = req.body;
        const existing = await User_1.default.findOne({ email });
        if (existing)
            return res.status(400).json({ message: "User already exists" });
        const hashed = await bcryptjs_1.default.hash(password, 10);
        const user = await (0, userService_1.createUserService)({
            name,
            email,
            password,
            phone,
            job,
            avatar,
            isAdmin: false
        });
        const token = generateToken(user);
        const userObj = user.toObject();
        userObj.profile = formatProfileFromDoc(user);
        delete userObj.passwordHash;
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
                profile: userObj.profile
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
        const { email, password } = req.body;
        const user = await User_1.default.findOne({ email });
        if (!user)
            return res.status(404).json({ message: "User not found" });
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash || "");
        if (!isMatch)
            return res.status(400).json({ message: "Invalid credentials" });
        const token = generateToken(user);
        const userObj = user.toObject();
        userObj.profile = formatProfileFromDoc(user);
        delete userObj.passwordHash;
        res.json({
            message: "Login successful",
            token,
            user: {
                id: userObj._id,
                name: userObj.name,
                email: userObj.email,
                avatar: userObj.avatar,
                isAdmin: userObj.isAdmin,
                profile: userObj.profile
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
        const adminObj = admin.toObject();
        adminObj.profile = formatProfileFromDoc(admin);
        delete adminObj.passwordHash;
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
        const userObj = user.toObject();
        userObj.profile = formatProfileFromDoc(user);
        delete userObj.passwordHash;
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
        // Update basic fields
        const allowed = ["name", "email", "phone", "job", "avatar", "countryCode"];
        allowed.forEach((key) => {
            if (data[key] !== undefined) {
                user[key] = data[key];
            }
        });
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
        const userObj = user.toObject();
        userObj.profile = formatProfileFromDoc(user);
        delete userObj.passwordHash;
        return res.json({ message: "Profile updated", user: userObj });
    }
    catch (err) {
        console.error("updateProfile error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.updateProfile = updateProfile;
