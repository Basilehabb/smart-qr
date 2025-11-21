import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import adminRoutes from "./routes/adminRoutes";


import authRoutes from './routes/authRoutes';
import qrRoutes from './routes/qrRoutes';
// import adminRoutes from './routes/adminRoutes'; // هنضيفه بعد ما نجهزه

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ==============================
// Database
// ==============================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartqr';

console.log('Trying to connect to:', MONGODB_URI);

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch((err) => {
    console.error('❌ MongoDB connection failed');
    console.error(err);
  });

// ==============================
// Routes
// ==============================
app.use('/api/auth', authRoutes);
app.use('/api/qr', qrRoutes);  // 🔥 المسار الوحيد الصحيح
app.use('/api/admin', adminRoutes);


// app.use('/api/admin', adminRoutes); // هنفعّله لاحقا لما أكتب لك الملف

// ==============================
// Default Home Route
// ==============================
app.get('/', (req, res) => {
  res.send('SmartQR Backend Running...');
});

// ==============================
// Start Server
// ==============================
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
