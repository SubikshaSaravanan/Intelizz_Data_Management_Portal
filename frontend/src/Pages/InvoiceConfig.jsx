import { useEffect, useState } from "react";
import { API } from "../api/api";
import { Eye, EyeOff } from "lucide-react";

export default function InvoiceConfig() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    API.get("/invoice-config").then(res => {
      setRows(res.data);
    });
  }, []);

  const update = (i, key, value) => {
    const copy = [...rows];
    copy[i][key] = value;
    setRows(copy);
  };

  const save = async () => {
    await API.post("/invoice-config", rows);
    alert("Configuration saved");
  };

  return (
    <div className="p-10 bg-slate-100 min-h-screen">

      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">
          Invoice Configuration
        </h1>

        <button
          onClick={save}
          className="bg-indigo-600 text-white px-6 py-2 rounded"
        >
          Save Changes
        </button>
      </div>

      <table className="w-full bg-white shadow rounded text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th>#</th>
            <th>Field Name</th>
            <th>Display Text</th>
            <th>Default Value</th>
            <th>Display</th>
            <th>Disabled</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className="border-t">
              <td className="p-3">{i + 1}</td>
              <td className="p-3 font-medium">{r.field_name}</td>

              <td className="p-3">
                <input
                  value={r.display_text || ""}
                  onChange={e =>
                    update(i, "display_text", e.target.value)
                  }
                  className="border px-2 py-1 rounded w-full"
                />
              </td>

              <td className="p-3">
                <input
                  value={r.default_value || ""}
                  onChange={e =>
                    update(i, "default_value", e.target.value)
                  }
                  className="border px-2 py-1 rounded w-full"
                />
              </td>

              <td className="p-3 text-center">
                {r.visible ? (
                  <Eye
                    onClick={() =>
                      update(i, "visible", false)
                    }
                    className="cursor-pointer text-green-600"
                  />
                ) : (
                  <EyeOff
                    onClick={() =>
                      update(i, "visible", true)
                    }
                    className="cursor-pointer text-gray-400"
                  />
                )}
              </td>

              <td className="p-3 text-center">
                <input
                  type="checkbox"
                  checked={r.disabled}
                  onChange={e =>
                    update(i, "disabled", e.target.checked)
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
