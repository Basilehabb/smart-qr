import { Request, Response } from "express";
import QRCodeModel from "../models/QRCode";
import User from "../models/User";
import ScanLog from "../models/ScanLog";
import { nanoid } from "nanoid";

/**
 * ✅ Create a new QR
 * Admin only
 */
export const createQR = async (req: Request, res: Response) => {
  try {
    // Ensure only admins can create
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Only admins can create QR codes" });
    }

    const code = nanoid(8).toUpperCase();
    const qr = await QRCodeModel.create({ code });

    res.status(201).json({
      success: true,
      message: "QR created successfully",
      qr,
    });

  } catch (error) {
    console.error("createQR error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * ✅ Get QR details + user if linked
 * Logs scan event for analytics
 */
export const getQRDetails = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const qr = await QRCodeModel.findOne({ code }).populate("userId", "-password");

    if (!qr) return res.status(404).json({ message: "QR not found" });

    // log scan for analytics
    await ScanLog.create({
      code: qr.code,
      scannedAt: new Date(),
      userAgent: req.headers["user-agent"] || "unknown",
    });

    res.json({
      code: qr.code,
      linked: !!qr.userId,
      user: qr.userId || null,
    });

  } catch (error) {
    console.error("getQRDetails error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * ✅ Link QR to a user
 */
export const linkUserToQR = async (req: Request, res: Response) => {
  try {
    const { code, userId } = req.body;

    if (!code || !userId) {
      return res.status(400).json({ message: "code & userId required" });
    }

    const qr = await QRCodeModel.findOne({ code });
    if (!qr) return res.status(404).json({ message: "QR not found" });

    if (qr.userId) {
      return res.status(400).json({ message: "QR already linked to a user" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    qr.userId = user._id;
    await qr.save();

    res.json({
      message: "QR linked successfully",
      qr,
    });

  } catch (error) {
    console.error("linkUserToQR error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
