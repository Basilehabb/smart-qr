import React from "react";
import EditButton from "./EditButton";
import LoginToLinkButton from "./LoginToLinkButton";
import { getBasePlatformId, getProfileEntryTitle, normalizeLink } from "@/lib/normalizeLink";

import {
  FaWhatsapp,
  FaInstagram,
  FaFacebook,
  FaTiktok,
  FaGlobe,
  FaPhoneAlt,
  FaYoutube,
  FaPaypal,
  FaSpotify,
  FaGamepad,
  FaLink,
  FaEnvelope,
  FaLinkedin,
  FaSnapchatGhost,
  FaMoneyBillWave,
} from "react-icons/fa";
import { FaXTwitter, FaThreads } from "react-icons/fa6";

type Props = { params: { code: string } };

async function fetchQr(code: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/qr/${code}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("QR not found");
  return res.json();
}

/* ===== Titles ===== */
const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  instagram: <FaInstagram />,
  phone: <FaPhoneAlt />,
  whatsapp: <FaWhatsapp />,
  facebook: <FaFacebook />,
  x: <FaXTwitter />,
  threads: <FaThreads />,
  linkedin: <FaLinkedin />,
  tiktok: <FaTiktok />,
  website: <FaGlobe />,
  youtube: <FaYoutube />,
  paypal: <FaPaypal />,
  instapay: <FaMoneyBillWave />,
  spotify: <FaSpotify />,
  gaming: <FaGamepad />,
  email: <FaEnvelope />,
  snapchat: <FaSnapchatGhost />,
  other: <FaLink />,
};

/* ===== Link Item ===== */
function LinkItem({
  title,
  value,
  platform,
}: {
  title: string;
  value: string;
  platform: string;
}) {
  const basePlatform = getBasePlatformId(platform);
  const href = normalizeLink(basePlatform, value);
  const opensNewTab = !["phone", "email"].includes(basePlatform);

  return (
    <a
      href={href}
      target={opensNewTab ? "_blank" : undefined}
      rel={opensNewTab ? "noopener noreferrer" : undefined}
      className="
        flex items-center gap-4
        w-full px-6 py-4
        rounded-full
        bg-gradient-to-r from-[#C9A441] to-[#B8962E]
        text-white font-medium
        shadow-md
        hover:scale-[1.02] transition
      "
    >
      <div className="w-9 h-9 rounded-full bg-black/20 flex items-center justify-center text-lg">
        {PLATFORM_ICONS[basePlatform] || PLATFORM_ICONS.other}
      </div>
      <span className="flex-1 text-left">{title}</span>
    </a>
  );
}

export default async function Page({ params }: Props) {
  const data = await fetchQr(params.code);

  if (!data.user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#FAFAFA] px-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">
            هذا الـ QR غير مربوط
          </h2>
          <p className="text-gray-600 mb-6">
            يمكنك إنشاء حساب جديد أو تسجيل الدخول لربط هذا الـ QR.
          </p>
          <div className="flex flex-col gap-3">
            <a
              href={`/register?code=${params.code}`}
              className="w-full px-4 py-3 rounded-lg bg-[#C9A441] text-white font-medium"
            >
              Create Account & Link QR
            </a>
            <LoginToLinkButton code={params.code} />
          </div>
        </div>
      </main>
    );
  }

  const user = data.user;
  const profile = user.profile || {};

  const allLinks = Object.entries(profile).flatMap(([_, group]) =>
    Object.entries(group || {}).filter(
      ([_, v]) => v && String(v).trim() !== ""
    )
  );

  return (
    <main className="min-h-screen bg-[#FAFAFA] flex justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md overflow-hidden">

        {/* ================= HEADER ================= */}
          <div className="relative w-full h-[320px]">

          <svg
            viewBox="0 0 375 320"
            preserveAspectRatio="xMidYMid slice"
            className="w-full h-full"
          >
            <defs>
              {/* MASK */}
              <mask id="curveMask">
                <rect width="375" height="320" fill="white" />
                <path
                  d="
                    M0,232
                    C90,270 285,270 375,232
                    L375,320
                    L0,320
                    Z
                  "
                  fill="black"
                />
              </mask>
            </defs>

            {/* IMAGE */}
            {user.avatar && (
              <image
                href={user.avatar}
                x="0"
                y="0"
                width="375"
                height="320"
                preserveAspectRatio="xMidYMid meet"
                mask="url(#curveMask)"
              />
            )}

            {/* BLACK CURVE */}
            <path
              d="
                M0,232
                C90,270 285,270 375,232
              "
              stroke="#000"
              strokeWidth="12"
              fill="none"
            />
          </svg>

        </div>


        {/* ================= CONTENT ================= */}
        <div className="px-6 pt-8 pb-8">

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {user.name}
            </h1>
            {user.job && (
              <p className="text-gray-500 text-sm">{user.job}</p>
            )}
          </div>

          <div className="space-y-4 mb-6">
            {allLinks.map(([key, value]) => (
              <LinkItem
                key={key}
                platform={key}
                title={getProfileEntryTitle(key, String(value))}
                value={String(value)}
              />
            ))}
          </div>

          <div className="text-center">
            <EditButton />
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
            <span>Powered by</span>
            <img
              src="/loly-logo.png"
              alt="Loly Accessories"
              className="h-16 w-auto object-contain"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
