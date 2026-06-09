import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Download, Send, UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import axios from 'axios';

export default function OrderReleaseWorkspace() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadLogs, setUploadLogs] = useState(null); // Tracks API execution results
  
  const userId = "SRITIKARAN";
  const API_BASE = 'http://localhost:5000/api/order-release';

  // 1. Download Template Strategy
  const handleDownloadTemplate = () => {
    window.location.href = `${API_BASE}/download-template/${userId}`;
  };

  // 2. Handle File Picking
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadLogs(null); // Clear old results
    }
  };

  // 3. Handle File Drag/Drop Actions
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setUploadLogs(null);
    }
  };

  // 4. Send File Payload to Flask Backend
  const handleUploadFile = async () => {
    if (!file) {
      alert("Please select or drop an Excel spreadsheet first.");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);

    try {
      setUploading(true);
      setUploadLogs(null);

      const response = await axios.post(`${API_BASE}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setUploadLogs({
        status: 'success',
        message: response.data.message || "File uploaded successfully!",
        summary: response.data.summary || [] // Row by row check arrays
      });
    } catch (err) {
      console.error("Upload interface crash:", err);
      setUploadLogs({
        status: 'error',
        message: err.response?.data?.error || "Failed to process target Excel payload mapping."
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8 font-sans antialiased text-[#1E293B]">
      {/* Header Profile Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate("/OrderReleaseManager")} 
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-sm transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Order Release</h1>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-0.5">Logistics Integration</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="p-3 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button 
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-5 py-3 bg-[#475569] hover:bg-[#334155] text-white font-semibold text-sm rounded-xl shadow-sm transition-all"
          >
            <Download className="w-4 h-4" /> Download Excel Template
          </button>
          
          {/* Active Upload/Sync Execution Trigger Button */}
          <button 
            onClick={handleUploadFile}
            disabled={uploading || !file}
            className="flex items-center gap-2 px-5 py-3 bg-[#0EA5E9] hover:bg-[#0284C7] disabled:bg-slate-200 disabled:text-slate-400 font-semibold text-sm rounded-xl shadow-sm transition-all"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Processing Data...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Sync to OTM
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Container Work Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {/* Upload Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col items-center justify-center min-h-[400px]">
            <div className="text-center max-w-md mb-8">
              <h3 className="text-xl font-bold text-slate-800 mb-2">Upload Order Release Data</h3>
              <p className="text-sm text-slate-400">Prepare your Excel file and upload it below to begin the sync pipeline.</p>
            </div>

            {/* Drag and Drop Zone Container with Hidden File Trigger Hook */}
            <label 
              onDragOver={handleDragOver}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`w-full max-w-2xl border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all ${
                isDragging ? 'border-[#0EA5E9] bg-sky-50/40' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                className="hidden" 
                onChange={handleFileChange} 
              />
              <div className="p-4 bg-white rounded-full shadow-sm border border-slate-100 text-[#0EA5E9] mb-4">
                <UploadCloud className="w-8 h-8" />
              </div>
              
              {file ? (
                <div className="text-center">
                  <p className="text-base font-bold text-[#0EA5E9] truncate max-w-md">{file.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB — Click or drag to change file</p>
                </div>
              ) : (
                <>
                  <p className="text-base font-bold text-slate-700">Click to Upload or Drag Excel File</p>
                  <p className="text-xs text-slate-400 mt-1.5">Template fields are based on your Manager settings</p>
                </>
              )}
            </label>
          </div>

          {/* Dynamic Execution Log Output Box */}
          {uploadLogs && (
            <div className={`border rounded-2xl p-6 shadow-sm transition-all ${
              uploadLogs.status === 'success' ? 'bg-emerald-50/40 border-emerald-100' : 'bg-rose-50/40 border-rose-100'
            }`}>
              <div className="flex items-start gap-3">
                {uploadLogs.status === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="w-full">
                  <h4 className={`text-sm font-bold ${uploadLogs.status === 'success' ? 'text-emerald-800' : 'text-rose-800'}`}>
                    {uploadLogs.status === 'success' ? "Transmission Completed" : "Integration Process Error"}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">{uploadLogs.message}</p>
                  
                  {/* Detailed Table Grid row maps if backend sends array responses summary metrics */}
                  {uploadLogs.summary && uploadLogs.summary.length > 0 && (
                    <div className="mt-4 bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                            <th className="p-3">Excel Row</th>
                            <th className="p-3">Order ID</th>
                            <th className="p-3 text-right">OTM Sync Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-700">
                          {uploadLogs.summary.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50/40">
                              <td className="p-3 font-mono text-slate-400">{row.excel_row}</td>
                              <td className="p-3 font-bold">{row.order_release_id}</td>
                              <td className="p-3 text-right">
                                <span className={`inline-block px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                                  row.status === 'Success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {row.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side Sidebar Layout */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-12">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700">File History</h4>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase">
              {file ? "1 File Staged" : "0 Files"}
            </span>
          </div>

          {file ? (
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <FileSpreadsheet className="w-8 h-8 text-emerald-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-700 truncate">{file.name}</p>
                <p className="text-[10px] text-slate-400 uppercase font-medium">Ready to Sync</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-300">
              <FileSpreadsheet className="w-12 h-12 stroke-[1.5] mb-3" />
              <p className="text-sm font-medium text-slate-400">No uploads yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}