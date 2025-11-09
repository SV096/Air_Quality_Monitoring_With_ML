import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sun, Moon, Menu, X, Droplets, LogOut, User } from "lucide-react";

export default function Layout({ children }) {
  console.log("Layout component rendering");
  const loc = useLocation();
  const [dark, setDark] = useState(() =>
    localStorage.getItem("theme") === "dark"
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    console.log("Layout effect running");
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    
    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (token) {
      // In a real app, you would fetch user data from the server
      // For now, we'll just set a basic user object
      setUser({ username: "User" });
    }
  }, [dark]);

  // Close mobile menu when location changes
  useEffect(() => {
    setMobileOpen(false);
  }, [loc]);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    // Redirect to home page
    window.location.href = "/";
  };

  // Check if user is logged in
  const isLoggedIn = !!localStorage.getItem("token");

  // Navigation items
  let nav = [
    { to: "/", label: "Dashboard" },
    { to: "/live", label: "Live" },
    { to: "/history", label: "History" },
    { to: "/forecast", label: "Forecast" },
  ];

  // Add favorites and logout if user is logged in
  if (isLoggedIn) {
    nav.push({ to: "/favorites", label: "Favorites" });
    nav.push({ 
      to: "#", 
      label: "Logout", 
      onClick: handleLogout,
      icon: <LogOut className="w-4 h-4" />
    });
  } else {
    nav.push({ to: "/auth", label: "Login" });
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#071022] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Header */}
      <header className="bg-gradient-to-r from-brand-500 to-brand-400 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-lg font-bold">
              <Droplets className="w-6 h-6" />
            </div>
            <div>
              <div className="text-lg font-extrabold leading-tight">
                AirQuality
              </div>
              <div className="text-xs opacity-90 hidden sm:block">
                Real-time monitoring
              </div>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={n.onClick}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  loc.pathname === n.to
                    ? "bg-white/20 ring-1 ring-white/30"
                    : "hover:bg-white/10"
                }`}
              >
                {n.icon}
                {n.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {isLoggedIn && user && (
              <div className="hidden md:flex items-center gap-2 text-sm bg-white/20 px-3 py-2 rounded-lg">
                <User className="w-4 h-4" />
                <span>{user.username}</span>
              </div>
            )}
            <button
              onClick={() => setDark(!dark)}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-200"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="text-sm opacity-90 hidden lg:block">
              {new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
              } {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-all duration-200"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden bg-brand-600/95 px-4 py-3 space-y-2 border-t border-white/10">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => {
                  if (n.onClick) n.onClick();
                  setMobileOpen(false);
                }}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  loc.pathname === n.to
                    ? "bg-white/20 ring-1 ring-white/30"
                    : "hover:bg-white/10"
                }`}
              >
                {n.icon}
                {n.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">{children}</main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white">
                  <Droplets className="w-5 h-5" />
                </div>
                <span className="text-lg font-bold">AirQuality</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Real-time air quality monitoring with predictive analytics for cities worldwide.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/" className="text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition">Dashboard</Link></li>
                <li><Link to="/live" className="text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition">Live AQI</Link></li>
                <li><Link to="/history" className="text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition">History</Link></li>
                <li><Link to="/forecast" className="text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition">Forecast</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Data Sources</h3>
              <ul className="space-y-2 text-sm">
                <li className="text-slate-600 dark:text-slate-400">World Air Quality Index Project</li>
                <li className="text-slate-600 dark:text-slate-400">OpenWeatherMap</li>
                <li className="text-slate-600 dark:text-slate-400">Local Environmental Agencies</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-200 dark:border-slate-800 mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              © {new Date().getFullYear()} Air Quality Monitoring. All rights reserved.
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Built with ♥ for cleaner air
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}