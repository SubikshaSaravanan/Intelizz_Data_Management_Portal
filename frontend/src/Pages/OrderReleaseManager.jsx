import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, EyeOff, X, RefreshCw, Save, ArrowRight } from 'lucide-react';
import axios from 'axios';

export default function OrderReleaseManager() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false); // Tracks OTM Cloud API extraction execution state
  
  const userId = "SRITIKARAN"; 
  const API_BASE = 'http://localhost:5000/api/order-release';

  // Load fields dynamically from your local Postgres database registry cache matrix wrapper
  const loadLocalRegistry = async () => {
    try {
      const response = await axios.get(`${API_BASE}/fields`);
      const initializedFields = response.data.map(field => ({
        section: field.group || 'system',
        key: field.otm_db_path,
        label: field.display_name,
        visible: false, 
        required: field.is_required || false
      }));
      setFields(initializedFields);
    } catch (err) {
      console.error("Error loading registry profiles:", err);
    }
  };

  useEffect(() => {
    loadLocalRegistry().then(() => setLoading(false));
  }, []);

  // Connected Function: Handles downloading data from Oracle API and saving it to local db
  const handleSyncFromOtmCloud = async () => {
    try {
      setSyncing(true);
      const res = await axios.post(`${API_BASE}/sync-from-otm`);
      alert(res.data.message);
      
      // Reload the fresh database values immediately into the left side list
      await loadLocalRegistry();
    } catch (err) {
      console.error("OTM Catalog Sync Interrupted:", err);
      alert(err.response?.data?.message || "Integration error communicating with Cloud Gateway.");
    } finally {
      setSyncing(false);
    }
  };

  const toggleVisibility = (key) => {
    setFields(prev => prev.map(f => f.key === key ? { ...f, visible: !f.visible } : f));
  };

  const handleSaveChanges = async () => {
    try {
      const payload = { user_id: userId, fields: fields.filter(f => f.visible).map(f => f.key) };
      await axios.post(`${API_BASE}/save-config`, payload);
      alert("Changes saved to profile context wrapper!");
    } catch (err) {
      alert("Failed to sync fields configuration profile mapping.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8 font-sans antialiased text-[#1E293B]">
      {/* Top action header bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Order Release Manager</h1>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate("/OrderReleaseWorkspace")} 
            className="flex items-center gap-2 px-5 py-3 bg-black hover:bg-slate-900 text-white font-semibold text-sm rounded-xl shadow-sm transition-all"
          >
            Go to OrderRelease <ArrowRight className="w-4 h-4" />
          </button>
          <button 
            onClick={handleSaveChanges}
            className="flex items-center gap-2 px-5 py-3 bg-[#10B981] hover:bg-[#059669] text-white font-semibold text-sm rounded-xl shadow-sm transition-all"
          >
            <Save className="w-4 h-4" /> Save Changes
          </button>
          
          {/* Working Button Attached to Oracle Dynamic Endpoint */}
          <button 
            onClick={handleSyncFromOtmCloud}
            disabled={syncing}
            className="flex items-center gap-2 px-5 py-3 bg-[#3B82F6] hover:bg-[#2563EB] disabled:bg-blue-300 text-white font-semibold text-sm rounded-xl shadow-sm transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> 
            {syncing ? "Pulling Catalog..." : "Sync from OTM"}
          </button>
          
          <button className="px-5 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-sm rounded-xl shadow-sm transition-all">
            Reset
          </button>
        </div>
      </div>

      {/* Global Filter Search row */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
        <input 
          type="text"
          placeholder="Search live extracted OTM metadata parameters..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 focus:border-slate-300 rounded-xl text-sm shadow-sm focus:outline-none placeholder-slate-400 transition-all"
        />
      </div>

      {/* Split Workspace layout design mapping container columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 flex flex-col gap-3">
          <div className="grid grid-cols-12 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            <div className="col-span-3">Section</div>
            <div className="col-span-3">Key</div>
            <div className="col-span-4">Display Label</div>
            <div className="col-span-1 text-center">Visible</div>
            <div className="col-span-1 text-center">Required</div>
          </div>

          {fields
            .filter(f => f.label.toLowerCase().includes(search.toLowerCase()) || f.key.toLowerCase().includes(search.toLowerCase()))
            .map((field) => (
              <div key={field.key} className="grid grid-cols-12 items-center bg-white border border-slate-100 rounded-xl p-4 shadow-sm transition-all hover:border-slate-200">
                <div className="col-span-3 text-sm text-slate-400 font-medium">{field.section}</div>
                <div className="col-span-3 text-sm text-slate-600 font-mono text-xs">{field.key}</div>
                <div className="col-span-4 text-sm font-bold text-[#6366F1]">{field.label}</div>
                
                <div className="col-span-1 flex justify-center">
                  <button 
                    onClick={() => toggleVisibility(field.key)}
                    className={`p-2 rounded-lg transition-all ${
                      field.visible ? 'bg-[#93C5FD]/40 text-[#2563EB]' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {field.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
                
                <div className="col-span-1 flex justify-center">
                  <input 
                    type="checkbox" 
                    checked={field.required} 
                    disabled 
                    className="w-4 h-4 rounded text-[#6366F1] border-slate-200 accent-[#E2E8F0] cursor-not-allowed"
                  />
                </div>
              </div>
          ))}
        </div>

        {/* Right Active Fields layout summary */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] sticky top-6">
          <h3 className="text-sm font-bold text-slate-800 mb-6">Selected ({fields.filter(f => f.visible).length})</h3>
          <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-1">
            {fields.filter(f => f.visible).map((field) => (
              <div key={field.key} className="flex items-center justify-between group border-b border-slate-50 pb-3 last:border-0">
                <div>
                  <p className="text-sm font-bold text-[#2563EB]">{field.label}</p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{field.key}</p>
                </div>
                <button 
                  onClick={() => toggleVisibility(field.key)}
                  className="text-slate-400 hover:text-rose-500 opacity-80 hover:opacity-100 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}