import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

// Routes
import authRoutes from "./routes/authRoutes";
import qrRoutes from "./routes/qrRoutes";
import adminRoutes from "./routes/adminRoutes";

dotenv.config();
const app = express();

// =====================================
// ✅ CORS FIX FOR RENDER + VERCEL
// =====================================
app.use(
  cors({
    origin: [
      "https://smart-qr-frontend.vercel.app",
      "http://localhost:3000"
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Handle preflight
app.options("*", cors());

// Body parser
app.use(express.json());

// =====================================
// MongoDB
// =====================================
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ ERROR: MONGODB_URI is missing");
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => {
    console.error("❌ MongoDB connection failed");
    console.error(err);
  });

// =====================================
// API ROUTES
// =====================================
app.use("/api/auth", authRoutes);
app.use("/api/qr", qrRoutes);
app.use("/api/admin", adminRoutes);

// Test Route
app.get("/", (req, res) => {
  res.send("🚀 SmartQR Backend Running on Render!");
});

// =====================================
// SERVER START
// =====================================
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
