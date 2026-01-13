import { useEffect, useState } from "react";
import axios from "axios";
import {
  RefreshCcw,
  FileText,
  Download,
  Trash2,
  Search,
  UploadCloud,
  AlertTriangle
} from "lucide-react";
import logo from "./assets/intelizz-logo.png";

export default function App() {
  const [data, setData] = useState([]);
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [errorModal, setErrorModal] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    const res = await axios.get("http://localhost:5000/api/invoices");
    setData(res.data);
    setAll(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setLoading(true);
      const f = new FormData();
      f.append("file", file);
      await axios.post("http://localhost:5000/api/upload", f);
      await load();
      showToast("Invoices uploaded & sent to OTM");
    } catch {
      showToast("Upload failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const refresh = async (id) => {
    try {
      setLoading(true);
      await axios.post(`http://localhost:5000/api/refresh/${id}`);
      await load();
      showToast("Status refreshed from OTM");
    } finally {
      setLoading(false);
    }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this invoice?")) return;
    try {
      setLoading(true);
      await axios.delete(`http://localhost:5000/api/delete/${id}`);
      await load();
      showToast("Invoice deleted");
    } catch {
      showToast("Delete failed", "error");
    } finally {
      setLoading(false);
    }
  };

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

  const badge = (s) => {
    if (s === "PROCESSED") return "bg-green-100 text-green-700";
    if (s === "IN_PROGRESS") return "bg-yellow-100 text-yellow-700";
    if (s === "READY_TO_PAY") return "bg-blue-100 text-blue-700";
    if (s === "ERROR") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-600";
  };

  return (
    <div className="min-h-screen bg-slate-100">

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 px-4 py-2 rounded shadow text-white ${
            toast.type === "error" ? "bg-red-600" : "bg-green-600"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Loader */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white px-8 py-5 rounded shadow text-indigo-700 font-semibold">
            Processing...
          </div>
        </div>
      )}

      {/* Error Modal */}
      {errorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white w-[500px] rounded-xl shadow-lg p-6">
            <h2 className="text-red-600 font-semibold text-lg mb-3">
              Invoice Processing Error
            </h2>
            <p className="text-gray-700 text-sm whitespace-pre-wrap">
              {errorModal}
            </p>
            <div className="text-right mt-5">
              <button
                onClick={() => setErrorModal(null)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-[#0f172a] to-[#1e3a8a] px-8 py-4 text-white shadow flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <img src={logo} className="h-10" alt="INTELIZZ Logo" />
          <div>
            <h1 className="text-xl font-bold">
              INTELIZZ Data Management Portal
            </h1>
            <p className="text-xs text-blue-200">
              Oracle Transportation Management
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Upload & Search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow p-6 col-span-2 border-l-4 border-indigo-600">
            <h2 className="font-semibold text-gray-700 mb-3">
              Upload Invoice Excel
            </h2>
            <label className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded cursor-pointer w-fit">
              <UploadCloud size={20} />
              Upload Excel
              <input type="file" className="hidden" onChange={upload} />
            </label>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="font-semibold text-gray-700 mb-2">Search</h2>
            <div className="flex items-center border rounded px-3">
              <Search className="text-gray-400" />
              <input
                value={search}
                onChange={(e) => filter(e.target.value)}
                placeholder="Invoice / Transmission"
                className="p-2 w-full outline-none"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="p-4 text-left">Invoice XID</th>
                <th className="p-4 text-left">Invoice No</th>
                <th className="p-4 text-left">Transmission</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((i) => (
                <tr key={i.id} className="border-t hover:bg-indigo-50 transition">
                  <td className="p-4">{i.invoice_xid}</td>
                  <td className="p-4 font-semibold text-indigo-700">
                    {i.invoice_num}
                  </td>
                  <td className="p-4">{i.transmission_no || "—"}</td>

                  <td className="p-4 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${badge(
                        i.status
                      )}`}
                    >
                      {i.status}
                    </span>
                  </td>

                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-4">

                      <button
                        onClick={() => refresh(i.id)}
                        className="text-yellow-600 hover:text-yellow-800"
                      >
                        <RefreshCcw size={20} />
                      </button>

                      <a
                        href={`http://localhost:5000/api/xml/${i.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <FileText size={20} />
                      </a>

                      <a
                        href={`http://localhost:5000/api/xml/${i.id}?download=true`}
                        className="text-green-600 hover:text-green-800"
                      >
                        <Download size={20} />
                      </a>

                      {i.status === "ERROR" && (
                        <button
                          onClick={() =>
                            setErrorModal(
                              i.error_message ||
                                "Invoice failed in OTM. Error report not available yet."
                            )
                          }
                          className="text-red-600 hover:text-red-800"
                        >
                          <AlertTriangle size={20} />
                        </button>
                      )}

                      <button
                        onClick={() => del(i.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={20} />
                      </button>

                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
