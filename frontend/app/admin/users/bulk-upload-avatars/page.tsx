"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import AdminSidebar from "../../AdminSidebar";
import axios from "axios";


export default function BulkAvatarsPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const upload = async () => {
    if (!files.length) return alert("اختر صور");

    setLoading(true);
    setResult(null);

    try {
      const token = localStorage.getItem("admin-token");
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));

      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/users/bulk-upload-avatars`,
        fd,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            // ❌ متحطش Content-Type
          },
        }
      );

      setResult(res.data.results);
    } catch (e: any) {
      alert(e?.response?.data?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />

      <div className="flex-1 p-6">
        <div className="max-w-3xl mx-auto space-y-6 bg-white p-6 rounded shadow">

          <h1 className="text-2xl font-bold">Bulk Upload Avatars</h1>

          <p className="text-sm text-gray-600">
            📌 اسم الصورة لازم يكون الإيميل:
            <br />
            example@gmail.com.jpg
          </p>

          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) =>
              setFiles(Array.from(e.target.files || []))
            }
          />

          <button
            onClick={upload}
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 text-white rounded"
          >
            {loading ? "Uploading..." : "Upload Images"}
          </button>

          {result && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-green-600">
                  ✅ Success ({result.success.length})
                </h3>
                {result.success.map((r: any, i: number) => (
                  <div key={i} className="text-sm">
                    {r.email}
                  </div>
                ))}
              </div>

              <div>
                <h3 className="font-semibold text-red-600">
                  ❌ Failed ({result.failed.length})
                </h3>
                {result.failed.map((r: any, i: number) => (
                  <div key={i} className="text-sm">
                    {r.file} – {r.error}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
