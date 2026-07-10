"use strict";

const configurationError = () => {
  const error = new Error("WhatsApp Marketing is not configured");
  error.code = "WHATSAPP_NOT_CONFIGURED";
  return error;
};

const getConfiguration = () => {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION;
  const templateName = process.env.WHATSAPP_MARKETING_TEMPLATE_NAME;
  const templateLanguage = process.env.WHATSAPP_MARKETING_TEMPLATE_LANGUAGE || "en_US";

  if (!accessToken || !phoneNumberId || !apiVersion || !templateName) throw configurationError();
  return { accessToken, phoneNumberId, apiVersion, templateName, templateLanguage };
};

const isWhatsAppConfigured = () => {
  try {
    getConfiguration();
    return true;
  } catch {
    return false;
  }
};

const sendMarketingMessage = async ({ to, message }) => {
  const { accessToken, phoneNumberId, apiVersion, templateName, templateLanguage } = getConfiguration();
  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: templateLanguage },
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: message }],
          },
        ],
      },
    }),
  });

  if (!response.ok) {
    let providerMessage = `Meta API returned ${response.status}`;
    try {
      const payload = await response.json();
      providerMessage = payload?.error?.message || providerMessage;
    } catch {
      // Keep the provider response private and return a safe error to the queue.
    }
    const error = new Error(providerMessage);
    error.code = "WHATSAPP_SEND_FAILED";
    throw error;
  }

  const payload = await response.json();
  return payload?.messages?.[0]?.id || null;
};

module.exports = { isWhatsAppConfigured, sendMarketingMessage };
