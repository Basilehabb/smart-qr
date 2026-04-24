import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initPostgres } from "./db/postgres";

// Routes
import uploadRoutes from "./routes/uploadRoutes";
import fieldsRoutes from "./routes/fieldsRoutes";
import qrRoutes from "./routes/qrRoutes";
import adminRoutes from "./routes/adminRoutes";
import authRoutes from "./routes/authRoutes"; // ⬅ مهم جداً


dotenv.config();
const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!allowedOrigins.includes("http://localhost:3000")) {
  allowedOrigins.push("http://localhost:3000");
}

// =====================================
// ✅ MANUAL CORS HEADERS
// =====================================
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// =====================================
// ✅ CORS
// =====================================
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Body parser
app.use(express.json());

// =====================================
// API ROUTES (الترتيب المهم جداً)
// =====================================

// ✔️ الرئيسي: كل auth هنا
app.use("/api/auth", authRoutes);

// ✔️ Routes أخرى
app.use("/api/qr", qrRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/fields", fieldsRoutes);

// ✔️ رفع الملفات (لو ليك مسارات رفع أخرى غير avatar)
app.use("/api/upload", uploadRoutes);


// ❌ احذف السطر ده نهائيًا
// app.use("/auth", authRoutes);

// Test Route
app.get("/", (req, res) => {
  res.send("🚀 SmartQR Backend Running on Render!");
});

// =====================================
// SERVER START
// =====================================
const port = process.env.PORT || 4000;
initPostgres()
  .then(() => {
    console.log("PostgreSQL connected successfully");
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("PostgreSQL connection failed", err);
    process.exit(1);
  });
