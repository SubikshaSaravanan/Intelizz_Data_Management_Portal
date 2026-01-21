import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api"
});

// ==========================
// EXCEL UPLOAD
// ==========================
export const uploadExcel = (file) => {
  const f = new FormData();
  f.append("file", file);
  return api.post("/upload", f);
};

// ==========================
// FETCH INVOICES
// ==========================
export const getInvoices = () => {
  return api.get("/invoices");
};

// ==========================
// REFRESH STATUS
// ==========================
export const refreshInvoice = (id) => {
  return api.post(`/refresh/${id}`);
};

// ==========================
// DELETE INVOICE
// ==========================
export const deleteInvoice = (id) => {
  return api.delete(`/delete/${id}`);
};

// ==========================
// VIEW XML
// ==========================
export const viewXML = (id) => {
  window.open(
    `http://localhost:5000/api/xml/${id}`,
    "_blank"
  );
};

export default api;
