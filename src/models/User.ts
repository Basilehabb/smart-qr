import { Schema, model, Document } from "mongoose";

export interface UserDocument extends Document {
  name: string;
  email: string;
  phone?: string;
  job?: string;
  passwordHash: string;

  avatar?: string;        // ← الاسم الموحّد المعتمد

  isAdmin: boolean;

  profile?: {
    social?: Map<string, string>;
    contact?: Map<string, string>;
    payment?: Map<string, string>;
    video?: Map<string, string>;
    music?: Map<string, string>;
    design?: Map<string, string>;
    gaming?: Map<string, string>;
    other?: Map<string, string>;
  };

  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },

    phone: { type: String, default: "" },
    job: { type: String, default: "" },

    passwordHash: { type: String, required: true },

    avatar: { type: String, default: "" }, // ← ثابت

    isAdmin: { type: Boolean, default: false },

    profile: {
      social: { type: Map, of: String, default: {} },
      contact: { type: Map, of: String, default: {} },
      payment: { type: Map, of: String, default: {} },
      video: { type: Map, of: String, default: {} },
      music: { type: Map, of: String, default: {} },
      design: { type: Map, of: String, default: {} },
      gaming: { type: Map, of: String, default: {} },
      other: { type: Map, of: String, default: {} },
    }
  },
  { timestamps: true }
);

/** 
 * 🔥 Serializer — يحوّل Maps → Objects في كل Response
 */
UserSchema.methods.toJSON = function () {
  const user = this.toObject();

  delete user.passwordHash;

  const sections = [
    "social",
    "contact",
    "payment",
    "video",
    "music",
    "design",
    "gaming",
    "other",
  ];

  if (user.profile) {
    sections.forEach((sec) => {
      if (user.profile[sec] instanceof Map) {
        user.profile[sec] = Object.fromEntries(user.profile[sec]);
      }
    });
  }

  return user;
};

export default model<UserDocument>("User", UserSchema);
