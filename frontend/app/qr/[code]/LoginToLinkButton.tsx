"use client";

export default function LoginToLinkButton({ code }: { code: string }) {

  const handleClick = () => {
    localStorage.setItem("qr-to-link", code);
    window.location.href = "/login";
  };

  return (
    <button
      onClick={handleClick}
      className="px-4 py-2 border border-blue-600 text-blue-600 rounded"
    >
      Login to Link
    </button>
  );
}
