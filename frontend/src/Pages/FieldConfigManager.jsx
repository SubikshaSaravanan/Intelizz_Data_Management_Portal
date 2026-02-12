import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Save, RefreshCw, Eye, EyeOff, Settings2, 
  CheckCircle, AlertCircle, Lock,
  Download, Upload, FileJson, Search
} from 'lucide-react';

const CORE_FIELDS = ['itemXid', 'domainName', 'itemGid', 'itemName'];

const FieldConfigManager = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  
  const [templateLibrary, setTemplateLibrary] = useState([{ name: "Template Mapping", data: [] }]);
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  
  const fileInputRef = useRef(null);
  const API_BASE = "http://127.0.0.1:5000/api/items";

  useEffect(() => { fetchConfigs(); }, []);

 const fetchConfigs = async () => {
  try {
    const res = await axios.get(`${API_BASE}/config`);
    setConfigs(res.data);

    setTemplateLibrary(prev => {
      const updatedDB = { name: "Template Mapping", data: res.data };
      if (prev.length <= 1) return [updatedDB];
      
      // Keep the rest of the library (uploaded templates)
      return [updatedDB, ...prev.slice(1)];
    });
  } catch (err) {
    showMsg("error", "Failed to load configurations.");
  }
};
   

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  // --- AUTOMATIC LOAD ON CHANGE ---
  const handleTemplateChange = (index) => {
    setSelectedTemplateIndex(index);
    const selected = templateLibrary[index];
    if (selected && selected.data.length > 0) {
      setConfigs(selected.data);
      showMsg("success", `Switched to: ${selected.name}`);
    }
  };

  const handleUpdate = (key, field, value) => {
    setConfigs(prev => prev.map(item => 
      item.key === key ? { ...item, [field]: value } : item
    ));
  };

  const downloadTemplate = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(configs, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `OTM_Template_${new Date().toLocaleDateString()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target.result);
          const newTemplate = { name: file.name, data: json };
          const updatedLibrary = [...templateLibrary, newTemplate];
          setTemplateLibrary(updatedLibrary);
          
          // Auto-select and Auto-load the uploaded template
          setSelectedTemplateIndex(updatedLibrary.length - 1);
          setConfigs(json);
          showMsg("success", "Template uploaded and applied!");
        } catch (err) {
          showMsg("error", "Invalid JSON file.");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSave = async () => {
  setSaving(true);
  try {
    await axios.post(`${API_BASE}/upload-template-json`, configs);
    showMsg("success", "Settings saved successfully!");
    
    // Refresh the "Current Database Config" without losing uploaded items
    const res = await axios.get(`${API_BASE}/config`);
    setTemplateLibrary(prev => {
        const newState = [...prev];
        newState[0] = { name: "Current Database Config", data: res.data };
        return newState;
    });
  } catch (err) {
    showMsg("error", "Failed to save settings.");
  } finally {
    setSaving(false);
  }
};

  const handleSyncOTM = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/sync-fields`);
      await fetchConfigs();
      showMsg("success", res.data.message || "OTM Fields synchronized!");
    } catch (err) {
      showMsg("error", "OTM Sync failed.");
    } finally {
      setLoading(false);
    }
  };

  const filteredConfigs = configs.filter(c => 
    c.key.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.label && c.label.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Toast Notification */}
        {message.text && (
          <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border ${
            message.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-rose-600 border-rose-500 text-white'
          }`}>
            {message.type === 'success' ? <CheckCircle size={20}/> : <AlertCircle size={20}/>}
            <span className="font-semibold">{message.text}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-blue-600 rounded-lg text-white"><Settings2 size={24}/></div>
              Field Configuration
            </h1>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button onClick={handleSyncOTM} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-50 shadow-sm disabled:opacity-50">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              {loading ? "Syncing..." : "Sync OTM"}
            </button>
            <button onClick={handleSave} className="flex items-center gap-2 bg-slate-900 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-slate-800 shadow-lg active:scale-95 disabled:opacity-50">
              <Save size={18} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Search and Template Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 flex-1 min-w-[300px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search OTM keys or labels..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <select 
              value={selectedTemplateIndex}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-semibold outline-none focus:border-blue-500 cursor-pointer"
            >
              {templateLibrary.map((tmpl, idx) => (
                <option key={idx} value={idx}>{tmpl.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={downloadTemplate} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2.5 rounded-xl font-bold hover:bg-blue-100 transition-all">
              <Download size={18} /> Download
            </button>
            <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition-all">
              <Upload size={18} /> Upload
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".json" />
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="p-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest w-[25%]">Otm Key</th>
                  <th className="p-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest w-[30%]">Display Text (UI)</th>
                  <th className="p-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest w-[25%]">Default Value</th>
                  <th className="p-5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">Visible</th>
                  <th className="p-5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">Mandatory</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredConfigs.map((cfg) => {
                  const isCore = CORE_FIELDS.includes(cfg.key);
                  return (
                    <tr key={cfg.key} className={`hover:bg-blue-50/20 transition-colors ${isCore ? 'bg-slate-50/50' : ''}`}>
                      <td className="p-5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded">
                            {cfg.key}
                          </span>
                          {isCore && <Lock size={12} className="text-slate-300" />}
                        </div>
                      </td>
                      <td className="p-5">
                        <input 
                          type="text" 
                          value={cfg.label || ""} 
                          onChange={(e) => handleUpdate(cfg.key, 'label', e.target.value)}
                          className="w-full px-4 py-2.5 border-2 border-slate-100 rounded-xl focus:border-blue-500 bg-white outline-none transition-all font-semibold text-slate-700"
                        />
                      </td>
                      <td className="p-5">
                        <input 
                          type="text" 
                          value={cfg.defaultValue || ""} 
                          disabled={isCore}
                          onChange={(e) => handleUpdate(cfg.key, 'defaultValue', e.target.value)}
                          className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none ${isCore ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'border border-slate-200 focus:border-slate-400'}`}
                        />
                      </td>
                      <td className="p-5 text-center">
                        <button 
                          disabled={isCore}
                          onClick={() => handleUpdate(cfg.key, 'display', !cfg.display)}
                          className={`p-2.5 rounded-xl transition-all ${cfg.display ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'} ${isCore ? 'opacity-30' : ''}`}
                        >
                          {cfg.display ? <Eye size={18}/> : <EyeOff size={18}/>}
                        </button>
                      </td>
                      <td className="p-5 text-center">
                        <label className={`relative inline-flex items-center ${isCore ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}>
                          <input type="checkbox" className="sr-only peer" checked={isCore ? true : !!cfg.mandatory} disabled={isCore} onChange={() => handleUpdate(cfg.key, 'mandatory', !cfg.mandatory)} />
                          <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                        </label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FieldConfigManager;