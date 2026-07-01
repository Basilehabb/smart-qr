"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const login = async () => {
    try {
      const res = await api.post("/auth/login", { phone, password });
      const token = res.data.token;
      const user = res.data.user;

      // ================
      // 1) Admin Login
      // ================
      if (user.isAdmin) {
        localStorage.setItem("admin-token", token);
        router.push("/admin/dashboard");
        return;
      }

      // ================
      // 2) Normal User Login
      // ================
      localStorage.setItem("user-token", token);

      // ================
      // 3) Return URL (Edit Profile)
      // (هذا أهم شرط → لازم يجي قبل "qr-to-link")
      // ================
      const returnUrl = localStorage.getItem("return-url");
      if (returnUrl) {
        localStorage.removeItem("return-url");
        router.push(returnUrl);
        return;
      }

      // ================
      // 4) Was user trying to link a QR?
      // ================
      const qrToLink = localStorage.getItem("qr-to-link");
      if (qrToLink) {
        await api.post(
          "/qr/link",
          { code: qrToLink },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        localStorage.removeItem("qr-to-link");
        router.push(`/qr/${qrToLink}`);
        return;
      }

      // ================
      // 5) Load user linked QR codes
      // ================
      const qrRes = await api.get("/qr/my", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const codes = qrRes.data?.codes;

      // لو المستخدم عنده QR
      if (codes?.length > 0) {
        router.push(`/qr/${codes[0]}`);
        return;
      }

      // ================
      // 6) No QR → Send him home
      // ================
      router.push("/");

    } catch (err) {
      alert("Invalid credentials, please try again.");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="rounded-xl bg-white p-6 shadow">
            <div className="relative flex h-48 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/80 bg-white/20 text-4xl font-bold">
                  {phone.trim() ? phone.trim()[0] : "S"}
                </div>
                <h2 className="text-2xl font-semibold">Smart QR</h2>
                <p className="mt-2 text-sm text-white/85">Sign in to continue to your profile or admin dashboard</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Account</p>
                <p className="mt-2 text-lg font-semibold text-gray-900">{phone || "Phone number"}</p>
              </div>

              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm font-medium text-gray-700">Quick note</p>
                <p className="mt-1 text-sm text-gray-500">
                  Use the same login to manage your QR page, profile links, and admin tools.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="rounded-xl bg-white p-6 shadow sm:p-8">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Login</h1>
              <p className="mt-2 text-sm text-gray-500">
                Keep the same clean look as the edit profile flow, with a simple sign-in form.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Phone Number</label>
                  <input
                    className="w-full rounded border border-gray-200 px-3 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    className="w-full rounded border border-gray-200 px-3 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-gray-600">
                  After login, admins go to the dashboard and users return to their QR/profile flow automatically.
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  onClick={() => router.push("/")}
                  className="rounded border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  onClick={login}
                  className="rounded bg-green-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-green-700"
                >
                  Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
