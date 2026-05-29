"use client";

import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import AdminSidebar from "../AdminSidebar";
import qs from "qs";

function buildQueryFromURL() {
  if (typeof window === "undefined") return {};
  return Object.fromEntries(new URLSearchParams(window.location.search));
}

export default function AdminUsersPage() {
  const router = useRouter();

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // filters state (keeps in sync with URL)
  const [search, setSearch] = useState("");
  const [isAdmin, setIsAdmin] = useState<string>(""); // "" | "true" | "false"
  const [hasQR, setHasQR] = useState<string>("");
  const [job, setJob] = useState("");
  const [phoneExists, setPhoneExists] = useState<string>("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [showDrawer, setShowDrawer] = useState(false);


  useEffect(() => {
    const q = buildQueryFromURL();
    if (q.search) setSearch(String(q.search));
    if (q.isAdmin) setIsAdmin(String(q.isAdmin));
    if (q.hasQR) setHasQR(String(q.hasQR));
    if (q.job) setJob(String(q.job));
    if (q.phoneExists) setPhoneExists(String(q.phoneExists));
    if (q.createdFrom) setCreatedFrom(String(q.createdFrom));
    if (q.createdTo) setCreatedTo(String(q.createdTo));
    if (q.sort) setSort(String(q.sort));
    if (q.page) setPage(Number(q.page));
    if (q.limit) setLimit(Number(q.limit));
  
    fetchUsers(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // build query object from state
  const currentQuery = useMemo(() => ({
    search: search || undefined,
    isAdmin: isAdmin || undefined,
    hasQR: hasQR || undefined,
    job: job || undefined,
    phoneExists: phoneExists || undefined,
    createdFrom: createdFrom || undefined,
    createdTo: createdTo || undefined,
    sort: sort || undefined,
    page: page || 1,
    limit: limit || 20,
  }), [search, isAdmin, hasQR, job, phoneExists, createdFrom, createdTo, sort, page, limit]);

  // Fetch users with current query and update URL
  async function fetchUsers(overrides?: any) {
    setLoading(true);
    try {
      const q = { ...currentQuery, ...(overrides || {}) };
      // remove undefined
      Object.keys(q).forEach(k => q[k] === undefined && delete q[k]);

      const queryString = qs.stringify(q, { addQueryPrefix: true, arrayFormat: "brackets" });

      const token = localStorage.getItem("admin-token");
      const res = await api.get(`/admin/users${queryString}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUsers(res.data.users || []);

      // push query to URL without full page reload
      if (typeof window !== "undefined") {
        const newUrl = window.location.pathname + queryString;
        window.history.replaceState({}, "", newUrl);
      }

    } catch (e) {
      console.error("fetch users error:", e);
    } finally {
      setLoading(false);
    }
  }

  // handle apply filters
  function applyFilters() {
    setPage(1);
    fetchUsers({ page: 1 });
    setShowDrawer(false);
  }

  function clearFilters() {
    setSearch("");
    setIsAdmin("");
    setHasQR("");
    setJob("");
    setPhoneExists("");
    setCreatedFrom("");
    setCreatedTo("");
    setSort("newest");
    setPage(1);
    setLimit(20);
    fetchUsers({});
  }

  // delete user
  const deleteUser = async (userId: string) => {
    if (!confirm("هل تريد حذف هذا المستخدم؟")) return;

    const token = localStorage.getItem("admin-token");

    await api.delete(`/admin/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    fetchUsers();
  };

  if (loading) return <p className="text-center mt-20">Loading...</p>;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />

      <div className="flex-1 p-6">
        <div className="max-w-5xl mx-auto space-y-6">

          <div className="bg-white p-5 rounded shadow">

            {/* HEADER */}
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold">Users</h1>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowDrawer(true)}
                  className="px-4 py-2 border rounded"
                >
                  Filters
                </button>

                <button
                onClick={() => router.push("/register?from=admin")}
                className="px-4 py-2 bg-green-600 text-white rounded"
                >
                  + Create User
                </button>
              </div>
            </div>

            <input
              className="border px-3 py-2 rounded w-full mb-4"
              placeholder="Search users..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1); // always go to first page on search
              }}
            />

            <div className="bg-white rounded shadow">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-sm text-gray-600">
                    <th className="p-3">Name</th>
                    <th>Phone</th>
                    <th>QRs</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user._id}
                      className="border-b hover:bg-gray-50 text-sm"
                    >
                      <td className="p-3">{user.name}</td>
                      <td>{user.phone || user.email || "-"}</td>

                      <td>{user.qrCount ?? 0}</td>

                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => window.location.href = `/admin/users/${user._id}`}
                          className="px-3 py-1 rounded bg-blue-600 text-white"
                        >
                          View
                        </button>

                        <button
                          onClick={() => deleteUser(user._id)}
                          className="px-3 py-1 rounded bg-red-600 text-white"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {users.length === 0 && (
                <p className="p-4 text-center text-gray-500">No users found</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters Drawer */}
      {showDrawer && (
        <div className="fixed right-0 top-0 h-full w-[360px] bg-white shadow p-4 z-50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Filters</h3>
            <button onClick={() => setShowDrawer(false)} className="px-2 py-1 border rounded">Close</button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Role (isAdmin)</label>
              <select value={isAdmin} onChange={(e) => setIsAdmin(e.target.value)} className="w-full border rounded px-2 py-1">
                <option value="">Any</option>
                <option value="true">Admin</option>
                <option value="false">User</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Has QR</label>
              <select value={hasQR} onChange={(e) => setHasQR(e.target.value)} className="w-full border rounded px-2 py-1">
                <option value="">Any</option>
                <option value="true">Has QR</option>
                <option value="false">No QR</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Job (contains)</label>
              <input value={job} onChange={(e) => setJob(e.target.value)} className="w-full border rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm mb-1">Phone exists</label>
              <select value={phoneExists} onChange={(e) => setPhoneExists(e.target.value)} className="w-full border rounded px-2 py-1">
                <option value="">Any</option>
                <option value="true">Has phone</option>
                <option value="false">No phone</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Created From</label>
              <input type="date" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)} className="w-full border rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm mb-1">Created To</label>
              <input type="date" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)} className="w-full border rounded px-2 py-1" />
            </div>

            <div>
              <label className="block text-sm mb-1">Sort</label>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="w-full border rounded px-2 py-1">
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="name_asc">Name A-Z</option>
                <option value="name_desc">Name Z-A</option>
                <option value="email_asc">Phone A-Z</option>
                <option value="email_desc">Phone Z-A</option>
              </select>
            </div>

            <div className="flex gap-2 mt-3">
              <button onClick={applyFilters} className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded">Apply</button>
              <button onClick={clearFilters} className="flex-1 px-3 py-2 border rounded">Clear</button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
