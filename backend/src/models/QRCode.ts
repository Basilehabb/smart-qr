import crypto from "crypto";
import { pool } from "../db/postgres";
import User from "./User";
import { QueryMany, QueryOne } from "./query";

export interface QRCodeDocument {
  _id: string;
  id: string;
  code: string;
  userId: string | any | null;
  data: Record<string, any>;
  scanCount: number;
  lastScannedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  save: () => Promise<QRCodeDocument>;
  toObject: () => any;
}

const rowToQR = (row: any): QRCodeDocument | null => {
  if (!row) return null;

  const qr: QRCodeDocument = {
    _id: row.id,
    id: row.id,
    code: row.code,
    userId: row.user_id ?? null,
    data: row.data ?? {},
    scanCount: Number(row.scan_count ?? 0),
    lastScannedAt: row.last_scanned_at ? new Date(row.last_scanned_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    save: async () => {
      const saved = await QRCode.save(qr);
      Object.assign(qr, saved);
      return qr;
    },
    toObject: () => ({
      _id: qr._id,
      id: qr.id,
      code: qr.code,
      userId: qr.userId,
      data: qr.data,
      scanCount: qr.scanCount,
      lastScannedAt: qr.lastScannedAt,
      createdAt: qr.createdAt,
      updatedAt: qr.updatedAt,
    }),
  };

  return qr;
};

const matchesFilter = (qr: QRCodeDocument, filter: any = {}) => {
  for (const [field, condition] of Object.entries(filter)) {
    const value = (qr as any)[field];
    if (condition && typeof condition === "object" && "$ne" in condition) {
      if (value === condition.$ne) return false;
      continue;
    }
    if (String(value ?? "") !== String(condition ?? "")) return false;
  }
  return true;
};

const populateQR = async (qr: QRCodeDocument, field: string, select?: string) => {
  if (field !== "userId" || !qr.userId) return qr;
  const user = await User.findById(String(qr.userId)).select(select || "");
  qr.userId = user;
  return qr;
};

class QRCode {
  static find(filter: any = {}) {
    return new QueryMany(async () => {
      const result = await pool.query("SELECT * FROM qr_codes");
      const qrs = result.rows.filter(Boolean).map((row) => rowToQR(row) as QRCodeDocument);
      return qrs.filter((qr) => matchesFilter(qr, filter));
    }, populateQR);
  }

  static findOne(filter: any = {}) {
    return new QueryOne(async () => {
      const qrs = await QRCode.find(filter);
      return qrs[0] ?? null;
    }, populateQR);
  }

  static async create(data: any) {
    const id = data._id || data.id || crypto.randomUUID();
    const result = await pool.query(
      `INSERT INTO qr_codes (id, code, user_id, data, scan_count, last_scanned_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
       RETURNING *`,
      [
        id,
        data.code,
        data.userId ?? data.user_id ?? null,
        JSON.stringify(data.data ?? {}),
        data.scanCount ?? data.scan_count ?? 0,
        data.lastScannedAt ?? data.last_scanned_at ?? null,
      ]
    );

    return rowToQR(result.rows[0])!;
  }

  static async save(qr: QRCodeDocument) {
    const userId = typeof qr.userId === "object" ? qr.userId?._id : qr.userId;
    const result = await pool.query(
      `UPDATE qr_codes
       SET code = $2, user_id = $3, data = $4, scan_count = $5,
           last_scanned_at = $6, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        qr._id,
        qr.code,
        userId ?? null,
        JSON.stringify(qr.data ?? {}),
        qr.scanCount ?? 0,
        qr.lastScannedAt ?? null,
      ]
    );

    return rowToQR(result.rows[0])!;
  }

  static async findOneAndUpdate(filter: any, update: any) {
    const qr = await QRCode.findOne(filter);
    if (!qr) return null;
    Object.assign(qr, update);
    return qr.save();
  }

  static async updateMany(filter: any, update: any) {
    const qrs = await QRCode.find(filter);
    for (const qr of qrs) {
      Object.assign(qr, update);
      await qr.save();
    }
    return { modifiedCount: qrs.length };
  }

  static async deleteOne(filter: any) {
    const qr = await QRCode.findOne(filter);
    if (!qr) return { deletedCount: 0 };
    await pool.query("DELETE FROM qr_codes WHERE id = $1", [qr._id]);
    return { deletedCount: 1 };
  }

  static async countDocuments(filter: any = {}) {
    const qrs = await QRCode.find(filter);
    return qrs.length;
  }
}

export default QRCode;
