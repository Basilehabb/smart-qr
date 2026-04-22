"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const login = async () => {
    try {
      const res = await api.post("/auth/login", { email, password });
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
    <div className="flex flex-col items-center justify-center min-h-screen">
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />

      <button onClick={login}>Login</button>
    </div>
  );
}
