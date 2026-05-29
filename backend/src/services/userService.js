"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserService = void 0;
const User_1 = __importDefault(require("../models/User"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
/**
 * ================================
 * Default Empty Profile
 * ================================
 */
const defaultProfile = {
    contact: [],
    social: [],
    payment: [],
    video: [],
    music: [],
    design: [],
    gaming: [],
    other: []
};
/**
 * ================================
 * CREATE USER (Single Source of Truth)
 * ================================
 */
const createUserService = async (data) => {
    const { name, email, password, phone = "", countryCode = "+20", job = "", avatar = "", isAdmin = false, profile } = data;
    const normalizedEmail = String(email || "").trim();
    const normalizedPhone = String(phone || "").replace(/\D/g, "");
    // 1️⃣ Check phone uniqueness
    if (normalizedPhone) {
        const existingByPhone = await User_1.default.findOne({ phone: normalizedPhone });
        if (existingByPhone) {
            throw new Error("PHONE_EXISTS");
        }
    }
    // 2️⃣ Check email uniqueness
    if (normalizedEmail) {
        const existing = await User_1.default.findOne({ email: normalizedEmail });
        if (existing) {
            throw new Error("EMAIL_EXISTS");
        }
    }
    // 3️⃣ Hash password
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    // 4️⃣ Create user
    const user = await User_1.default.create({
        name,
        email: normalizedEmail,
        phone: normalizedPhone,
        countryCode,
        job,
        avatar,
        passwordHash,
        isAdmin,
        // ⭐ profile: from input OR default
        profile: profile ?? defaultProfile
    });
    return user;
};
exports.createUserService = createUserService;
