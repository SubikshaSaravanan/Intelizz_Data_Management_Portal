import React, { useState } from "react";
import { Package, Eye, EyeOff, Save } from "lucide-react";

const initialRows = [
  { id: 1, name: "Item Transaction Code", displayText: "", defaultValue: "IU", display: true, disabled: true },
  { id: 2, name: "Item ID Domain Name", displayText: "", defaultValue: "", display: true, disabled: true },
  { id: 3, name: "Item ID", displayText: "", defaultValue: "", display: true, disabled: true },
  { id: 4, name: "Item Name", displayText: "", defaultValue: "", display: false, disabled: false },
  { id: 5, name: "Item Description", displayText: "", defaultValue: "", display: false, disabled: false },
  { id: 6, name: "Commodity ID Domain Name", displayText: "", defaultValue: "", display: false, disabled: false },
  { id: 7, name: "Commodity ID", displayText: "", defaultValue: "", display: false, disabled: false }
];

export default function Items() {
  const [rows, setRows] = useState(initialRows);

  const updateRow = (id, field, value) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 text-white rounded-xl shadow">
              <Package />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Item Configuration</h1>
              <p className="text-sm text-slate-500">Manage item fields visibility and behavior</p>
            </div>
          </div>

          <button className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-xl shadow hover:bg-indigo-700 transition">
            <Save size={18} /> Save Changes
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-4 text-left text-sm font-semibold">#</th>
                <th className="p-4 text-left text-sm font-semibold">Field Name</th>
                <th className="p-4 text-left text-sm font-semibold">Display Text</th>
                <th className="p-4 text-left text-sm font-semibold">Default Value</th>
                <th className="p-4 text-center text-sm font-semibold">Display</th>
                <th className="p-4 text-center text-sm font-semibold">Disabled</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} className="border-t hover:bg-slate-50 transition">
                  <td className="p-4 text-slate-600">{index + 1}</td>
                  <td className="p-4 font-medium text-slate-800">{row.name}</td>
                  <td className="p-4">
                    <input
                      type="text"
                      placeholder="Enter display text"
                      value={row.displayText}
                      onChange={e => updateRow(row.id, "displayText", e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </td>
                  <td className="p-4">
                    <input
                      type="text"
                      value={row.defaultValue}
                      readOnly
                      className="w-full rounded-lg border bg-slate-100 px-3 py-2 text-slate-500"
                    />
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => updateRow(row.id, "display", !row.display)}
                      className={`inline-flex items-center justify-center w-9 h-9 rounded-full ${row.display ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-500"}`}
                    >
                      {row.display ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    <input
                      type="checkbox"
                      checked={row.disabled}
                      onChange={e => updateRow(row.id, "disabled", e.target.checked)}
                      className="w-5 h-5 accent-indigo-600"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
