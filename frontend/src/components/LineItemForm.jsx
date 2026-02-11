export default function LineItemForm({ item, onChange, onDelete }) {
  return (
    <div className="grid grid-cols-6 gap-3 border p-4 mb-3 rounded">

      <input
        className="border p-2"
        value={item.lineitemSeqNo}
        onChange={e =>
          onChange("lineitemSeqNo", e.target.value)
        }
      />

      {/* COST TYPE DROPDOWN */}
      <select
        className="border p-2"
        value={item.costTypeGid}
        onChange={e =>
          onChange("costTypeGid", e.target.value)
        }
      >
        <option value="">Select</option>
        <option value="B">Base</option>
        <option value="FRT">Freight</option>
        <option value="FSC">Fuel</option>
        <option value="ACC">Accessorial</option>
        <option value="TAX">Tax</option>
      </select>

      <input
        className="border p-2 col-span-2"
        placeholder="Description"
        value={item.description}
        onChange={e =>
          onChange("description", e.target.value)
        }
      />

      <input
        className="border p-2"
        placeholder="Amount"
        value={item.amount}
        onChange={e =>
          onChange("amount", e.target.value)
        }
      />

      {/* CURRENCY */}
      <select
        className="border p-2"
        value={item.currency}
        onChange={e =>
          onChange("currency", e.target.value)
        }
      >
        <option>INR</option>
        <option>USD</option>
        <option>EUR</option>
        <option>GBP</option>
        <option>AED</option>
        <option>SGD</option>
      </select>

      

    </div>
  );
}
