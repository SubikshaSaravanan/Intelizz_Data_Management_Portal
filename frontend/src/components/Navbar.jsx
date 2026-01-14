import { Link, useNavigate } from "react-router-dom";
import {
  Home,
  FileText,
  Truck,
  Users,
  MapPin,
  Activity,
  ClipboardList,
  Clock,
  Settings,
  LogOut
} from "lucide-react";

export default function Navbar() {
  const nav = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("auth");
    nav("/");
    window.location.reload();
  };

  const menus = [
    { name: "Dashboard", path: "/dashboard", icon: <Home size={18}/> },
    { name: "Invoices", path: "/invoice", icon: <FileText size={18}/> },
    { name: "Shipment", path: "#", icon: <Truck size={18}/> },
    { name: "Vendors", path: "#", icon: <Users size={18}/> },
    { name: "Location", path: "#", icon: <MapPin size={18}/> },
    { name: "Tracking", path: "#", icon: <Activity size={18}/> },
    { name: "Orders", path: "#", icon: <ClipboardList size={18}/> },
    { name: "Audit", path: "#", icon: <Clock size={18}/> },
    { name: "Settings", path: "#", icon: <Settings size={18}/> }
  ];

  return (
    <div className="bg-indigo-900 text-white flex justify-between px-6 py-3 shadow-lg">

      {/* Left side menus */}
      <div className="flex gap-6 items-center">
        {menus.map(m => (
          <Link
            key={m.name}
            to={m.path}
            className="flex items-center gap-2 text-sm hover:text-indigo-300 transition"
          >
            {m.icon}
            {m.name}
          </Link>
        ))}
      </div>

      {/* Right side logout */}
      <button
        onClick={logout}
        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-1.5 rounded text-sm"
      >
        <LogOut size={16}/> Logout
      </button>

    </div>
  );
}
