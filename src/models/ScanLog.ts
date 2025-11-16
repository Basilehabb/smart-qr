import { Schema, model } from "mongoose";

const scanLogSchema = new Schema(
  {
    code: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    userAgent: String,
    ip: String,
  },
  { timestamps: true }
);

export default model("ScanLog", scanLogSchema);
