import { Response } from "express";
import cloudinary from "../config/cloudinary";
import streamifier from "streamifier";
import User from "../models/User";

export const uploadAvatar = async (req: any, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const userId = req.user.id; // ✅ جاي من verifyToken

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "avatars",
        resource_type: "image",
      },
      async (error, result) => {
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
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);

  } catch (err) {
    console.error("uploadAvatar error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
