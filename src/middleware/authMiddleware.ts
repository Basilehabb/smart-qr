import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";

export interface AuthRequest extends Request {
  user?: IUser & { role?: string };
}

/**
 * ================================
 * 🔐 verifyToken → Anyone logged in
 * ================================
 */
export const verifyToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = header.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Invalid token format" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    req.user = user as any;
    next();

  } catch (err) {
    console.error("verifyToken error:", err);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

/**
 * ================================
 * 👑 verifyAdmin → Admin only
 * ================================
 */
export const verifyAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }

  next();
};
