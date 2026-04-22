import crypto from "crypto";
import { pool } from "../db/postgres";
import { QueryMany, QueryOne } from "./query";

interface ProfileItem {
  key: string;
  value: string;
}

export interface UserDocument {
  _id: string;
  id: string;
  name: string;
  email: string;
  phone?: string;
  countryCode?: string;
  job?: string;
  passwordHash?: string;
  avatar?: string;
  avatarPublicId?: string;
  isAdmin: boolean;
  profile?: Record<string, ProfileItem[]>;
  createdAt: Date;
  updatedAt: Date;
  save: () => Promise<UserDocument>;
  markModified: (_field: string) => void;
  toObject: () => any;
  toJSON: () => any;
}

const sections = ["contact", "social", "payment", "video", "music", "design", "gaming", "other"];

const defaultProfile = () =>
  sections.reduce((acc, section) => {
    acc[section] = [];
    return acc;
  }, {} as Record<string, ProfileItem[]>);

const normalizeProfile = (profile: any = {}) => {
  const out = defaultProfile();
  for (const section of sections) {
    const value = profile?.[section];
    out[section] = Array.isArray(value)
      ? value
          .filter((item) => item?.key && item?.value !== undefined && item?.value !== null)
          .map((item) => ({ key: String(item.key), value: String(item.value) }))
      : [];
  }
  return out;
};

const rowToUser = (row: any): UserDocument | null => {
  if (!row) return null;

  const user: UserDocument = {
    _id: row.id,
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? "",
    countryCode: row.country_code ?? "+20",
    job: row.job ?? "",
    passwordHash: row.password_hash,
    avatar: row.avatar ?? "",
    avatarPublicId: row.avatar_public_id ?? "",
    isAdmin: Boolean(row.is_admin),
    profile: normalizeProfile(row.profile),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    markModified: () => undefined,
    save: async () => {
      const saved = await User.save(user);
      Object.assign(user, saved);
      return user;
    },
    toObject: () => ({
      _id: user._id,
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone ?? "",
      countryCode: user.countryCode ?? "+20",
      job: user.job ?? "",
      passwordHash: user.passwordHash,
      avatar: user.avatar ?? "",
      avatarPublicId: user.avatarPublicId ?? "",
      isAdmin: user.isAdmin,
      profile: normalizeProfile(user.profile),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }),
    toJSON: () => {
      const out = user.toObject();
      delete out.passwordHash;
      return out;
    },
  };

  return user;
};

const valueForField = (user: any, field: string) => {
  if (field === "createdAt") return user.createdAt;
  if (field === "updatedAt") return user.updatedAt;
  return user[field];
};

const matchesCondition = (value: any, condition: any) => {
  if (condition && typeof condition === "object" && !(condition instanceof RegExp) && !(condition instanceof Date)) {
    if ("$regex" in condition) {
      const regex = new RegExp(condition.$regex, condition.$options || "");
      return regex.test(String(value ?? ""));
    }
    if ("$ne" in condition && value === condition.$ne) return false;
    if ("$exists" in condition) {
      const exists = value !== undefined && value !== null;
      if (condition.$exists !== exists) return false;
    }
    if ("$gte" in condition && new Date(value).getTime() < new Date(condition.$gte).getTime()) return false;
    if ("$lte" in condition && new Date(value).getTime() > new Date(condition.$lte).getTime()) return false;
    return true;
  }

  return value === condition;
};

const matchesFilter = (user: any, filter: any = {}) => {
  for (const [field, condition] of Object.entries(filter)) {
    if (field === "$or") {
      if (!(condition as any[]).some((part) => matchesFilter(user, part))) return false;
      continue;
    }

    if (!matchesCondition(valueForField(user, field), condition)) return false;
  }

  return true;
};

class User {
  static find(filter: any = {}) {
    return new QueryMany(async () => {
      const result = await pool.query("SELECT * FROM users");
      return result.rows.map(rowToUser).filter(Boolean).filter((user) => matchesFilter(user, filter)) as UserDocument[];
    });
  }

  static findOne(filter: any = {}) {
    return new QueryOne(async () => {
      const users = await User.find(filter);
      return users[0] ?? null;
    });
  }

  static findById(id: string) {
    return new QueryOne(async () => {
      const result = await pool.query("SELECT * FROM users WHERE id = $1", [String(id)]);
      return rowToUser(result.rows[0]);
    });
  }

  static async create(data: any) {
    const id = data._id || data.id || crypto.randomUUID();
    const profile = normalizeProfile(data.profile);
    const result = await pool.query(
      `INSERT INTO users (
        id, name, email, phone, country_code, job, password_hash, avatar,
        avatar_public_id, is_admin, profile, created_at, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
      RETURNING *`,
      [
        id,
        data.name,
        data.email,
        data.phone ?? "",
        data.countryCode ?? data.country_code ?? "+20",
        data.job ?? "",
        data.passwordHash,
        data.avatar ?? "",
        data.avatarPublicId ?? data.avatar_public_id ?? "",
        data.isAdmin ?? data.is_admin ?? false,
        JSON.stringify(profile),
      ]
    );

    return rowToUser(result.rows[0])!;
  }

  static async save(user: UserDocument) {
    const result = await pool.query(
      `UPDATE users
       SET name = $2, email = $3, phone = $4, country_code = $5, job = $6,
           password_hash = $7, avatar = $8, avatar_public_id = $9,
           is_admin = $10, profile = $11, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        user._id,
        user.name,
        user.email,
        user.phone ?? "",
        user.countryCode ?? "+20",
        user.job ?? "",
        user.passwordHash,
        user.avatar ?? "",
        user.avatarPublicId ?? "",
        user.isAdmin,
        JSON.stringify(normalizeProfile(user.profile)),
      ]
    );

    return rowToUser(result.rows[0])!;
  }

  static async findByIdAndUpdate(id: string, update: any) {
    const user = await User.findById(id);
    if (!user) return null;
    Object.assign(user, update);
    if (update.profile) user.profile = normalizeProfile(update.profile);
    return user.save();
  }

  static async findByIdAndDelete(id: string) {
    const user = await User.findById(id);
    await pool.query("DELETE FROM users WHERE id = $1", [String(id)]);
    return user;
  }

  static async countDocuments(filter: any = {}) {
    const users = await User.find(filter);
    return users.length;
  }
}

export default User;
