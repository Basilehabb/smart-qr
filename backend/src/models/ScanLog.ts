import crypto from "crypto";
import { pool } from "../db/postgres";
import { QueryMany } from "./query";

interface ScanLogDocument {
  _id: string;
  id: string;
  code: string;
  qrId?: string | null;
  scannedAt: Date;
  userAgent: string;
  ip: string;
  createdAt: Date;
  updatedAt: Date;
  toObject: () => any;
}

const rowToScanLog = (row: any): ScanLogDocument | null => {
  if (!row) return null;
  const log: ScanLogDocument = {
    _id: row.id,
    id: row.id,
    code: row.code,
    qrId: row.qr_id ?? null,
    scannedAt: new Date(row.scanned_at),
    userAgent: row.user_agent ?? "unknown",
    ip: row.ip ?? "unknown",
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    toObject: () => ({
      _id: log._id,
      id: log.id,
      code: log.code,
      qrId: log.qrId,
      scannedAt: log.scannedAt,
      userAgent: log.userAgent,
      ip: log.ip,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
    }),
  };

  return log;
};

class ScanLog {
  static find() {
    return new QueryMany(async () => {
      const result = await pool.query("SELECT * FROM scan_logs");
      return result.rows.map(rowToScanLog).filter(Boolean) as ScanLogDocument[];
    });
  }

  static async create(data: any) {
    const id = data._id || data.id || crypto.randomUUID();
    const result = await pool.query(
      `INSERT INTO scan_logs (id, code, qr_id, scanned_at, user_agent, ip, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
       RETURNING *`,
      [
        id,
        data.code,
        data.qrId ?? data.qr_id ?? null,
        data.scannedAt ?? data.scanned_at ?? new Date(),
        data.userAgent ?? data.user_agent ?? "unknown",
        data.ip ?? "unknown",
      ]
    );

    return rowToScanLog(result.rows[0]);
  }

  static async countDocuments() {
    const result = await pool.query("SELECT COUNT(*)::int AS count FROM scan_logs");
    return result.rows[0].count;
  }
}

export default ScanLog;
