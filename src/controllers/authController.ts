import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";

const generateToken = (user: any) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );
};

// =============================================
// REGISTER
// =============================================
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      passwordHash,
      role: "user",
    });

    const token = generateToken(user);

    res.status(201).json({
      message: "User registered",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
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

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
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

    const passwordHash = await bcrypt.hash(adminPassword as string, 10);

    const admin = await User.create({
      name: "Admin",
      email: adminEmail,
      passwordHash,
      role: "admin",
    });

    res.json({ message: "Admin created", admin });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// =============================================
// GET ME (formatted profile)
// =============================================
export const getMe = async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const formattedProfile: any = {};
    const sections = ["social", "contact", "payment", "video", "music", "design", "gaming", "other"];

    sections.forEach(section => {
      const map = (user.profile as any)?.[section];
      formattedProfile[section] = map ? Object.fromEntries(map) : {};
    });

    const userObj = user.toObject();
    (userObj as any).passwordHash = undefined;

    userObj.profile = formattedProfile;

    res.json({ user: userObj });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// =============================================
// UPDATE PROFILE
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
      const passwordHash = await bcrypt.hash(data.password, 10);
      user.passwordHash = passwordHash;
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

    const formattedProfile: any = {};
    const sections = ["social", "contact", "payment", "video", "music", "design", "gaming", "other"];
    sections.forEach(section => {
      const map = (user.profile as any)?.[section];
      formattedProfile[section] = map ? Object.fromEntries(map) : {};
    });

    const userObj = user.toObject();
    (userObj as any).passwordHash = undefined;

    userObj.profile = formattedProfile;

    return res.json({ message: "Profile updated", user: userObj });

  } catch (err) {
    console.error("updateProfile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
