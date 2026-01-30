// path: src/controllers/authController.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { createUserService } from "../services/userService";

/*----------------------------------------
  TOKEN GENERATOR
----------------------------------------*/
const generateToken = (user: any) => {
  return jwt.sign(
    {
      id: user._id,
      isAdmin: user.isAdmin,
      email: user.email
    },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );
};

/*----------------------------------------
  ⭐ PROFILE FORMATTER (array → object)
----------------------------------------*/
function formatProfileFromDoc(userDoc: any) {
  const formatted: any = {};
  const sections = ["contact", "social", "payment", "video", "music", "design", "gaming", "other"];

  sections.forEach((section) => {
    const arr = userDoc?.profile?.[section];
    
    if (!arr || !Array.isArray(arr)) {
      formatted[section] = {};
      return;
    }

    // ⭐ Convert array to object while preserving order
    const obj: Record<string, string> = {};
    arr.forEach((item: any) => {
      if (item.key && item.value) {
        obj[item.key] = item.value;
      }
    });
    
    formatted[section] = obj;
  });

  return formatted;
}

/*----------------------------------------
  REGISTER
----------------------------------------*/
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone, job, avatar } = req.body;

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const user = await createUserService({
      name,
      email,
      password,
      phone,
      job,
      avatar,
      isAdmin: false
    });

    const token = generateToken(user);

    const userObj: any = user.toObject();
    userObj.profile = formatProfileFromDoc(user);
    delete userObj.passwordHash;

    return res.status(201).json({
      message: "User registered",
      token,
      user: {
        id: userObj._id,
        name: userObj.name,
        email: userObj.email,
        phone: userObj.phone,
        job: userObj.job,
        avatar: userObj.avatar,
        isAdmin: userObj.isAdmin,
        profile: userObj.profile
      }
    });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


/*----------------------------------------
  LOGIN
----------------------------------------*/
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
        avatar: userObj.avatar,
        isAdmin: userObj.isAdmin,
        profile: userObj.profile
      }
    });
  } catch (error) {
    console.error("login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/*----------------------------------------
  ADMIN CREATION
----------------------------------------*/
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
      avatar: "",
      profile: {
        contact: [],
        social: [],
        payment: [],
        video: [],
        music: [],
        design: [],
        gaming: [],
        other: []
      }
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

/*----------------------------------------
  GET ME
----------------------------------------*/
export const getMe = async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user)
      return res.status(404).json({ message: "User not found" });

    const userObj: any = user.toObject();
    userObj.profile = formatProfileFromDoc(user);
    delete userObj.passwordHash;

    res.json({ user: userObj });
  } catch (error) {
    console.error("getMe error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/*----------------------------------------
  ⭐⭐⭐ UPDATE PROFILE (يحفظ الترتيب)
----------------------------------------*/
export const updateProfile = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const data = req.body;

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ message: "User not found" });

    // Update basic fields
    const allowed = ["name", "email", "phone", "job", "avatar", "countryCode"];
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

    // ⭐⭐⭐ Update profile sections - PRESERVE ORDER
    if (data.profile && typeof data.profile === "object") {
      if (!user.profile) user.profile = {} as any;

      const sections = ["contact","social","payment", "video", "music", "design", "gaming", "other"];

      for (const section of sections) {
        const incomingObj = data.profile[section];
        
        if (!incomingObj || typeof incomingObj !== "object") continue;

        // ⭐ Convert object → array (preserve exact order from frontend)
        const newArray: any[] = [];
        
        // IMPORTANT: Object.entries preserves the order as sent from frontend
        for (const [key, value] of Object.entries(incomingObj)) {
          // Skip null/empty values (marked for deletion)
          if (value === null || value === "") continue;
          
          newArray.push({
            key: key,
            value: String(value)
          });
        }

        // ⭐ Save as array (order is now preserved!)
        (user.profile as any)[section] = newArray;
      }

      user.markModified("profile");
    }

    await user.save();

    // Return formatted response
    const userObj: any = user.toObject();
    userObj.profile = formatProfileFromDoc(user);
    delete userObj.passwordHash;

    return res.json({ message: "Profile updated", user: userObj });
  } catch (err) {
    console.error("updateProfile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};