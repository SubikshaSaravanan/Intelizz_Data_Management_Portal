import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";

import Login from "./Pages/Login";
import Landing from "./Pages/Landing";
import Invoice from "./Pages/Invoice";
import InvoiceJson from "./Pages/InvoiceJson";
import InvoiceTemplate from "./Pages/InvoiceTemplate";
import Items from "./Pages/ItemCreate";
import Setting from "./Pages/FieldConfigManager";
import OrderBaseManager from './Pages/OrderBaseManager';
import OrderBase from "./Pages/Orderbase";
import OrderReleaseManager from "./Pages/OrderReleaseManager";
import OrderReleaseWorkspace from "./Pages/OrderReleaseWorkspace";


import Navbar from "./components/Navbar";
import PrivateRoute from "./components/PrivateRoute";
import OrderRelease from "./Pages/OrderReleaseWorkspace";

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
        <Route
          path="/orders"
          element={
            <PrivateRoute>
              <OrderBaseManager />
            </PrivateRoute>
          }
        />
        <Route
          path="/OrderBase"
          element={
            <PrivateRoute>
              <OrderBase />
            </PrivateRoute>
          }
        />
        <Route
          path="/OrderReleaseWorkspace"
          element={
            <PrivateRoute>
              <OrderReleaseWorkspace />
            </PrivateRoute>
          }
        />
        <Route
          path="/OrderReleaseManager"
          element={
            <PrivateRoute>
              <OrderReleaseManager />
            </PrivateRoute>
          }
        />


        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}
