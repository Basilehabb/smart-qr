// path: src/models/User.ts
import { Schema, model, Document } from "mongoose";

// ⭐ تعريف structure الـ profile item
interface ProfileItem {
  key: string;
  value: string;
}

export interface UserDocument extends Document {
  name: string;
  email: string;
  phone?: string;
  countryCode?: string;
  job?: string;
  passwordHash: string;
  avatar?: string;
  isAdmin: boolean;

  // ⭐⭐⭐ Profile sections as arrays (to preserve order)
  profile?: {
    contact?: ProfileItem[];
    social?: ProfileItem[];
    payment?: ProfileItem[];
    video?: ProfileItem[];
    music?: ProfileItem[];
    design?: ProfileItem[];
    gaming?: ProfileItem[];
    other?: ProfileItem[];
  };

  createdAt: Date;
  updatedAt: Date;
}

// ⭐ Sub-schema للـ profile items
const ProfileItemSchema = new Schema(
  {
    key: { type: String, required: true },
    value: { type: String, required: true }
  },
  { _id: false } // علشان ما يعمل ObjectId لكل item
);

const UserSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, default: "" },
    countryCode: { type: String, default: "+20" },
    job: { type: String, default: "" },
    passwordHash: { type: String, required: true },
    avatar: { type: String, default: "" },
    isAdmin: { type: Boolean, default: false },

    // ⭐⭐⭐ Profile sections as arrays
    profile: {
      contact: { type: [ProfileItemSchema], default: [] },
      social: { type: [ProfileItemSchema], default: [] },
      payment: { type: [ProfileItemSchema], default: [] },
      video: { type: [ProfileItemSchema], default: [] },
      music: { type: [ProfileItemSchema], default: [] },
      design: { type: [ProfileItemSchema], default: [] },
      gaming: { type: [ProfileItemSchema], default: [] },
      other: { type: [ProfileItemSchema], default: [] }
    }
  },
  { timestamps: true }
);

/**
 * ⭐ toJSON method - يحول الـ arrays لـ objects للـ frontend
 */
UserSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.passwordHash;

  const sections = ["contact","social","payment", "video", "music", "design", "gaming", "other"];

  if (user.profile) {
    sections.forEach((sec) => {
      const arr = user.profile[sec];
      
      if (!arr || !Array.isArray(arr)) {
        user.profile[sec] = {};
        return;
      }

      // ⭐ Convert array → object (preserving order)
      const obj: Record<string, string> = {};
      arr.forEach((item: ProfileItem) => {
        if (item.key && item.value) {
          obj[item.key] = item.value;
        }
      });
      
      user.profile[sec] = obj;
    });
  } else {
    user.profile = {
      contact: {},
      social: {},
      payment: {},
      video: {},
      music: {},
      design: {},
      gaming: {},
      other: {}
    };
  }

  return user;
};

export default model<UserDocument>("User", UserSchema);