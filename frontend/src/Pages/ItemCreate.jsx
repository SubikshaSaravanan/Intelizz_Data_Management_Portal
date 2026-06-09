
import React, { useState } from 'react';
import axios from 'axios';
import BulkUpload from "../components/BulkUpload";
import {
  Database, Download, CheckCircle, Info, ChevronDown, SendHorizontal, Loader2, FileText, X, Trash2
} from 'lucide-react';

const ItemCreate = () => {

const [summary, setSummary] = useState(null);
const [itemsResult, setItemsResult] = useState([]);

  const [status, setStatus] = useState({ type: null, message: "" });
  const [downloading, setDownloading] = useState(false);
  const [pushing, setPushing] = useState(false);
  
  const [fileHistory, setFileHistory] = useState([]); 
  const [activeFile, setActiveFile] = useState(null);

  const [configs, setConfigs] = useState([]);
const [formData, setFormData] = useState({});
const [otmError, setOtmError] = useState(null);

const [uploadSummary, setUploadSummary] = useState(null);
const [uploadResults, setUploadResults] = useState([]);

  const handleExport = async () => {
    setDownloading(true);
    try {
      setStatus({ type: 'info', message: "Generating unique template..." });
      const response = await axios.get('http://127.0.0.1:5000/api/items/export-template', { 
        responseType: 'blob' 
      });

      // Unique filename with seconds
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `OTM_Template_${timestamp}.xlsx`;

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setStatus({ type: 'success', message: `Template downloaded: ${fileName}` });
    } catch (err) {
      setStatus({ type: 'error', message: "Failed to generate template." });
    } finally {
      setDownloading(false);
    }
  };

  const handleDropdownChange = (e) => {
    const selectedName = e.target.value;
    if (!selectedName) {
        setActiveFile(null);
        return;
    }
    const fileMatch = fileHistory.find(f => f.name === selectedName);
    if (fileMatch) {
      setActiveFile(fileMatch);
    }
  };

  // NEW: Logic to remove a single file
  const handleRemoveFile = () => {
    if (!activeFile) return;
    
    const fileNameToRemove = activeFile.name;
    setFileHistory(prev => prev.filter(f => f.name !== fileNameToRemove));
    setActiveFile(null);
    setStatus({ type: 'info', message: `Removed ${fileNameToRemove} from history.` });
  };

const handlePushToOTM = async () => {
    if (!activeFile) return;
    setPushing(true);
    const formData = new FormData();
    formData.append('file', activeFile); 

    try {
        setStatus({ type: 'info', message: `Syncing ${activeFile.name}...` });
        const response = await axios.post('http://127.0.0.1:5000/api/items/bulk-upload', formData);
        
        const { summary, results } = response.data;

        if (summary) {
            setUploadSummary(summary);     
            setUploadResults(results);     
            setSummary(summary);              
            setItemsResult(results); // <-- populate the table correctly

            setStatus({ 
                type: 'success', 
                message: `Sync Done! Success: ${summary.success}, Failed: ${summary.failed}` 
            });
        } else {
            setStatus({ type: 'error', message: "Backend succeeded but sent no summary data." });
        }
    } catch (error) {
        setStatus({ type: 'error', message: "Sync failed at the server level." });
    } finally {
        setPushing(false);
    }
}

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white"><Database size={20} /></div>
            <h1 className="text-lg font-bold text-slate-800">OTM Bulk Manager</h1>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleExport} disabled={downloading} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all">
              <Download size={16} className="inline mr-2" /> Template
            </button>
            <BulkUpload onFileSelected={(file) => {
                setActiveFile(file);
                setFileHistory(prev => [file, ...prev.filter(f => f.name !== file.name)]);
            }} />
            {activeFile && (
              <button onClick={handlePushToOTM} disabled={pushing} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg animate-in zoom-in">
                {pushing ? <Loader2 size={16} className="animate-spin" /> : <SendHorizontal size={16} className="inline mr-2" />}
                Push to OTM
              </button>
            )}
          </div>
        </div>
    </nav>

      <main className="mx-auto mt-12 max-w-5xl px-6">

 {status.message && (
  <div className={`mb-8 p-4 rounded-2xl border flex items-center justify-between transition-all duration-500 
    ${status.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 
      status.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : 
      status.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
      'bg-blue-50 border-blue-200 text-blue-700'}`}>
    <div className="flex items-center gap-2">
      {status.type === 'success' && <CheckCircle size={18} />}
      <span className="text-sm font-semibold">{status.message}</span>
    </div>
    <X size={18} className="cursor-pointer hover:opacity-70" onClick={() => setStatus({type: null, message: ""})} />
  </div>
)} 


{/* ✅ UPLOAD SUMMARY */}
{uploadSummary && (
  <div className="mb-6 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
    <h3 className="text-xs font-bold text-slate-500 mb-2 uppercase">Upload Summary</h3>
    <div className="flex gap-6 text-sm font-semibold">
      <span className="text-blue-600">Total: {uploadSummary.total}</span>
      <span className="text-emerald-600">Success: {uploadSummary.success}</span>
      <span className="text-rose-600">Failed: {uploadSummary.failed}</span>
    </div>
  </div>
)}

{/* ✅ RESULTS TABLE */}
{uploadResults.length > 0 && (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="p-4 border-b text-xs font-bold text-slate-500 uppercase">
      Upload Results
    </div>

    <div className="max-h-80 overflow-auto">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="text-left px-4 py-2">Item</th>
            <th className="text-left px-4 py-2">Status</th>
            <th className="text-left px-4 py-2">Error</th>
          </tr>
        </thead>

        <tbody>
          {uploadResults.map((row, index) => (
            <tr key={index} className="border-t">
              <td className="px-4 py-2 font-semibold">{row.item_name || row.item_gid}</td>

              <td className={`px-4 py-2 font-bold ${
                row.status === "SUCCESS" ? "text-emerald-600" : "text-rose-600"
              }`}>
                {row.status}
              </td>

              <td className="px-4 py-2 text-slate-500">
                {row.error ? JSON.stringify(row.error) : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}


     {summary && (
  <div className="mb-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
    
    {/* 🔹 Progress + Summary */}
    <h3 className="text-xs font-bold text-slate-600 mb-3">Upload Summary</h3>
    
    <div className="w-full bg-slate-200 rounded-full h-3 mb-3">
      <div
        className="bg-blue-600 h-3 rounded-full transition-all"
        style={{ width: `${(summary.success / summary.total) * 100}%` }}
      ></div>
    </div>

    <div className="flex gap-6 text-xs font-bold">
      <span className="text-slate-600">Total: {summary.total}</span>
      <span className="text-green-600">Success: {summary.success}</span>
      <span className="text-red-600">Failed: {summary.failed}</span>
    </div>
  </div>
)}

{itemsResult.length > 0 && (
  <div className="mb-10 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
    
    <h3 className="text-xs font-bold text-slate-600 mb-4">Upload Details</h3>

    <table className="min-w-full text-xs text-left">
      <thead>
        <tr className="text-slate-500 border-b">
          <th className="py-2">Item XID</th>
          <th className="py-2">Status</th>
          <th className="py-2">Message</th>
        </tr>
      </thead>
      <tbody>
        {itemsResult.map((item, index) => (
          <tr key={index} className="border-b hover:bg-slate-50">
            <td className="py-2 font-semibold">{item.itemXid}</td>
            <td className="py-2">
              {item.status === "SUCCESS" ? (
                <span className="text-green-600 font-bold">SUCCESS</span>
              ) : (
                <span className="text-red-600 font-bold">FAILED</span>
              )}
            </td>
            <td className="py-2 text-slate-500">{item.message || "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}


        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">File History</h3>
              
              <div className="flex flex-col gap-2">
                <div className="relative flex-1">
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 appearance-none focus:outline-none"
                    value={activeFile?.name || ""}
                    onChange={handleDropdownChange}
                  >
                    <option value="">-- History --</option>
                    {fileHistory.map((file, index) => (
                      <option key={index} value={file.name}>{file.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-3 pointer-events-none text-slate-400"><ChevronDown size={14} /></div>
                </div>

                {/* The "Remove This" Button */}
                {activeFile && (
                    <button 
                        onClick={handleRemoveFile}
                        className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-[10px] font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-colors border border-red-100"
                    >
                        <Trash2 size={12} /> Remove Selected
                    </button>
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-3">
            <div className="bg-blue-600 rounded-[32px] p-10 text-white shadow-xl">
              <h2 className="text-2xl font-bold mb-4 italic">Synchronization Hub</h2>
              <div className="bg-white/10 rounded-2xl p-6 border border-white/10">
                <p className="text-[10px] uppercase font-bold text-blue-200 mb-1">Active File Details</p>
                <div className="flex items-center gap-3">
                    <FileText size={24} className="text-blue-300" />
                    <p className="text-lg font-bold truncate">
                        {activeFile ? activeFile.name : 'Waiting for selection...'}
                    </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ItemCreate;
