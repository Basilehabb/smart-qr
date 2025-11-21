import { Schema, model, Document } from "mongoose";

export interface AdminDocument extends Document {
  name: string;
  email: string;
  passwordHash: string;
  phone?: string;
  job?: string;
  avatar?: string;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema = new Schema<AdminDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, default: "" },
    job: { type: String, default: "" },
    avatar: { type: String, default: "" },
    isAdmin: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default model<AdminDocument>("Admin", AdminSchema);
