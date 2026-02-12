import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  FileText,
  Truck,
  Users,
  MapPin,
  Clock,
  Package,
  ClipboardList,
  Activity,
  Sun,
  Moon,
  Database,
  Settings,
  ShieldCheck,
  RefreshCw,
  Globe,
  Box,
  Layers,
  Anchor,
  CreditCard,
  FilePlus,
  Sliders,
  UserCog,
  CheckSquare,
  Ruler
} from "lucide-react";
import { getDashboardModules, syncMetadata } from "../api";

// Expanded Icon mapping for OTM resources
const IconMap = {
  FileText, Truck, Users, MapPin, Clock, Package, ClipboardList, Activity,
  Database, Settings, ShieldCheck, Globe, Box, Layers, Anchor, CreditCard,
  FilePlus, Sliders, UserCog, CheckSquare, Ruler
};

export default function Landing() {
  const nav = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [modules, setModules] = useState({
    MASTER: [],
    TRANSACTION: [],
    POWER: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const resp = await getDashboardModules();
      console.log("Dashboard Modules fetched:", resp.data);
      setModules(resp.data);
    } catch (err) {
      console.error("Failed to fetch dashboard modules", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (e, objectName) => {
    e.stopPropagation();
    try {
      await syncMetadata(objectName);
      fetchModules();
    } catch (err) {
      alert("Sync failed: " + err.message);
    }
  };

  const renderSection = (title, data, colorClass, sectionKey) => {
    // Debug helper
    console.log(`Rendering ${title} with ${data?.length || 0} items`);

    if (!data || data.length === 0) {
      return (
        <div className="mb-8 opacity-50 italic">
          {/* Visual debug for empty sections */}
          No data for {title} (key: {sectionKey})
        </div>
      );
    }

    return (
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <div className={`w-2 h-8 rounded-full bg-gradient-to-b ${colorClass}`} />
          {title} ({data.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {data.map((t, idx) => {
            const Icon = IconMap[t.icon] || Database;
            const isSynced = t.is_synced || t.is_app;
            const hasPath = t.path && t.path !== "#";

            return (
              <div
                key={t.name + idx}
                onClick={() => {
                  console.log(`Navigating to ${t.path} for module ${t.name}`);
                  if (hasPath) nav(t.path);
                }}
                className={`group cursor-pointer ${!isSynced ? 'opacity-70 grayscale-[0.4]' : ''} ${!hasPath ? 'pointer-events-none' : ''}`}
              >
                <div
                  className={`relative h-40 rounded-2xl p-6 text-white
                  bg-gradient-to-br ${getGradient(title)}
                  shadow-lg transition-all duration-300
                  group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:grayscale-0 group-hover:opacity-100`}
                >
                  {/* Background Icon */}
                  <div className="absolute top-5 right-5 opacity-20 group-hover:opacity-40 transition pointer-events-none">
                    <Icon size={64} />
                  </div>

                  {/* Foreground */}
                  <div className="relative z-10 h-full flex flex-col justify-between pointer-events-none">
                    <div>
                      <Icon size={32} />
                      <h3 className="mt-4 text-lg font-semibold leading-tight">
                        {t.title}
                      </h3>
                      {!isSynced && (
                        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full mt-1 inline-block">
                          Not Synced
                        </span>
                      )}
                    </div>

                    {!t.is_app && (
                      <div className="flex items-center justify-between mt-2 pointer-events-auto">
                        <p className="text-[10px] text-white/60">
                          {t.last_synced
                            ? `Synced: ${new Date(t.last_synced).toLocaleDateString()}`
                            : "Metadata Missing"}
                        </p>
                        <button
                          onClick={(e) => handleSync(e, t.name)}
                          className="p-1.5 hover:bg-white/20 rounded-lg transition"
                          title="Sync Metadata"
                        >
                          <RefreshCw size={12} className={!t.is_synced ? 'animate-pulse' : ''} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const getGradient = (title) => {
    if (title.includes("Master")) return "from-indigo-500 to-indigo-700";
    if (title.includes("Transaction")) return "from-emerald-500 to-emerald-700";
    if (title.includes("Power")) return "from-amber-500 to-orange-700";
    return "from-slate-500 to-slate-700";
  };

  return (
    <div className={darkMode
      ? "min-h-screen bg-slate-900 p-10 text-white transition-colors duration-500"
      : "min-h-screen bg-slate-50 p-10 text-slate-800 transition-colors duration-500"}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">
            Data Management Portal
          </h1>
          <p className={darkMode ? "text-slate-400 mt-2" : "text-slate-500 mt-2"}>
            Oracle OTM-style centralized control for operational data
          </p>
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={darkMode
            ? "flex items-center gap-2 bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl hover:bg-slate-700 transition"
            : "flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition"}
        >
          {darkMode ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-indigo-600" />}
          <span className="text-sm font-medium">
            {darkMode ? "Light Mode" : "Dark Mode"}
          </span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
        </div>
      ) : (
        <>
          {renderSection("Master Data", modules.MASTER, "from-indigo-500 to-indigo-700", "MASTER")}
          {renderSection("Transaction Data", modules.TRANSACTION, "from-emerald-500 to-emerald-700", "TRANSACTION")}
          {renderSection("Power Data", modules.POWER, "from-amber-500 to-orange-700", "POWER")}
        </>
      )}
    </div>
  );
}
