import { Request, Response } from "express";
import QRCodeModel from "../models/QRCode";
import User from "../models/User";
import ScanLog from "../models/ScanLog";
import { nanoid } from "nanoid";

/**
 * ===========================================
 * 1) Create QR  (Admin Only)
 * ===========================================
 */
export const createQR = async (req: Request, res: Response) => {
  try {
    // لازم admin يعمل QR
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Only admins can create QR codes" });
    }

    const code = nanoid(10).toUpperCase();
    const qr = await QRCodeModel.create({ code });

    res.status(201).json({
      success: true,
      qr
    });

  } catch (error) {
    console.error("createQR error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * ===========================================
 * 2) Get QR Details (Scan)
 * أي حد يعمل scan يشوف الداتا فورًا
 * ===========================================
 */
export const getQRDetails = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const qr = await QRCodeModel.findOne({ code }).populate("userId", "-password");
    if (!qr) return res.status(404).json({ message: "QR not found" });

    // تسجيل scan
    await ScanLog.create({
      code: qr.code,
      scannedAt: new Date(),
      userAgent: req.headers["user-agent"] || "unknown",
    });

    // لو QR مربوط → رجّع بيانات اليوزر كاملة
    if (qr.userId) {
      return res.json({
        code: qr.code,
        linked: true,
        user: qr.userId
      });
    }

    // لو مش مربوط
    return res.json({
      code: qr.code,
      linked: false
    });

  } catch (error) {
    console.error("getQRDetails error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * ===========================================
 * 3) Link QR to a User  (Claim)
 * بعد login/register
 * ===========================================
 */
export const linkUserToQR = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized - login required" });
    }

    const userId = req.user.id;

    const qr = await QRCodeModel.findOne({ code });
    if (!qr) return res.status(404).json({ message: "QR not found" });

    // لو QR مربوط بالفعل
    if (qr.userId) {
      return res.status(409).json({
        status: "already_linked",
        message: "This QR is already linked to a user"
      });
    }

    // اربطه بالمستخدم الحالي
    qr.userId = userId;
    await qr.save();

    return res.json({
      status: "linked",
      code: qr.code,
      userId
    });

  } catch (error) {
    console.error("linkUserToQR error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * ===========================================
 * 4) Unlink QR from User  (Admin)
 * ===========================================
 */
export const unlinkQR = async (req: Request, res: Response) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Only admins can unlink QR" });
    }

    const { code } = req.params;

    const qr = await QRCodeModel.findOne({ code });
    if (!qr) return res.status(404).json({ message: "QR not found" });

    qr.userId = null as any;  // ← يحل المشكلة
    await qr.save();

    res.json({ success: true, message: "QR unlinked successfully" });

  } catch (error) {
    console.error("unlinkQR error:", error);
    res.status(500).json({ message: "Server error" });
  }
};



/**
 * ===========================================
 * 5) Delete QR (Admin)
 * ===========================================
 */
export const deleteQR = async (req: Request, res: Response) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Only admins can delete QR codes" });
    }

    const { code } = req.params;

    await QRCodeModel.deleteOne({ code });

    res.json({ success: true, message: "QR deleted" });

  } catch (error) {
    console.error("deleteQR error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ⬇ أضف هذا تحت باقي الـ imports
import QRCode from "../models/QRCode";

// ===============
// GET MY QR CODE
// ===============
export const getMyQr = async (req: any, res: Response) => {
  try {
    const qrs = await QRCode.find({ userId: req.user.id });

    return res.json({
      codes: qrs.map(qr => qr.code)  // → array of codes
    });

  } catch (err) {
    console.error("getMyQr error:", err);
    res.status(500).json({ message: "Server error" });
  }
};