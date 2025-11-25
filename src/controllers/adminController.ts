import { Request, Response } from "express";
import User from "../models/User";
import QRCode from "../models/QRCode";
import ScanLog from "../models/ScanLog";

// ===============================
// OVERVIEW STATS
// ===============================
export const getOverview = async (req: Request, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalQRs = await QRCode.countDocuments();
    const linkedQRs = await QRCode.countDocuments({ userId: { $ne: null } });
    const totalScans = await ScanLog.countDocuments();

    res.json({
      totalUsers,
      totalQRs,
      linkedQRs,
      totalScans,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// LIST ALL USERS
// ===============================
export const listUsers = async (req: Request, res: Response) => {
  try {
    // نجيب كل اليوزرز
    const users = await User.find().select("-passwordHash");

    // نجيب كل ال QR codes
    const qrs = await QRCode.find();

    // نحسب qrCount لكل يوزر
    const usersWithQRCount = users.map((u) => ({
      ...u.toObject(),
      qrCount: qrs.filter(q => q.userId?.toString() === u._id.toString()).length
    }));

    res.json({ users: usersWithQRCount });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// Update USER
// ===============================
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { name, email, phone, job } = req.body;

    const updated = await User.findByIdAndUpdate(
      userId,
      { name, email, phone, job },
      { new: true }
    ).select("-passwordHash");

    res.json({ user: updated });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


// ===============================
// DELETE USER
// ===============================
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    await User.findByIdAndDelete(userId);

    // unlink all QR codes assigned to this user
    await QRCode.updateMany({ userId }, { userId: null });

    res.json({ message: "User deleted and QR unlinked." });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// LIST ALL QR CODES
// ===============================
export const listQRs = async (req: Request, res: Response) => {
  const qrs = await QRCode.find().populate("userId", "name email");
  res.json(qrs);
};

// ===============================
// DELETE QR CODE
// ===============================
export const deleteQR = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    await QRCode.deleteOne({ code });
    res.json({ message: "QR deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// UNLINK QR FROM USER
// ===============================
export const unlinkQR = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    await QRCode.updateOne({ code }, { userId: null });

    res.json({ message: "QR unlinked" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// SCAN ANALYTICS
// ===============================
export const scanAnalytics = async (req: Request, res: Response) => {
  try {
    const logs = await ScanLog.find().sort({ scannedAt: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
