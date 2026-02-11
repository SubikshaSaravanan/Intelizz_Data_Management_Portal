import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/intel-8.png";

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
  Package,
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
    { name: "Dashboard", path: "/dashboard", icon: <Home size={18} /> },
    { name: "Invoices", path: "/invoice", icon: <FileText size={18} /> },
    { name: "Shipment", path: "/shipment", icon: <Truck size={18} /> },
    { name: "Vendors", path: "/vendors", icon: <Users size={18} /> },
    { name: "Location", path: "/location", icon: <MapPin size={18} /> },
    { name: "Tracking", path: "/tracking", icon: <Activity size={18} /> },
    { name: "Orders", path: "/orders", icon: <ClipboardList size={18} /> },
    { name: "Audit", path: "/audit", icon: <Clock size={18} /> },
    { name: "itemCreate", path: "/ItemCreate", icon: <Package size={18} /> },
    { name: "Settings", path: "/settings", icon: <Settings size={18} /> }
  ];

  return (
    <div className="bg-indigo-900 text-white flex justify-between px-6 py-3 shadow-lg">

      {/* LEFT SIDE */}
      <div className="flex items-center gap-8">

        {/* ✅ LOGO — STATIC ON ALL PAGES */}
        <Link to="/dashboard" className="flex items-center gap-3">
          <img
            src={logo}
            alt="Intelizz"
            className="h-12 w-auto object-contain"
          />
          {/*<span className="text-lg font-bold tracking-wide">
            INTELIZZ
          </span>*/}
        </Link>

        {/* MENUS */}
        <div className="flex gap-6 items-center">
          {menus.map(menu => (
            <Link
              key={menu.name}
              to={menu.path}
              className="flex items-center gap-2 text-sm hover:text-indigo-300 transition"
            >
              {menu.icon}
              {menu.name}
            </Link>
          ))}
        </div>

      </div>

      {/* LOGOUT */}
      <button
        onClick={logout}
        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-1.5 rounded text-sm"
      >
        <LogOut size={16} />
        Logout
      </button>

    </div>
  );
}
