"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import AdminSidebar from "../AdminSidebar";

export default function AdminDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [latestUsers, setLatestUsers] = useState<any[]>([]);
  const [latestQRs, setLatestQRs] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("admin-token");

    if (!token) {
      router.push("/login");
      return;
    }

    (async () => {
      try {
        // 1) Overview
        const o = await api.get("/admin/overview", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOverview(o.data);

        // 2) Users (limit 5)
        const users = await api.get("/admin/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLatestUsers(users.data.users.slice(0, 5));

        // 3) QRs (limit 5)
        const qrs = await api.get("/admin/qrs", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLatestQRs(qrs.data.slice(0, 5));

      } catch (err) {
        console.error(err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="text-center mt-10">Loading dashboard...</p>;

  return (
    <div className="flex min-h-screen bg-gray-100">

      {/* Sidebar Fixed */}
      <AdminSidebar />

      {/* MAIN CONTENT */}
      <div className="flex-1 p-6">

        <div className="max-w-5xl mx-auto space-y-6">

          {/* Title */}
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>

          {/* Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card title="Users" value={overview.totalUsers} />
            <Card title="QR Codes" value={overview.totalQRs} />
            <Card title="Linked QR" value={overview.linkedQRs} />
            <Card title="Total Scans" value={overview.totalScans} />
          </div>

          {/* Latest Users */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between mb-3">
              <h2 className="text-lg font-semibold">Latest Users</h2>
              <button
                onClick={() => router.push("/admin/users")}
                className="text-blue-600 underline"
              >
                View All
              </button>
            </div>

            {latestUsers.length === 0 ? (
              <p className="text-gray-500">No users found.</p>
            ) : (
              <ul>
                {latestUsers.map((u) => (
                  <li key={u._id} className="py-2 border-b last:border-none">
                    {u.name} – {u.email}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Latest QRs */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between mb-3">
              <h2 className="text-lg font-semibold">Latest QR Codes</h2>
              <button
                onClick={() => router.push("/admin/qrs")}
                className="text-blue-600 underline"
              >
                View All
              </button>
            </div>

            {latestQRs.length === 0 ? (
              <p className="text-gray-500">No QR codes found.</p>
            ) : (
              <ul>
                {latestQRs.map((qr) => (
                  <li key={qr.code} className="py-2 border-b last:border-none">
                    {qr.code} {qr.userId ? "(linked)" : "(unlinked)"}
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

function Card({ title, value }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-4 text-center">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
