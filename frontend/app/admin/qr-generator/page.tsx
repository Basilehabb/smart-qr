"use client";

import { useState, useRef } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";

export default function QRGenerator() {
  const [url, setUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const qrCanvasRef = useRef<HTMLDivElement>(null);
  const qrSvgRef = useRef<SVGSVGElement>(null);

  function handleGenerate() {
    if (!url) return alert("Enter URL");
    if (!phone) return alert("Enter phone number");

    const finalUrl =
      url.startsWith("http://") || url.startsWith("https://")
        ? url
        : "https://" + url;

    setGeneratedUrl(finalUrl);
  }

  function cleanPhone() {
    return phone.replace(/\D/g, "");
  }

  // ================= JPG =================
  function downloadJPG() {
    const canvas = qrCanvasRef.current?.querySelector("canvas");
    if (!canvas) return;

    const scale = 8; // 🔥 أعلى دقة
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width * scale;
    exportCanvas.height = canvas.height * scale;

    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.drawImage(canvas, 0, 0, exportCanvas.width, exportCanvas.height);

    const data = exportCanvas.toDataURL("image/jpeg", 1.0);

    const link = document.createElement("a");
    link.href = data;
    link.download = `${cleanPhone()}.jpg`;
    link.click();
  }

  // ================= SVG =================
  function downloadSVG() {
    const svg = qrSvgRef.current;
    if (!svg) return;

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);

    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${cleanPhone()}.svg`;
    link.click();
  }

  // ================= PDF =================
  function downloadPDF() {
    const canvas = qrCanvasRef.current?.querySelector("canvas");
    if (!canvas) return;

    const scale = 8;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width * scale;
    exportCanvas.height = canvas.height * scale;

    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.drawImage(canvas, 0, 0, exportCanvas.width, exportCanvas.height);

    const imgData = exportCanvas.toDataURL("image/jpeg", 1.0);

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // حجم مناسب في منتصف الصفحة
    pdf.addImage(imgData, "JPEG", 40, 60, 130, 130);
    pdf.save(`${cleanPhone()}.pdf`);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-50">
      <h1 className="text-2xl font-bold">QR Code Generator (Metal Ready)</h1>

      <input
        className="border px-4 py-2 rounded w-96"
        placeholder="Phone Number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      <input
        className="border px-4 py-2 rounded w-96"
        placeholder="https://example.com"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />

      <button
        onClick={handleGenerate}
        className="px-6 py-2 bg-indigo-600 text-white rounded"
      >
        Generate QR
      </button>

      {generatedUrl && (
        <>
          <div
            ref={qrCanvasRef}
            className="p-6 bg-white shadow rounded flex flex-col items-center"
          >
            <QRCodeCanvas
              value={generatedUrl}
              size={350}
              level="H"
              includeMargin
            />
          </div>

          {/* Hidden SVG version for download */}
          <div className="hidden">
            <QRCodeSVG
              ref={qrSvgRef}
              value={generatedUrl}
              size={1000}
              level="H"
              includeMargin
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={downloadJPG}
              className="px-5 py-2 bg-green-600 text-white rounded"
            >
              Download JPG
            </button>

            <button
              onClick={downloadSVG}
              className="px-5 py-2 bg-black text-white rounded"
            >
              Download SVG (Metal Ready)
            </button>

            <button
              onClick={downloadPDF}
              className="px-5 py-2 bg-purple-700 text-white rounded"
            >
              Download PDF (Print Ready)
            </button>
          </div>
        </>
      )}
    </div>
  );
}