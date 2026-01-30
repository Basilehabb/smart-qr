import { Request, Response } from "express";
import User from "../models/User";
import QRCode from "../models/QRCode";
import ScanLog from "../models/ScanLog";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import * as XLSX from "xlsx";
import { createUserService } from "../services/userService";

/* =====================
   LINK NORMALIZER (USED IN BULK UPLOAD)
===================== */
function normalizeLink(type: string, value: string): string {
  if (!value) return "";

  const v = String(value).trim();

  if (
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("tel:") ||
    v.startsWith("mailto:")
  ) {
    return v;
  }

  switch (type) {
    case "facebook":
      return `https://www.facebook.com/${v.replace(/^@/, "")}/`;

    case "instagram":
      return `https://www.instagram.com/${v.replace(/^@/, "")}`;

    case "tiktok":
      return `https://www.tiktok.com/@${v.replace(/^@/, "")}`;

    case "youtube":
      return `https://www.youtube.com/@${v.replace(/^@/, "")}`;

    case "whatsapp": {
      const num = v.replace(/\D/g, "").replace(/^0/, "20");
      return `https://wa.me/${num}`;
    }

    case "phone": {
      const num = v.replace(/\D/g, "").replace(/^0/, "20");
      return `tel:+${num}`;
    }

    case "email":
      return `mailto:${v}`;

    case "website":
      return v.startsWith("http") ? v : `https://${v}`;

    case "paypal":
      return `https://paypal.me/${v}`;

    default:
      return v;
  }
}


/* ======================================================
   HELPER: Format Profile (Array → Object)
====================================================== */
function formatProfile(userDoc: any) {
  const formatted: any = {};
  const sections = ["contact", "social", "payment", "video", "music", "design", "gaming", "other"];

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

        const password =
          row.password !== undefined && row.password !== null
            ? String(row.password)
            : crypto.randomBytes(4).toString("hex");
          const passwordHash = await bcrypt.hash(password, 10);

        const user = await createUserService({
          name: row.name,
          email: row.email,
          password,
          phone: row.phone,
          job: row.job,
          avatar: row.avatar
        });

        /* =====================
   BUILD PROFILE FROM EXCEL
          ===================== */
          const profile: any = {
            social: {},
            contact: {},
            payment: {},
            other: {}
          };

          if (row.instagram) profile.social.instagram = normalizeLink("instagram", row.instagram);
          if (row.facebook) profile.social.facebook = normalizeLink("facebook", row.facebook);
          if (row.tiktok) profile.social.tiktok = normalizeLink("tiktok", row.tiktok);
          if (row.youtube) profile.social.youtube = normalizeLink("youtube", row.youtube);

          if (row.whatsapp) profile.contact.whatsapp = normalizeLink("whatsapp", row.whatsapp);
          if (row.publicEmail) profile.contact.email = normalizeLink("email", row.publicEmail);
          if (row.phoneLink) profile.contact.phone = normalizeLink("phone", row.phoneLink);

          if (row.paypal) profile.payment.paypal = normalizeLink("paypal", row.paypal);
          if (row.website) profile.other.website = normalizeLink("website", row.website);

          if (
            Object.values(profile).some(
              (sec) => Object.keys(sec as Record<string, any>).length > 0
            )
          ) {          
            await User.findByIdAndUpdate(user._id, {
              profile: {
                social: Object.entries(profile.social).map(([k, v]) => ({ key: k, value: v })),
                contact: Object.entries(profile.contact).map(([k, v]) => ({ key: k, value: v })),
                payment: Object.entries(profile.payment).map(([k, v]) => ({ key: k, value: v })),
                other: Object.entries(profile.other).map(([k, v]) => ({ key: k, value: v })),
              }
            });
          }
          
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
        phone: "01234567890",
        job: "Engineer",
        password: "",
        qrCode: "",
    
        instagram: "john_doe",
        facebook: "john.doe",
        tiktok: "",
        youtube: "",
    
        whatsapp: "01234567890",
        publicEmail: "contact@example.com",
        phoneLink: "01234567890",
    
        paypal: "",
        website: "example.com"
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
    // Parse query params
    const {
    search,
    isAdmin,
    hasQR,
    job,
    phoneExists,
    createdFrom,
    createdTo,
    sort,
    } = req.query as any;
    const page = Math.max(1, parseInt((req.query.page as string) || "1")) || 1;
    const limit = Math.min(200, Math.max(1, parseInt((req.query.limit as string) || "20"))) || 20;
    
    
    // Build Mongo filter
    const filter: any = {};
    
    
    if (search && String(search).trim()) {
    const s = String(search).trim();
    filter.$or = [
    { name: { $regex: s, $options: "i" } },
    { email: { $regex: s, $options: "i" } },
    { phone: { $regex: s, $options: "i" } },
    { job: { $regex: s, $options: "i" } },
    ];
    }
    if (isAdmin === "true") filter.isAdmin = true;
else if (isAdmin === "false") filter.isAdmin = false;


if (job && String(job).trim()) filter.job = String(job).trim();


if (phoneExists === "true") filter.phone = { $exists: true, $ne: "" };
else if (phoneExists === "false") filter.$or = (filter.$or || []).concat([{ phone: "" }, { phone: { $exists: false } }]);


// createdAt range
if (createdFrom || createdTo) {
filter.createdAt = {} as any;
if (createdFrom) filter.createdAt.$gte = new Date(String(createdFrom));
if (createdTo) {
const d = new Date(String(createdTo));
// include end of day if user passed date-only
d.setHours(23, 59, 59, 999);
filter.createdAt.$lte = d;
}
}

// Count total (for pagination) — apply same filter
const total = await User.countDocuments(filter);


// Sorting
let sortObj: any = { createdAt: -1 };
switch (sort) {
case "oldest":
sortObj = { createdAt: 1 };
break;
case "name_asc":
sortObj = { name: 1 };
break;
case "name_desc":
sortObj = { name: -1 };
break;
case "email_asc":
sortObj = { email: 1 };
break;
case "email_desc":
sortObj = { email: -1 };
break;
default:
sortObj = { createdAt: -1 };
}

// Fetch users with pagination
const users = await User.find(filter)
.select("-passwordHash")
.sort(sortObj)
.skip((page - 1) * limit)
.limit(limit)
.lean();

// If hasQR filter applied, we need to filter by QR join
let qrs: any[] = [];
if (hasQR === "true" || hasQR === "false") {
qrs = await QRCode.find({ userId: { $ne: null } }).lean();
} else {
qrs = await QRCode.find().lean();
}

// Enrich users with qrCount and format profile
const enriched = users.map((u: any) => {
  const qrCount = qrs.filter((q) => q.userId && String(q.userId) === String(u._id)).length;
  const out = { ...u };
  out.qrCount = qrCount;
  out.profile = formatProfile(u);
  return out;
  });

  // If hasQR filter true => keep only users with qrCount > 0
let final = enriched;
if (hasQR === "true") final = enriched.filter((x) => x.qrCount > 0);
else if (hasQR === "false") final = enriched.filter((x) => x.qrCount === 0);


// Note: if we filtered by hasQR after pagination it could shrink page size — better approach would be aggregation; this is simple and acceptable for moderate dataset.


return res.json({
  users: final,
  meta: {
  total,
  page,
  limit,
  pages: Math.ceil(total / limit) || 1,
  },
  });
  } catch (err: any) {
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

    const user = await createUserService({
      name,
      email,
      password,
      phone,
      job,
      isAdmin: true
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
   6) GET USER (WITH PROFILE + LINKED QR CODES)
====================================================== */
export const getUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "User not found" });

    // ⭐ Get all QR codes linked to this user
    const qrCodes = await QRCode.find({ userId }).select("code createdAt");

    // ⭐ Format profile correctly
    const userObj: any = user.toObject();
    userObj.profile = formatProfile(user);

    // ⭐ Include linked QR codes in response
    userObj.qrCodes = qrCodes;

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
      const sections = ["contact", "social", "payment", "video", "music", "design", "gaming", "other"];

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
// ======================================================
// 13) UPLOAD USER AVATAR (ADMIN ONLY)
// ======================================================
import cloudinary from "../config/cloudinary";
import streamifier from "streamifier";

export const uploadUserAvatarAdmin = async (req: any, res: Response) => {
  try {
    const { userId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // امسح الصورة القديمة لو موجودة
    if ((user as any).avatarPublicId) {
      await cloudinary.uploader.destroy((user as any).avatarPublicId);
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "avatars", resource_type: "image" },
      async (error, result) => {
        if (error || !result) {
          return res.status(500).json({ message: "Upload failed" });
        }

        user.avatar = result.secure_url;
        (user as any).avatarPublicId = result.public_id;
        await user.save();

        return res.json({ url: result.secure_url });
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);

  } catch (err) {
    console.error("uploadUserAvatarAdmin error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
/* ======================================================
   14) BULK UPLOAD USER AVATARS (ADMIN)
====================================================== */
export const bulkUploadUserAvatars = async (req: any, res: Response) => {
  console.log("🔥 bulkUploadUserAvatars HIT");
  console.log("files:", req.files);
  console.log("headers:", req.headers["content-type"]);
  try {
    if (!req.files || !req.files.length) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const results = {
      success: [] as any[],
      failed: [] as any[],
    };

    const uploads = req.files.map((file: any) => {
      return new Promise<void>(async (resolve) => {
        const originalName = file.originalname;
        const email = originalName.replace(/\.(jpg|jpeg|png|webp)$/i, "");

        const user = await User.findOne({ email });
        if (!user) {
          results.failed.push({
            file: originalName,
            error: "User not found",
          });
          return resolve();
        }

        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "avatars", resource_type: "image" },
          async (error, result) => {
            if (error || !result) {
              results.failed.push({
                file: originalName,
                error: "Upload failed",
              });
              return resolve();
            }

            user.avatar = result.secure_url;
            (user as any).avatarPublicId = result.public_id;
            await user.save();

            results.success.push({
              email,
              avatar: result.secure_url,
            });

            resolve();
          }
        );

        streamifier.createReadStream(file.buffer).pipe(uploadStream);
      });
    });

    // 🔥 استنى كل الصور تترفع
    await Promise.all(uploads);

    return res.json({
      message: "Bulk avatar upload finished",
      results,
    });

  } catch (err) {
    console.error("bulkUploadUserAvatars error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


