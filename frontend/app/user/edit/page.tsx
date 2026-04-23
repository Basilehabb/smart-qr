"use client";

import React, { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api"; // your axios/fetch wrapper
import { ExternalLink } from "lucide-react";

type Platform = {
  id: string;
  title: string;
  category?: string;
  requires?: "phone" | "url" | "text" | null;
  template?: string | null;
  icon?: string | null;
};

type ProfileSections = {
  social: Record<string, string | null>;
  contact: Record<string, string | null>;
  payment: Record<string, string | null>;
  video: Record<string, string | null>;
  music: Record<string, string | null>;
  design: Record<string, string | null>;
  gaming: Record<string, string | null>;
  other: Record<string, string | null>;
};

const EMPTY_PROFILE: ProfileSections = {
  contact: {},
  social: {},
  payment: {},
  video: {},
  music: {},
  design: {},
  gaming: {},
  other: {},
};

export default function EditProfilePage() {
  function redirectToLogin() {
    const returnUrl = `${window.location.pathname}${window.location.search}`;
    localStorage.removeItem("user-token");
    localStorage.setItem("return-url", returnUrl);
    window.location.href = "/login";
  }

  // basic user info
  const [user, setUser] = useState<any | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+20");
  const [job, setJob] = useState("");
  const [password, setPassword] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // profile sections (allow null values to mark pending-deletes)
  const [profile, setProfile] = useState<ProfileSections>(EMPTY_PROFILE);
  const [activeTab, setActiveTab] = useState<keyof ProfileSections>("social");

  // store previous values on delete so we can undo
  const [deletedBuffer, setDeletedBuffer] = useState<Record<string, Record<string, string>>>({});

  // available platforms
  const [platforms, setPlatforms] = useState<Platform[]>([]);

  // UI
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [selectedValue, setSelectedValue] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // drag
  const dragItem = useRef<{ section: keyof ProfileSections; key: string } | null>(null);

  const sections = [
    { key: "social" as keyof ProfileSections, title: "Social" },
    { key: "contact" as keyof ProfileSections, title: "Contact" },
    { key: "payment" as keyof ProfileSections, title: "Payment" },
    { key: "video" as keyof ProfileSections, title: "Video" },
    { key: "music" as keyof ProfileSections, title: "Music" },
    { key: "design" as keyof ProfileSections, title: "Design" },
    { key: "gaming" as keyof ProfileSections, title: "Gaming" },
    { key: "other" as keyof ProfileSections, title: "Other" },
  ];

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // fetch platforms (if missing, fallback to built-in list)
        try {
          const pf = await api.get("/fields");
          setPlatforms(pf.data.platforms || fallbackPlatforms());
        } catch (err) {
          // If backend 404 or not ready, use fallback
          setPlatforms(fallbackPlatforms());
        }

        // fetch current user
        const token = localStorage.getItem("user-token");
        if (!token) {
          redirectToLogin();
          return;
        }
        const res = await api.get("/auth/me", { headers: { Authorization: `Bearer ${token}` } });
        const u = res.data.user;
        setUser(u);
        setName(u.name || "");
        setEmail(u.email || "");
        setPhone(u.phone || "");
        setJob(u.job || "");
        // normalize incoming profile: convert Maps or non-plain to plain object with string values
        if (u.profile) {
          const normalizeSection = (sec: any) => {
            if (!sec) return {};
            // if it's a Map-like: convert
            if (typeof sec.entries === "function") {
              const out: Record<string, string> = {};
              for (const [k, v] of sec.entries()) {
                out[k] = String(v);
              }
              return out;
            }
            // otherwise assume plain object
            const out: Record<string, string> = {};
            for (const k of Object.keys(sec)) {
              const val = (sec as any)[k];
              out[k] = val == null ? "" : String(val);
            }
            return out;
          };

          setProfile({
            social: normalizeSection(u.profile.social),
            contact: normalizeSection(u.profile.contact),
            payment: normalizeSection(u.profile.payment),
            video: normalizeSection(u.profile.video),
            music: normalizeSection(u.profile.music),
            design: normalizeSection(u.profile.design),
            gaming: normalizeSection(u.profile.gaming),
            other: normalizeSection(u.profile.other),
          });
        }
        if (u.avatar) setAvatarPreview(u.avatar);
      } catch (err) {
        console.error(err);
        const status = (err as any)?.response?.status;
        if (status === 401) {
          redirectToLogin();
          return;
        }
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fallback platforms if backend isn't ready
  function fallbackPlatforms(): Platform[] {
    return [
      { id: "website", title: "Website", category: "other", requires: "url" },
      { id: "whatsapp", title: "WhatsApp", category: "contact", requires: "phone", template: "https://wa.me/{PHONE}" },
      { id: "instagram", title: "Instagram", category: "social", requires: "text", template: "https://instagram.com/{VALUE}" },
      { id: "facebook", title: "Facebook", category: "social", requires: "url" },
      { id: "tiktok", title: "TikTok", category: "social", requires: "text", template: "https://tiktok.com/@{VALUE}" },
      { id: "phone", title: "Phone", category: "contact", requires: "phone" },
    ];
  }

  // Validation helpers
  function isEmail(v: string) {
    return /\S+@\S+\.\S+/.test(v);
  }
  function isUrl(v: string) {
    try {
      const u = new URL(v);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }
  function isPhone(v: string) {
    // accept digits, spaces, dashes, parentheses and leading +
    return /^[+\d][\d\s\-()]{4,}$/.test(v);
  }

  function digitsOnly(v: string) {
    return v.replace(/\D/g, "");
  }

  function generateLink(platform: Platform, value: string) {
    if (!platform || !value) return value;
    if (platform.template) {
      return platform.template.replace("{PHONE}", digitsOnly(value)).replace("{VALUE}", encodeURIComponent(value));
    }

    // defaults
    if (platform.id === "whatsapp") {
      // ensure we have country code + digits to form wa.me link
      let digits = digitsOnly(value);
      // if value is phone without code, try attach countryCode if not present
      if (!digits.startsWith("00") && !digits.startsWith("+") && !digits.startsWith(countryCode.replace("+", "")) && !digits.startsWith(countryCode)) {
        digits = (countryCode.replace("+", "") || "") + digits;
      }
      return `https://wa.me/${digits}`;
    }
    if (platform.id === "instagram") {
      const handle = value.replace(/^@/, "");
      return `https://instagram.com/${handle}`;
    }
    if (platform.id === "website") {
      if (/^https?:\/\//.test(value)) return value;
      return `https://${value}`;
    }
    return value;
  }

  // Add field
  function addPlatformToProfile(platformId: string, rawValue: string) {
    const platform = platforms.find((p) => p.id === platformId);
    if (!platform) return;

    const category = (platform.category || "other") as keyof ProfileSections;
    const value = (platform.template || platform.requires) ? generateLink(platform, rawValue) : rawValue;

    setProfile((prev) => ({
      ...prev,
      [category]: { ...(prev as any)[category], [platformId]: value },
    }));
  }

  // Delete → mark as null (pending delete) and keep previous value in buffer
  function deleteField(section: keyof ProfileSections, key: string) {
    setProfile((prev) => {
      const sectionObj = { ...(prev as any)[section] };
      const prevVal = sectionObj[key] ?? "";
      // store previous value in buffer
      setDeletedBuffer((buf) => {
        const copy = { ...buf };
        if (!copy[section]) copy[section] = {};
        copy[section][key] = String(prevVal);
        return copy;
      });
      // mark as null (pending delete)
      sectionObj[key] = null;
      return { ...prev, [section]: sectionObj };
    });
  }

  // Undo delete: restore from buffer (if exists)
  function undoDelete(section: keyof ProfileSections, key: string) {
    setDeletedBuffer((buf) => {
      const copy = { ...buf };
      const prevVal = copy[section]?.[key];
      setProfile((prev) => {
        const sectionObj = { ...(prev as any)[section] };
        if (prevVal !== undefined) {
          sectionObj[key] = prevVal;
        } else {
          // if nothing in buffer, just remove the key (clean)
          delete sectionObj[key];
        }
        return { ...prev, [section]: sectionObj };
      });
      if (copy[section]) {
        delete copy[section][key];
        if (Object.keys(copy[section]).length === 0) delete copy[section];
      }
      return copy;
    });
  }

  // Drag handlers
  function handleDragStart(e: React.DragEvent, section: keyof ProfileSections, key: string) {
    dragItem.current = { section, key };
    e.dataTransfer.effectAllowed = "move";
  }
  function allowDrop(e: React.DragEvent) {
    e.preventDefault();
  }
  function handleDrop(e: React.DragEvent, section: keyof ProfileSections, key?: string) {
    e.preventDefault();
    if (!dragItem.current) return;
    const src = dragItem.current;
    if (src.section !== section) {
      setProfile((prev) => {
        const srcCopy = { ...(prev as any)[src.section] };
        const val = srcCopy[src.key];
        delete srcCopy[src.key];
        const dstCopy = { ...(prev as any)[section] };
        dstCopy[src.key] = val;
        return { ...prev, [src.section]: srcCopy, [section]: dstCopy };
      });
    } else {
      setProfile((prev) => {
        const items = Object.entries((prev as any)[section]) as [string, string | null][];
        const from = items.findIndex(([k]) => k === src.key);
        if (from === -1) return prev;
        const [moved] = items.splice(from, 1);
        if (!key) items.push(moved);
        else {
          const to = items.findIndex(([k]) => k === key);
          items.splice(to, 0, moved);
        }
        const newObj: Record<string, string | null> = {};
        items.forEach(([k, v]) => (newObj[k] = v));
        return { ...prev, [section]: newObj };
      });
    }
    dragItem.current = null;
  }

  // Avatar upload local preview + optional backend upload
  function onAvatarChange(file?: File) {
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function uploadAvatarToServer() {
    if (!avatarFile) return null;
  
    try {
      const token = localStorage.getItem("user-token");
      if (!token) return null;
  
      const fd = new FormData();
      fd.append("file", avatarFile);
  
      const res = await api.post(
        "/auth/upload-avatar",
        fd,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
  
      return res.data.url;
    } catch (err) {
      console.error("upload avatar failed", err);
      return null;
    }
  }
  
  // Save
async function saveProfile() {
  setError(null);
  setSaving(true);

  if (!isEmail(email)) {
    setError("Invalid email");
    setSaving(false);
    return;
  }

  try {
    const token = localStorage.getItem("user-token");
    if (!token) return redirectToLogin();

    const avatarUrl = await uploadAvatarToServer();

    const cleanProfile: any = {};
    for (const section of Object.keys(profile) as (keyof ProfileSections)[]) {
      cleanProfile[section] = { ...profile[section] };
    }

    const payload: any = {
      name,
      email,
      job,
      phone,
      countryCode,
      profile: cleanProfile,
    };

    if (password) payload.password = password;
    if (avatarUrl) payload.avatar = avatarUrl;

    // update
    await api.put("/auth/update", payload, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // fetch updated user
    const updated = await api.get("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const newUser = updated.data.user;

    // UI update
    setUser(newUser);

    // 🔥🔥 IMPORTANT: decide redirect now!

    // 1) check if user came from QR page
    const params = new URLSearchParams(window.location.search);
    const back = params.get("code");

    if (back) {
      // يرجعه لنفس QR اللي جه منه
      window.location.href = `/qr/${back}`;
      return;
    }

    // 2) otherwise → ارجعه للـ QR الخاص بيه
    window.location.href = `/qr/${newUser.code || newUser.qrCode}`;

  } catch (err: any) {
    console.error(err);
    if (err?.response?.status === 401) {
      redirectToLogin();
      return;
    }
    setError(err?.response?.data?.message || "Failed to save");
  } finally {
    setSaving(false);
  }
}

  // small helper: platform title lookup when rendering preview list
  function getPlatformTitle(id: string) {
    return platforms.find((p) => p.id === id)?.title || id;
  }

  // search helper
  const filteredPlatforms = platforms.filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="min-h-screen p-6 bg-slate-50">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left: preview card */}
        <div className="col-span-12 md:col-span-4 lg:col-span-3">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="rounded-lg overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 h-40 relative p-4 text-white flex items-center justify-center">
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" className="w-24 h-24 rounded-full object-cover border-4 border-white" />
              ) : (
                <div className="text-5xl font-bold">{name ? name[0].toUpperCase() : "U"}</div>
              )}
            </div>

            <div className="mt-4 text-center">
              <h3 className="text-xl font-semibold">{name || "No name"}</h3>
              <p className="text-sm text-gray-500">{email}</p>
              <p className="text-sm text-gray-500">{countryCode} {phone}</p>
            </div>

            <div className="mt-6 space-y-3">
              {sections.map((s) => {
                const entries = Object.entries((profile as any)[s.key] || {}) as [string,   string | null][];
                return entries.length ? (
                  <div key={s.key}>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase">{s.title}</h4>
                    <div className="mt-2 space-y-1">
                      {entries.map(([k, v]) => {
                        if (v === null) {
                          return (
                            <div key={k} className="flex items-center gap-3 opacity-60 text-sm text-rose-600">
                              <div className="w-8 h-8 bg-rose-50 rounded-full flex items-center justify-center text-rose-600">!</div>
                              <div className="text-sm">
                                <div className="font-medium">{getPlatformTitle(k)}</div>
                                <div className="text-xs">Will be removed after save</div>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div key={k} className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">•</div>
                            <div className="text-sm text-gray-700">
                              <div className="font-medium">{getPlatformTitle(k)}</div>
                              <a href={String(v)} target="_blank" rel="noreferrer" className="text-xs text-gray-500 break-all inline-block">
                                {v}
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        </div>

        {/* Center Column – Editor */}
        <div className="col-span-12 md:col-span-8 lg:col-span-6">
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            {/* Basic Info Section */}
            <div className="space-y-4">
              {/* Row 1 — Name + Email + Phone */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Name */}
                <input
                  className="border rounded px-3 py-2 w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                />

                {/* Email */}
                <input
                  className="border rounded px-3 py-2 w-full"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                />

                {/* Phone (with country code box) */}
                <div className="flex items-center w-full">
                  <div
                    className="
                        flex items-center
                        border border-gray-300
                        bg-gray-50
                        rounded-l-lg
                        px-2
                        h-[42px]
                        text-sm text-gray-700
                      "
                  >
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="bg-transparent outline-none cursor-pointer text-sm"
                    >
                      <option value="+20">+20</option>
                      <option value="+971">+971</option>
                      <option value="+966">+966</option>
                      <option value="+1">+1</option>
                    </select>
                  </div>

                  <input
                    className="border border-gray-300 border-l-0 rounded-r-lg px-3 h-[42px] w-full text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone number"
                  />
                </div>
              </div>

              {/* Row 2 — Job + Password + Avatar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  className="border rounded px-3 py-2 w-full"
                  value={job}
                  onChange={(e) => setJob(e.target.value)}
                  placeholder="Job / Title"
                />

                <input
                  className="border rounded px-3 py-2 w-full"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="New password (optional)"
                />

                <label className="px-4 py-2 bg-indigo-600 text-white rounded text-center cursor-pointer w-full">
                  Upload avatar
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => onAvatarChange(e.target.files?.[0])} />
                </label>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b pb-2 overflow-x-auto">
              {sections.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setActiveTab(s.key)}
                  className={`px-3 py-2 rounded-t ${activeTab === s.key ? "bg-white border-l border-r border-t -mb-px text-indigo-600" : "text-gray-600"}`}
                >
                  {s.title}
                </button>
              ))}
            </div>

            {/* Field Editor */}
            <div className="bg-slate-50 p-4 rounded">
              <div className="space-y-3">
                {Object.entries(profile[activeTab] || {}).length === 0 && <div className="text-gray-500">No links in this section yet. Add one with "Add Link".</div>}

                {(Object.entries(profile[activeTab] || {}) as [string, string | null][]).map(([plat, val]) => {
                  const platInfo = platforms.find((p) => p.id === plat);
                  const title = platInfo?.title || plat;
                  const isPendingDelete = val === null;

                  return (
                    <div
                      key={plat}
                      draggable
                      onDragStart={(e) => handleDragStart(e, activeTab, plat)}
                      onDragOver={allowDrop}
                      onDrop={(e) => handleDrop(e, activeTab, plat)}
                      className="
                        p-4 
                        rounded-lg 
                        border 
                        bg-white 
                        flex 
                        flex-col 
                        gap-3 
                        shadow-sm
                      "
                    >
                      {/* ---------- HEADER (Title + Actions) ---------- */}
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <div className="cursor-move text-gray-400 text-lg">≡</div>
                          <span className="font-semibold text-gray-700">{title}</span>
                          {isPendingDelete && (
                            <span className="text-xs text-red-500">(will be removed)</span>
                          )}
                        </div>
                  
                        {/* ACTION BUTTONS */}
                        <div className="flex items-center gap-2">
                          {!isPendingDelete && (
                            <button
                              title="Open"
                              onClick={() => {
                                const url = String(val ?? "");
                                if (url) window.open(url, "_blank");
                              }}
                              className="p-2 border rounded hover:bg-gray-100 flex items-center justify-center"
                            >
                              <ExternalLink size={16} />
                            </button>
                          )}
                  
                          {isPendingDelete ? (
                            <button
                              title="Undo"
                              onClick={() => undoDelete(activeTab, plat)}
                              className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                            >
                              Undo
                            </button>
                          ) : (
                            <button
                              title="Delete"
                              onClick={() => deleteField(activeTab, plat)}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                  
                      {/* ---------- INPUT FIELD ---------- */}
                      {isPendingDelete ? (
                        <input
                          disabled
                          value={deletedBuffer[activeTab]?.[plat] ?? ""}
                          placeholder="(will be removed)"
                          className="border rounded px-3 py-2 bg-red-50 text-red-700"
                        />
                      ) : (
                        <input
                          className="border rounded px-3 py-2 w-full"
                          value={String(val ?? "")}
                          onChange={(e) =>
                            setProfile((prev) => ({
                              ...prev,
                              [activeTab]: {
                                ...(prev as any)[activeTab],
                                [plat]: e.target.value,
                              },
                            }))
                          }
                        />
                      )}
                  
                      {/* ---------- CATEGORY LABEL ---------- */}
                      <span className="text-xs text-gray-400">{platInfo?.category || "other"}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {error && <div className="text-red-600">{error}</div>}

            {/* Buttons */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-3 mt-4">
              <button onClick={() => setShowAddDialog(true)} className="px-4 py-2 bg-purple-600 text-white rounded w-full md:w-auto">
                + Add Link
              </button>

              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <button onClick={() => (window.location.href = "/")} className="px-4 py-2 border rounded w-full md:w-auto">
                  Cancel
                </button>

                <button onClick={saveProfile} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded w-full md:w-auto">
                  {saving ? "Saving..." : "Save & Continue"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Fields library */}
        <div className="col-span-12 md:col-span-6 lg:col-span-3">
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold mb-2">Fields</h3>

            <div className="mb-3">
              <input className="w-full border rounded px-3 py-2" placeholder="Search platform" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-auto">
              {["Most popular", "Social", "Communication", "Payment", "Other"].map((group) => {
                const list = filteredPlatforms.filter((p) => {
                  if (group === "Most popular") return true;
                  return (p.category || "other").toLowerCase().includes(group.toLowerCase());
                });
                if (!list.length) return null;
                return (
                  <div key={group}>
                    <div className="text-xs text-gray-500 uppercase mb-2">{group}</div>
                    <div className="flex flex-wrap gap-2">
                      {list.slice(0, 20).map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setSelectedPlatform(p.id);
                            setSelectedValue("");
                            setShowAddDialog(true);
                          }}
                          className="px-3 py-1 border rounded text-sm bg-purple-50"
                        >
                          {p.title}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Add dialog */}
        {showAddDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg w-[640px] p-6">
              <h3 className="text-lg font-semibold mb-4">Add Link</h3>

              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">Platform</label>
                <select value={selectedPlatform} onChange={(e) => setSelectedPlatform(e.target.value)} className="w-full border rounded px-3 py-2">
                  <option value="">Choose platform</option>
                  {platforms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">Value (URL / username / phone)</label>
                <input className="w-full border rounded px-3 py-2" value={selectedValue} onChange={(e) => setSelectedValue(e.target.value)} />
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setShowAddDialog(false)} className="px-4 py-2 border rounded">
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!selectedPlatform) return alert("Choose platform");
                    const plat = platforms.find((p) => p.id === selectedPlatform);
                    if (!plat) return alert("Invalid platform");
                    if (plat.requires === "phone" && !isPhone(selectedValue) && !isPhone(digitsOnly(selectedValue))) {
                      return alert("Please provide a valid phone number");
                    }
                    if (plat.requires === "url" && !isUrl(selectedValue)) {
                      return alert("Please provide a valid URL (https://...)");
                    }
                    if (plat.requires === "text" && !selectedValue.trim()) {
                      return alert("Value required");
                    }

                    addPlatformToProfile(selectedPlatform, selectedValue);
                    setShowAddDialog(false);
                    setSelectedPlatform("");
                    setSelectedValue("");
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
