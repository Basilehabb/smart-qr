"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get("/", (req, res) => {
    res.json({
        platforms: [
            {
                id: "whatsapp",
                title: "WhatsApp",
                category: "contact",
                requires: "phone",
                template: "https://wa.me/{PHONE}",
                icon: "whatsapp"
            },
            {
                id: "instagram",
                title: "Instagram",
                category: "social",
                requires: "text",
                template: null,
                icon: "instagram"
            },
            {
                id: "facebook",
                title: "Facebook",
                category: "social",
                requires: "text",
                template: null,
                icon: "facebook"
            },
            {
                id: "x",
                title: "X",
                category: "social",
                requires: "text",
                template: null,
                icon: "x"
            },
            {
                id: "threads",
                title: "Threads",
                category: "social",
                requires: "text",
                template: null,
                icon: "threads"
            },
            {
                id: "linkedin",
                title: "LinkedIn",
                category: "social",
                requires: "text",
                template: null,
                icon: "linkedin"
            },
            {
                id: "email",
                title: "Email",
                category: "contact",
                requires: "text",
                template: "mailto:{VALUE}",
                icon: "email"
            },
            {
                id: "phone",
                title: "Phone",
                category: "contact",
                requires: "phone",
                template: "tel:{PHONE}",
                icon: "phone"
            },
            {
                id: "website",
                title: "Website",
                category: "other",
                requires: "url",
                template: null,
                icon: "globe"
            },
            {
                id: "other",
                title: "Other",
                category: "other",
                requires: "url",
                template: null,
                icon: "link"
            },
            {
                id: "tiktok",
                title: "TikTok",
                category: "social",
                requires: "text",
                template: null,
                icon: "tiktok"
            },
            {
                id: "youtube",
                title: "YouTube",
                category: "video",
                requires: "text",
                template: null,
                icon: "youtube"
            },
            {
                id: "paypal",
                title: "PayPal",
                category: "payment",
                requires: "text",
                template: null,
                icon: "paypal"
            },
            {
                id: "instapay",
                title: "InstaPay",
                category: "payment",
                requires: "text",
                template: null,
                icon: "instapay"
            },
            {
                id: "snapchat",
                title: "Snapchat",
                category: "social",
                requires: "text",
                template: null,
                icon: "snap"
            }
        ]
    });
});
exports.default = router;
