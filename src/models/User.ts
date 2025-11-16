import { Schema, model, Document } from "mongoose";

export interface UserDocument extends Document {
  name?: string;
  email: string;
  phone?: string;
  job?: string;
  password?: string;
  avatar?: string;
  qrCode?: string;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDocument>(
  {
    name: String,
    email: { type: String, required: true, unique: true },
    phone: String,
    job: String,
    password: String,
    avatar: String,
    qrCode: String,
    isAdmin: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default model<UserDocument>("User", UserSchema);
