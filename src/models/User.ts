import { Schema, model, Document } from "mongoose";

export interface UserDocument extends Document {
  name: string;
  email: string;
  phone?: string;
  job?: string;
  passwordHash: string;
  avatar?: string;
  isAdmin: boolean;
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
  },
  { timestamps: true }
);

export default model<UserDocument>("User", UserSchema);
