import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin";

export interface AdminRequest extends Request {
  admin?: any;
}

export const verifyAdmin = async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { adminId: string };
    const admin = await Admin.findById(decoded.adminId).select("-password");

    if (!admin) return res.status(403).json({ message: "Admins only" });

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};
