"use strict";

const { Router } = require("express");
const {
  previewRecipients,
  sendCampaign,
  campaignHistory,
} = require("../controllers/marketingController");

const router = Router();

router.post("/preview", previewRecipients);
router.post("/send", sendCampaign);
router.get("/history", campaignHistory);

exports.default = router;
