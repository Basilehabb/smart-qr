// path: src/controllers/uploadController.ts
import { Request, Response } from "express";

/**
 * Generic upload handler:
 * - supports: multer local (req.file.path / filename)
 * - supports: S3/Cloudinary style (req.file.location)
 *
 * Returns JSON { url: "..." }
 */
export const uploadAvatar = async (req: any, res: Response) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: "No file uploaded" });

    // try common fields
    const url = file.location || file.path || (file.filename ? `/uploads/${file.filename}` : null);

    if (!url) return res.status(500).json({ message: "Could not determine uploaded file URL" });

    return res.json({ url });
  } catch (err) {
    console.error("uploadAvatar error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
