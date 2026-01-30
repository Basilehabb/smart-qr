import User from "../models/User";
import bcrypt from "bcryptjs";

/**
 * ================================
 * Create User Input (Unified)
 * ================================
 */
export interface CreateUserInput {
  name: string;
  email: string;
  password: string;

  phone?: string;
  countryCode?: string;
  job?: string;
  avatar?: string;

  isAdmin?: boolean;

  profile?: {
    social?: { key: string; value: string }[];
    contact?: { key: string; value: string }[];
    payment?: { key: string; value: string }[];
    video?: { key: string; value: string }[];
    music?: { key: string; value: string }[];
    design?: { key: string; value: string }[];
    gaming?: { key: string; value: string }[];
    other?: { key: string; value: string }[];
  };
}

/**
 * ================================
 * Default Empty Profile
 * ================================
 */
const defaultProfile = {
  social: [],
  contact: [],
  payment: [],
  video: [],
  music: [],
  design: [],
  gaming: [],
  other: []
};

/**
 * ================================
 * CREATE USER (Single Source of Truth)
 * ================================
 */
export const createUserService = async (data: CreateUserInput) => {
  const {
    name,
    email,
    password,

    phone = "",
    countryCode = "+20",
    job = "",
    avatar = "",

    isAdmin = false,
    profile
  } = data;

  // 1️⃣ Check email uniqueness
  const existing = await User.findOne({ email });
  if (existing) {
    throw new Error("EMAIL_EXISTS");
  }

  // 2️⃣ Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // 3️⃣ Create user
  const user = await User.create({
    name,
    email,
    phone,
    countryCode,
    job,
    avatar,
    passwordHash,
    isAdmin,

    // ⭐ profile: from input OR default
    profile: profile ?? defaultProfile
  });

  return user;
};