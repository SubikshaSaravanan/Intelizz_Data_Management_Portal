import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Search, ChevronDown, ChevronUp, Database, 
  Calendar, Tag, Layers, Send, CheckCircle, AlertCircle, RotateCcw, Upload, Download 
} from 'lucide-react';

const ItemCreate = () => {
  const [config, setConfig] = useState([]); 
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState({ type: null, message: "" });
  const [createdGid, setCreatedGid] = useState(null);

  // 1. Logic to Download the Excel Template from Backend
  const handleExport = async () => {
    try {
      setStatus({ type: 'info', message: "Generating template..." });
      const response = await axios.get('http://127.0.0.1:5000/api/items/export-template', {
        responseType: 'blob', // Required for file downloads
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'OTM_UI_Template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setStatus({ type: 'success', message: "Template downloaded successfully!" });
    } catch (err) {
      setStatus({ type: 'error', message: "Failed to download template." });
    }
  };

  // 2. Logic to initialize the form
  const initForm = async () => {
    setLoading(true);
    try {
      const configRes = await axios.get('http://127.0.0.1:5000/api/items/config');
      const activeConfigs = configRes.data.filter(c => c.display);
      setConfig(activeConfigs);

      const initial = {};
      activeConfigs.forEach(c => { initial[c.key] = ''; });
      setFormData(initial);
    } catch (err) { 
      setStatus({ type: 'error', message: "Failed to load template settings." });
    } finally { setLoading(false); }
  };

  useEffect(() => { initForm(); }, []);

  // 3. Logic to upload the modified Excel
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
      setLoading(true);
      await axios.post('http://127.0.0.1:5000/api/items/upload-template', uploadData);
      await initForm(); 
      setStatus({ type: 'success', message: "UI Template updated from Excel!" });
    } catch (err) {
      setStatus({ type: 'error', message: "Excel upload failed." });
    } finally { setLoading(false); }
  };

  const handlePost = async () => {
    setSubmitting(true);
    try {
      const response = await axios.post('http://127.0.0.1:5000/api/items/', formData);
      setCreatedGid(response.data.item_gid);
      setStatus({ type: 'success', message: `Success! GID: ${response.data.item_gid}` });
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.error || "Sync Failed." });
    } finally { setSubmitting(false); }
  };


  const renderSectionFields = (sectionId) => {
    return config
      .filter(c => c.section === sectionId)
      .filter(c => !searchTerm || c.label.toLowerCase().includes(searchTerm.toLowerCase()))
      .map(field => (
        <div key={field.key} className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {field.label} {field.mandatory && <span className="text-red-400">*</span>}
          </label>
          <input 
            className="h-10 border border-slate-200 rounded-xl px-4 text-sm bg-slate-50/30 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            value={formData[field.key] || ''}
            onChange={(e) => setFormData({...formData, [field.key]: e.target.value})}
          />
        </div>
      ));
  };

  if (loading) return <div className="flex h-screen items-center justify-center font-bold text-blue-600 italic">Loading dynamic template...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="text-blue-600" />
            <h1 className="text-lg font-bold tracking-tight text-slate-800">OTM Item Manager</h1>
          </div>
          

          <div className="flex items-center gap-3">
            {/* Download Button */}
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-semibold transition-all text-slate-700 shadow-sm"
            >
              <Download size={16} className="text-blue-500"/> Download List
            </button>

            {/* Upload Button */}
            <label className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-all text-sm font-semibold shadow-md">
              <Upload size={16}/> Upload Template
              <input type="file" className="hidden" onChange={handleFileUpload} accept=".xlsx, .xls" />
            </label>

            <div className="h-6 w-[1px] bg-slate-200 mx-2"></div>

            <input 
              type="text" placeholder="Filter UI fields..." 
              className="h-10 w-40 rounded-full border border-slate-200 bg-slate-50 px-4 text-xs focus:w-64 transition-all outline-none"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </nav>

      <main className="mx-auto mt-8 max-w-5xl px-6">
        {status.message && (
          <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
            status.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 
            status.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-700' :
            'bg-red-50 border-red-200 text-red-700'
          }`}>
            {status.type === 'success' ? <CheckCircle size={18}/> : <AlertCircle size={18}/>}
            <span className="text-sm font-medium">{status.message}</span>
          </div>
        )}

        {['core', 'dates', 'attributes'].map(sectionId => (
          <div key={sectionId} className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 uppercase text-[10px] font-black tracking-[0.2em] text-slate-400">
                <Layers size={14} className="text-blue-400"/> {sectionId} Group
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6 p-8">
              {renderSectionFields(sectionId)}
            </div>
          </div>
        ))}

        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xs px-4">
          <button 
            onClick={handlePost} 
            disabled={submitting} 
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-2xl hover:bg-black transition-all disabled:bg-slate-300 transform active:scale-95"
          >
            {submitting ? "Processing Sync..." : "Push to Oracle OTM"}
          </button>
        </div>
      </main>
    </div>
  );
};

export default ItemCreate;