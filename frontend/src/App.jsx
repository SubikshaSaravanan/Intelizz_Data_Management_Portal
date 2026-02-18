import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";

import Login from "./Pages/Login";
import Landing from "./Pages/Landing";
import Invoice from "./Pages/Invoice";
import InvoiceJson from "./Pages/InvoiceJson";
import InvoiceTemplate from "./Pages/InvoiceTemplate";
import Items from "./Pages/ItemCreate";
import Setting from "./Pages/FieldConfigManager";

import Navbar from "./components/Navbar";
import PrivateRoute from "./components/PrivateRoute";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("auth") === "true"
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setIsLoggedIn(localStorage.getItem("auth") === "true");
    }, 300);

    return () => clearInterval(interval);
  }, []);

  return (
    <BrowserRouter>
      {isLoggedIn && <Navbar />}

      <Routes>
        <Route
          path="/"
          element={
            isLoggedIn ? <Navigate to="/dashboard" /> : <Login />
          }
        />

        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Landing />
            </PrivateRoute>
          }
        />

        <Route
          path="/invoice"
          element={
            <PrivateRoute>
              <Invoice />
            </PrivateRoute>
          }
        />

        <Route
          path="/invoice-json"
          element={
            <PrivateRoute>
              <InvoiceJson />
            </PrivateRoute>
          }
        />

        <Route
          path="/invoice/template"
          element={
            <PrivateRoute>
              <InvoiceTemplate />
            </PrivateRoute>
          }
        />

        <Route
          path="/ItemCreate"
          element={
            <PrivateRoute>
              <Items />
            </PrivateRoute>
          }
        />

        <Route
          path="/FieldConfigManager"
          element={
            <PrivateRoute>
              <Setting />
            </PrivateRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <Setting />
            </PrivateRoute>
          }
        />

        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}
