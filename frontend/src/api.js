import axios from "axios";

const API = "http://localhost:5000/api";

export const uploadExcel = (file) => {
  const f = new FormData();
  f.append("file", file);
  return axios.post(`${API}/upload`, f);
};

export const getInvoices = () => {
  return axios.get(`${API}/invoices`);
};
