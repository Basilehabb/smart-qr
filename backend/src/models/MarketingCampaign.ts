import crypto from "crypto";
import { pool } from "../db/postgres";

export type MarketingCampaignStatus =
  | "queued"
  | "processing"
  | "completed"
  | "completed_with_errors";

export interface MarketingCampaignDocument {
  id: string;
  message: string;
  filtersJson: Record<string, any>;
  status: MarketingCampaignStatus;
  totalUsers: number;
  successCount: number;
  failedCount: number;
  createdBy: string | null;
  createdAt: Date;
  toJSON: () => Record<string, any>;
}

const parseFiltersJson = (value: any): Record<string, any> => {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof value === "object" && !Array.isArray(value) ? value : {};
};

const rowToCampaign = (row: any): MarketingCampaignDocument | null => {
  if (!row) return null;

  const campaign: MarketingCampaignDocument = {
    id: row.id,
    message: row.message,
    filtersJson: parseFiltersJson(row.filters_json),
    status: row.status,
    totalUsers: Number(row.total_users || 0),
    successCount: Number(row.success_count || 0),
    failedCount: Number(row.failed_count || 0),
    createdBy: row.created_by || null,
    createdAt: new Date(row.created_at),
    toJSON: () => ({
      id: campaign.id,
      message: campaign.message,
      filtersJson: campaign.filtersJson,
      status: campaign.status,
      totalUsers: campaign.totalUsers,
      successCount: campaign.successCount,
      failedCount: campaign.failedCount,
      createdBy: campaign.createdBy,
      createdAt: campaign.createdAt,
    }),
  };

  return campaign;
};

class MarketingCampaign {
  static async create(data: {
    message: string;
    filtersJson: Record<string, any>;
    totalUsers: number;
    createdBy: string;
  }) {
    const result = await pool.query(
      `INSERT INTO marketing_campaigns (
        id, message, filters_json, status, total_users, success_count, failed_count, created_by, created_at
      )
      VALUES ($1,$2,$3,'queued',$4,0,0,$5,NOW())
      RETURNING *`,
      [crypto.randomUUID(), data.message, JSON.stringify(data.filtersJson), data.totalUsers, data.createdBy]
    );

    return rowToCampaign(result.rows[0])!;
  }

  static async findById(id: string) {
    const result = await pool.query("SELECT * FROM marketing_campaigns WHERE id = $1", [String(id)]);
    return rowToCampaign(result.rows[0]);
  }

  static async listRecent(limit = 50) {
    const result = await pool.query(
      "SELECT * FROM marketing_campaigns ORDER BY created_at DESC LIMIT $1",
      [Math.min(100, Math.max(1, limit))]
    );
    return result.rows.map(rowToCampaign).filter(Boolean) as MarketingCampaignDocument[];
  }

  static async listPending() {
    const result = await pool.query(
      "SELECT * FROM marketing_campaigns WHERE status IN ('queued', 'processing') ORDER BY created_at ASC"
    );
    return result.rows.map(rowToCampaign).filter(Boolean) as MarketingCampaignDocument[];
  }

  static async updateProgress(
    id: string,
    data: {
      status: MarketingCampaignStatus;
      successCount: number;
      failedCount: number;
      filtersJson: Record<string, any>;
    }
  ) {
    const result = await pool.query(
      `UPDATE marketing_campaigns
       SET status = $2, success_count = $3, failed_count = $4, filters_json = $5
       WHERE id = $1
       RETURNING *`,
      [
        String(id),
        data.status,
        data.successCount,
        data.failedCount,
        JSON.stringify(data.filtersJson),
      ]
    );

    return rowToCampaign(result.rows[0]);
  }
}

export default MarketingCampaign;
