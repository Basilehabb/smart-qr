import { Request, Response } from "express";
import QRCodeModel from "../models/QRCode";
import ScanLog from "../models/ScanLog";
import { nanoid } from "nanoid";

/**
 * PUBLIC — QR Scan
 */
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


/**
 * USER — Link QR to logged-in user
 */
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


/**
 * USER — Get all QR codes for logged-in user
 */
export const getMyQr = async (req: any, res: Response) => {
  try {
    const qrs = await QRCodeModel.find({ userId: req.user.id });
    res.json({ codes: qrs.map(q => q.code) });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * ADMIN — Create general QR code
 */
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


/**
 * ADMIN — Create new QR and auto-link it to User
 */
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


/**
 * ADMIN — Link existing unassigned QR to User
 */
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
