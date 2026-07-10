import crypto from "crypto";
import { pool } from "../db/postgres";

export type PlanFeatures = Record<string, any>;

export interface PlanDocument {
  _id: string;
  id: string;
  key: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  features: PlanFeatures;
  createdAt: Date;
  updatedAt: Date;
  save: () => Promise<PlanDocument>;
  toObject: () => any;
  toJSON: () => any;
}

const normalizeFeatures = (features: any): PlanFeatures => {
  if (!features) return {};
  if (typeof features === "string") {
    try {
      return JSON.parse(features);
    } catch {
      return {};
    }
  }
  return typeof features === "object" && !Array.isArray(features) ? features : {};
};

const rowToPlan = (row: any): PlanDocument | null => {
  if (!row) return null;

  const plan: PlanDocument = {
    _id: row.id,
    id: row.id,
    key: row.key,
    name: row.name,
    isActive: Boolean(row.is_active),
    isDefault: Boolean(row.is_default),
    features: normalizeFeatures(row.features),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    save: async () => {
      const saved = await Plan.save(plan);
      Object.assign(plan, saved);
      return plan;
    },
    toObject: () => ({
      _id: plan._id,
      id: plan.id,
      key: plan.key,
      name: plan.name,
      isActive: plan.isActive,
      isDefault: plan.isDefault,
      features: plan.features,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    }),
    toJSON: () => plan.toObject(),
  };

  return plan;
};

class Plan {
  static async findAll() {
    const result = await pool.query("SELECT * FROM plans ORDER BY created_at ASC");
    return result.rows.map(rowToPlan).filter(Boolean) as PlanDocument[];
  }

  static async findById(id: string) {
    const result = await pool.query("SELECT * FROM plans WHERE id = $1", [String(id)]);
    return rowToPlan(result.rows[0]);
  }

  static async findByKey(key: string) {
    const result = await pool.query("SELECT * FROM plans WHERE key = $1", [String(key)]);
    return rowToPlan(result.rows[0]);
  }

  static async findForUser(userId: string) {
    const result = await pool.query(
      `SELECT plans.*
       FROM plans
       INNER JOIN users ON users.plan_id = plans.id
       WHERE users.id = $1`,
      [String(userId)]
    );
    return rowToPlan(result.rows[0]);
  }

  static async getDefault() {
    const result = await pool.query(
      "SELECT * FROM plans WHERE is_default = TRUE AND is_active = TRUE LIMIT 1"
    );
    return rowToPlan(result.rows[0]);
  }

  static async create(data: any) {
    const id = data.id || data._id || crypto.randomUUID();
    const result = await pool.query(
      `INSERT INTO plans (id, key, name, is_active, is_default, features, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
       RETURNING *`,
      [
        id,
        data.key,
        data.name,
        data.isActive ?? data.is_active ?? true,
        data.isDefault ?? data.is_default ?? false,
        JSON.stringify(normalizeFeatures(data.features)),
      ]
    );

    return rowToPlan(result.rows[0])!;
  }

  static async save(plan: PlanDocument) {
    const result = await pool.query(
      `UPDATE plans
       SET name = $2, is_active = $3, is_default = $4, features = $5, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [plan.id, plan.name, plan.isActive, plan.isDefault, JSON.stringify(normalizeFeatures(plan.features))]
    );

    return rowToPlan(result.rows[0])!;
  }

  static async setDefault(id: string) {
    await pool.query("UPDATE plans SET is_default = FALSE, updated_at = NOW() WHERE is_default = TRUE");
    const result = await pool.query(
      "UPDATE plans SET is_default = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *",
      [String(id)]
    );
    return rowToPlan(result.rows[0]);
  }

  static async countAssignedUsers(id: string) {
    const result = await pool.query("SELECT COUNT(*)::int AS count FROM users WHERE plan_id = $1", [String(id)]);
    return Number(result.rows[0]?.count || 0);
  }

  static async deleteById(id: string) {
    const result = await pool.query("DELETE FROM plans WHERE id = $1", [String(id)]);
    return result.rowCount || 0;
  }
}

export default Plan;
