import React, { useState } from "react";
import axios from "axios";
import { User, Lock, Mail, Shield, Eye, EyeOff } from "lucide-react";

export default function Auth() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState("login");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function login() {
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      const r = await axios.post("/api/auth/login", { username, password });
      localStorage.setItem("token", r.data.token);
      setSuccess("Logged in successfully!");
      // Redirect after a short delay
      setTimeout(() => {
        window.location.href = "/favorites";
      }, 1500);
    } catch (e) {
      setError(e.response?.data?.error || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  async function register() {
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      await axios.post("/api/auth/register", { username, password, email });
      setSuccess("Account created successfully! Please login.");
      // Switch to login mode after a short delay
      setTimeout(() => {
        setMode("login");
      }, 2000);
    } catch (e) {
      setError(e.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Clear messages when switching modes
  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="max-w-md mx-auto animate-fadeIn">
      <div className="card p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center mb-4">
            {mode === "login" ? (
              <User className="w-8 h-8 text-brand-600 dark:text-brand-400" />
            ) : (
              <Shield className="w-8 h-8 text-brand-600 dark:text-brand-400" />
            )}
          </div>
          <h1 className="text-2xl font-extrabold mb-1">
            {mode === "login" ? "Welcome back" : "Create an account"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {mode === "login"
              ? "Sign in to manage your favorites"
              : "Create an account to save favorites"}
          </p>
        </div>

        {(error || success) && (
          <div className={`mb-6 p-4 rounded-lg text-sm ${error ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200' : 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'} animate-shake`}>
            {error || success}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); mode === "login" ? login() : register(); }}>
          <label className="block mb-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <User className="w-4 h-4" />
              Username
            </div>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-brand-300 outline-none bg-white dark:bg-slate-800 transition"
              placeholder="Enter your username"
              required
              minLength="3"
              maxLength="30"
            />
          </label>

          {mode === "register" && (
            <label className="block mb-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <Mail className="w-4 h-4" />
                Email
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-brand-300 outline-none bg-white dark:bg-slate-800 transition"
                placeholder="Enter your email"
              />
            </label>
          )}

          <label className="block mb-6">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <Lock className="w-4 h-4" />
              Password
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-brand-300 outline-none bg-white dark:bg-slate-800 transition pr-12"
                placeholder="Enter your password"
                required
                minLength="6"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-slate-400"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {mode === "register" ? "At least 6 characters" : ""}
            </div>
          </label>

          <div className="flex flex-col gap-3">
            {mode === "login" ? (
              <button
                type="submit"
                disabled={loading}
                className="w-full brand-btn py-3 rounded-lg font-semibold hover:scale-[1.02] transition flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-lg font-semibold hover:scale-[1.02] transition flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Creating account…
                  </>
                ) : (
                  "Create account"
                )}
              </button>
            )}

            <button
              type="button"
              onClick={switchMode}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition font-medium"
            >
              {mode === "login" ? "Create new account" : "Already have an account?"}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            By {mode === "login" ? "signing in" : "creating an account"}, you agree to our 
            Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}