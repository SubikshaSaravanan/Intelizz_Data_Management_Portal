import { useState } from "react";
import api from "../api";
import LineItemForm from "../components/LineItemForm";
import InvoiceToggle from "../components/InvoiceToggle";
import JsonUpload from "../components/JsonUpload";


/* =====================================================
   AUTO INVOICE NUMBER GENERATOR
===================================================== */
const generateInvoiceIds = () => {
  const now = new Date();

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  const datePart = `${yyyy}${mm}${dd}`;

  // key per day
  const counterKey = `invoice_seq_${datePart}`;

  // get last count
  let seq = Number(localStorage.getItem(counterKey) || 0);

  seq += 1;

  // save back
  localStorage.setItem(counterKey, seq);

  const seqFormatted = String(seq).padStart(4, "0");

  return {
    invoiceXid: `XID-${datePart}-${seqFormatted}`,
    invoiceNumber: `INV-${datePart}-${seqFormatted}`
  };
};


/* =====================================================
   REFERENCE NUMBER QUALIFIERS
===================================================== */
const REFNUM_QUALS = [
  "21","61","62","63","64",
  "8","9","98","99",
  "AC","AF","AO","AW",
  "B4","BD","BI","BJ","BK","BL","BM","BN",
  "BS","BT",
  "CF","CG"
];

/* =====================================================
   SERVICE PROVIDER ALIAS QUALIFIERS
===================================================== */
const SERVICE_PROVIDER_QUALS = [
  "VENDOR NAME ALT",
  "INTL.GLOGS",
  "GLOG",
  "SC",
  "XX",
  "AIR PREFIX",
  "VENDOR SITE CODE",
  "SUPPLIER SITE ID",
  "SUPPLIER ID",
  "VENDOR NUM",
  "KEWILL CARRIER CODE",
  "KEWILL CARRIER GLOBAL ID",
  "IATA"
];

export default function InvoiceJson() {
  
  const [mode, setMode] = useState("json");
  const autoIds = generateInvoiceIds();

  /* ================= STATE ================= */
  const [header, setHeader] = useState({
    domainName: "INTL",
    invoiceXid: autoIds.invoiceXid,
    invoiceNumber: autoIds.invoiceNumber,
    invoiceType: "STANDARD",
    invoiceSource: "MANUAL",
    servprovAliasQualGid: "",
    servprovAliasValue: "",
    currencyGid: "INR"
  });

  const [refnum, setRefnum] = useState({
    qual: "BM",
    value: ""
  });

  const [lineItems, setLineItems] = useState([
    {
      lineitemSeqNo: 1,
      description: "",
      costTypeGid: "",
      amount: "",
      currency: "INR"
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  /* ================= LINE ITEMS ================= */
  const addLine = () => {
    setLineItems([
      ...lineItems,
      {
        lineitemSeqNo: lineItems.length + 1,
        description: "",
        costTypeGid: "",
        amount: "",
        currency: header.currencyGid
      }
    ]);
  };

  const updateLine = (i, k, v) => {
    const copy = [...lineItems];
    copy[i][k] = v;
    setLineItems(copy);
  };

  const removeLine = (i) => {
    const copy = [...lineItems];
    copy.splice(i, 1);
    setLineItems(copy);
  };

  /* ================= SUBMIT ================= */
  const submit = async () => {
    setError(null);
    setSuccess(null);

    if (!header.servprovAliasQualGid || !header.servprovAliasValue) {
      alert("Service Provider Alias is mandatory");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        ...header,

        invoiceDate: {
          value: new Date().toISOString(),
          timezone: "UTC"
        },

        dateReceived: {
          value: new Date().toISOString(),
          timezone: "UTC"
        },

        refnums: {
          items: [
            {
              invoiceRefnumQualGid: refnum.qual,
              invoiceRefnumValue: refnum.value,
              domainName: "INTL"
            }
          ]
        },

        lineItems: {
          items: lineItems.map(li => ({
            lineitemSeqNo: Number(li.lineitemSeqNo),
            description: li.description,
            processAsFlowThru: false,
            costTypeGid: li.costTypeGid,
            domainName: "INTL",
            freightCharge: {
              value: Number(li.amount),
              currency: li.currency
            },
            costRefs: {
              items: [
                {
                  shipmentCostQualGid: "SHIPMENT_COST",
                  domainName: "INTL"
                }
              ]
            }
          }))
        }
      };

      const res = await api.post("/invoice/json", payload);

      setSuccess({
        invoiceXid: header.invoiceXid,
        invoiceNumber: header.invoiceNumber,
        invoiceGid: res.data?.links?.[0]?.href
      });

      // generate next invoice automatically
      const next = generateInvoiceIds();

      setHeader(prev => ({
        ...prev,
        invoiceXid: next.invoiceXid,
        invoiceNumber: next.invoiceNumber
      }));

    } catch (err) {
      setError(
        err?.response?.data?.error ||
        "Invoice creation failed"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */
    return (
  <div className="min-h-screen bg-slate-100 px-6 py-8">

      {/* ===== TOGGLE ===== */}
      <InvoiceToggle mode="json" />

      {/* ===== JSON FILE UPLOAD ===== */}
      <JsonUpload />

      {/* ===== FORM ===== */}
      <div className="bg-white p-8 rounded shadow max-w-7xl mx-auto">

        


          <h2 className="text-2xl font-bold mb-6">
            Create Invoice (JSON)
          </h2>

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 p-4 rounded mb-4">
              <b>✅ Invoice Created Successfully</b>
              <p>Invoice XID: {success.invoiceXid}</p>
              <p>Invoice Number: {success.invoiceNumber}</p>
              {success.invoiceGid && (
                <p className="text-sm break-all mt-1">
                  OTM GID: {success.invoiceGid}
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded mb-4">
              ❌ {error}
            </div>
          )}

      {/* HEADER */}
      <div className="grid grid-cols-3 gap-4 mb-6">

        <input className="border p-2 bg-gray-100" value={header.invoiceXid} readOnly />
        <input className="border p-2 bg-gray-100" value={header.invoiceNumber} readOnly />

        <select
          className="border p-2"
          value={header.servprovAliasQualGid}
          onChange={e =>
            setHeader({ ...header, servprovAliasQualGid: e.target.value })
          }
        >
          <option value="">Alias Qualifier</option>
          {SERVICE_PROVIDER_QUALS.map(q => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>

        <input
          className="border p-2"
          placeholder="Alias Value"
          value={header.servprovAliasValue}
          onChange={e =>
            setHeader({ ...header, servprovAliasValue: e.target.value })
          }
        />

        <select
          className="border p-2"
          value={header.invoiceType}
          onChange={e =>
            setHeader({ ...header, invoiceType: e.target.value })
          }
        >
          <option>STANDARD</option>
          <option>PARENT</option>
          <option>CHILD</option>
        </select>

        <select
          className="border p-2"
          value={header.currencyGid}
          onChange={e =>
            setHeader({ ...header, currencyGid: e.target.value })
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

      {/* REFNUM */}
      <h3 className="font-semibold mb-2">Reference Number</h3>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <select
          className="border p-2"
          value={refnum.qual}
          onChange={e =>
            setRefnum({ ...refnum, qual: e.target.value })
          }
        >
          {REFNUM_QUALS.map(q => (
            <option key={q}>{q}</option>
          ))}
        </select>

        <input
          className="border p-2"
          placeholder="Reference Value"
          onChange={e =>
            setRefnum({ ...refnum, value: e.target.value })
          }
        />
      </div>

      {/* LINE ITEMS */}
      <button
        onClick={addLine}
        className="bg-indigo-600 text-white px-4 py-2 rounded mb-4"
      >
        + Add Line Item
      </button>

      {lineItems.map((li, i) => (
        <LineItemForm
          key={i}
          item={li}
          onChange={(k, v) => updateLine(i, k, v)}
          
        />
      ))}

      <button
        onClick={submit}
        disabled={loading}
        className={`mt-6 px-10 py-3 rounded text-white transition-all
          ${loading
            ? "bg-gray-400"
            : "bg-green-600 hover:bg-green-700 active:scale-95"
          }`}
      >
        {loading ? "Creating Invoice..." : "Create Invoice in OTM"}
      </button>

    </div>
  </div>
);
}
