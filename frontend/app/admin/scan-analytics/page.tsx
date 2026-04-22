"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import AdminSidebar from "../AdminSidebar";

interface ScanLogItem {
  code: string;
  scannedAt: string;
  userAgent: string;
}

export default function ScanAnalyticsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<ScanLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("admin-token");
    if (!token) {
      router.push("/login");
      return;
    }

    (async () => {
      try {
        const res = await api.get("/admin/scan-analytics", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLogs(res.data || []);
      } catch (err) {
        console.error(err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading)
    return <p className="text-center mt-10">Loading scans...</p>;

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-5xl mx-auto space-y-4">

          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Scan Analytics</h1>

            <button
              className="text-blue-600 underline"
              onClick={() => router.push("/admin/dashboard")}
            >
              Back to Dashboard
            </button>
          </div>

          {/* Logs table */}
          <div className="bg-white p-4 rounded shadow">
            {logs.length === 0 ? (
              <p className="text-gray-500 text-center">No scans found.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2">QR Code</th>
                    <th className="py-2">Scanned At</th>
                    <th className="py-2">Device</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={i} className="border-b last:border-none">
                      <td className="py-2 font-mono">{log.code}</td>
                      <td className="py-2">
                        {new Date(log.scannedAt).toLocaleString()}
                      </td>
                      <td className="py-2 text-gray-600">{log.userAgent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
