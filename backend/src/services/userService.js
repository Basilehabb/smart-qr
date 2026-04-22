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
    // 1️⃣ Check email uniqueness
    const existing = await User_1.default.findOne({ email });
    if (existing) {
        throw new Error("EMAIL_EXISTS");
    }
    // 2️⃣ Hash password
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    // 3️⃣ Create user
    const user = await User_1.default.create({
        name,
        email,
        phone,
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
