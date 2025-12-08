import { Request, Response } from "express";
import cloudinary from "../config/cloudinary";
import streamifier from "streamifier";

export const uploadAvatar = async (req: any, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "avatars",
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return res.status(500).json({ message: "Upload failed" });
        }

        if (!result?.secure_url) {
          return res.status(500).json({ message: "Could not determine uploaded file URL" });
        }

        return res.json({ url: result.secure_url });
      }
    );

    // Important: convert buffer → stream → Cloudinary
    streamifier.createReadStream(file.buffer).pipe(uploadStream);

  } catch (err) {
    console.error("uploadAvatar error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
