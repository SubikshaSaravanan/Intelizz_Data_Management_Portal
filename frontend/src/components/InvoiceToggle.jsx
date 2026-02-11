import { useNavigate } from "react-router-dom";

export default function InvoiceToggle({ mode }) {
  const navigate = useNavigate();

  return (
    <div className="flex justify-center mb-8 gap-4">

      {/* EXCEL */}
      <button
        onClick={() => navigate("/invoice")}
        className={`px-6 py-2 rounded transition ${
          mode === "excel"
            ? "bg-indigo-600 text-white"
            : "bg-white border text-gray-400"
        }`}
      >
        Excel Upload
      </button>

      {/* JSON */}
      <button
        onClick={() => navigate("/invoice-json")}
        className={`px-6 py-2 rounded transition ${
          mode === "json"
            ? "bg-green-600 text-white"
            : "bg-white border text-gray-400"
        }`}
      >
        JSON Invoice
      </button>

    </div>
  );
}
