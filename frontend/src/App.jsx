import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Pages/Login";
import Landing from "./Pages/Landing";
import Invoice from "./Pages/Invoice";
import Items from "./Pages/ItemCreate";
import Navbar from "./components/Navbar";
import PrivateRoute from "./components/PrivateRoute";
import { useState, useEffect } from "react";
import Setting from "./Pages/FieldConfigManager";      
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("auth") === "true"
  );

  // Keep React in sync with localStorage
  useEffect(() => {
    const interval = setInterval(() => {
      setIsLoggedIn(localStorage.getItem("auth") === "true");
    }, 300);

    return () => clearInterval(interval);
  }, []);

  return (
    <BrowserRouter>

      {/* Show Navbar only when logged in */}
      {isLoggedIn && <Navbar />}

      <Routes>

        {/* Login */}
        <Route
          path="/"
          element={
            isLoggedIn ? <Navigate to="/dashboard" /> : <Login />
          }
        />

        {/* Landing */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Landing />
            </PrivateRoute>
          }
        />

        {/* Invoice */}
        <Route
          path="/invoice"
          element={
            <PrivateRoute>
              <Invoice />
            </PrivateRoute>
          }
        />
        {/* Items*/}
        <Route
  path="/ItemCreate"
  element={
    <PrivateRoute>
      <Items />
    </PrivateRoute>
  }
/>
 {/* Items*/}
        <Route
  path="/FieldConfigManager"
  element={
    <PrivateRoute>
      <Setting />
    </PrivateRoute>
  }
/>
 {/* Settings*/}
        <Route
  path="/settings"
  element={
    <PrivateRoute>
      <Setting />
    </PrivateRoute>
  }
/>


      </Routes>
    </BrowserRouter>
  );
}
