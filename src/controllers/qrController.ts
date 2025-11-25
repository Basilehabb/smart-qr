import { Request, Response } from "express";
import QRCodeModel from "../models/QRCode";
import ScanLog from "../models/ScanLog";
import { nanoid } from "nanoid";

/**
 * 0) Create QR (Admin only)
 */
export const createQR = async (req: Request, res: Response) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Only admins can create QR codes" });
    }

    // allow user to enter custom code OR auto-generate
    let { code } = req.body;

    if (!code) {
      code = nanoid(10).toUpperCase();
    }

    // check duplicate
    const exists = await QRCodeModel.findOne({ code });
    if (exists) {
      return res.status(409).json({ message: "QR already exists" });
    }

    const qr = await QRCodeModel.create({ code });

    return res.status(201).json({
      success: true,
      qr
    });

  } catch (error) {
    console.error("createQR error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * 1) Get QR Details (Scan)
 */
export const getQRDetails = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const qr = await QRCodeModel.findOne({ code }).populate("userId", "-password");
    if (!qr) return res.status(404).json({ message: "QR not found" });

    await ScanLog.create({
      code: qr.code,
      scannedAt: new Date(),
      userAgent: req.headers["user-agent"] || "unknown",
    });

    return res.json({
      code: qr.code,
      linked: !!qr.userId,
      user: qr.userId || null
    });

  } catch (error) {
    console.error("getQRDetails error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * 2) Link QR to logged-in user
 */
export const linkUserToQR = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const qr = await QRCodeModel.findOne({ code });
    if (!qr) return res.status(404).json({ message: "QR not found" });

    if (qr.userId)
      return res.status(409).json({ status: "already_linked" });

    qr.userId = req.user.id;
    await qr.save();

    return res.json({ status: "linked", code });

  } catch (error) {
    console.error("linkUserToQR error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * 3) Get My QR Codes
 */
export const getMyQr = async (req: any, res: Response) => {
  try {
    const qrs = await QRCodeModel.find({ userId: req.user.id });
    return res.json({ codes: qrs.map(qr => qr.code) });

  } catch (err) {
    console.error("getMyQr error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * 4) Create QR for a specific user (Admin)
 */
export const createQRForUser = async (req: Request, res: Response) => {
  try {
    if (!req.user?.isAdmin)
      return res.status(403).json({ message: "Only admins can perform this" });

    const { userId } = req.params;

    const code = nanoid(10).toUpperCase();

    const qr = await QRCodeModel.create({
      code,
      userId
    });

    return res.json({
      message: "QR created and linked to user",
      qr
    });

  } catch (error) {
    console.error("createQRForUser error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * 5) Link existing QR to a specific user (Admin)
 */
export const linkExistingQRToUser = async (req: Request, res: Response) => {
  try {
    if (!req.user?.isAdmin)
      return res.status(403).json({ message: "Only admins can perform this" });

    const { userId } = req.params;
    const { code } = req.body;

    const qr = await QRCodeModel.findOne({ code });
    if (!qr) return res.status(404).json({ message: "QR not found" });

    if (qr.userId)
      return res.status(409).json({ message: "QR is already linked" });

    qr.userId = userId;
    await qr.save();

    return res.json({
      message: "QR linked to user",
      qr
    });

  } catch (error) {
    console.error("linkExistingQRToUser error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

