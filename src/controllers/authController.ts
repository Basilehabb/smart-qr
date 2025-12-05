import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";

const generateToken = (user: any) => {
  return jwt.sign(
    {
      id: user._id,
      isAdmin: user.isAdmin,
      email: user.email,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );
};

/**
 * Helper: convert profile Maps to plain objects for response
 */
function formatProfileFromDoc(userDoc: any) {
  const formattedProfile: any = {};
  const sections = ["social", "contact", "payment", "video", "music", "design", "gaming", "other"];
  sections.forEach((section) => {
    const map = userDoc?.profile?.[section];
    formattedProfile[section] = map ? Object.fromEntries(map) : {};
  });
  return formattedProfile;
}

// =============================================
// REGISTER
// =============================================
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      passwordHash: hashed,
      isAdmin: false,
      profile: {
        social: new Map(),
        contact: new Map(),
        payment: new Map(),
        video: new Map(),
        music: new Map(),
        design: new Map(),
        gaming: new Map(),
        other: new Map(),
      },
    });

    const token = generateToken(user);

    const userObj: any = user.toObject();
    userObj.profile = formatProfileFromDoc(user);
    delete userObj.passwordHash;

    res.status(201).json({
      message: "User registered",
      token,
      user: {
        id: userObj._id,
        name: userObj.name,
        email: userObj.email,
        isAdmin: userObj.isAdmin,
        profile: userObj.profile,
      },
    });
  } catch (err) {
    console.error("register error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// =============================================
// LOGIN
// =============================================
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.passwordHash || "");
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken(user);

    const userObj: any = user.toObject();
    userObj.profile = formatProfileFromDoc(user);
    delete userObj.passwordHash;

    res.json({
      message: "Login successful",
      token,
      user: {
        id: userObj._id,
        name: userObj.name,
        email: userObj.email,
        isAdmin: userObj.isAdmin,
        profile: userObj.profile,
      },
    });
  } catch (error) {
    console.error("login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// =============================================
// CREATE ADMIN IF NOT EXISTS
// =============================================
export const createAdminIfNotExists = async (req: Request, res: Response) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin)
      return res.json({ message: "Admin already exists" });

    const hashed = await bcrypt.hash(adminPassword as string, 10);

    const admin = await User.create({
      name: "Admin",
      email: adminEmail,
      passwordHash: hashed,
      isAdmin: true,
      profile: {
        social: new Map(),
        contact: new Map(),
        payment: new Map(),
        video: new Map(),
        music: new Map(),
        design: new Map(),
        gaming: new Map(),
        other: new Map(),
      },
    });

    const adminObj: any = admin.toObject();
    adminObj.profile = formatProfileFromDoc(admin);
    delete adminObj.passwordHash;

    res.json({ message: "Admin created", admin: adminObj });
  } catch (err) {
    console.error("createAdminIfNotExists error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// =============================================
// GET LOGGED-IN USER
// =============================================
export const getMe = async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const userObj: any = user.toObject();
    userObj.profile = formatProfileFromDoc(user);
    delete userObj.passwordHash;

    res.json({ user: userObj });
  } catch (error) {
    console.error("getMe error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// =============================================
// UPDATE PROFILE (with dynamic Maps support)
// =============================================
export const updateProfile = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const data = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Update normal fields
    const allowed = ["name", "email", "phone", "job", "avatar"];
    allowed.forEach((key) => {
      if (data[key] !== undefined) {
        (user as any)[key] = data[key];
      }
    });

    // Update password
    if (data.password) {
      const hashed = await bcrypt.hash(data.password, 10);
      user.passwordHash = hashed;
    }

    // Update maps
    if (data.profile && typeof data.profile === "object") {
      if (!user.profile) user.profile = {} as any;

      for (const [section, values] of Object.entries(data.profile)) {
        if (!values) continue;

        if (!(user.profile as any)[section]) {
          (user.profile as any)[section] = new Map();
        }

        const map = (user.profile as any)[section];

        for (const [key, value] of Object.entries(values)) {
          if (value === "" || value === null) {
            map.delete(key);
          } else {
            map.set(key, String(value));
          }
        }
      }
    }

    await user.save();

    const userObj: any = user.toObject();
    userObj.profile = formatProfileFromDoc(user);
    delete userObj.passwordHash;

    return res.json({ message: "Profile updated", user: userObj });
  } catch (err) {
    console.error("updateProfile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
