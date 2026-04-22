"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAdmin = exports.verifyToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
/**
 * ================================
 * 🔐 verifyToken → Anyone logged in
 * ================================
 */
const verifyToken = async (req, res, next) => {
    try {
        const header = req.headers.authorization;
        if (!header) {
            return res.status(401).json({ message: "No token provided" });
        }
        const token = header.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "Invalid token format" });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = await User_1.default.findById(decoded.id).select("-passwordHash");
        if (!user) {
            return res.status(401).json({ message: "Invalid or expired token" });
        }
        req.user = user;
        next();
    }
    catch (err) {
        console.error("verifyToken error:", err);
        return res.status(401).json({ message: "Unauthorized" });
    }
};
exports.verifyToken = verifyToken;
/**
 * ================================
 * 👑 verifyAdmin → Admin only
 * ================================
 */
const verifyAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Admin only" });
    }
    next();
};
exports.verifyAdmin = verifyAdmin;
