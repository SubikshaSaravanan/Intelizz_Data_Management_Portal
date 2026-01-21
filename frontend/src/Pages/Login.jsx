import { useState } from "react";
import axios from "axios";
import logo from "../assets/intel-8.png";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.post("http://localhost:5000/api/auth/login", {
        username,
        password,
      });

      // SINGLE SOURCE OF TRUTH
      localStorage.setItem("auth", "true");

      // redirect
      window.location.href = "/dashboard";
    } catch {
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-blue-900 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl grid grid-cols-2 w-[900px] overflow-hidden">

        {/* Left Panel */}
        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-10 text-white flex flex-col justify-center">
          <img src={logo} className="h-14 w-auto" />
          {/*<h2 className="text-3xl font-bold">INTELIZZ</h2>*/}
          <p className="mt-4 text-blue-200">
            Secure enterprise portal for Oracle Transportation Management
          </p>
        </div>

        {/* Right Panel */}
        <div className="p-10 flex flex-col justify-center">
          <h3 className="text-2xl font-bold text-gray-700 mb-6">
            Sign in to your account
          </h3>

          {error && (
            <p className="bg-red-100 text-red-700 p-3 rounded mb-3">
              {error}
            </p>
          )}

          <form onSubmit={submit} className="space-y-5">
            <input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border p-3 rounded focus:ring-2 ring-indigo-500"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border p-3 rounded focus:ring-2 ring-indigo-500"
            />

            <button
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded font-semibold"
            >
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>

          <p className="mt-6 text-xs text-gray-400">
            Only authorized INTELIZZ users can access this portal
          </p>
        </div>
      </div>
    </div>
  );
}
