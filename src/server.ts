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

// =======================================
// ✅ CORS (مسموح فقط للدومينات الخاصة بك)
// =======================================
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://smart-qr-frontend.vercel.app",
      "https://smart-qr-platform.vercel.app", // لو هتضيف دومين تاني
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// ==============================
// 🔌 MongoDB Connection
// ==============================
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ ERROR: MONGODB_URI is missing");
  process.exit(1);
}

console.log("Trying to connect to:", MONGODB_URI);

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => {
    console.error("❌ MongoDB connection failed");
    console.error(err);
  });

// ==============================
// 🔗 Routes
// ==============================
app.use("/api/auth", authRoutes);
app.use("/api/qr", qrRoutes);
app.use("/api/admin", adminRoutes);

// ==============================
// 🔍 Test Root
// ==============================
app.get("/", (req, res) => {
  res.send("🚀 SmartQR Backend Ready & Running…");
});

// ==============================
// 🚀 Start Server
// ==============================
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
