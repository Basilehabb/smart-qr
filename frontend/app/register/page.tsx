"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { ExternalLink } from "lucide-react";
import {
  PLATFORM_DEFINITIONS,
  getBasePlatformId,
  getNextPlatformKey,
  getProfileEntryTitle,
  normalizeLink,
} from "@/lib/normalizeLink";

const API = process.env.NEXT_PUBLIC_API_URL;

type Platform = {
  id: string;
  title: string;
  category?: string;
  requires?: "phone" | "url" | "text" | null;
  template?: string | null;
  icon?: string | null;
};

type ProfileSections = {
  social: Record<string, string>;
  contact: Record<string, string>;
  payment: Record<string, string>;
  video: Record<string, string>;
  music: Record<string, string>;
  design: Record<string, string>;
  gaming: Record<string, string>;
  other: Record<string, string>;
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

const SECTIONS = [
  { key: "social" as keyof ProfileSections, title: "Social" },
  { key: "contact" as keyof ProfileSections, title: "Contact" },
  { key: "payment" as keyof ProfileSections, title: "Payment" },
  { key: "video" as keyof ProfileSections, title: "Video" },
  { key: "music" as keyof ProfileSections, title: "Music" },
  { key: "design" as keyof ProfileSections, title: "Design" },
  { key: "gaming" as keyof ProfileSections, title: "Gaming" },
  { key: "other" as keyof ProfileSections, title: "Other" },
];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const code = searchParams.get("code");
  const from = searchParams.get("from");
  const isAdminFlow = from === "admin";

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    password: "",
    job: "",
  });
  const [profile, setProfile] = useState<ProfileSections>(EMPTY_PROFILE);
  const [activeTab, setActiveTab] = useState<keyof ProfileSections>("social");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [platforms] = useState<Platform[]>(PLATFORM_DEFINITIONS as Platform[]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [selectedValue, setSelectedValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function isPhone(value: string) {
    return /^[+\d][\d\s\-()]{4,}$/.test(value.trim());
  }

  function isValidUrlInput(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return false;

    try {
      const normalized = normalizeLink("website", trimmed);
      const url = new URL(normalized);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  function getPlatformTitle(key: string, value: string) {
    return getProfileEntryTitle(key, value);
  }

  function addPlatformToProfile(platformId: string, rawValue: string) {
    const platform = platforms.find((item) => item.id === platformId);
    if (!platform) return;

    const category = (platform.category || "other") as keyof ProfileSections;
    const entryKey = getNextPlatformKey(platform.id, profile[category] || {});
    const value = normalizeLink(platform.id, rawValue);

    setProfile((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [entryKey]: value,
      },
    }));
  }

  function updateProfileValue(section: keyof ProfileSections, key: string, value: string) {
    setProfile((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  }

  function deleteField(section: keyof ProfileSections, key: string) {
    setProfile((prev) => {
      const nextSection = { ...prev[section] };
      delete nextSection[key];
      return { ...prev, [section]: nextSection };
    });
  }

  async function uploadAvatar(token: string) {
    if (!avatarFile) return;

    const uploadData = new FormData();
    uploadData.append("file", avatarFile);

    await axios.post(`${API}/auth/upload-avatar`, uploadData, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  function buildNormalizedProfile() {
    const normalizedProfile: Partial<ProfileSections> = {};

    (Object.keys(profile) as (keyof ProfileSections)[]).forEach((section) => {
      normalizedProfile[section] = {};
      Object.entries(profile[section]).forEach(([key, value]) => {
        const trimmed = String(value || "").trim();
        if (!trimmed) return;
        normalizedProfile[section]![key] = normalizeLink(getBasePlatformId(key), trimmed);
      });
    });

    return normalizedProfile;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await axios.post(`${API}/auth/register`, {
        name: formData.name,
        phone: formData.phone,
        password: formData.password,
        job: formData.job,
      });

      const loginRes = await axios.post(`${API}/auth/login`, {
        phone: formData.phone,
        password: formData.password,
      });

      const token = loginRes.data.token;

      await axios.put(
        `${API}/auth/update`,
        { profile: buildNormalizedProfile() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await uploadAvatar(token);

      if (!isAdminFlow && code) {
        await axios.post(
          `${API}/qr/link`,
          { code },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        router.push(`/qr/${code}`);
        return;
      }

      router.push(isAdminFlow ? "/admin/users" : "/");
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const filteredPlatforms = platforms.filter((platform) =>
    platform.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen p-6 bg-slate-50">
      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-4 lg:col-span-3">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="rounded-lg overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 h-40 relative p-4 text-white flex items-center justify-center">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="avatar preview"
                  className="w-24 h-24 rounded-full object-cover border-4 border-white"
                />
              ) : (
                <div className="text-5xl font-bold">
                  {formData.name ? formData.name[0].toUpperCase() : "U"}
                </div>
              )}
            </div>

            <div className="mt-4 text-center">
              <h2 className="text-2xl font-semibold">
                {isAdminFlow ? "Create User" : "Create Account"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {formData.name || "Preview"}
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {SECTIONS.map((section) => {
                const entries = Object.entries(profile[section.key] || {});
                if (!entries.length) return null;

                return (
                  <div key={section.key}>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase">
                      {section.title}
                    </h4>
                    <div className="mt-2 space-y-1">
                      {entries.map(([key, value]) => (
                        <div key={key} className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                            •
                          </div>
                          <div className="text-sm text-gray-700">
                            <div className="font-medium">
                              {getPlatformTitle(key, value)}
                            </div>
                            <a
                              href={value}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-gray-500 break-all inline-block"
                            >
                              {value}
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="col-span-12 md:col-span-8 lg:col-span-6">
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  className="border rounded px-3 py-2 w-full"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Full name"
                  required
                />

                <input
                  className="border rounded px-3 py-2 w-full"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Phone number"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  className="border rounded px-3 py-2 w-full"
                  value={formData.job}
                  onChange={(e) => setFormData((prev) => ({ ...prev, job: e.target.value }))}
                  placeholder="Job / Title"
                />

                <input
                  className="border rounded px-3 py-2 w-full"
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  type="password"
                  placeholder="Password"
                  autoComplete="new-password"
                  required
                />

                <label className="px-4 py-2 bg-indigo-600 text-white rounded text-center cursor-pointer w-full">
                  Upload avatar
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setAvatarFile(file);
                      setAvatarPreview(URL.createObjectURL(file));
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-2 border-b pb-2 overflow-x-auto">
              {SECTIONS.map((section) => (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => setActiveTab(section.key)}
                  className={`px-3 py-2 rounded-t ${
                    activeTab === section.key
                      ? "bg-white border-l border-r border-t -mb-px text-indigo-600"
                      : "text-gray-600"
                  }`}
                >
                  {section.title}
                </button>
              ))}
            </div>

            <div className="bg-slate-50 p-4 rounded">
              <div className="space-y-3">
                {Object.entries(profile[activeTab] || {}).length === 0 ? (
                  <div className="text-gray-500">
                    No links in this section yet. Add one with "Add Link".
                  </div>
                ) : null}

                {(Object.entries(profile[activeTab] || {}) as [string, string][]).map(
                  ([key, value]) => {
                    const platformInfo = platforms.find(
                      (item) => item.id === getBasePlatformId(key)
                    );

                    return (
                      <div
                        key={key}
                        className="p-4 rounded-lg border bg-white flex flex-col gap-3 shadow-sm"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-700">
                              {getPlatformTitle(key, value)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              title="Open"
                              onClick={() => window.open(String(value || ""), "_blank")}
                              className="p-2 border rounded hover:bg-gray-100 flex items-center justify-center"
                            >
                              <ExternalLink size={16} />
                            </button>

                            <button
                              type="button"
                              title="Delete"
                              onClick={() => deleteField(activeTab, key)}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        <input
                          className="border rounded px-3 py-2 w-full"
                          value={value}
                          onChange={(e) =>
                            updateProfileValue(activeTab, key, e.target.value)
                          }
                        />

                        <span className="text-xs text-gray-400">
                          {platformInfo?.category || "other"}
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            {error ? <div className="text-red-600">{error}</div> : null}

            <div className="flex flex-col md:flex-row justify-between items-center gap-3 mt-4">
              <button
                type="button"
                onClick={() => setShowAddDialog(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded w-full md:w-auto"
              >
                + Add Link
              </button>

              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => (window.location.href = "/")}
                  className="px-4 py-2 border rounded w-full md:w-auto"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded w-full md:w-auto"
                >
                  {loading ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 md:col-span-6 lg:col-span-3">
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold mb-2">Fields</h3>

            <div className="mb-3">
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="Search platform"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-auto">
              {["Most popular", "Social", "Communication", "Payment", "Other"].map((group) => {
                const list = filteredPlatforms.filter((platform) => {
                  if (group === "Most popular") return true;
                  return (platform.category || "other")
                    .toLowerCase()
                    .includes(group.toLowerCase());
                });

                if (!list.length) return null;

                return (
                  <div key={group}>
                    <div className="text-xs text-gray-500 uppercase mb-2">{group}</div>
                    <div className="flex flex-wrap gap-2">
                      {list.slice(0, 20).map((platform) => (
                        <button
                          key={platform.id}
                          type="button"
                          onClick={() => {
                            setSelectedPlatform(platform.id);
                            setSelectedValue("");
                            setShowAddDialog(true);
                          }}
                          className="px-3 py-1 border rounded text-sm bg-purple-50"
                        >
                          {platform.title}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {showAddDialog ? (
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
                  {platforms.map((platform) => (
                    <option key={platform.id} value={platform.id}>
                      {platform.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">
                  Value (URL / username / phone)
                </label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={selectedValue}
                  onChange={(e) => setSelectedValue(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddDialog(false)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedPlatform) {
                      setError("Choose platform");
                      return;
                    }

                    const platform = platforms.find((item) => item.id === selectedPlatform);
                    if (!platform) {
                      setError("Invalid platform");
                      return;
                    }

                    if (platform.requires === "phone" && !isPhone(selectedValue)) {
                      setError("Please provide a valid phone number");
                      return;
                    }

                    if (platform.requires === "url" && !isValidUrlInput(selectedValue)) {
                      setError("Please provide a valid URL or domain");
                      return;
                    }

                    if (platform.requires === "text" && !selectedValue.trim()) {
                      setError("Value required");
                      return;
                    }

                    setError("");
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
        ) : null}
      </form>
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
