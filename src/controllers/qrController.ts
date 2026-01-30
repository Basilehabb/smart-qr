// path: src/controllers/qrController.ts
import { Request, Response } from "express";
import QRCodeModel from "../models/QRCode";
import ScanLog from "../models/ScanLog";
import User from "../models/User";
import { nanoid } from "nanoid";

/*----------------------------------------
  ⭐ PROFILE FORMATTER (array → object)
----------------------------------------*/
function formatProfile(user: any) {
  if (!user?.profile) return {};

  const sections = ["contact", "social", "payment", "video", "music", "design", "gaming", "other"];
  const out: any = {};

  sections.forEach((sec) => {
    const arr = user.profile[sec];
    
    if (!arr || !Array.isArray(arr)) {
      out[sec] = {};
      return;
    }

    // ⭐ Convert array → object (preserving order)
    const obj: Record<string, string> = {};
    arr.forEach((item: any) => {
      if (item.key && item.value) {
        obj[item.key] = item.value;
      }
    });
    
    out[sec] = obj;
  });

  return out;
}

/*----------------------------------------
  PUBLIC — QR Scan
----------------------------------------*/
export const getQRDetails = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const qr = await QRCodeModel.findOne({ code }).populate(
      "userId",
      "-passwordHash"
    );

    if (!qr) return res.status(404).json({ message: "QR not found" });

    await ScanLog.create({
      code: qr.code,
      scannedAt: new Date(),
      userAgent: req.headers["user-agent"] || "unknown"
    });

    if (!qr.userId) {
      return res.json({
        code,
        linked: false,
        user: null
      });
    }

    const user: any = qr.userId;

    return res.json({
      code,
      linked: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        countryCode: user.countryCode || "",
        job: user.job || "",
        avatar: user.avatar || "",
        profile: formatProfile(user)
      }
    });
  } catch (err) {
    console.error("QR scan error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/*----------------------------------------
  USER — Link QR
----------------------------------------*/
export const linkUserToQR = async (req: any, res: Response) => {
  try {
    const { code } = req.body;

    if (!req.user)
      return res.status(401).json({ message: "Unauthorized" });

    const qr = await QRCodeModel.findOne({ code });
    if (!qr) return res.status(404).json({ message: "QR not found" });

    if (qr.userId)
      return res.status(409).json({ status: "already_linked" });

    qr.userId = req.user.id;
    await qr.save();

    res.json({ status: "linked", code });
  } catch (err) {
    console.error("linkUserToQR error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/*----------------------------------------
  USER — Get My QR Codes
----------------------------------------*/
export const getMyQr = async (req: any, res: Response) => {
  try {
    const qrs = await QRCodeModel.find({ userId: req.user.id });
    res.json({ codes: qrs.map((q) => q.code) });
  } catch (err) {
    console.error("getMyQr error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/*----------------------------------------
  ADMIN — Create QR
----------------------------------------*/
export const createQR = async (req: any, res: Response) => {
  try {
    if (!req.user?.isAdmin)
      return res.status(403).json({ message: "Admin only" });

    let { code } = req.body;
    if (!code) code = nanoid(10).toUpperCase();

    const exists = await QRCodeModel.findOne({ code });
    if (exists)
      return res.status(409).json({ message: "QR already exists" });

    const qr = await QRCodeModel.create({ code });

    res.status(201).json({ success: true, qr });
  } catch (err) {
    console.error("createQR error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/*----------------------------------------
  ADMIN — Create QR For User
----------------------------------------*/
export const createQRForUser = async (req: any, res: Response) => {
  try {
    if (!req.user?.isAdmin)
      return res.status(403).json({ message: "Admin only" });

    const { userId } = req.params;
    const code = nanoid(10).toUpperCase();

    const qr = await QRCodeModel.create({ code, userId });

    res.json({ message: "QR created and linked", qr });
  } catch (err) {
    console.error("createQRForUser error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/*----------------------------------------
  ADMIN — Link Existing QR
----------------------------------------*/
export const linkExistingQRToUser = async (req: any, res: Response) => {
  try {
    if (!req.user?.isAdmin)
      return res.status(403).json({ message: "Admin only" });

    const { userId } = req.params;
    const { code } = req.body;

    const qr = await QRCodeModel.findOne({ code });
    if (!qr) return res.status(404).json({ message: "QR not found" });

    if (qr.userId)
      return res.status(409).json({ message: "QR already linked" });

    qr.userId = userId;
    await qr.save();

    res.json({ message: "QR linked", qr });
  } catch (err) {
    console.error("linkExistingQRToUser error:", err);
    res.status(500).json({ message: "Server error" });
  }
};