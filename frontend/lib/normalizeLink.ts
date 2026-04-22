export function normalizeLink(type: string, value: string) {
    if (!value) return "";
  
    const v = value.trim();
  
    if (
      v.startsWith("http://") ||
      v.startsWith("https://") ||
      v.startsWith("tel:") ||
      v.startsWith("mailto:")
    ) {
      return v;
    }
  
    switch (type) {
      case "facebook":
        return `https://www.facebook.com/${v.replace(/^@/, "")}/`;
  
      case "instagram":
        return `https://www.instagram.com/${v.replace(/^@/, "")}`;
  
      case "tiktok":
        return `https://www.tiktok.com/@${v.replace(/^@/, "")}`;
  
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
  
      case "website":
        return `https://${v}`;
        
      default:
        return v;
    }
  }
  