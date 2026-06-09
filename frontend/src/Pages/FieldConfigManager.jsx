import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Save, RefreshCw, Eye, EyeOff, Settings2, 
  CheckCircle, AlertCircle, Lock, Download, Search, X, ListChecks
} from 'lucide-react';

const CORE_FIELDS = ['itemXid', 'domainName', 'itemGid', 'itemName'];

const FieldConfigManager = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState(""); 
  const [message, setMessage] = useState({ type: "", text: "" });
  
  // Base URL updated to match your backend Blueprint structure
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

  const handleUpdate = async (key, field, value) => {
    // Update local state for immediate UI feedback
    setConfigs(prev => prev.map(item => 
      item.key === key ? { ...item, [field]: value } : item
    ));

    // For toggles, we hit the backend immediately to keep things in sync
    if (field === 'display' || field === 'mandatory') {
      try {
        await axios.post(`${API_BASE}/config/update`, { key, [field]: value });
      } catch (err) {
        showMsg("error", "Direct update failed.");
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Logic for batch updating labels/defaults
      await axios.post(`${API_BASE}/config/update`, configs); // Adjusting to your bulk update logic if available
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
      const res = await axios.post(`${API_BASE}/sync-fields`);
      showMsg("success", res.data.message || "Sync Complete!");
      await fetchConfigs(); // Refresh the table
    } catch (err) {
      showMsg("error", "Sync failed. Ensure backend /sync-fields is active.");
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
        
        {message.text && (
          <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border ${
            message.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}>
            <span className="font-bold">{message.text}</span>
          </div>
        )}

        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-8">
            <div className="flex-1 w-full space-y-4">
              <h1 className="text-3xl font-black flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-2xl text-white"><Settings2 size={28}/></div>
                Configuration Manager
              </h1>
              <div className="w-full max-w-xl space-y-2">
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div className="h-full bg-blue-600 transition-all duration-700" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleSyncOTM} className="flex items-center gap-2 bg-white border border-slate-200 px-6 py-3.5 rounded-2xl font-bold hover:bg-slate-50">
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} /> Sync OTM
              </button>
              <button onClick={handleSave} className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-slate-800 shadow-xl">
                <Save size={18} /> {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          <div className="lg:col-span-3 space-y-6">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Search by OTM Key or Display Label..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-6 py-4.5 bg-white border border-slate-200 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-blue-50/50 shadow-sm transition-all text-sm font-medium"
              />
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    <th className="p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Section</th>
                    <th className="p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Key</th>
                    <th className="p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Display Label</th>
                    <th className="p-6 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest">Visible</th>
                    <th className="p-6 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest">Required</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
{filteredConfigs.map((cfg) => {
  // 1. Define if the current row is a core field
  const isCore = CORE_FIELDS.includes(cfg.key);

  return (
    <tr 
      key={cfg.key} 
      className={`transition-colors ${isCore ? 'bg-slate-50/50' : cfg.display ? 'bg-blue-50/30' : ''}`}
    >
      <td className="p-6">
        <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase ${
          isCore ? 'bg-slate-200 text-slate-500' : cfg.section === 'core' ? 'bg-purple-50 text-purple-600' : 'bg-orange-50 text-orange-600'
        }`}>
          {isCore ? 'System' : (cfg.section || 'child')}
        </span>
      </td>

      <td className="p-6">
        <code className={`text-[10px] font-bold px-2 py-1 rounded ${isCore ? 'bg-slate-200 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
          {cfg.key}
        </code>
      </td>

      <td className="p-6">
        <div className="relative flex items-center">
          <input 
            type="text" 
            value={cfg.label || ""} 
            // 2. Disable input if it's a core field
            disabled={isCore}
            onChange={(e) => handleUpdate(cfg.key, 'label', e.target.value)} 
            // 3. Add gray styling classes for disabled state
            className={`w-full px-4 py-2 border rounded-xl text-sm font-bold outline-none transition-all ${
              isCore 
                ? 'bg-slate-100 border-transparent text-slate-400 cursor-not-allowed' 
                : 'border-slate-200 focus:border-blue-500 bg-white'
            }`}
          />
          {isCore && <Lock size={14} className="absolute right-3 text-slate-300" />}
        </div>
      </td>

      <td className="p-6 text-center">
        <button 
          // 4. Disable visibility toggle for core fields
          disabled={isCore}
          onClick={() => handleUpdate(cfg.key, 'display', !cfg.display)} 
          // 5. Add visual 'disabled' style
          className={`p-2.5 rounded-xl transition-all ${
            isCore 
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
              : cfg.display ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
          }`}
        >
          {/* Core fields are always shown, so force Eye icon if isCore is true */}
          {(isCore || cfg.display) ? <Eye size={18}/> : <EyeOff size={18}/>}
        </button>
      </td>

      <td className="p-6 text-center">
        <input 
          type="checkbox" 
          // 6. Force checked if core field
          checked={isCore || !!cfg.mandatory} 
          disabled={isCore}
          onChange={() => handleUpdate(cfg.key, 'mandatory', !cfg.mandatory)} 
          className={`w-5 h-5 rounded cursor-pointer transition-opacity ${
            isCore ? 'accent-slate-400 opacity-50 cursor-not-allowed' : 'accent-blue-600'
          }`} 
        />
      </td>
    </tr>
  );
})}
                </tbody>
              </table>
            </div>
          </div>

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