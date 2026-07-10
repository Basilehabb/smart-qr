"use strict";

const MarketingCampaign = require("../models/MarketingCampaign").default;
const { findRecipientsByIds } = require("./marketingRecipientService");
const { sendMarketingMessage } = require("./whatsappService");

const campaignQueue = [];
const queuedCampaignIds = new Set();
let workerRunning = false;

const getConcurrency = () => {
  const configured = Number(process.env.WHATSAPP_SEND_CONCURRENCY || 5);
  return Number.isInteger(configured) ? Math.min(20, Math.max(1, configured)) : 5;
};

const getCampaignState = (filtersJson) => {
  const source = filtersJson && typeof filtersJson === "object" ? filtersJson : {};
  return {
    filters: source.filters && typeof source.filters === "object" ? source.filters : {},
    recipientIds: Array.isArray(source.recipientIds) ? source.recipientIds.map(String) : [],
    successfulUserIds: Array.isArray(source.successfulUserIds) ? source.successfulUserIds.map(String) : [],
    failedUserIds: Array.isArray(source.failedUserIds) ? source.failedUserIds.map(String) : [],
  };
};

const saveProgress = async (campaign, state, status) => {
  const filtersJson = {
    filters: state.filters,
    recipientIds: state.recipientIds,
    successfulUserIds: state.successfulUserIds,
    failedUserIds: state.failedUserIds,
  };

  return MarketingCampaign.updateProgress(campaign.id, {
    status,
    successCount: state.successfulUserIds.length,
    failedCount: state.failedUserIds.length,
    filtersJson,
  });
};

const processCampaign = async (campaignId) => {
  const campaign = await MarketingCampaign.findById(campaignId);
  if (!campaign || ["completed", "completed_with_errors"].includes(campaign.status)) return;

  const state = getCampaignState(campaign.filtersJson);
  const completedIds = new Set([...state.successfulUserIds, ...state.failedUserIds]);
  const pendingIds = state.recipientIds.filter((id) => !completedIds.has(id));

  await saveProgress(campaign, state, "processing");

  const recipients = await findRecipientsByIds(pendingIds);
  const recipientsById = new Map(recipients.map((recipient) => [recipient.id, recipient]));
  const concurrency = getConcurrency();

  for (let index = 0; index < pendingIds.length; index += concurrency) {
    const batchIds = pendingIds.slice(index, index + concurrency);
    const results = await Promise.all(
      batchIds.map(async (userId) => {
        const recipient = recipientsById.get(userId);
        if (!recipient) return { userId, success: false, reason: "Recipient no longer has a valid phone" };

        try {
          await sendMarketingMessage({ to: recipient.whatsappPhone, message: campaign.message });
          return { userId, success: true };
        } catch (error) {
          return { userId, success: false, reason: error?.message || "Meta API request failed" };
        }
      })
    );

    results.forEach((result) => {
      if (result.success) {
        state.successfulUserIds.push(result.userId);
      } else {
        state.failedUserIds.push(result.userId);
        console.error(`WhatsApp campaign ${campaign.id} failed for user ${result.userId}: ${result.reason}`);
      }
    });

    await saveProgress(campaign, state, "processing");
  }

  const finalStatus = state.failedUserIds.length ? "completed_with_errors" : "completed";
  await saveProgress(campaign, state, finalStatus);
};

const runWorker = async () => {
  if (workerRunning) return;
  workerRunning = true;

  try {
    while (campaignQueue.length) {
      const campaignId = campaignQueue.shift();
      if (!campaignId) continue;
      queuedCampaignIds.delete(campaignId);

      try {
        await processCampaign(campaignId);
      } catch (error) {
        console.error(`WhatsApp campaign ${campaignId} worker error:`, error);
      }
    }
  } finally {
    workerRunning = false;
    if (campaignQueue.length) void runWorker();
  }
};

const enqueueCampaign = (campaignId) => {
  if (!campaignId || queuedCampaignIds.has(campaignId)) return;
  queuedCampaignIds.add(campaignId);
  campaignQueue.push(campaignId);
  void runWorker();
};

const resumePendingCampaigns = async () => {
  const campaigns = await MarketingCampaign.listPending();
  campaigns.forEach((campaign) => enqueueCampaign(campaign.id));
};

module.exports = { enqueueCampaign, resumePendingCampaigns };
