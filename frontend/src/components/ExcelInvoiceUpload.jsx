import { useState } from "react";
import api from "../api";

export default function ExcelInvoiceUpload({ onSuccess }) {
  const [file, setFile] = useState(null);
  const [processType, setProcessType] = useState("json");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    if (!file) {
      alert("Please upload an Excel file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("processType", processType);

    try {
      setLoading(true);
      setError(null);

      const res = await api.post("/invoice/excel", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      onSuccess?.(res.data);
    } catch (err) {
      setError(
        err?.response?.data?.error || "Excel invoice creation failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow mb-8">

      <h2 className="text-xl font-bold mb-4">
        Create Invoice from Excel
      </h2>

      {/* FILE UPLOAD */}
      <div className="mb-4">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files[0])}
        />

        {file && (
          <p className="mt-2 text-sm text-gray-600">
            📄 Uploaded file: <b>{file.name}</b>
          </p>
        )}
      </div>

      {/* PROCESS TYPE */}
      <div className="mb-4">
        <p className="font-semibold mb-2">Processing Type</p>

        <div className="flex gap-6">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={processType === "json"}
              onChange={() => setProcessType("json")}
            />
            JSON
          </label>

          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={processType === "xml"}
              onChange={() => setProcessType("xml")}
            />
            XML
          </label>
        </div>
      </div>

      {/* SUBMIT */}
      <button
        onClick={submit}
        disabled={loading}
        className={`px-6 py-2 rounded text-white
          ${loading
            ? "bg-gray-400"
            : "bg-indigo-600 hover:bg-indigo-700"
          }`}
      >
        {loading ? "Processing..." : "Create Invoice"}
      </button>

      {error && (
        <p className="text-red-600 mt-3 text-sm">
          ❌ {error}
        </p>
      )}
    </div>
  );
}
