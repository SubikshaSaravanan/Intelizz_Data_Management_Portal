import axios from "axios";

/* ======================================================
   AXIOS BASE CONFIG
====================================================== */

const api = axios.create({
  baseURL: "http://localhost:5000/api"
});

/* ======================================================
   EXCEL UPLOAD
====================================================== */

export const uploadExcel = (file) => {
  const formData = new FormData();
  formData.append("file", file);

  return api.post("/upload", formData);
};

/* ======================================================
   FETCH XML INVOICES
====================================================== */

export const getInvoices = () => {
  return api.get("/invoices");
};

/* ======================================================
   REFRESH INVOICE STATUS
====================================================== */

export const refreshInvoice = (id) => {
  return api.post(`/refresh/${id}`);
};

/* ======================================================
   DELETE INVOICE
====================================================== */

export const deleteInvoice = (id) => {
  return api.delete(`/delete/${id}`);
};

/* ======================================================
   VIEW XML
====================================================== */

export const viewXML = (id) => {
  window.open(
    `http://localhost:5000/api/xml/${id}`,
    "_blank"
  );
};

/* ======================================================
   JSON FILE UPLOAD
====================================================== */

export const uploadJsonInvoice = (file) => {
  const f = new FormData();
  f.append("file", file);

  return api.post("/upload-json", f);
};

/* ======================================================
   JSON MANUAL INVOICE (OTM REST)
====================================================== */

export const createInvoiceJson = (payload) =>
  api.post("/invoice/json", payload);

export const getJsonInvoices = () =>
  api.get("/invoice/json");

export const getInvoiceFromOTM = (id) =>
  api.get(`/invoice/json/otm/${id}`);

export const updateInvoiceInOTM = (id, payload) =>
  api.patch(`/invoice/json/otm/${id}`, payload);

export const deleteInvoiceFromOTM = (id) =>
  api.delete(`/invoice/json/otm/${id}`);

export default api;
