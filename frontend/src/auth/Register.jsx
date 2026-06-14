import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import { useAuthStore } from "../store/auth.store";

function Register() {
  const navigate = useNavigate();

  const { register, loading } = useAuthStore();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await register(formData);

      navigate("/login");
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          "Registration failed"
      );
    }
  };

  return (
    <AuthLayout subtitle="Create your workspace and start collaborating">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-2">
            Full Name
          </label>

          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter your full name"
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-2">
            Email
          </label>

          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-2">
            Password
          </label>

          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Create a password"
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all"
        >
          {loading
            ? "Creating your account..."
            : "Create Account"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <span className="text-slate-400">
          Already have an account?{" "}
        </span>

        <Link
          to="/login"
          className="text-indigo-400 hover:text-indigo-300"
        >
          Sign In
        </Link>
      </div>
    </AuthLayout>
  );
}

export default Register;