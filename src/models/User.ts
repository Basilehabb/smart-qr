import { Schema, model, Document } from "mongoose";

export interface UserDocument extends Document {
  name: string;
  email: string;
  phone?: string;
  job?: string;
  passwordHash: string;
  avatar?: string;
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

    // 🔥 Important: never store raw password
    passwordHash: { type: String, required: true },

    avatar: { type: String, default: "" },

    // 🔥 Admin Role
    isAdmin: { type: Boolean, default: false },

    // ====== profile maps ======
    profile: {
      social: { type: Map, of: String, default: {} },
      contact: { type: Map, of: String, default: {} },
      payment: { type: Map, of: String, default: {} },
      video: { type: Map, of: String, default: {} },
      music: { type: Map, of: String, default: {} },
      design: { type: Map, of: String, default: {} },
      gaming: { type: Map, of: String, default: {} },
      other: { type: Map, of: String, default: {} },
    },
  },
  { timestamps: true }
);

export default model<UserDocument>("User", UserSchema);
