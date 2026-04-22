"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import AdminSidebar from "../../AdminSidebar";

export default function BulkUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const downloadTemplate = async () => {
    const token = localStorage.getItem("admin-token");
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users/template`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users_template.xlsx";
    a.click();
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a file");

    setUploading(true);
    setResults(null);

    try {
      const token = localStorage.getItem("admin-token");
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post("/admin/users/bulk-upload", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setResults(response.data.results);
    } catch (error: any) {
      alert(error?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const downloadResults = () => {
    if (!results) return;

    const successData = results.success.map((item: any) => ({
      Row: item.row,
      Name: item.user.name,
      Email: item.user.email,
      Password: item.user.password,
      "QR Code": item.qrCode,
      Status: "Success",
    }));

    const errorData = results.errors.map((item: any) => ({
      Row: item.row,
      Name: item.data.name,
      Email: item.data.email,
      Error: item.error,
      Status: "Failed",
    }));

    const allData = [...successData, ...errorData];

    const csvContent = [
      Object.keys(allData[0]).join(","),
      ...allData.map(row => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "upload_results.csv";
    a.click();
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />

      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Bulk Upload Users</h1>
            <button
              className="text-blue-600 underline"
              onClick={() => router.push("/admin/users")}
            >
              Back to Users
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold mb-2">📋 Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Download the Excel template below</li>
              <li>Fill in user details (name, email are required)</li>
              <li>Password: leave empty to auto-generate</li>
              <li>QR Code: leave empty to auto-generate, or provide existing code</li>
              <li>Upload the completed file</li>
            </ol>
          </div>

          {/* Download Template */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-3">Step 1: Download Template</h2>
            <button
              onClick={downloadTemplate}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              📥 Download Excel Template
            </button>
          </div>

          {/* Upload File */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-3">Step 2: Upload File</h2>
            
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="flex-1 border rounded px-3 py-2"
              />

              <button
                onClick={handleUpload}
                disabled={uploading || !file}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>

            {file && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {file.name}
              </p>
            )}
          </div>

          {/* Results */}
          {results && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Upload Results</h2>
                <button
                  onClick={downloadResults}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  📥 Download Results
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Rows</p>
                  <p className="text-2xl font-bold">{results.total}</p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Success</p>
                  <p className="text-2xl font-bold text-green-600">
                    {results.success.length}
                  </p>
                </div>

                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-red-600">
                    {results.errors.length}
                  </p>
                </div>
              </div>

              {/* Success List */}
              {results.success.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-green-600 mb-2">
                    ✅ Successfully Created ({results.success.length})
                  </h3>
                  <div className="max-h-60 overflow-auto border rounded">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Row</th>
                          <th className="px-3 py-2 text-left">Name</th>
                          <th className="px-3 py-2 text-left">Email</th>
                          <th className="px-3 py-2 text-left">Password</th>
                          <th className="px-3 py-2 text-left">QR Code</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.success.map((item: any, idx: number) => (
                          <tr key={idx} className="border-t">
                            <td className="px-3 py-2">{item.row}</td>
                            <td className="px-3 py-2">{item.user.name}</td>
                            <td className="px-3 py-2">{item.user.email}</td>
                            <td className="px-3 py-2 font-mono text-xs">
                              {item.user.password}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs">
                              {item.qrCode}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Error List */}
              {results.errors.length > 0 && (
                <div>
                  <h3 className="font-semibold text-red-600 mb-2">
                    ❌ Failed ({results.errors.length})
                  </h3>
                  <div className="max-h-60 overflow-auto border rounded">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Row</th>
                          <th className="px-3 py-2 text-left">Name</th>
                          <th className="px-3 py-2 text-left">Email</th>
                          <th className="px-3 py-2 text-left">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.errors.map((item: any, idx: number) => (
                          <tr key={idx} className="border-t">
                            <td className="px-3 py-2">{item.row}</td>
                            <td className="px-3 py-2">{item.data.name}</td>
                            <td className="px-3 py-2">{item.data.email}</td>
                            <td className="px-3 py-2 text-red-600">
                              {item.error}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}