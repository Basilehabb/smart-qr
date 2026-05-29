export type PlatformDefinition = {
  id: string;
  title: string;
  category: "social" | "contact" | "payment" | "video" | "music" | "design" | "gaming" | "other";
  requires?: "phone" | "url" | "text" | null;
  template?: string | null;
  icon?: string | null;
};

export const PLATFORM_DEFINITIONS: PlatformDefinition[] = [
  { id: "whatsapp", title: "WhatsApp", category: "contact", requires: "phone", icon: "whatsapp" },
  { id: "phone", title: "Phone", category: "contact", requires: "phone", icon: "phone" },
  { id: "email", title: "Email", category: "contact", requires: "text", icon: "email" },
  { id: "instagram", title: "Instagram", category: "social", requires: "text", icon: "instagram" },
  { id: "facebook", title: "Facebook", category: "social", requires: "text", icon: "facebook" },
  { id: "x", title: "X", category: "social", requires: "text", icon: "x" },
  { id: "threads", title: "Threads", category: "social", requires: "text", icon: "threads" },
  { id: "linkedin", title: "LinkedIn", category: "social", requires: "text", icon: "linkedin" },
  { id: "tiktok", title: "TikTok", category: "social", requires: "text", icon: "tiktok" },
  { id: "youtube", title: "YouTube", category: "video", requires: "text", icon: "youtube" },
  { id: "snapchat", title: "Snapchat", category: "social", requires: "text", icon: "snapchat" },
  { id: "paypal", title: "PayPal", category: "payment", requires: "text", icon: "paypal" },
  { id: "instapay", title: "InstaPay", category: "payment", requires: "text", icon: "instapay" },
  { id: "website", title: "Website", category: "other", requires: "url", icon: "globe" },
  { id: "other", title: "Other", category: "other", requires: "url", icon: "link" },
];

export const PLATFORM_MAP = Object.fromEntries(
  PLATFORM_DEFINITIONS.map((platform) => [platform.id, platform])
) as Record<string, PlatformDefinition>;

export function getBasePlatformId(key: string) {
  return String(key || "").split("__")[0];
}

export function getNextPlatformKey(platformId: string, entries: Record<string, unknown> = {}) {
  const existingCount = Object.keys(entries).filter(
    (key) => getBasePlatformId(key) === platformId
  ).length;

  return existingCount === 0 ? platformId : `${platformId}__${existingCount + 1}`;
}

function ensureAbsoluteHttpUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function humanizeDomain(value: string) {
  try {
    const host = new URL(ensureAbsoluteHttpUrl(value)).hostname.replace(/^www\./i, "");
    return host.split(".")[0] || "Other";
  } catch {
    return "Other";
  }
}

export function getProfileEntryTitle(key: string, value: string) {
  const baseId = getBasePlatformId(key);
  if (baseId === "other") {
    return humanizeDomain(value);
  }

  return PLATFORM_MAP[baseId]?.title || baseId;
}

export function normalizeLink(type: string, value: string) {
  if (!value) return "";

  const baseType = getBasePlatformId(type);
  const v = value.trim();

  if (
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("tel:") ||
    v.startsWith("mailto:")
  ) {
    return v;
  }

  switch (baseType) {
    case "facebook":
      return `https://www.facebook.com/${v.replace(/^@/, "")}/`;

    case "instagram":
      return `https://www.instagram.com/${v.replace(/^@/, "")}`;

    case "x":
      return `https://x.com/${v.replace(/^@/, "")}`;

    case "threads":
      return `https://www.threads.net/@${v.replace(/^@/, "")}`;

    case "linkedin":
      return `https://www.linkedin.com/in/${v.replace(/^@/, "")}`;

    case "tiktok":
      return `https://www.tiktok.com/@${v.replace(/^@/, "")}`;

    case "youtube":
      return `https://www.youtube.com/@${v.replace(/^@/, "")}`;

    case "snapchat":
      return `https://www.snapchat.com/add/${v.replace(/^@/, "")}`;

    case "whatsapp": {
      const num = v.replace(/\D/g, "").replace(/^0/, "20");
      return `https://wa.me/${num}`;
    }

    case "phone": {
      const num = v.replace(/\D/g, "").replace(/^0/, "20");
      return `tel:+${num}`;
    }

    case "email":
      return `mailto:${v}`;

    case "paypal":
      return `https://paypal.me/${v.replace(/^@/, "")}`;

    case "instapay":
      // Best experience is to paste a full InstaPay payment link.
      return v.includes("@") ? "https://www.instapay.eg/" : ensureAbsoluteHttpUrl(v);

    case "website":
    case "other":
      return ensureAbsoluteHttpUrl(v);

    default:
      return v;
  }
}
