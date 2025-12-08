import { UserDocument } from "../models/User"; // لو عندك نوع User
import "express";

declare module "express-serve-static-core" {
  interface Request {
    user?: UserDocument | null;
  }
}
