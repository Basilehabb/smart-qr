"use strict";

const MarketingCampaign = require("../models/MarketingCampaign").default;
const { resolveMarketingRecipients } = require("../services/marketingRecipientService");
const { isWhatsAppConfigured } = require("../services/whatsappService");
const { enqueueCampaign } = require("../services/marketingQueueService");

const MAX_MESSAGE_LENGTH = 1024;

const sendError = (res, status, code, message) => res.status(status).json({ code, message });

const previewRecipients = async (req, res) => {
  try {
    const { recipients } = await resolveMarketingRecipients(req.body?.filters || {});
    return res.json({ count: recipients.length });
  } catch (error) {
    if (error?.code === "MARKETING_FILTER_INVALID") {
      return sendError(res, 400, error.code, error.message);
    }
    console.error("previewRecipients error:", error);
    return sendError(res, 500, "MARKETING_PREVIEW_FAILED", "Could not preview recipients");
  }
};

const sendCampaign = async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    if (!message) return sendError(res, 400, "MESSAGE_REQUIRED", "Message must not be empty");
    if (message.length > MAX_MESSAGE_LENGTH) {
      return sendError(res, 400, "MESSAGE_TOO_LONG", `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer`);
    }
    if (!isWhatsAppConfigured()) {
      return sendError(res, 503, "WHATSAPP_NOT_CONFIGURED", "WhatsApp Marketing is not configured");
    }

    const { filters, recipients } = await resolveMarketingRecipients(req.body?.filters || {});
    if (!recipients.length) {
      return sendError(res, 400, "NO_RECIPIENTS", "No users with valid phone numbers match these filters");
    }

    const campaign = await MarketingCampaign.create({
      message,
      filtersJson: {
        filters,
        recipientIds: recipients.map((recipient) => recipient.id),
        successfulUserIds: [],
        failedUserIds: [],
      },
      totalUsers: recipients.length,
      createdBy: req.user._id || req.user.id,
    });

    // The request returns immediately while the worker sends in the background.
    enqueueCampaign(campaign.id);
    return res.status(202).json({
      campaign: {
        id: campaign.id,
        status: campaign.status,
        totalUsers: campaign.totalUsers,
      },
    });
  } catch (error) {
    if (error?.code === "MARKETING_FILTER_INVALID") {
      return sendError(res, 400, error.code, error.message);
    }
    console.error("sendCampaign error:", error);
    return sendError(res, 500, "MARKETING_SEND_FAILED", "Could not create campaign");
  }
};

const campaignHistory = async (_req, res) => {
  try {
    const campaigns = await MarketingCampaign.listRecent();
    return res.json({
      campaigns: campaigns.map((campaign) => ({
        id: campaign.id,
        message: campaign.message,
        created_at: campaign.createdAt,
        total_users: campaign.totalUsers,
        success_count: campaign.successCount,
        failed_count: campaign.failedCount,
        status: campaign.status,
      })),
    });
  } catch (error) {
    console.error("campaignHistory error:", error);
    return sendError(res, 500, "MARKETING_HISTORY_FAILED", "Could not load campaign history");
  }
};

exports.previewRecipients = previewRecipients;
exports.sendCampaign = sendCampaign;
exports.campaignHistory = campaignHistory;
