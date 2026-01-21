import { useEffect, useState } from "react";
import axios from "axios";
import {
  RefreshCcw,
  FileText,
  Download,
  Trash2,
  UploadCloud,
  AlertTriangle
} from "lucide-react";

export default function Invoice() {
  const [data, setData] = useState([]);
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [errorModal, setErrorModal] = useState(null);

  const API = "http://localhost:5000/api";

  // ==========================
  // TOAST
  // ==========================
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ==========================
  // LOAD DATA
  // ==========================
  const load = async () => {
    const res = await axios.get(`${API}/invoices`);
    setData(res.data);
    setAll(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  // ==========================
  // UPLOAD EXCEL
  // ==========================
  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const f = new FormData();
      f.append("file", file);

      await axios.post(`${API}/upload`, f);
      await load();
      showToast("Invoices uploaded successfully");
    } catch {
      showToast("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  // ==========================
  // REFRESH STATUS
  // ==========================
  const refresh = async (id) => {
    setLoading(true);
    await axios.post(`${API}/refresh/${id}`);
    await load();
    setLoading(false);
  };

  // ==========================
  // DELETE
  // ==========================
  const del = async (id) => {
    if (!window.confirm("Delete invoice?")) return;
    setLoading(true);
    await axios.delete(`${API}/delete/${id}`);
    await load();
    setLoading(false);
  };

  // ==========================
  // VIEW XML
  // ==========================
  const viewXML = (id) => {
    window.open(`${API}/xml/${id}`, "_blank");
  };

  // ==========================
  // DOWNLOAD XML
  // ==========================
  const downloadXML = async (id, invoiceNum) => {
    const res = await axios.get(`${API}/xml/${id}`, {
      responseType: "blob"
    });

    const blob = new Blob([res.data], {
      type: "application/xml"
    });

    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = `${invoiceNum}.xml`;
    link.click();
  };

  // ==========================
  // SHOW ERROR (FROM DB)
  // ==========================
  const showTransmissionError = (invoice) => {
    setErrorModal(
      invoice.error_message ||
        "No error details available."
    );
  };

  // ==========================
  // SEARCH
  // ==========================
  const filter = (v) => {
    setSearch(v);
    setData(
      all.filter(
        (i) =>
          i.invoice_xid.toLowerCase().includes(v.toLowerCase()) ||
          i.invoice_num.toLowerCase().includes(v.toLowerCase()) ||
          (i.transmission_no || "").includes(v)
      )
    );
  };

  // ==========================
  // STATUS COLOR
  // ==========================
  const badge = (s) => {
    if (s === "PROCESSED") return "bg-green-100 text-green-700";
    if (s === "IN_PROGRESS") return "bg-yellow-100 text-yellow-700";
    if (s === "READY_TO_PAY") return "bg-blue-100 text-blue-700";
    if (s === "ERROR") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-600";
  };

  return (
    <div className="min-h-screen bg-slate-100">

      {/* TOAST */}
      {toast && (
        <div className="fixed top-5 right-5 bg-green-600 text-white px-4 py-2 rounded">
          {toast}
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white px-8 py-5 rounded">
            Processing...
          </div>
        </div>
      )}

      {/* ERROR MODAL */}
      {errorModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[520px] rounded-xl p-6">
            <h2 className="text-red-600 font-bold mb-3">
              Transmission Error Report
            </h2>

            <pre className="bg-slate-100 p-4 text-xs max-h-[300px] overflow-auto whitespace-pre-wrap">
              {errorModal}
            </pre>

            <div className="text-right mt-4">
              <button
                onClick={() => setErrorModal(null)}
                className="bg-indigo-600 text-white px-5 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* HEADER */}
        <div className="flex justify-between mb-6">
          <label className="bg-indigo-600 text-white px-6 py-3 rounded cursor-pointer flex gap-2">
            <UploadCloud />
            Upload Excel
            <input type="file" hidden onChange={upload} />
          </label>

          <input
            value={search}
            onChange={(e) => filter(e.target.value)}
            placeholder="Invoice / Transmission"
            className="border px-4 py-2 rounded"
          />
        </div>

        {/* TABLE */}
        <table className="w-full bg-white rounded shadow text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-4">Invoice XID</th>
              <th className="p-4">Invoice No</th>
              <th className="p-4">Transmission</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>

          <tbody>
            {data.map((i) => (
              <tr key={i.id} className="border-t">
                <td className="p-4">{i.invoice_xid}</td>
                <td className="p-4 text-indigo-600">{i.invoice_num}</td>
                <td className="p-4">{i.transmission_no}</td>

                <td className="p-4 text-center">
                  <span className={`px-3 py-1 rounded ${badge(i.status)}`}>
                    {i.status}
                  </span>
                </td>

                <td className="p-4 flex gap-4 justify-center">
                  <RefreshCcw
                    className="cursor-pointer"
                    onClick={() => refresh(i.id)}
                  />

                  <FileText
                    className="cursor-pointer"
                    onClick={() => viewXML(i.id)}
                  />

                  <Download
                    className="cursor-pointer"
                    onClick={() =>
                      downloadXML(i.id, i.invoice_num)
                    }
                  />

                  {i.status === "ERROR" && (
                    <AlertTriangle
                      className="text-red-600 cursor-pointer"
                      onClick={() =>
                        showTransmissionError(i)
                      }
                    />
                  )}

                  <Trash2
                    className="text-red-600 cursor-pointer"
                    onClick={() => del(i.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

      </div>
    </div>
  );
}
