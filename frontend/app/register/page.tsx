"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL;

/* =====================
   LINK NORMALIZER
===================== */
function normalizeLink(type: string, value: string) {
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
    case "youtube":
      return `https://www.youtube.com/@${v.replace(/^@/, "")}`;
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
      return v.startsWith("http") ? v : `https://${v}`;
    case "paypal":
      return `https://paypal.me/${v}`;
    default:
      return v;
  }
}

/* =====================
   LINKS CONFIG
===================== */
const LINK_SECTIONS = {
  social: [
    { key: "instagram", label: "Instagram" },
    { key: "facebook", label: "Facebook" },
    { key: "tiktok", label: "TikTok" },
    { key: "youtube", label: "YouTube" },
  ],
  contact: [
    { key: "whatsapp", label: "WhatsApp" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Public Email" },
  ],
  payment: [{ key: "paypal", label: "PayPal" }],
  other: [{ key: "website", label: "Website" }],
};

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const code = searchParams.get("code");
  const from = searchParams.get("from"); // admin | null
  const isAdminFlow = from === "admin";

  /* ===== BASIC ===== */
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    job: "",
  });

  /* ===== PROFILE ===== */
  const [profile, setProfile] = useState<any>({
    contact: {},
    social: {},
    payment: {},
    other: {},
  });

  /* ===== AVATAR ===== */
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* =====================
     SUBMIT
  ===================== */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      /* 1️⃣ REGISTER */
      await axios.post(`${API}/auth/register`, formData);

      /* 2️⃣ LOGIN (حتى في admin) */
      const loginRes = await axios.post(`${API}/auth/login`, {
        email: formData.email,
        password: formData.password,
      });

      const token = loginRes.data.token;

      /* 3️⃣ NORMALIZE PROFILE */
      const normalizedProfile: any = {};
      Object.entries(profile).forEach(([section, links]: any) => {
        normalizedProfile[section] = {};
        Object.entries(links).forEach(([key, value]: any) => {
          if (!value) return;
          normalizedProfile[section][key] = normalizeLink(key, value);
        });
      });

      await axios.put(
        `${API}/auth/update`,
        { profile: normalizedProfile },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      /* 4️⃣ UPLOAD AVATAR */
      if (avatarFile) {
        const fd = new FormData();
        fd.append("file", avatarFile);

        await axios.post(`${API}/auth/upload-avatar`, fd, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      /* 5️⃣ LINK QR (user only) */
      if (!isAdminFlow && code) {
        await axios.post(
          `${API}/qr/link`,
          { code },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        router.push(`/qr/${code}`);
        return;
      }

      /* 6️⃣ REDIRECT */
      router.push(isAdminFlow ? "/admin/users" : "/");
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  /* =====================
     UI
  ===================== */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100 p-6">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl p-8 space-y-8">

        <h2 className="text-3xl font-bold text-center">
          {isAdminFlow ? "Create User" : "Create Account"}
        </h2>

        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* BASIC */}
          <div className="grid grid-cols-2 gap-4">
            {["name", "email", "password", "phone", "job"].map((k) => (
              <input
                key={k}
                type={k === "password" ? "password" : "text"}
                placeholder={k}
                value={(formData as any)[k]}
                onChange={(e) =>
                  setFormData({ ...formData, [k]: e.target.value })
                }
                className="border rounded-lg px-4 py-3"
                required={k !== "phone" && k !== "job"}
              />
            ))}
          </div>

          {/* AVATAR */}
          <div className="flex items-center gap-4">
            {avatarPreview && (
              <img src={avatarPreview} className="w-16 h-16 rounded-full" />
            )}
            <label className="px-4 py-2 bg-indigo-600 text-white rounded cursor-pointer">
              Upload Avatar
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setAvatarFile(f);
                  setAvatarPreview(URL.createObjectURL(f));
                }}
              />
            </label>
          </div>

          {/* LINKS */}
          {Object.entries(LINK_SECTIONS).map(([section, fields]) => (
            <div key={section}>
              <h3 className="font-semibold mb-2 capitalize">{section}</h3>
              <div className="grid grid-cols-2 gap-3">
                {fields.map((f) => (
                  <input
                    key={f.key}
                    placeholder={f.label}
                    className="border rounded-lg px-4 py-2"
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        [section]: {
                          ...profile[section],
                          [f.key]: e.target.value,
                        },
                      })
                    }
                  />
                ))}
              </div>
            </div>
          ))}

          <button
            disabled={loading}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold text-lg"
          >
            {loading ? "Creating..." : "Create"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="text-center mt-20">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
