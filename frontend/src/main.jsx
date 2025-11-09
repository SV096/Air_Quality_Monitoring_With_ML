import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Live from "./pages/Live";
import History from "./pages/History";
import Auth from "./pages/Auth";
import Favorites from "./pages/Favorites";
import Forecast from "./pages/Forecast";
import "./styles.css";

// Simple authentication check
function token() {
  return localStorage.getItem("token");
}

// Protected route component
function ProtectedRoute({ children }) {
  return token() ? children : <Navigate to="/auth" replace />;
}

function App() {
  // Add a simple test to verify the app is rendering
  console.log("App is rendering");
  
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/live" element={<Live />} />
          <Route path="/history" element={<History />} />
          <Route path="/auth" element={<Auth />} />
          <Route 
            path="/favorites" 
            element={
              <ProtectedRoute>
                <Favorites />
              </ProtectedRoute>
            } 
          />
          <Route path="/forecast" element={<Forecast />} />
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

// Error boundary for the entire app
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#071022]">
          <div className="text-center p-8 card">
            <h1 className="text-2xl font-bold text-red-500 mb-4">Something went wrong</h1>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              We're sorry, but something went wrong. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return <App />;
  }
}

const container = document.getElementById("root");
const root = createRoot(container);
console.log("Creating root");
root.render(<ErrorBoundary />);