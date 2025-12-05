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

    const enriched = users.map((u) => ({
      ...u.toObject(),
      qrCount: qrs.filter((q) => q.userId?.toString() === u._id.toString()).length,
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

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(409).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      phone,
      job,
      passwordHash: hashedPassword,
      role: "user",
    });

    res.json({ user });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

export const getUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.userId).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "User not found" });

    const formattedProfile: any = {};
    const sections = ["social", "contact", "payment", "video", "music", "design", "gaming", "other"];

    sections.forEach((section) => {
      const map = (user.profile as any)?.[section];
      formattedProfile[section] = map ? Object.fromEntries(map) : {};
    });

    const userObj = user.toObject();
    userObj.profile = formattedProfile;

    res.json({ user: userObj });
  } catch (err) {
    console.error("getUser error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const data = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const basicFields = ["name", "email", "phone", "job"];
    basicFields.forEach((field) => {
      if (data[field] !== undefined) {
        (user as any)[field] = data[field];
      }
    });

    // password update
    if (data.password) {
      const hashed = await bcrypt.hash(data.password, 10);
      user.passwordHash = hashed;
    }

    // profile update
    if (data.profile && typeof data.profile === "object") {
      if (!user.profile) user.profile = {} as any;

      for (const [section, values] of Object.entries(data.profile)) {
        if (!values || typeof values !== "object") continue;

        if (!(user.profile as any)[section]) {
          (user.profile as any)[section] = new Map();
        }

        const sectionMap = (user.profile as any)[section];

        for (const [key, value] of Object.entries(values)) {
          if (value === null || value === "") {
            sectionMap.delete(key);
          } else {
            sectionMap.set(key, String(value));
          }
        }
      }
    }

    await user.save();

    const formattedProfile: any = {};
    const sections = ["social", "contact", "payment", "video", "music", "design", "gaming", "other"];
    sections.forEach((section) => {
      const map = (user.profile as any)?.[section];
      formattedProfile[section] = map ? Object.fromEntries(map) : {};
    });

    const userObj = user.toObject();
    userObj.profile = formattedProfile;

    res.json({ user: userObj });
  } catch (error) {
    console.error("updateUser error:", error);
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
