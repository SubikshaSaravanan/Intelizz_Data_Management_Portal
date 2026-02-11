import { useEffect, useState, useRef } from "react";
import axios from "axios";
import InvoiceToggle from "../components/InvoiceToggle";

import {
  RefreshCcw,
  FileText,
  Download,
  Trash2,
  AlertTriangle,
  Repeat
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { X, Upload, FolderOpen, Check, Loader2 } from "lucide-react";

export default function Invoice() {
  const [data, setData] = useState([]);
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [errorModal, setErrorModal] = useState(null);

  const [excelFile, setExcelFile] = useState(null);
  const [processType, setProcessType] = useState("xml");

  // Template Selection State
  const [templates, setTemplates] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [fetchingTemplates, setFetchingTemplates] = useState(false);

  const API = "http://localhost:5000/api";
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // ==========================
  // LOAD DATA
  // ==========================
  const load = async () => {
    const res = await axios.get(`${API}/invoices`);
    setData(res.data);
    setAll(res.data);
  };

  const fetchTemplates = async () => {
    try {
      setFetchingTemplates(true);
      const res = await axios.get(`${API}/invoice-template/templates`);
      setTemplates(res.data);
    } catch (error) {
      console.error("Failed to load templates", error);
    } finally {
      setFetchingTemplates(false);
    }
  };

  useEffect(() => {
    load();
    fetchTemplates();
  }, []);

  // ==========================
  // TOAST
  // ==========================
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ==========================
  // UPLOAD
  // ==========================
  const confirmUpload = async () => {
    if (!excelFile && !selectedTemplateId) {
      alert("Please select either an Excel document or an Invoice Template to proceed.");
      return;
    }

    try {
      setLoading(true);
      const fd = new FormData();

      // Only append file if it actually exists
      if (excelFile) {
        fd.append("file", excelFile);
      }

      fd.append("processType", processType);

      if (selectedTemplateId) {
        fd.append("templateId", selectedTemplateId);
      }

      await axios.post(`${API}/invoice/upload`, fd);
      await load();
      showToast(`Invoice processed successfully (${excelFile ? 'File' : 'Template'})`);
      setExcelFile(null); // Clear file after upload
    } catch (e) {
      console.error(e);
      showToast(e.response?.data?.error || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  // ==========================
  // REFRESH (XML)
  // ==========================
  const refresh = async (invoice) => {
    if (invoice.source_type === "JSON") return;

    setLoading(true);
    await axios.post(`${API}/refresh/${invoice.id}`);
    await load();
    setLoading(false);
  };

  // ==========================
  // RESEND (XML + JSON)
  // ==========================
  const resend = async (invoice) => {
    setLoading(true);
    await axios.post(`${API}/invoice/resend/${invoice.id}`);
    await load();
    setLoading(false);
    showToast("Invoice resent");
  };

  // ==========================
  // DELETE
  // ==========================
  const deleteInvoice = async (id) => {
    if (!window.confirm("Delete this invoice?")) return;

    setLoading(true);
    await axios.delete(`${API}/delete/${id}`);
    await load();
    setLoading(false);
    showToast("Invoice deleted");
  };

  // ==========================
  // VIEWERS
  // ==========================
  const viewXML = (id) => window.open(`${API}/xml/${id}`, "_blank");
  const viewJSON = (id) => window.open(`${API}/json/${id}`, "_blank");

  const downloadXML = async (id, num) => {
    const res = await axios.get(`${API}/xml/${id}`, { responseType: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(res.data);
    link.download = `${num}.xml`;
    link.click();
  };

  // ==========================
  // SEARCH
  // ==========================
  const filter = (v) => {
    const value = v.toLowerCase().trim();
    setSearch(v);

    // if search box is empty → show all
    if (!value) {
      setData(all);
      return;
    }

    setData(
      all.filter((i) => {
        const invoiceXid = (i.invoice_xid || "").toLowerCase();
        const invoiceNum = (i.invoice_num || "").toLowerCase(); // ✅ INVOICE NUMBER
        const transmission = String(i.transmission_no || "");

        return (
          invoiceXid.includes(value) ||     // INV_116000_001_Z1
          invoiceNum.includes(value) ||     // T1_ARFW_000003
          transmission.includes(value)      // 903004
        );
      })
    );
  };



  const badge = (s) => {
    if (s === "ERROR") return "bg-red-100 text-red-700";
    if (s === "PROCESSED") return "bg-green-100 text-green-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">

      {/* ===== TOGGLE ===== */}
      <InvoiceToggle mode="excel" />

      {/* TOAST */}
      {toast && (
        <div className="fixed top-5 right-5 bg-green-600 text-white px-4 py-2 rounded z-50">
          {toast}
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white px-8 py-4 rounded">Processing…</div>
        </div>
      )}

      {/* ERROR MODAL */}
      {errorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-[600px] max-h-[80vh] rounded shadow p-6 overflow-auto">
            <h2 className="text-lg font-semibold mb-3 text-red-600">
              OTM Error – {errorModal.invoice}
            </h2>

            <pre className="bg-slate-100 p-4 rounded text-sm whitespace-pre-wrap">
              {errorModal.message}
            </pre>

            <div className="text-right mt-4">
              <button
                onClick={() => setErrorModal(null)}
                className="bg-indigo-600 text-white px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">Process New Invoice</h2>
          <button
            onClick={() => navigate("/invoice/template")}
            className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors shadow-sm font-medium text-sm"
          >
            <FileText size={18} />
            Template Builder
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
          {/* FILE PICKER */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Select Excel Document</label>
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx,.xls"
                onClick={(e) => { e.target.value = null; }}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) setExcelFile(file);
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-dashed border-slate-300 px-4 py-2.5 rounded-lg text-slate-600 hover:border-indigo-500 hover:text-indigo-600 transition-all font-medium cursor-pointer"
              >
                <FolderOpen size={18} />
                {excelFile ? "Change Document" : "Browse Document"}
              </button>
            </div>
            {excelFile && (
              <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium mt-1">
                <Check size={14} />
                {excelFile.name}
              </div>
            )}
          </div>

          {/* TEMPLATE DROPDOWN */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Invoice Template</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium"
            >
              <option value="">Default Mapping (Manual)</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* PROCESS TYPE & BUTTON */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-sm font-semibold text-slate-700">Output Format</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    checked={processType === "xml"}
                    onChange={() => setProcessType("xml")}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  XML
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    checked={processType === "json"}
                    onChange={() => setProcessType("json")}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  JSON
                </label>
              </div>
            </div>
            <button
              onClick={confirmUpload}
              disabled={loading || (!excelFile && !selectedTemplateId)}
              className={`w-full bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold shadow-md hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${(loading || (!excelFile && !selectedTemplateId)) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
              {excelFile ? "Process & Upload Document" : "Process Template only"}
            </button>
            {!excelFile && selectedTemplateId && (
              <p className="text-[10px] text-center text-slate-500 italic">
                Using template default values for processing.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SEARCH */}
      <div className="flex justify-end mb-3">
        <input
          value={search}
          onChange={(e) => filter(e.target.value)}
          className="border px-4 py-2 rounded"
          placeholder="Search..."
        />
      </div>

      {/* TABLE */}
      <table className="w-full bg-white rounded shadow text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="p-3">XID</th>
            <th className="p-3">Number</th>
            <th className="p-3">Transmission</th>
            <th className="p-3">Source</th>
            <th className="p-3">Status</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>

        <tbody>
          {data.map((i) => (
            <tr key={i.id} className="border-t text-center">
              <td className="p-3">{i.invoice_xid}</td>
              <td className="p-3 text-indigo-600">{i.invoice_num}</td>
              <td className="p-3">{i.transmission_no}</td>

              <td className="p-3">
                <span
                  className={`px-2 py-1 text-xs rounded ${i.source_type === "XML"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-purple-100 text-purple-700"
                    }`}
                >
                  {i.source_type}
                </span>
              </td>

              <td className="p-3">
                <span className={`px-3 py-1 rounded ${badge(i.status)}`}>
                  {i.status}
                </span>
              </td>

              <td className="p-3">
                <div className="flex justify-center gap-4">
                  {i.source_type === "XML" && (
                    <RefreshCcw
                      className="cursor-pointer hover:text-indigo-600"
                      onClick={() => refresh(i)}
                    />
                  )}

                  <Repeat
                    className="cursor-pointer hover:text-indigo-600"
                    onClick={() => resend(i)}
                  />

                  {i.has_xml && (
                    <FileText
                      className="cursor-pointer"
                      onClick={() => viewXML(i.id)}
                    />
                  )}

                  {i.has_json && (
                    <FileText
                      className="cursor-pointer text-indigo-600"
                      onClick={() => viewJSON(i.id)}
                    />
                  )}

                  {i.has_xml && (
                    <Download
                      className="cursor-pointer"
                      onClick={() =>
                        downloadXML(i.id, i.invoice_num)
                      }
                    />
                  )}

                  {i.status === "ERROR" && (
                    <AlertTriangle
                      className="text-red-600 cursor-pointer"
                      title="View error"
                      onClick={() =>
                        setErrorModal({
                          invoice: i.invoice_num,
                          message:
                            i.error_message ||
                            "No error details available"
                        })
                      }
                    />
                  )}

                  <Trash2
                    className="cursor-pointer text-red-600"
                    onClick={() => deleteInvoice(i.id)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>


    </div>
  );
}