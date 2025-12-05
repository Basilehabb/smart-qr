import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role?: string;
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
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },

    // فقط تعديل هنا 👇
    passwordHash: { type: String, required: true },

    role: { type: String, enum: ["admin", "user"], default: "user" },

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

export default model<IUser>("User", UserSchema);
