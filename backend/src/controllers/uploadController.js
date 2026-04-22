"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAvatar = void 0;
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const streamifier_1 = __importDefault(require("streamifier"));
const User_1 = __importDefault(require("../models/User"));
const uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        const userId = req.user.id; // ✅ جاي من verifyToken
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const uploadStream = cloudinary_1.default.uploader.upload_stream({
            folder: "avatars",
            resource_type: "image",
        }, async (error, result) => {
            if (error) {
                console.error("Cloudinary upload error:", error);
                return res.status(500).json({ message: "Upload failed" });
            }
            if (!result?.secure_url) {
                return res
                    .status(500)
                    .json({ message: "Could not determine uploaded file URL" });
            }
            // ⭐⭐ السطرين اللي كانوا ناقصين ⭐⭐
            user.avatar = result.secure_url;
            await user.save();
            return res.json({
                message: "Avatar uploaded and saved",
                url: result.secure_url,
            });
        });
        streamifier_1.default.createReadStream(req.file.buffer).pipe(uploadStream);
    }
    catch (err) {
        console.error("uploadAvatar error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};
exports.uploadAvatar = uploadAvatar;
