import { Request, Response } from "express";
import User from "../models/User";
import QRCode from "../models/QRCode";
import ScanLog from "../models/ScanLog";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import * as XLSX from "xlsx";

/* ======================================================
   HELPER: Format Profile (Array → Object)
====================================================== */
function formatProfile(userDoc: any) {
  const formatted: any = {};
  const sections = ["social", "contact", "payment", "video", "music", "design", "gaming", "other"];

  sections.forEach(section => {
    const arr = userDoc?.profile?.[section];
    
    if (!arr || !Array.isArray(arr)) {
      formatted[section] = {};
      return;
    }

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

/* ======================================================
   1) BULK UPLOAD USERS
====================================================== */
export const bulkUploadUsers = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    if (!data || data.length === 0) {
      return res.status(400).json({ message: "Excel file is empty" });
    }

    const results = {
      total: data.length,
      success: [] as any[],
      errors: [] as any[],
    };

    for (let i = 0; i < data.length; i++) {
      const row: any = data[i];

      try {
        if (!row.name || !row.email) {
          results.errors.push({
            row: i + 2,
            error: "Missing required fields (name, email)",
            data: row
          });
          continue;
        }

        const existing = await User.findOne({ email: row.email });
        if (existing) {
          results.errors.push({
            row: i + 2,
            error: "Email already exists",
            data: row
          });
          continue;
        }

        const password = row.password || crypto.randomBytes(4).toString("hex");
        const passwordHash = await bcrypt.hash(password, 10);

        const user = await User.create({
          name: row.name,
          email: row.email,
          phone: row.phone || "",
          job: row.job || "",
          avatar: row.avatar || "",
          passwordHash,
          profile: {
            social: [],
            contact: [],
            payment: [],
            video: [],
            music: [],
            design: [],
            gaming: [],
            other: []
          }
        });

        let qr: any;

        if (row.qrCode) {
          qr = await QRCode.findOne({ code: row.qrCode });

          if (qr) {
            if (qr.userId) {
              results.errors.push({
                row: i + 2,
                error: `QR ${row.qrCode} already linked`,
                data: row
              });
              await User.findByIdAndDelete(user._id);
              continue;
            }

            qr.userId = user._id;
            await qr.save();
          } else {
            qr = await QRCode.create({
              code: row.qrCode,
              userId: user._id
            });
          }
        } else {
          const code = crypto.randomBytes(5).toString("hex").toUpperCase();
          qr = await QRCode.create({ code, userId: user._id });
        }

        results.success.push({
          row: i + 2,
          user: { id: user._id, name: user.name, email: user.email, password },
          qrCode: qr.code
        });

      } catch (e: any) {
        results.errors.push({
          row: i + 2,
          error: e.message,
          data: row
        });
      }
    }

    return res.json({
      message: "Bulk upload complete",
      results
    });

  } catch (error: any) {
    console.error("bulkUploadUsers error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ======================================================
   2) DOWNLOAD TEMPLATE
====================================================== */
export const downloadTemplate = async (req: Request, res: Response) => {
  try {
    const template = [
      {
        name: "John Doe",
        email: "john@example.com",
        phone: "+201234567890",
        job: "Engineer",
        password: "optional123",
        qrCode: "ABC123",
        avatar: "",
      },
      {
        name: "Jane Smith",
        email: "jane@example.com",
        phone: "+201987654321",
        job: "Designer",
        password: "",
        qrCode: "",
        avatar: "",
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Users");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=users_template.xlsx");

    res.send(buffer);

  } catch (err) {
    console.error("downloadTemplate error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   3) OVERVIEW
====================================================== */
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

/* ======================================================
   4) USERS LIST (WITH FORMATTED PROFILE)
====================================================== */
export const listUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select("-passwordHash");
    const qrs = await QRCode.find();

    const enriched = users.map((u: any) => {
      const obj = u.toObject();
      obj.qrCount = qrs.filter(q => q.userId?.toString() === u._id.toString()).length;
      
      // ⭐ Format profile: array → object
      obj.profile = formatProfile(u);
      
      return obj;
    });

    res.json({ users: enriched });

  } catch (err) {
    console.error("listUsers error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   5) CREATE USER
====================================================== */
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
      phone: phone || "",
      job: job || "",
      passwordHash,
      profile: {
        social: [],
        contact: [],
        payment: [],
        video: [],
        music: [],
        design: [],
        gaming: [],
        other: []
      }
    });

    const userObj: any = user.toObject();
    userObj.profile = formatProfile(user);
    delete userObj.passwordHash;

    return res.json({ user: userObj });

  } catch (err) {
    console.error("createUser error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   6) GET USER (WITH FORMATTED PROFILE)
====================================================== */
export const getUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.userId).select("-passwordHash");

    if (!user) return res.status(404).json({ message: "User not found" });

    const userObj: any = user.toObject();
    userObj.profile = formatProfile(user);

    return res.json({ user: userObj });

  } catch (err) {
    console.error("getUser error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   7) UPDATE USER (BASIC FIELDS ONLY - NO PROFILE)
====================================================== */
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const data = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Basic fields only
    const editable = ["name", "email", "phone", "job", "avatar", "isAdmin"];

    editable.forEach((field) => {
      if (data[field] !== undefined) {
        (user as any)[field] = data[field];
      }
    });

    if (data.password) {
      user.passwordHash = await bcrypt.hash(String(data.password), 10);
    }

    await user.save();

    const userObj: any = user.toObject();
    userObj.profile = formatProfile(user);
    delete userObj.passwordHash;

    return res.json({ user: userObj });

  } catch (err) {
    console.error("updateUser error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   8) UPDATE USER PROFILE (ADMIN VERSION)
   ⭐ Converts object → array & preserves order
====================================================== */
export const updateUserProfileAdmin = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const data = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Update basic fields
    const editable = ["name", "email", "phone", "job", "avatar", "countryCode", "isAdmin"];
    editable.forEach(k => {
      if (data[k] !== undefined) (user as any)[k] = data[k];
    });

    if (data.password) {
      user.passwordHash = await bcrypt.hash(String(data.password), 10);
    }

    // Update profile sections (object → array)
    if (data.profile && typeof data.profile === "object") {
      const sections = ["social", "contact", "payment", "video", "music", "design", "gaming", "other"];

      for (const section of sections) {
        const incoming = data.profile[section];

        if (incoming && typeof incoming === "object") {
          const arr: any[] = [];

          for (const [key, value] of Object.entries(incoming)) {
            if (value !== null && value !== "") {
              arr.push({ key, value: String(value) });
            }
          }

          (user.profile as any)[section] = arr;
        }
      }

      user.markModified("profile");
    }

    await user.save();

    const userObj: any = user.toObject();
    userObj.profile = formatProfile(user);
    delete userObj.passwordHash;

    return res.json({ user: userObj });

  } catch (err) {
    console.error("updateUserProfileAdmin error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   9) DELETE USER
====================================================== */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    await User.findByIdAndDelete(req.params.userId);
    await QRCode.updateMany(
      { userId: req.params.userId },
      { userId: null }
    );

    res.json({ message: "User deleted" });

  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   10) QR MANAGEMENT
====================================================== */
export const listQRs = async (req: Request, res: Response) => {
  const qrs = await QRCode.find().populate("userId", "name email");
  res.json(qrs);
};

export const unlinkQR = async (req: Request, res: Response) => {
  try {
    await QRCode.findOneAndUpdate(
      { code: req.params.code },
      { userId: null }
    );

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

/* ======================================================
   11) SCAN ANALYTICS
====================================================== */
export const scanAnalytics = async (req: Request, res: Response) => {
  try {
    const logs = await ScanLog
      .find()
      .sort({ scannedAt: -1 })
      .limit(100);

    res.json(logs);

  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   12) RESET PASSWORD
====================================================== */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const tempPassword = crypto.randomBytes(4).toString("hex");
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await User.findByIdAndUpdate(userId, { passwordHash });

    res.json({
      success: true,
      tempPassword,
      message: "Temporary password generated"
    });

  } catch (err) {
    console.error("reset password error:", err);
    res.status(500).json({ message: "Server error" });
  }
};