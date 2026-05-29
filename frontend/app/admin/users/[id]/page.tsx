"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import AdminSidebar from "../../AdminSidebar";
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

export default function UserDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [qrs, setQrs] = useState<any[]>([]);
  const [allQrs, setAllQrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    email: "",
    phone: "",
    job: "",
    avatar: "",
  });

  // Profile editing
  const [profile, setProfile] = useState<ProfileSections>(EMPTY_PROFILE);
  const [activeTab, setActiveTab] = useState<keyof ProfileSections>("social");
  const [deletedBuffer, setDeletedBuffer] = useState<Record<string, Record<string, string>>>({});
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [selectedValue, setSelectedValue] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const dragItem = useRef<{ section: keyof ProfileSections; key: string } | null>(null);

  const [selectedQR, setSelectedQR] = useState("");

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
    const token = localStorage.getItem("admin-token");
    if (!token) return router.push("/login");

    (async () => {
      try {
        // Load platforms
        try {
          const pf = await api.get("/fields");
          setPlatforms(pf.data.platforms || fallbackPlatforms());
        } catch {
          setPlatforms(fallbackPlatforms());
        }

        // Get users
        const usersRes = await api.get("/admin/users", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const foundUser = usersRes.data.users.find((u: any) => u._id === userId);
        if (!foundUser) return router.push("/admin/users");

        setUser(foundUser);

        setEditData({
          name: foundUser.name || "",
          email: foundUser.email || "",
          phone: foundUser.phone || "",
          job: foundUser.job || "",
          avatar: foundUser.avatar || "",
        });

        // Load profile with better normalization
        if (foundUser.profile) {
          const normalizeSection = (sec: any) => {
            if (!sec) return {};
            
            // Check if it's already a plain object
            if (sec && typeof sec === 'object' && !Array.isArray(sec)) {
              const out: Record<string, string> = {};
              
              // Handle Map-like objects
              if (typeof sec.entries === "function") {
                try {
                  for (const [k, v] of sec.entries()) {
                    if (k && v !== null && v !== undefined) {
                      out[k] = String(v);
                    }
                  }
                } catch (e) {
                  console.error("Error iterating entries:", e);
                }
              } else {
                // Handle plain objects
                try {
                  const keys = Object.keys(sec);
                  for (const k of keys) {
                    const val = sec[k];
                    if (k && val !== null && val !== undefined && typeof val !== 'object') {
                      out[k] = String(val);
                    }
                  }
                } catch (e) {
                  console.error("Error processing object:", e);
                }
              }
              
              return out;
            }
            
            return {};
          };

          const loadedProfile = {
            social: normalizeSection(foundUser.profile.social),
            contact: normalizeSection(foundUser.profile.contact),
            payment: normalizeSection(foundUser.profile.payment),
            video: normalizeSection(foundUser.profile.video),
            music: normalizeSection(foundUser.profile.music),
            design: normalizeSection(foundUser.profile.design),
            gaming: normalizeSection(foundUser.profile.gaming),
            other: normalizeSection(foundUser.profile.other),
          };

          console.log("Loaded profile:", loadedProfile);
          setProfile(loadedProfile);
        }

        // Get QRs
        const qrRes = await api.get("/admin/qrs", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setAllQrs(qrRes.data);
        setQrs(qrRes.data.filter((qr: any) => qr.userId?._id === userId));
      } catch {
        router.push("/admin/dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [router, userId]);

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

  function isEmail(v: string) {
    return !v.trim() || /\S+@\S+\.\S+/.test(v);
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
    if (platform.id === "whatsapp") {
      let digits = digitsOnly(value);
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

  function deleteField(section: keyof ProfileSections, key: string) {
    setProfile((prev) => {
      const sectionObj = { ...(prev as any)[section] };
      const prevVal = sectionObj[key] ?? "";
      setDeletedBuffer((buf) => {
        const copy = { ...buf };
        if (!copy[section]) copy[section] = {};
        copy[section][key] = String(prevVal);
        return copy;
      });
      sectionObj[key] = null;
      return { ...prev, [section]: sectionObj };
    });
  }

  function undoDelete(section: keyof ProfileSections, key: string) {
    setDeletedBuffer((buf) => {
      const copy = { ...buf };
      const prevVal = copy[section]?.[key];
      setProfile((prev) => {
        const sectionObj = { ...(prev as any)[section] };
        if (prevVal !== undefined) {
          sectionObj[key] = prevVal;
        } else {
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

  function getPlatformTitle(id: string) {
    return platforms.find((p) => p.id === id)?.title || id;
  }

  const filteredPlatforms = platforms.filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const saveUser = async () => {
    const token = localStorage.getItem("admin-token");

    if (!isEmail(editData.email)) {
      return alert("Invalid email");
    }

    try {
      const cleanProfile: any = {};
      for (const section of Object.keys(profile) as (keyof ProfileSections)[]) {
        cleanProfile[section] = { ...profile[section] };
      }
      if (avatarFile) {
        const fd = new FormData();
        fd.append("file", avatarFile);
      
        const res = await api.post(`/admin/users/${userId}/avatar`, fd, {
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": undefined,
  },
});

      
        editData.avatar = res.data.url;
      }
      
      // ⭐ Use the new endpoint for profile updates
      const response = await api.put(
        `/admin/users/${userId}`,
        {
          ...editData,
          profile: cleanProfile,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert("User updated successfully");

      // Reload the page to fetch fresh data
      window.location.reload();
      
    } catch (error: any) {
      console.error("Save error:", error);
      alert(error?.response?.data?.message || "Failed to save user");
    }
  };

  const createQRForUser = async () => {
    const token = localStorage.getItem("admin-token");
    const res = await api.post(
      `/admin/users/${userId}/qrs`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    alert("QR Created & Linked: " + res.data.qr.code);
    router.refresh();
  };

  const linkExistingQR = async () => {
    if (!selectedQR) return alert("Select a QR");
    const token = localStorage.getItem("admin-token");
    await api.patch(
      `/admin/users/${userId}/qrs/link`,
      { code: selectedQR },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    alert("QR Linked!");
    router.refresh();
  };

  const unlinkQR = async (code: string) => {
    const token = localStorage.getItem("admin-token");
    await api.patch(`/admin/qrs/${code}/unlink`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    alert("QR Unlinked");
    router.refresh();
  };

  const deleteUser = async () => {
    if (!confirm("Are you sure?")) return;
    const token = localStorage.getItem("admin-token");
    await api.delete(`/admin/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    alert("User deleted");
    router.push("/admin/users");
  };

  const resetPassword = async () => {
    const token = localStorage.getItem("admin-token");
    const res = await api.post(
      `/admin/users/${userId}/reset-password`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    alert("Temporary Password: " + res.data.tempPassword);
  };

  if (loading) return <p className="text-center mt-20">Loading user...</p>;
  if (!user) return <p className="text-center text-red-600 mt-20">User not found</p>;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />

      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* HEADER */}
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">User: {user.name}</h1>
            <button className="text-blue-600 underline" onClick={() => router.push("/admin/users")}>
              Back
            </button>
          </div>

          {/* USER CARD */}
          <div className="bg-white p-5 rounded-lg shadow">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-semibold">User Details</h2>
              {!isEditing && (
                <button className="px-3 py-1 bg-yellow-500 text-white rounded" onClick={() => setIsEditing(true)}>
                  Edit User
                </button>
              )}
            </div>

            {!isEditing ? (
              <>
                <p><b>Name:</b> {user.name}</p>
                {user.email && <p><b>Public Email:</b> {user.email}</p>}
                {user.phone && <p><b>Login Phone:</b> {user.phone}</p>}
                {user.job && <p><b>Job:</b> {user.job}</p>}

                <button className="mt-3 px-4 py-2 bg-purple-600 text-white rounded" onClick={resetPassword}>
                  Reset Password
                </button>

                <button className="mt-4 px-4 py-2 bg-red-600 text-white rounded" onClick={deleteUser}>
                  Delete User
                </button>
              </>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Name</label>
                  <input
                    className="border px-3 py-2 rounded w-full"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1">Public Email</label>
                  <input
                    className="border px-3 py-2 rounded w-full"
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    placeholder="Optional"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm mb-1">Login Phone</label>
                  <div className="border px-3 py-2 rounded w-full bg-gray-50 text-gray-700">
                    {editData.phone || "-"}
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-1">Job</label>
                  <input
                    className="border px-3 py-2 rounded w-full"
                    value={editData.job}
                    onChange={(e) => setEditData({ ...editData, job: e.target.value })}
                  />
                </div>

                <div className="col-span-2 space-y-3">
                <label className="block text-sm mb-1">Avatar</label>

                <div className="flex items-center gap-4">
                  {(avatarPreview || editData.avatar) && (
                    <img
                      src={avatarPreview || editData.avatar}
                      className="w-16 h-16 rounded-full object-cover border"
                      alt="avatar"
                    />
                  )}

                  <label className="px-4 py-2 bg-indigo-600 text-white rounded cursor-pointer">
                    Upload Image
                    <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      setAvatarFile(file);

                      const reader = new FileReader();
                      reader.onload = () => {
                        setAvatarPreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />

                  </label>
                </div>
              </div>

              </div>
            )}
          </div>

          {/* PROFILE EDITOR (ONLY IN EDIT MODE) */}
          {isEditing && (
            <div className="bg-white p-5 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Profile Links</h2>

              {/* Tabs */}
              <div className="flex gap-2 border-b pb-2 overflow-x-auto mb-4">
                {sections.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setActiveTab(s.key)}
                    className={`px-3 py-2 rounded-t ${
                      activeTab === s.key ? "bg-white border-l border-r border-t -mb-px text-indigo-600" : "text-gray-600"
                    }`}
                  >
                    {s.title}
                  </button>
                ))}
              </div>

              {/* Field Editor */}
              <div className="bg-slate-50 p-4 rounded mb-4">
                <div className="space-y-3">
                  {Object.entries(profile[activeTab] || {}).length === 0 && (
                    <div className="text-gray-500">No links in this section yet.</div>
                  )}

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
                        className="p-4 rounded-lg border bg-white flex flex-col gap-3 shadow-sm"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <div className="cursor-move text-gray-400 text-lg">≡</div>
                            <span className="font-semibold text-gray-700">{title}</span>
                            {isPendingDelete && <span className="text-xs text-red-500">(will be removed)</span>}
                          </div>

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

                        <span className="text-xs text-gray-400">{platInfo?.category || "other"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button onClick={() => setShowAddDialog(true)} className="px-4 py-2 bg-purple-600 text-white rounded">
                + Add Link
              </button>

              {/* Save Buttons */}
              <div className="flex gap-3 mt-6">
                <button onClick={saveUser} className="px-6 py-2 bg-green-600 text-white rounded">
                  Save Changes
                </button>
                <button onClick={() => setIsEditing(false)} className="px-6 py-2 border rounded">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* QR SECTION */}
          <div className="bg-white p-5 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-3">Linked QR Codes ({qrs.length})</h2>

            <div className="flex gap-3 mb-4">
              <button onClick={createQRForUser} className="px-4 py-2 bg-blue-600 text-white rounded">
                Create QR for this User
              </button>

              <select
                className="border px-3 py-2 rounded"
                value={selectedQR}
                onChange={(e) => setSelectedQR(e.target.value)}
              >
                <option value="">Select QR to Link</option>
                {allQrs
                  .filter((qr) => !qr.userId)
                  .map((qr) => (
                    <option key={qr.code} value={qr.code}>
                      {qr.code}
                    </option>
                  ))}
              </select>

              <button onClick={linkExistingQR} className="px-3 py-2 bg-green-600 text-white rounded">
                Link
              </button>
            </div>

            {qrs.length === 0 ? (
              <p className="text-gray-500">No QR codes linked.</p>
            ) : (
              <ul className="space-y-3">
                {qrs.map((qr) => (
                  <li key={qr.code} className="p-3 border rounded flex justify-between items-center bg-gray-50">
                    <div>
                      <p className="font-medium">{qr.code}</p>
                      <p className="text-xs text-gray-500">Created: {new Date(qr.createdAt).toLocaleString()}</p>
                    </div>

                    <div className="flex gap-3">
                      <button className="px-3 py-1 border rounded" onClick={() => router.push(`/admin/qr/${qr.code}`)}>
                        Open
                      </button>

                      <button className="px-3 py-1 bg-yellow-500 text-white rounded" onClick={() => unlinkQR(qr.code)}>
                        Unlink
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Add Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg w-[640px] p-6">
            <h3 className="text-lg font-semibold mb-4">Add Link</h3>

            <div className="mb-3">
              <label className="block text-sm text-gray-600 mb-1">Platform</label>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
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
              <input
                className="w-full border rounded px-3 py-2"
                value={selectedValue}
                onChange={(e) => setSelectedValue(e.target.value)}
              />
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
  );
}
