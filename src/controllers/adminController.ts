import { Request, Response } from "express";
import User from "../models/User";
import QRCode from "../models/QRCode";
import ScanLog from "../models/ScanLog";
import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * Helper: convert profile Maps to plain objects for response
 */
function formatProfile(userDoc: any) {
  const formatted: any = {};
  const sections = ["social","contact","payment","video","music","design","gaming","other"];

  sections.forEach(sec => {
    const v = userDoc?.profile?.[sec];

    if (!v) { formatted[sec] = {}; return; }

    if (v instanceof Map) {
      formatted[sec] = Object.fromEntries(v);
    } else if (typeof v === "object") {
      formatted[sec] = { ...v };
    } else {
      formatted[sec] = {};
    }
  });

  return formatted;
}


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

    const enriched = users.map((u: any) => {
      const obj = u.toObject();
      obj.qrCount = qrs.filter((q) => q.userId?.toString() === u._id.toString()).length;
      // convert profile maps to plain objects
      obj.profile = formatProfile(u);
      return obj;
    });

    res.json({ users: enriched });
  } catch (err) {
    console.error("listUsers error:", err);
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
      name,
      email,
      phone,
      job,
      passwordHash,
      // ensure profile maps are initialized
      profile: {
        social: {},
        contact: {},
        payment: {},
        video: {},
        music: {},
        design: {},
        gaming: {},
        other: {},
      },
    });

    const uobj: any = user.toObject();
    uobj.profile = formatProfile(user);

    res.json({ user: uobj });
  } catch (err) {
    console.error("createUser error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.userId).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "User not found" });

    const userObj: any = user.toObject();
    userObj.profile = formatProfile(user);

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

    // ========== Update basic fields ==========
    const basicFields = ["name", "email", "phone", "job", "avatar", "isAdmin"];
    basicFields.forEach((field) => {
      if (data[field] !== undefined) {
        (user as any)[field] = data[field];
      }
    });

    /*// ========== Update profile sections (expect JSON objects) ==========
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
      */
      // ========== Update profile sections (REPLACE each section entirely) ==========
      if (data.profile && typeof data.profile === "object") {
        if (!user.profile) user.profile = {} as any;

        for (const [section, values] of Object.entries(data.profile)) {
          // section must be object
          if (!values || typeof values !== "object") continue;

          // create fresh Map to avoid keeping old deleted values
          // Replace each section with a *plain ordered object*
          const newObj: Record<string, string> = {};

          for (const [key, value] of Object.entries(values)) {
            if (value !== null && value !== "") {
              newObj[key] = String(value); // preserves insertion order
            }
          }

          (user.profile as any)[section] = newObj;
        }
      }
    // ========== Optional: update password if provided (admin action) ==========
    if (data.password) {
      const hashed = await bcrypt.hash(String(data.password), 10);
      (user as any).passwordHash = hashed;
    }

    await user.save();

    const userObj: any = user.toObject();
    userObj.profile = formatProfile(user);
    delete userObj.passwordHash;

    res.json({ user: userObj });
  } catch (err) {
    console.error("updateUser error:", err);
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
export const resetPassword = async (req: Request, res: Response) => {
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
