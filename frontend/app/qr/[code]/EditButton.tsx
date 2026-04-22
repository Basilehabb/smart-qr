"use client";

export default function EditButton() {
  return (
    <button
      onClick={() => {
        const token = localStorage.getItem("user-token");

        const path = window.location.pathname;
        const qrCode = path.startsWith("/qr/")
          ? path.replace("/qr/", "")
          : null;

        const target = qrCode
          ? `/user/edit?code=${qrCode}`
          : "/user/edit";

        if (token) {
          window.location.href = target;
        } else {
          localStorage.setItem("return-url", target);
          window.location.href = "/login";
        }
      }}
      className="
        px-8 py-3
        rounded-full
        bg-gradient-to-r from-[#C9A441] to-[#B8962E]
        text-white font-semibold
        shadow-lg
        hover:scale-[1.03]
        hover:shadow-xl
        transition-all
      "
    >
      Edit Profile
    </button>
  );
}
