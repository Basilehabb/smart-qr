import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import authRoutes from './routes/authRoutes';
import qrRoutes from './routes/qrRoutes';
import adminRoutes from './routes/adminAuthRoutes';
import uploadRoutes from './routes/uploadRoutes';



dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartqr';

console.log('Trying to connect to:', MONGODB_URI);

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch((err) => {
    console.error('❌ MongoDB connection failed');
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    console.error('Full details:', err);
  });


app.use('/api/auth', authRoutes);
app.use('/api/qrcode', qrRoutes);
app.use("/api/qr", qrRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use("/api/qr", qrRoutes);


const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server running on ${port}`));
