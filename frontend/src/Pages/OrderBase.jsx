import React, { useState } from "react";
import axios from "axios";
import { Download, ArrowLeft, Upload, Send, RefreshCw, CheckCircle2, FileText, FileSpreadsheet } from "lucide-react";
import { useNavigate } from "react-router-dom";

const OrderBase = () => {
  const navigate = useNavigate();
  const [fileList, setFileList] = useState([]); 
  const [selectedFileIndex, setSelectedFileIndex] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Correcting the API BASE to match your order_bp blueprint
  // Change this line:
const API_BASE = "http://localhost:5000/api/orderbase";

  // ================= DOWNLOAD TEMPLATE =================
  const downloadTemplate = async () => {
    try {
      const response = await axios.get(`${API_BASE}/export-template`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "OrderBase_Template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert("❌ Failed to download template");
    }
  };

  // ================= FILE UPLOAD LOGIC (CONNECTED TO BACKEND) =================
  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    const formData = new FormData();
    formData.append("file", uploadedFile);

    setIsUploading(true);
    try {
      // Sending to your new Python bulk-upload route
      const response = await axios.post(`${API_BASE}/bulk-upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.status === 200) {
        const newFile = {
          name: uploadedFile.name,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          raw: uploadedFile
        };
        setFileList([newFile, ...fileList]);
        setSelectedFileIndex(0); 
        setSyncSuccess(false);
      }
    } catch (error) {
      console.error(error);
      alert("❌ Upload failed: " + (error.response?.data?.error || "Server error"));
    } finally {
      setIsUploading(false);
    }
  };

  // ================= SYNC LOGIC (CONNECTED TO OTM) =================
  const handleSync = async () => {
    if (selectedFileIndex === null) return alert("Please select a file from history first!");
    
    setIsSyncing(true);
    setSyncSuccess(false);

    try {
      // Calling your new Python sync-to-otm route
      const response = await axios.post(`${API_BASE}/sync-to-otm`);
      
      if (response.status === 200) {
        setSyncSuccess(true);
      }
    } catch (error) {
      console.error(error);
      alert("❌ Sync to OTM failed: " + (error.response?.data?.error || "Check backend logs"));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRefresh = () => {
    setSyncSuccess(false);
    setIsSyncing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans text-slate-900">
      
      {/* HEADER */}
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/ordermanager")}
            className="p-2 rounded-xl bg-white shadow-sm border border-gray-200 hover:bg-gray-100 transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Order Base</h1>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Logistics Integration</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh}
            className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
            title="Refresh State"
          >
            <RefreshCw size={20} className={isSyncing || isUploading ? "animate-spin" : ""} />
          </button>

          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-600 text-white hover:bg-slate-700 shadow-sm transition font-medium"
          >
            <Download size={18} />
            Download Excel Template
          </button>

          <button 
            onClick={handleSync}
            disabled={isSyncing || fileList.length === 0 || isUploading}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-semibold transition shadow-md ${
              isSyncing ? "bg-emerald-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
            {isSyncing ? "Syncing to OTM..." : "Sync to OTM"}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* LEFT: UPLOAD & SUCCESS ZONE */}
        <div className="lg:col-span-3 bg-white border border-gray-200 rounded-2xl p-8 shadow-sm min-h-[450px] flex flex-col justify-center">
          {!syncSuccess ? (
            <div className="space-y-6">
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Upload Order Base Data</h2>
                <p className="text-gray-500">Prepare your Excel file and upload it below to begin the sync.</p>
              </div>

              <label className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 transition group ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-blue-50/50 hover:border-blue-300'}`}>
                <div className="flex flex-col items-center">
                  <div className="p-4 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                    {isUploading ? <RefreshCw className="text-blue-500 animate-spin" size={32} /> : <Upload className="text-blue-500" size={32} />}
                  </div>
                  <p className="mt-4 text-lg font-medium text-gray-700">
                    {isUploading ? "Uploading to Database..." : "Click to Upload or Drag Excel File"}
                  </p>
                  <p className="text-sm text-gray-400">Template fields are based on your Manager settings</p>
                </div>
                {!isUploading && <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />}
              </label>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={48} className="text-emerald-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800">Sync Successful!</h2>
              <p className="text-gray-500 mt-3 text-lg">
                Data from <b>{fileList[selectedFileIndex]?.name}</b> has been pushed to OTM.
              </p>
              <button 
                onClick={() => setSyncSuccess(false)}
                className="mt-8 px-6 py-2 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-600 hover:text-white transition"
              >
                Upload Another File
              </button>
            </div>
          )}
        </div>

        {/* RIGHT: FILE HISTORY */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6 border-b pb-4">
            <h3 className="font-bold text-gray-700 uppercase text-xs tracking-widest">File History</h3>
            <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
              {fileList.length} FILES
            </span>
          </div>
          
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px]">
            {fileList.length > 0 ? (
              fileList.map((file, index) => (
                <div 
                  key={index}
                  onClick={() => {
                    setSelectedFileIndex(index);
                    setSyncSuccess(false);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition ${
                    selectedFileIndex === index 
                    ? "bg-blue-50 border-blue-400 ring-1 ring-blue-400" 
                    : "bg-white border-gray-100 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileText size={22} className={selectedFileIndex === index ? "text-blue-600" : "text-gray-400"} />
                    <div className="overflow-hidden">
                      <p className={`text-sm font-bold truncate ${selectedFileIndex === index ? "text-blue-900" : "text-gray-700"}`}>
                        {file.name}
                      </p>
                      <p className="text-[10px] text-gray-400 uppercase">{file.time}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 text-gray-300">
                <FileSpreadsheet size={40} className="mx-auto mb-2" />
                <p className="text-xs">No uploads yet</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default OrderBase;