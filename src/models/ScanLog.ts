import { Schema, model } from "mongoose";

const ScanLogSchema = new Schema({
  code: { type: String, required: true }, // still useful for quick lookup

  // Reference to actual QR Document
  qrId: { type: Schema.Types.ObjectId, ref: "QRCode", required: false },

  scannedAt: { type: Date, default: Date.now },

  userAgent: { type: String, default: "unknown" },
  ip: { type: String, default: "unknown" },

}, { timestamps: true });

// Index لتحسين الأداء في عمليات البحث
ScanLogSchema.index({ code: 1, scannedAt: -1 });

export default model("ScanLog", ScanLogSchema);
