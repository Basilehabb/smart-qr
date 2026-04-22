"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import AdminSidebar from "../AdminSidebar";

export default function AdminQRsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [qrs, setQrs] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const [admin, setAdmin] = useState<any | null>(null);

  // For Create QR Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCode, setNewCode] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("admin-token");

    if (!token) {
      router.push("/login");
      return;
    }

    (async () => {
      try {
        const me = await api.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!me.data.user.isAdmin) {
          router.push("/login");
          return;
        }

        setAdmin(me.data.user);

        const res = await api.get("/admin/qrs", {
          headers: { Authorization: `Bearer ${token}` }
        });

        setQrs(res.data);
      } catch (err) {
        console.error(err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);


  // ==========================
  // Create QR
  // ==========================
  const createQR = async () => {
    const token = localStorage.getItem("admin-token");

    try {
      const res = await api.post(
        "/admin/qrs",
        { code: newCode }, // لو فاضية → backend يعمل auto-generate
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setQrs(prev => [...prev, res.data.qr]); // add to list
      setNewCode("");
      setShowCreateModal(false);

      alert("QR Created Successfully!");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to create QR");
    }
  };


  // ==========================
  // Delete QR
  // ==========================
  const deleteQR = async (code: string) => {
    if (!confirm("Delete this QR?")) return;

    const token = localStorage.getItem("admin-token");

    await api.delete(`/admin/qrs/${code}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    setQrs(prev => prev.filter(q => q.code !== code));
  };

  // ==========================
  // Unlink QR
  // ==========================
  const unlinkQR = async (code: string) => {
    if (!confirm("Unlink this QR?")) return;

    const token = localStorage.getItem("admin-token");

    await api.patch(`/admin/qrs/${code}/unlink`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });

    setQrs(prev =>
      prev.map(q =>
        q.code === code ? { ...q, userId: null } : q
      )
    );
  };

  if (loading) return <p className="text-center mt-20">Loading...</p>;

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">All QR Codes</h1>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              + Create QR
            </button>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search code or user..."
            className="px-4 py-2 border rounded w-full mb-4"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* QR Table */}
          <div className="bg-white rounded-lg shadow p-4">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left">QR Code</th>
                  <th className="py-2 text-left">Linked User</th>
                  <th className="py-2"></th>
                </tr>
              </thead>

              <tbody>
                {qrs
                  .filter(q =>
                    q.code.toLowerCase().includes(search.toLowerCase()) ||
                    (q.userId?.name || "").toLowerCase().includes(search.toLowerCase())
                  )
                  .map(qr => (
                    <tr key={qr.code} className="border-b">
                      <td className="py-2">{qr.code}</td>

                      <td className="py-2">
                        {qr.userId ? (
                          <>
                            <span className="font-medium">{qr.userId.name}</span><br />
                            <span className="text-gray-500 text-sm">{qr.userId.email}</span>
                          </>
                        ) : (
                          <span className="text-gray-400">Not Linked</span>
                        )}
                      </td>

                      <td className="py-2 text-right space-x-2">
                        {/* Open QR */}
                        <a
                          href={`/admin/qr/${qr.code}`}
                          target="_blank"
                          className="px-3 py-1 bg-blue-600 text-white rounded"
                        >
                          Open
                        </a>

                        {/* Unlink */}
                        {qr.userId && (
                          <button
                            onClick={() => unlinkQR(qr.code)}
                            className="px-3 py-1 bg-yellow-500 text-white rounded"
                          >
                            Unlink
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => deleteQR(qr.code)}
                          className="px-3 py-1 bg-red-600 text-white rounded"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {qrs.length === 0 && (
              <p className="text-center text-gray-500 py-4">No QR codes found.</p>
            )}
          </div>

        </div>
      </div>

      {/* ===============================
          CREATE QR MODAL
      =============================== */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Create New QR</h2>

            <input
              className="border px-3 py-2 rounded w-full mb-3"
              placeholder="QR Code (optional)"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
            />

            <p className="text-gray-500 text-sm mb-3">
              * لو سيبتها فاضية: النظام هيعمل QR كود تلقائي
            </p>

            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 border rounded"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-green-600 text-white rounded"
                onClick={createQR}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
