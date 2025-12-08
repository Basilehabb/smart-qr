import { Request, Response } from "express";
import cloudinary from "../config/cloudinary";

export const uploadAvatar = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    const uploadResult = await cloudinary.uploader.upload(fileBase64, {
      folder: "avatars",
      transformation: [{ width: 400, height: 400, crop: "fill" }],
    });

    return res.json({ url: uploadResult.secure_url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Upload failed" });
  }
};
