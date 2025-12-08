import { Request, Response } from "express";
import QRCodeModel from "../models/QRCode";
import ScanLog from "../models/ScanLog";
import User from "../models/User";
import { nanoid } from "nanoid";

/**
 * Helper — format profile from Map → plain object
 */
function formatProfile(user: any) {
  if (!user?.profile) return {};

  const sections = [
    "social",
    "contact",
    "payment",
    "video",
    "music",
    "design",
    "gaming",
    "other",
  ];

  const out: any = {};

  sections.forEach((sec) => {
    const v = user.profile[sec];

    if (!v) out[sec] = {};
    else if (v instanceof Map) out[sec] = Object.fromEntries(v);
    else if (typeof v === "object") out[sec] = { ...v };
    else out[sec] = {};
  });

  return out;
}

/**
 * PUBLIC — GET QR DETAILS (Scan page)
 */
export const getQRDetails = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const qr = await QRCodeModel.findOne({ code }).populate(
      "userId",
      "-passwordHash"
    );

    if (!qr) return res.status(404).json({ message: "QR not found" });

    // Log scan
    await ScanLog.create({
      code: qr.code,
      scannedAt: new Date(),
      userAgent: req.headers["user-agent"] || "unknown",
    });

    // If QR not linked
    if (!qr.userId) {
      return res.json({
        code,
        linked: false,
        user: null,
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
        avatar: user.avatar || "", // IMPORTANT FOR PROFILE PICTURE
        profile: formatProfile(user),
      },
    });
  } catch (err) {
    console.error("QR scan error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * USER — Link QR to logged-in user
 */
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

/**
 * USER — Get user's QR codes
 */
export const getMyQr = async (req: any, res: Response) => {
  try {
    const qrs = await QRCodeModel.find({ userId: req.user.id });
    res.json({ codes: qrs.map((q) => q.code) });
  } catch (err) {
    console.error("getMyQr error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * ADMIN — Create general QR
 */
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

/**
 * ADMIN — Create QR & auto-link to user
 */
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

/**
 * ADMIN — Link existing unassigned QR
 */
export const linkExistingQRToUser = async (req: any, res: Response) => {
  try {
    if (!req.user?.isAdmin)
      return res.status(403).json({ message: "Admin only" });

    const { userId } = req.params;
    const { code } = req.body;

    const qr = await QRCodeModel.findOne({ code });
    if (!qr) return res.status(404).json({ message: "QR not found" });

    if (qr.userId)
      return res
        .status(409)
        .json({ message: "QR already linked" });

    qr.userId = userId;
    await qr.save();

    res.json({ message: "QR linked", qr });
  } catch (err) {
    console.error("linkExistingQRToUser error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


/* rest of QR controllers (linking, create, admin) can remain same as before;
   ensure when you return user objects you format profile via formatProfile() as above.

import { Request, Response } from "express";
import QRCodeModel from "../models/QRCode";
import ScanLog from "../models/ScanLog";
import { nanoid } from "nanoid";


  PUBLIC — QR Scan
 
export const getQRDetails = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const qr = await QRCodeModel.findOne({ code }).populate("userId", "-passwordHash");
    if (!qr) return res.status(404).json({ message: "QR not found" });

    await ScanLog.create({
      code: qr.code,
      scannedAt: new Date(),
      userAgent: req.headers["user-agent"] || "unknown",
    });

    return res.json({
      code,
      linked: !!qr.userId,
      user: qr.userId ?? null,
    });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};



  USER — Link QR to logged-in user
 
export const linkUserToQR = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const qr = await QRCodeModel.findOne({ code });
    if (!qr) return res.status(404).json({ message: "QR not found" });

    if (qr.userId) {
      return res.status(409).json({ status: "already_linked" });
    }

    qr.userId = req.user.id;
    await qr.save();

    res.json({ status: "linked", code });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};



  USER — Get all QR codes for logged-in user
 
export const getMyQr = async (req: any, res: Response) => {
  try {
    const qrs = await QRCodeModel.find({ userId: req.user.id });
    res.json({ codes: qrs.map(q => q.code) });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};



  ADMIN — Create general QR code
 
export const createQR = async (req: Request, res: Response) => {
  try {
    if (!req.user?.isAdmin)
      return res.status(403).json({ message: "Only admins can create QR codes" });

    let { code } = req.body;
    if (!code) code = nanoid(10).toUpperCase();

    const exists = await QRCodeModel.findOne({ code });
    if (exists) return res.status(409).json({ message: "QR already exists" });

    const qr = await QRCodeModel.create({ code });

    res.status(201).json({ success: true, qr });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};



  ADMIN — Create new QR and auto-link it to User
 
export const createQRForUser = async (req: Request, res: Response) => {
  try {
    if (!req.user?.isAdmin)
      return res.status(403).json({ message: "Admin only" });

    const { userId } = req.params;
    const code = nanoid(10).toUpperCase();

    const qr = await QRCodeModel.create({ code, userId });

    res.json({ message: "QR created and linked", qr });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};



 ADMIN — Link existing unassigned QR to User

export const linkExistingQRToUser = async (req: Request, res: Response) => {
  try {
    if (!req.user?.isAdmin)
      return res.status(403).json({ message: "Admin only" });

    const { userId } = req.params;
    const { code } = req.body;

    const qr = await QRCodeModel.findOne({ code });
    if (!qr) return res.status(404).json({ message: "QR not found" });

    if (qr.userId) return res.status(409).json({ message: "QR already linked" });

    qr.userId = userId;
    await qr.save();

    res.json({ message: "QR linked", qr });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
   
*/
