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
                template: "https://instagram.com/{VALUE}",
                icon: "instagram"
            },
            {
                id: "facebook",
                title: "Facebook",
                category: "social",
                requires: "text",
                template: "https://www.facebook.com/{VALUE}",
                icon: "facebook"
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
                id: "tiktok",
                title: "TikTok",
                category: "social",
                requires: "text",
                template: "https://tiktok.com/@{VALUE}",
                icon: "tiktok"
            },
            {
                id: "snapchat",
                title: "Snapchat",
                category: "social",
                requires: "text",
                template: "https://snapchat.com/add/{VALUE}",
                icon: "snap"
            }
        ]
    });
});
exports.default = router;
