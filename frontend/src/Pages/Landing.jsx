import { useNavigate } from "react-router-dom";
import { useState } from "react";
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
  Moon
} from "lucide-react";

export default function Landing() {
  const nav = useNavigate();
  const [darkMode, setDarkMode] = useState(false);

  const tiles = [
    {
      title: "Invoice Management",
      icon: FileText,
      color: "from-indigo-500 to-indigo-700",
      path: "/invoice"
    },
    {
      title: "Shipment",
      icon: Truck,
      color: "from-blue-500 to-blue-700"
    },
    {
      title: "Vendor Master",
      icon: Users,
      color: "from-emerald-500 to-emerald-700"
    },
    {
      title: "Location",
      icon: MapPin,
      color: "from-orange-500 to-orange-700"
    },
    {
      title: "Tracking Event",
      icon: Activity,
      color: "from-pink-500 to-pink-700"
    },
    {
      title: "Order Base",
      icon: ClipboardList,
      color: "from-purple-500 to-purple-700"
    },
    {
      title: "Audit",
      icon: Clock,
      color: "from-red-500 to-red-700"
    },
    {
      title: "Items",
      icon: Package,
      color: "from-amber-600 to-orange-800",
      path: "/items"
    }
  ];

  return (
    <div className={darkMode
      ? "min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-10 text-white"
      : "min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 p-10 text-slate-800"}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-3xl font-bold">
            Data Management Portal
          </h1>
          <p className={darkMode ? "text-slate-300 mt-2" : "text-slate-500 mt-2"}>
            Centralized control for operational master data
          </p>
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={darkMode
            ? "flex items-center gap-2 bg-slate-700 px-4 py-2 rounded-xl hover:bg-slate-600 transition"
            : "flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow hover:shadow-md transition"}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          <span className="text-sm font-medium">
            {darkMode ? "Light Mode" : "Dark Mode"}
          </span>
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {tiles.map(t => {
          const Icon = t.icon;
          return (
            <div
              key={t.title}
              onClick={() => t.path && nav(t.path)}
              className="group cursor-pointer"
            >
              <div
                className={`relative h-44 rounded-2xl p-6 text-white
                bg-gradient-to-br ${t.color}
                shadow-lg transition-all duration-300
                group-hover:-translate-y-2 group-hover:shadow-2xl`}
              >
                {/* Background Icon */}
                <div className="absolute top-5 right-5 opacity-20 group-hover:opacity-30 transition">
                  <Icon size={72} />
                </div>

                {/* Foreground */}
                <div className="relative z-10">
                  <Icon size={36} />
                  <h2 className="mt-6 text-lg font-semibold">
                    {t.title}
                  </h2>
                  <p className="text-sm text-white/80 mt-1">
                    {t.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
