import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Save, RefreshCw, Eye, EyeOff, Settings2, 
  CheckCircle, AlertCircle, Lock, Download, Upload, Search, 
  AlertOctagon, X, ListChecks
} from 'lucide-react';

const CORE_FIELDS = ['itemXid', 'domainName', 'itemGid', 'itemName'];

const FieldConfigManager = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  
  const [templateLibrary, setTemplateLibrary] = useState([{ name: "Database Config", data: [] }]);
  const fileInputRef = useRef(null);
  
  // Ensure this matches your Flask registration exactly
  const API_BASE = "http://127.0.0.1:5000/api/items";

  useEffect(() => { fetchConfigs(); }, []);

  const selectedFields = configs.filter(c => c.display);
  const totalFields = configs.length;
  const progressPercent = totalFields > 0 ? Math.round((selectedFields.length / totalFields) * 100) : 0;

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  const fetchConfigs = async () => {
    try {
      const res = await axios.get(`${API_BASE}/config`);
      setConfigs(res.data);
    } catch (err) {
      showMsg("error", "Failed to load database config.");
    }
  };

  const downloadTemplate = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(configs, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `OTM_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    showMsg("success", "Backup Downloaded!");
  };

  const handleUpdate = (key, field, value) => {
    setConfigs(prev => prev.map(item => 
      item.key === key ? { ...item, [field]: value } : item
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post(`${API_BASE}/upload-template-json`, configs);
      showMsg("success", "Database updated!");
      await fetchConfigs();
    } catch (err) {
      showMsg("error", "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleSyncOTM = async () => {
    setLoading(true);
    try {
      // ✅ Using the endpoint that matches your Flask item_bp registration
      const res = await axios.post(`${API_BASE}/sync-fields`);
      showMsg("success", res.data.message || "Sync Complete!");
      await fetchConfigs(); // Refresh the table
    } catch (err) {
      console.error("Sync Error Details:", err.response);
      showMsg("error", `Sync failed: ${err.response?.status || 'Server Offline'}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredConfigs = configs.filter(c => 
    c.key.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.label && c.label.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-[1600px] mx-auto">
        
        {/* Toast Notification */}
        {message.text && (
          <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border transition-all animate-in slide-in-from-top ${
            message.type === 'success' ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-rose-600 text-white border-rose-400'
          }`}>
            {message.type === 'success' ? <CheckCircle size={20}/> : <AlertCircle size={20}/>}
            <span className="font-bold">{message.text}</span>
          </div>
        )}

        {/* Header Card */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-8">
            <div className="flex-1 w-full space-y-4">
              <h1 className="text-3xl font-black flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-2xl text-white"><Settings2 size={28}/></div>
                Configuration Manager
              </h1>
              <div className="w-full max-w-xl space-y-2">
                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>Template Coverage</span>
                  <span className="text-blue-600">{progressPercent}% Selected</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div className="h-full bg-blue-600 transition-all duration-700" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleSyncOTM} className="flex items-center gap-2 bg-white border border-slate-200 px-6 py-3.5 rounded-2xl font-bold hover:bg-slate-50 transition-all">
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} /> {loading ? "Syncing..." : "Sync OTM"}
              </button>
              <button onClick={handleSave} className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-slate-800 shadow-xl transition-all active:scale-95">
                <Save size={18} /> {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Main Table Section */}
          <div className="lg:col-span-3 space-y-6">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Search keys..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-6 py-4.5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 transition-all font-medium"
              />
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    <th className="p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Key</th>
                    <th className="p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Display Label</th>
                    <th className="p-6 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest">Visible</th>
                    <th className="p-6 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest">Required</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredConfigs.map((cfg) => (
                    <tr key={cfg.key} className={`transition-colors ${cfg.display ? 'bg-blue-50/30' : ''}`}>
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                          <code className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded text-slate-500">{cfg.key}</code>
                          {CORE_FIELDS.includes(cfg.key) && <Lock size={12} className="text-slate-300" />}
                        </div>
                      </td>
                      <td className="p-6">
                        <input 
                          type="text" 
                          value={cfg.label || ""} 
                          onChange={(e) => handleUpdate(cfg.key, 'label', e.target.value)} 
                          className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:border-blue-500 outline-none transition-all"
                        />
                      </td>
                      <td className="p-6 text-center">
                        <button 
                          disabled={CORE_FIELDS.includes(cfg.key)}
                          onClick={() => handleUpdate(cfg.key, 'display', !cfg.display)} 
                          className={`p-2.5 rounded-xl transition-all ${cfg.display ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}
                        >
                          {cfg.display ? <Eye size={18}/> : <EyeOff size={18}/>}
                        </button>
                      </td>
                      <td className="p-6 text-center">
                        <input 
                          type="checkbox" 
                          checked={!!cfg.mandatory} 
                          disabled={CORE_FIELDS.includes(cfg.key)}
                          onChange={() => handleUpdate(cfg.key, 'mandatory', !cfg.mandatory)} 
                          className="w-5 h-5 accent-blue-600 rounded cursor-pointer" 
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Sidebar (Always Visible X Button) */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl sticky top-8 flex flex-col max-h-[85vh]">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-[2.5rem]">
                <div className="flex items-center gap-2 font-black text-xs tracking-widest uppercase">
                  <ListChecks className="text-blue-600" size={18} />
                  Selected ({selectedFields.length})
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {selectedFields.map((field) => (
                  <div key={field.key} className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="min-w-0 pr-2">
                      <p className="text-[9px] font-black text-blue-600 uppercase truncate">{field.key}</p>
                      <p className="text-xs font-bold text-slate-700 truncate">{field.label || field.key}</p>
                    </div>
                    {!CORE_FIELDS.includes(field.key) && (
                      <button 
                        onClick={() => handleUpdate(field.key, 'display', false)}
                        className="p-1.5 rounded-lg bg-white text-slate-400 hover:bg-rose-500 hover:text-white border border-slate-100 transition-all flex-shrink-0"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 rounded-b-[2.5rem]">
                <button onClick={downloadTemplate} className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-600 hover:text-blue-600 transition-all">
                  <Download size={14} /> Download Backup
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default FieldConfigManager;