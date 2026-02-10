import React, { useState, useEffect, useMemo } from "react";
import { Download, RotateCcw, FileText, Loader2, Check, Layout, ChevronDown, ChevronRight, Layers, Save, X, Plus, Trash2 } from "lucide-react";

// Helper to format field names for display (e.g., "invoiceId" -> "Invoice ID")
const formatFieldName = (fieldName) => {
  return fieldName
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
    .trim();
};

export default function InvoiceTemplate() {
  const [fields, setFields] = useState({ invoice: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});

  // Save Template State
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Fetch OTM Metadata on mount
  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/invoice-template/otm-metadata");
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata (Status: ${response.status})`);
      }
      const data = await response.json();

      let parsedFields = [];
      console.log("Raw OTM Metadata:", data);

      // Helper to extract properties from a schema object
      const extractProperties = (schema) => {
        if (!schema) return [];
        const props = schema.properties || {};
        return Object.keys(props).map(key => ({
          id: key,
          name: formatFieldName(key),
          ...props[key]
        }));
      };

      // 1. Check for OpenAPI 3.0 structure (components.schemas)
      if (data.components && data.components.schemas) {
        const schemaKey = Object.keys(data.components.schemas).find(k =>
          k.toLowerCase() === 'invoices' || k.toLowerCase() === 'invoice'
        );

        if (schemaKey) {
          parsedFields = extractProperties(data.components.schemas[schemaKey]);
        } else {
          const firstKey = Object.keys(data.components.schemas)[0];
          if (firstKey) parsedFields = extractProperties(data.components.schemas[firstKey]);
        }
      }
      // 2. Check for Swagger 2.0 structure (definitions)
      else if (data.definitions) {
        const schemaKey = Object.keys(data.definitions).find(k =>
          k.toLowerCase() === 'invoices' || k.toLowerCase() === 'invoice'
        );
        if (schemaKey) {
          parsedFields = extractProperties(data.definitions[schemaKey]);
        } else {
          const firstKey = Object.keys(data.definitions)[0];
          if (firstKey) parsedFields = extractProperties(data.definitions[firstKey]);
        }
      }
      // 3. Fallback to existing logic
      else if (Array.isArray(data)) {
        parsedFields = data;
      } else if (data.items) {
        parsedFields = data.items;
      } else if (data.properties) {
        parsedFields = Object.keys(data.properties).map(key => ({
          id: key,
          name: formatFieldName(key),
          ...data.properties[key]
        }));
      } else {
        parsedFields = Object.keys(data).map(key => ({
          id: key,
          name: formatFieldName(key)
        }));
      }

      // Map to our UI model
      const initialFields = parsedFields.map(field => {
        // Improved Detection: Handle various OpenAPI/Swagger and OTM-specific collection patterns
        const isArray =
          field.type === 'array' ||
          !!field.items ||
          (field.properties && field.properties.items && (field.properties.items.type === 'array' || field.properties.items.items));

        return {
          id: field.id || field.name,
          name: field.name || field.id,
          displayText: field.title || formatFieldName(field.name || field.id),
          defaultValue: isArray ? [""] : "",
          type: isArray ? 'array' : (field.type || 'string'),
          display: false,
          mandatory: field.required || false,
          disabled: false
        };
      });

      // Process: Set mandatory fields
      const processedFields = initialFields.map(f => ({
        ...f,
        display: f.mandatory ? true : f.display,
        disabled: f.mandatory
      }));

      setFields({ invoice: processedFields });

      // Auto-expand all groups initially
      const groups = getGroupedFields(processedFields);
      const allGroups = {};
      Object.keys(groups).forEach(g => allGroups[g] = true);
      setExpandedGroups(allGroups);

    } catch (err) {
      console.error("Error fetching OTM metadata:", err);
      setError(err.message);
      setFields({ invoice: [] });
    } finally {
      setLoading(false);
    }
  };

  // Grouping Logic
  const getGroupedFields = (fieldList) => {
    const groups = {};
    fieldList.forEach(field => {
      // Logic: Use the first word of the CamelCase ID as the group
      // e.g. "ReleaseID" -> "Release", "PaymentMethod..." -> "Payment"
      // Default to "General" if unclear
      const match = field.id.match(/^[A-Z]?[a-z]+/);
      let groupName = "General";

      if (match) {
        // Capitalize first letter
        groupName = match[0].charAt(0).toUpperCase() + match[0].slice(1);
      }

      // Specific overrides for cleaner groups
      if (field.id.startsWith("IncoTerm")) groupName = "Inco Terms";
      if (field.id.startsWith("Service")) groupName = "Service Provider";
      if (field.id.startsWith("Payment")) groupName = "Payment";
      if (field.id.startsWith("Release")) groupName = "Release";

      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(field);
    });

    // Sort fields within groups (Mandatory first)
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        if (a.mandatory === b.mandatory) return a.name.localeCompare(b.name);
        return a.mandatory ? -1 : 1;
      });
    });

    return groups;
  };

  const groupedFields = useMemo(() => getGroupedFields(fields.invoice), [fields.invoice]);

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const toggleAllGroups = (expand) => {
    const newGroups = {};
    Object.keys(groupedFields).forEach(key => newGroups[key] = expand);
    setExpandedGroups(newGroups);
  };

  const handleReset = () => {
    fetchMetadata();
  };

  const handleFieldChange = (id, key, value) => {
    setFields(prev => ({
      invoice: prev.invoice.map(field =>
        field.id === id ? { ...field, [key]: value } : field
      )
    }));
  };

  const handleToggle = (id, key) => {
    setFields(prev => ({
      invoice: prev.invoice.map(field => {
        if (field.id === id) {
          // If we are toggling mandatory
          if (key === "mandatory") {
            const newMandatory = !field.mandatory;
            return {
              ...field,
              mandatory: newMandatory,
              display: newMandatory ? true : field.display,
              disabled: newMandatory
            };
          }

          if (field.mandatory && key === "display") return field;

          return { ...field, [key]: !field[key] };
        }
        return field;
      })
    }));
  };

  const addArrayItem = (id) => {
    setFields(prev => ({
      invoice: prev.invoice.map(field =>
        field.id === id ? { ...field, defaultValue: [...field.defaultValue, ""] } : field
      )
    }));
  };

  const removeArrayItem = (id, index) => {
    setFields(prev => ({
      invoice: prev.invoice.map(field =>
        field.id === id ? {
          ...field,
          defaultValue: field.defaultValue.filter((_, i) => i !== index)
        } : field
      )
    }));
  };

  const updateArrayValue = (id, index, value) => {
    setFields(prev => ({
      invoice: prev.invoice.map(field =>
        field.id === id ? {
          ...field,
          defaultValue: field.defaultValue.map((v, i) => i === index ? value : v)
        } : field
      )
    }));
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      alert("Please enter a template name");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: templateName,
        fields: fields.invoice.filter(f => f.display)
          .map(f => ({
            id: f.id,
            name: f.name,
            displayText: f.displayText,
            defaultValue: f.defaultValue,
            type: f.type,
            display: f.display,
            mandatory: f.mandatory
          }))
      };

      const res = await fetch("/api/invoice-template/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save");

      setSaveModalOpen(false);
      setTemplateName("");
      setToast("Template saved successfully!");
      setTimeout(() => setToast(null), 3000);

    } catch (err) {
      console.error(err);
      alert("Error saving template");
    } finally {
      setSaving(false);
    }
  };

  const downloadTemplate = () => {
    const displayedFields = fields.invoice.filter(f => f.display);

    // Create SpreadsheetML (Basic Excel XML)
    let xmlContent = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Worksheet ss:Name="Invoice Template">
  <Table>
   <Row>`;

    // Headers
    displayedFields.forEach(f => {
      xmlContent += `<Cell><Data ss:Type="String">${f.displayText}</Data></Cell>`;
    });

    xmlContent += `</Row><Row>`;

    // Default Values
    displayedFields.forEach(f => {
      const displayVal = Array.isArray(f.defaultValue)
        ? f.defaultValue.filter(v => v.trim() !== "").join("; ")
        : (f.defaultValue || "");
      xmlContent += `<Cell><Data ss:Type="String">${displayVal}</Data></Cell>`;
    });

    xmlContent += `</Row>
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xmlContent], { type: "application/vnd.ms-excel" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    // Use templateName for filename, sanitized and falling back to default
    const fileName = templateName.trim()
      ? templateName.trim().replace(/[^a-z0-9]/gi, '_').toUpperCase()
      : "INVOICE_TEMPLATE";

    a.download = `${fileName}.xls`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">

      {/* TOAST */}
      {toast && (
        <div className="fixed top-5 right-5 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Check size={18} />
          {toast}
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Layout className="text-indigo-600" />
            Invoice Template Configuration
          </h1>
          <p className="text-slate-500 text-sm mt-1">Configure your invoice template fields locally.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSaveModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm font-medium text-sm flex items-center gap-2 transition-colors"
          >
            <Save size={16} />
            Save Configuration
          </button>

          <div className="h-6 w-px bg-slate-200 mx-1"></div>

          <button
            onClick={handleReset}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-slate-900 font-medium text-sm flex items-center gap-2 transition-colors shadow-sm"
          >
            <RotateCcw size={16} />
            Refresh
          </button>
          <button
            onClick={downloadTemplate}
            disabled={loading || fields.invoice.length === 0}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md flex items-center gap-2 font-medium text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            Download Template
          </button>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 p-8 max-w-7xl mx-auto w-full">

        {loading && (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500">
            <Loader2 className="animate-spin mb-3 text-indigo-600" size={32} />
            <p>Fetching fields from OTM...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg mb-6">
            <div className="font-semibold mb-1">Error fetching metadata</div>
            <div className="text-sm">{error}</div>
            <button onClick={fetchMetadata} className="mt-2 text-sm underline font-medium">Try Again</button>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-6">

            <div className="flex justify-between items-center">
              <div className="text-sm text-slate-500">
                Found <strong>{fields.invoice.length}</strong> fields in <strong>{Object.keys(groupedFields).length}</strong> groups.
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleAllGroups(true)} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50">Expand All</button>
                <span className="text-slate-300">|</span>
                <button onClick={() => toggleAllGroups(false)} className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100">Collapse All</button>
              </div>
            </div>

            {Object.keys(groupedFields).sort().map(groupName => (
              <div key={groupName} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(groupName)}
                  className="w-full px-6 py-4 bg-slate-50/50 hover:bg-slate-50 border-b border-slate-100 flex justify-between items-center transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Layers size={18} className="text-slate-400" />
                    <h3 className="font-semibold text-slate-800">{groupName}</h3>
                    <span className="text-xs font-medium px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full">
                      {groupedFields[groupName].length}
                    </span>
                  </div>
                  {expandedGroups[groupName] ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronRight size={20} className="text-slate-400" />}
                </button>

                {/* Group Content (Table) */}
                {expandedGroups[groupName] && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-3 w-1/4">Field Name</th>
                          <th className="px-6 py-3 w-1/4">Display Text</th>
                          <th className="px-6 py-3 w-1/5">Default Value</th>
                          <th className="px-6 py-3 text-center w-24">Display</th>
                          <th className="px-6 py-3 text-center w-24">Mandatory</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {groupedFields[groupName].map((field) => (
                          <tr key={field.id} className={`hover:bg-slate-50/80 transition-colors ${field.mandatory ? 'opacity-60' : ''}`}>
                            <td className="px-6 py-3">
                              <div className="font-medium text-slate-700">{field.name}</div>
                              <div className="text-xs text-slate-400 font-mono mt-0.5">{field.id}</div>
                            </td>
                            <td className="px-6 py-3">
                              <input
                                type="text"
                                value={field.displayText}
                                onChange={(e) => handleFieldChange(field.id, "displayText", e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400"
                                placeholder="Column Header"
                              />
                            </td>
                            <td className="px-6 py-3">
                              {field.type === 'array' ? (
                                <div className="space-y-1.5 py-1">
                                  {Array.isArray(field.defaultValue) && field.defaultValue.map((val, idx) => (
                                    <div key={idx} className="flex gap-1 group/item">
                                      <input
                                        type="text"
                                        value={val}
                                        onChange={(e) => updateArrayValue(field.id, idx, e.target.value)}
                                        className="flex-1 bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                        placeholder="Value"
                                      />
                                      {field.defaultValue.length > 1 && (
                                        <button
                                          onClick={() => removeArrayItem(field.id, idx)}
                                          className="text-slate-300 hover:text-rose-500 p-1 transition-colors"
                                          title="Remove item"
                                        >
                                          <X size={14} />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  <button
                                    onClick={() => addArrayItem(field.id)}
                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-1 transition-colors uppercase tracking-wider"
                                  >
                                    <Plus size={12} /> Add Value
                                  </button>
                                </div>
                              ) : (
                                <input
                                  type="text"
                                  value={field.defaultValue}
                                  onChange={(e) => handleFieldChange(field.id, "defaultValue", e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400"
                                  placeholder="Value"
                                />
                              )}
                            </td>
                            <td className="px-6 py-3 text-center">
                              <div className="flex justify-center">
                                <input
                                  type="checkbox"
                                  checked={field.display}
                                  onChange={() => handleToggle(field.id, "display")}
                                  disabled={field.disabled}
                                  className={`w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-colors cursor-pointer ${field.disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}
                                />
                              </div>
                            </td>
                            <td className="px-6 py-3 text-center">
                              <div className="flex justify-center">
                                <input
                                  type="checkbox"
                                  checked={field.mandatory}
                                  onChange={() => handleToggle(field.id, "mandatory")}
                                  className="w-5 h-5 rounded border-slate-300 text-rose-500 focus:ring-rose-500 transition-colors cursor-pointer"
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SAVE MODAL */}
      {saveModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 scale-100 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Save Template Configuration</h3>
              <button onClick={() => setSaveModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">Template Name</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="e.g. Standard OTM Invoice"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-slate-500 mt-2">This will save your current field selection, display names, and default values.</p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSaveModalOpen(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}