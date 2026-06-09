import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  X,
  Search,
  RotateCcw
} from "lucide-react";


function OrderBaseManager() {
  const [configs, setConfigs] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const API_BASE = "http://localhost:5000/api/orderbase";

  const CORE_FIELDS = [
    "orderBaseXid",
    "orderBaseName",
    "domainName",
    "sourceLocationGid",
    "destLocationGid"
  ];

  useEffect(() => {
    fetchConfigs();
  }, []);

  // ================= FORMAT KEY =================
  const formatKey = (key) => {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^./, str => str.toUpperCase());
  };

  // ================= FETCH =================
  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/config`);
      const data = res.data.map(i => ({
        ...i,
        display: i.display || false
      }));
      setConfigs(data);
      setSelectedFields(data.filter(i => i.display));
    } catch (err) {
      showMessage("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // ================= SYNC =================
  const handleSyncOTM = async () => {
    setSyncing(true);
    setMessage("");

    try {
      await axios.post(`${API_BASE}/sync-fields`);
      await fetchConfigs();
      showMessage("✅ Synced successfully from OTM");
    } catch (err) {
      showMessage("⚠️ OTM sync failed, fallback used");
    } finally {
      setSyncing(false);
    }
  };

  // ================= MESSAGE =================
  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 4000);
  };

  // ================= TOGGLE =================
  const toggleField = (field) => {
    if (CORE_FIELDS.includes(field.key)) return;

    const updated = configs.map(c => c.key === field.key ? { ...c, display: !c.display } : c
    );

    setConfigs(updated);

    if (!field.display) {
      setSelectedFields(prev => [...prev, field]);
    } else {
      setSelectedFields(prev => prev.filter(f => f.key !== field.key)
      );
    }
  };

  // ================= REMOVE =================
  const removeField = (key) => {
    setSelectedFields(prev => prev.filter(f => f.key !== key));
    setConfigs(prev => prev.map(c => c.key === key ? { ...c, display: false } : c
    )
    );
  };

  // ================= SAVE =================
  const handleSave = async () => {
    try {
      const payload = configs.map(c => ({
        key: c.key,
        label: c.label,
        required: c.required,
        display: c.display
      }));

      await axios.post(`${API_BASE}/config/update`, {
        configs: payload
      });

      showMessage("✅ Configuration saved successfully");
    } catch (err) {
      showMessage("❌ Failed to save configuration");
    }
  };

  // ✅ FIX ADDED HERE (THIS WAS MISSING)
  const filteredConfigs = configs.filter(c => (c.label || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">

        {/* TITLE */}
        <h1 className="text-3xl font-bold text-gray-800">
          Order Base Manager
        </h1>

        {/* BUTTON GROUP */}
        <div className="flex flex-wrap gap-3 justify-start md:justify-end">

          {/* GO TO ORDERBASE */}
          <button
            onClick={() => navigate("/OrderBase")}
            className="px-5 py-2 rounded-lg bg-black text-white shadow-md"
          >
            Go to OrderBase →
          </button>

          {/* SAVE */}
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 shadow-md"
          >
            Save Changes
          </button>

          {/* SYNC BUTTON */}
          <button
            onClick={handleSyncOTM}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white shadow-md transition 
            ${syncing ? "bg-blue-400 scale-95" : "bg-blue-600 hover:scale-105"}`}
          >
            <RotateCcw className={syncing ? "animate-spin" : ""} size={16} />
            {syncing ? "Syncing..." : "Sync from OTM"}
          </button>

          {/* RESET */}
          <button
            onClick={fetchConfigs}
            className="px-4 py-2 rounded-lg bg-white/70 backdrop-blur border shadow-md"
          >
            Reset
          </button>

        </div>
      </div>

      {/* MESSAGE */}
      {message && (
        <div className="mb-4 p-3 rounded-lg bg-white shadow text-sm">
          {message}
        </div>
      )}

      {/* SEARCH */}
      <div className="mb-6 flex items-center bg-white/60 backdrop-blur border rounded-xl px-4 py-2">
        <Search size={16} />
        <input
          className="ml-2 w-full bg-transparent outline-none"
          placeholder="Search fields..."
          onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* MAIN */}
      <div className="grid grid-cols-12 gap-6">

        {/* LEFT */}
        <div className="col-span-8">

          {/* HEADER */}
          <div className="grid grid-cols-5 text-xs font-semibold text-gray-400 px-4 py-3">
            <div>SECTION</div>
            <div>KEY</div>
            <div>DISPLAY LABEL</div>
            <div className="text-center">VISIBLE</div>
            <div className="text-center">REQUIRED</div>
          </div>

          <div className="space-y-3">

            {filteredConfigs.map(field => {
              const isCore = CORE_FIELDS.includes(field.key);

              return (
                <div
                  key={field.key}
                  className={`grid grid-cols-5 items-center px-4 py-4 rounded-2xl 
                  bg-white/60 backdrop-blur border shadow-sm transition
                  ${isCore ? "opacity-50" : "hover:shadow-lg"}`}
                >

                  <div>{field.section}</div>

                  <div className="font-semibold text-sm">
                    {field.label}
                  </div>

                  <input
                    value={formatKey(field.key)}
                    onChange={(e) => setConfigs(prev => prev.map(c => c.key === field.key
                      ? { ...c, key: e.target.value }
                      : c
                    )
                    )}
                    className="bg-transparent outline-none text-blue-600 font-bold" />

                  <div className="flex justify-center">
                    <button
                      onClick={() => toggleField(field)}
                      className={`w-10 h-10 rounded-xl 
                        ${field.display ? "bg-blue-600 text-white" : "bg-gray-200"}`}
                    >
                      {field.display ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  </div>

                  <div className="flex justify-center">
                    <input
                      type="checkbox"
                      checked={field.required}
                      disabled={isCore}
                      onChange={(e) => setConfigs(prev => prev.map(c => c.key === field.key
                        ? { ...c, required: e.target.checked }
                        : c
                      )
                      )} />
                  </div>

                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="col-span-4">
          <div className="bg-white/60 backdrop-blur rounded-3xl p-5 shadow-lg">

            <h3 className="font-bold mb-4">
              Selected ({selectedFields.length})
            </h3>

            <div className="space-y-3">

              {selectedFields.map(field => (
                <div key={field.key} className="flex justify-between bg-white p-3 rounded-xl">
                  <div>
                    <p className="text-xs text-blue-600 font-bold">
                      {formatKey(field.key)}
                    </p>
                    <p className="text-sm">{field.label}</p>
                  </div>

                  <button onClick={() => removeField(field.key)}>
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default OrderBaseManager;