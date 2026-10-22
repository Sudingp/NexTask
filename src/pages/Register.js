import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";

// The backend always had a /register endpoint, but the app had no sign-up page.
function Register() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const register = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await API.post("/auth/register", form);
      localStorage.setItem("token", res.data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Could not create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-500 to-purple-600 p-4">
      <form onSubmit={register} className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Create your account</h1>

        <label className="block text-sm mb-1" htmlFor="username">Name</label>
        <input id="username" required className="border p-2 w-full mb-4 rounded"
          value={form.username} onChange={update("username")} />

        <label className="block text-sm mb-1" htmlFor="email">Email</label>
        <input id="email" type="email" required autoComplete="email" className="border p-2 w-full mb-4 rounded"
          value={form.email} onChange={update("email")} />

        <label className="block text-sm mb-1" htmlFor="password">Password (6+ characters)</label>
        <input id="password" type="password" required minLength={6} autoComplete="new-password"
          className="border p-2 w-full mb-4 rounded" value={form.password} onChange={update("password")} />

        {error && <p role="alert" className="text-red-600 text-sm mb-4">{error}</p>}

        <button type="submit" disabled={loading}
          className="bg-blue-500 text-white w-full py-2 rounded hover:bg-blue-600 disabled:opacity-60">
          {loading ? "Creating account..." : "Sign up"}
        </button>

        <p className="text-sm text-center mt-4">
          Already have an account? <Link to="/" className="text-blue-600 underline">Log in</Link>
        </p>
      </form>
    </div>
  );
}

export default Register;
