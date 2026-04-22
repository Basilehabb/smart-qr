import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import { initPostgres, pool } from "../db/postgres";

dotenv.config();

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error("ERROR: MONGODB_URI is required for migration");
  process.exit(1);
}

if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const asId = (value: any) => {
  if (!value) return null;
  if (value instanceof ObjectId) return value.toHexString();
  if (typeof value === "object" && value._id) return asId(value._id);
  return String(value);
};

const asDate = (value: any, fallback = new Date()) => {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
};

const migrate = async () => {
  await initPostgres();

  const mongo = new MongoClient(mongoUri);
  await mongo.connect();
  const db = mongo.db();

  const users = await db.collection("users").find().toArray();
  const qrs = await db.collection("qrcodes").find().toArray();
  const logs = await db.collection("scanlogs").find().toArray();

  console.log(`Migrating ${users.length} users`);
  for (const user of users) {
    await pool.query(
      `INSERT INTO users (
        id, name, email, phone, country_code, job, password_hash, avatar,
        avatar_public_id, is_admin, profile, created_at, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        country_code = EXCLUDED.country_code,
        job = EXCLUDED.job,
        password_hash = EXCLUDED.password_hash,
        avatar = EXCLUDED.avatar,
        avatar_public_id = EXCLUDED.avatar_public_id,
        is_admin = EXCLUDED.is_admin,
        profile = EXCLUDED.profile,
        updated_at = EXCLUDED.updated_at`,
      [
        asId(user._id),
        user.name,
        user.email,
        user.phone ?? "",
        user.countryCode ?? "+20",
        user.job ?? "",
        user.passwordHash,
        user.avatar ?? "",
        user.avatarPublicId ?? "",
        Boolean(user.isAdmin),
        JSON.stringify(user.profile ?? {}),
        asDate(user.createdAt),
        asDate(user.updatedAt, asDate(user.createdAt)),
      ]
    );
  }

  console.log(`Migrating ${qrs.length} QR codes`);
  for (const qr of qrs) {
    await pool.query(
      `INSERT INTO qr_codes (
        id, code, user_id, data, scan_count, last_scanned_at, created_at, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (id) DO UPDATE SET
        code = EXCLUDED.code,
        user_id = EXCLUDED.user_id,
        data = EXCLUDED.data,
        scan_count = EXCLUDED.scan_count,
        last_scanned_at = EXCLUDED.last_scanned_at,
        updated_at = EXCLUDED.updated_at`,
      [
        asId(qr._id),
        qr.code,
        asId(qr.userId),
        JSON.stringify(qr.data ?? {}),
        Number(qr.scanCount ?? 0),
        qr.lastScannedAt ? asDate(qr.lastScannedAt) : null,
        asDate(qr.createdAt),
        asDate(qr.updatedAt, asDate(qr.createdAt)),
      ]
    );
  }

  console.log(`Migrating ${logs.length} scan logs`);
  for (const log of logs) {
    await pool.query(
      `INSERT INTO scan_logs (
        id, code, qr_id, scanned_at, user_agent, ip, created_at, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (id) DO UPDATE SET
        code = EXCLUDED.code,
        qr_id = EXCLUDED.qr_id,
        scanned_at = EXCLUDED.scanned_at,
        user_agent = EXCLUDED.user_agent,
        ip = EXCLUDED.ip,
        updated_at = EXCLUDED.updated_at`,
      [
        asId(log._id),
        log.code,
        asId(log.qrId),
        asDate(log.scannedAt),
        log.userAgent ?? "unknown",
        log.ip ?? "unknown",
        asDate(log.createdAt, asDate(log.scannedAt)),
        asDate(log.updatedAt, asDate(log.createdAt, asDate(log.scannedAt))),
      ]
    );
  }

  await mongo.close();
  await pool.end();
  console.log("Migration complete");
};

migrate().catch(async (err) => {
  console.error("Migration failed", err);
  await pool.end();
  process.exit(1);
});
