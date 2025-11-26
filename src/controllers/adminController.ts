import { Request, Response } from "express";
import User from "../models/User";
import QRCode from "../models/QRCode";
import ScanLog from "../models/ScanLog";
import bcrypt from "bcryptjs";
import crypto from "crypto";


/**
 * Dashboard Overview
 */
export const getOverview = async (req: Request, res: Response) => {
  try {
    res.json({
      totalUsers: await User.countDocuments(),
      totalQRs: await QRCode.countDocuments(),
      linkedQRs: await QRCode.countDocuments({ userId: { $ne: null } }),
      totalScans: await ScanLog.countDocuments(),
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * USERS
 */
export const listUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select("-passwordHash");
    const qrs = await QRCode.find();

    const enriched = users.map(u => ({
      ...u.toObject(),
      qrCount: qrs.filter(q => q.userId?.toString() === u._id.toString()).length
    }));

    res.json({ users: enriched });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, job, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "Missing fields" });

    if (await User.findOne({ email }))
      return res.status(409).json({ message: "Email exists" });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name, email, phone, job, passwordHash
    });

    res.json({ user });

  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      req.body,
      { new: true }
    ).select("-passwordHash");

    res.json({ user });

  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    await User.findByIdAndDelete(req.params.userId);
    await QRCode.updateMany({ userId: req.params.userId }, { userId: null });

    res.json({ message: "User deleted" });

  } catch {
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * QR MANAGEMENT (Dashboard only)
 */
export const listQRs = async (req: Request, res: Response) => {
  const qrs = await QRCode.find().populate("userId", "name email");
  res.json(qrs);
};

export const unlinkQR = async (req: Request, res: Response) => {
  try {
    await QRCode.findOneAndUpdate({ code: req.params.code }, { userId: null });
    res.json({ message: "QR unlinked" });

  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteQR = async (req: Request, res: Response) => {
  try {
    await QRCode.deleteOne({ code: req.params.code });
    res.json({ message: "QR deleted" });

  } catch {
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * Scan Analytics
 */
export const scanAnalytics = async (req: Request, res: Response) => {
  try {
    const logs = await ScanLog.find().sort({ scannedAt: -1 }).limit(100);
    res.json(logs);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * reset password
 */
export const resetUserPassword = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const tempPassword = crypto.randomBytes(4).toString("hex");
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await User.findByIdAndUpdate(userId, { passwordHash });

    return res.json({
      success: true,
      tempPassword,
      message: "Temporary password generated",
    });

  } catch (error) {
    console.error("reset password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


