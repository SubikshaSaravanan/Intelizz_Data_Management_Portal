import { useNavigate } from "react-router-dom";
import {
  FileText,
  Truck,
  Users,
  MapPin,
  Clock,
  Settings,
  ClipboardList,
  Activity
} from "lucide-react";

export default function Landing() {
  const nav = useNavigate();

  const tiles = [
    {
      title: "Invoice Management",
      icon: <FileText size={40} />,
      color: "from-indigo-500 to-indigo-700",
      path: "/invoice"
    },
    {
      title: "Shipment",
      icon: <Truck size={40} />,
      color: "from-blue-500 to-blue-700"
    },
    {
      title: "Vendor Master",
      icon: <Users size={40} />,
      color: "from-emerald-500 to-emerald-700"
    },
    {
      title: "Location",
      icon: <MapPin size={40} />,
      color: "from-orange-500 to-orange-700"
    },
    {
      title: "Tracking Event",
      icon: <Activity size={40} />,
      color: "from-pink-500 to-pink-700"
    },
    {
      title: "Order Base",
      icon: <ClipboardList size={40} />,
      color: "from-purple-500 to-purple-700"
    },
    {
      title: "Audit",
      icon: <Clock size={40} />,
      color: "from-red-500 to-red-700"
    },
    {
      title: "Settings",
      icon: <Settings size={40} />,
      color: "from-gray-600 to-gray-800"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-10">

      <h1 className="text-3xl font-bold text-gray-800 mb-10">
        INTELIZZ Management Portal
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {tiles.map(t => (
          <div
            key={t.title}
            onClick={() => t.path && nav(t.path)}
            className={`bg-gradient-to-br ${t.color} text-white rounded-2xl shadow-xl p-6 h-44
                        flex flex-col items-center justify-center cursor-pointer
                        hover:scale-105 hover:shadow-2xl transition-all duration-200`}
          >
            {t.icon}
            <p className="mt-4 font-semibold text-lg">{t.title}</p>
          </div>
        ))}
      </div>

    </div>
  );
}
