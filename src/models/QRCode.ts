import mongoose, { Schema, Document } from "mongoose";

export interface QRCodeDocument extends Document {
  code: string;
  userId: string | null;
  data: Record<string, any>;
  scanCount: number;
  lastScannedAt: Date | null;
  createdAt: Date;
}

const qrCodeSchema = new Schema({
  code: { type: String, required: true, unique: true },

  userId: { type: Schema.Types.ObjectId, ref: "User", default: null },

  data: {
    type: Object,
    default: {},
  },

  scanCount: {
    type: Number,
    default: 0,
  },

  lastScannedAt: {
    type: Date,
    default: null,
  },

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<QRCodeDocument>("QRCode", qrCodeSchema);
