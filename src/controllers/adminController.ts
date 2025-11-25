import { Request, Response } from "express";
import User from "../models/User";
import QRCode from "../models/QRCode";
import ScanLog from "../models/ScanLog";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

// Overview
export const getOverview = async (req: Request, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalQRs = await QRCode.countDocuments();
    const linkedQRs = await QRCode.countDocuments({ userId: { $ne: null } });
    const totalScans = await ScanLog.countDocuments();

    res.json({ totalUsers, totalQRs, linkedQRs, totalScans });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// List Users
export const listUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select("-passwordHash");
    const qrs = await QRCode.find();

    const usersWithQRCount = users.map(u => ({
      ...u.toObject(),
      qrCount: qrs.filter(q => q.userId?.toString() === u._id.toString()).length
    }));

    res.json({ users: usersWithQRCount });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Create User
export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, job, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "Missing required fields" });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: "Email exists" });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({ name, email, phone, job, passwordHash });
    res.json({ user });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Update User
export const updateUser = async (req: Request, res: Response) => {
  try {
    const updated = await User.findByIdAndUpdate(
      req.params.userId,
      req.body,
      { new: true }
    ).select("-passwordHash");

    res.json({ user: updated });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Delete User
export const deleteUser = async (req: Request, res: Response) => {
  try {
    await User.findByIdAndDelete(req.params.userId);
    await QRCode.updateMany({ userId: req.params.userId }, { userId: null });

    res.json({ message: "User deleted" });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// List QRs
export const listQRs = async (req: Request, res: Response) => {
  const qrs = await QRCode.find().populate("userId", "name email");
  res.json(qrs);
};

// Create QR
export const createQR = async (req: Request, res: Response) => {
  try {
    const code = nanoid(10).toUpperCase();
    const qr = await QRCode.create({ code });

    res.json({ qr });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Unlink QR
export const unlinkQR = async (req: Request, res: Response) => {
  try {
    await QRCode.findOneAndUpdate(
      { code: req.params.code },
      { userId: null }
    );

    res.json({ message: "QR unlinked" });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Delete QR
export const deleteQR = async (req: Request, res: Response) => {
  try {
    await QRCode.deleteOne({ code: req.params.code });

    res.json({ message: "QR deleted" });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Scan Analytics
export const scanAnalytics = async (req: Request, res: Response) => {
  const logs = await ScanLog.find().sort({ scannedAt: -1 }).limit(100);
  res.json(logs);
};
