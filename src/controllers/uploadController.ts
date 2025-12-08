import { Request, Response } from "express";
import cloudinary from "../config/cloudinary";

export const uploadAvatar = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    const result = await cloudinary.uploader.upload(base64, {
      folder: "avatars",
      transformation: [{ width: 400, height: 400, crop: "fill" }],
    });

    return res.json({ url: result.secure_url });
  } catch (err) {
    console.error("Upload failed:", err);
    return res.status(500).json({ message: "Upload failed" });
  }
};
