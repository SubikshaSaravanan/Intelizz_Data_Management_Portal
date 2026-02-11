import { UploadCloud, X } from "lucide-react";
import { useState } from "react";
import api from "../api";

export default function JsonUpload() {

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      alert("Please upload a valid JSON file");
      return;
    }

    try {
      setLoading(true);
      setToast(null);

      const form = new FormData();
      form.append("file", file);

      const res = await api.post("/invoice/json/upload", form);

      const data = res.data;

      setToast({
        type: "success",
        invoiceNumber: data?.invoiceNumber || "Generated",
        invoiceXid: data?.invoiceXid || "Generated"
      });

    } catch (err) {
      setToast({
        type: "error",
        message:
          err?.response?.data?.error ||
          "JSON upload failed"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ===== TOAST ===== */}
      {toast && (
        <div className="fixed top-6 right-6 bg-white border shadow-lg rounded-lg p-4 w-[340px] z-50 relative">

          {/* CLOSE BUTTON */}
          <button
            onClick={() => setToast(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
          >
            <X size={18} />
          </button>

          {toast.type === "success" ? (
            <>
              <h4 className="text-green-600 font-bold mb-2">
                ✅ Invoice Created Successfully
              </h4>

              <p className="text-sm">
                <b>Invoice Number:</b><br />
                {toast.invoiceNumber}
              </p>

              <p className="text-sm mt-1">
                <b>Invoice XID:</b><br />
                {toast.invoiceXid}
              </p>
            </>
          ) : (
            <>
              <h4 className="text-red-600 font-bold mb-2">
                ❌ Upload Failed
              </h4>
              <p className="text-sm">{toast.message}</p>
            </>
          )}
        </div>
      )}

      {/* ===== UPLOAD BOX ===== */}
      <div className="bg-white rounded shadow p-6 mb-8">

        <h3 className="text-lg font-semibold mb-3">
          Upload Invoice JSON
        </h3>

        <label className="bg-indigo-600 text-white px-6 py-3 rounded cursor-pointer flex gap-2 w-fit">
          <UploadCloud size={18} />
          Upload JSON
          <input
            type="file"
            accept=".json"
            hidden
            onChange={upload}
          />
        </label>

        {loading && (
          <p className="text-sm text-gray-500 mt-2">
            Uploading invoice to OTM...
          </p>
        )}
      </div>
    </>
  );
}
