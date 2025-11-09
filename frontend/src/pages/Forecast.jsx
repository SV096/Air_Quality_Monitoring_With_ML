// frontend/src/pages/Forecast.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
import { Search, TrendingUp, Clock, Info, AlertTriangle } from "lucide-react";
Chart.register(...registerables);

export default function Forecast() {
  const params = new URL(window.location.href).searchParams;
  const [city, setCity] = useState(params.get("city") || "Delhi");
  const [horizon, setHorizon] = useState(24);
  const [forecast, setForecast] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [suggests, setSuggests] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef(null);

  const searchCities = (q) => {
    setQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q) {
      setSuggests([]);
      setShowSuggestions(false);
      return;
    }
    searchTimeout.current = setTimeout(() => {
      axios.get("/api/cities?q=" + encodeURIComponent(q))
        .then((r) => {
          setSuggests(r.data.cities || []);
          setShowSuggestions(true);
        })
        .catch(() => {
          setSuggests([]);
          setShowSuggestions(false);
        });
    }, 300);
  };

  const selectCity = (selectedCity) => {
    setCity(selectedCity);
    setQuery(selectedCity);
    setSuggests([]);
    setShowSuggestions(false);
    // Update URL without refreshing the page
    const url = new URL(window.location);
    url.searchParams.set('city', selectedCity);
    window.history.replaceState({}, '', url);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [city, horizon]);

  function fetchData() {
    setLoading(true);
    setError(null);

    // Fetch history data with timeout
    const historyController = new AbortController();
    const historyTimeoutId = setTimeout(() => historyController.abort(), 10000); // 10 second timeout
    
    // Fetch forecast data with timeout
    const forecastController = new AbortController();
    const forecastTimeoutId = setTimeout(() => forecastController.abort(), 10000); // 10 second timeout

    // Fetch history data
    axios.get("/api/aqi/" + encodeURIComponent(city) + "?limit=48", { signal: historyController.signal })
      .then((r) => setHistory(r.data))
      .catch((err) => {
        console.error("Error fetching history:", err);
        if (err.name === 'AbortError') {
          setError("History data request timeout - please try again");
        }
        setHistory(null);
      })
      .finally(() => {
        clearTimeout(historyTimeoutId);
      })
      .finally(() => {
        // Fetch forecast data
        axios.get("/api/forecast/" + encodeURIComponent(city) + "?h=" + horizon, { signal: forecastController.signal })
          .then((r) => {
            setForecast(r.data);
            setLoading(false);
          })
          .catch((err) => {
            if (err.name === 'AbortError') {
              setError("Forecast request timeout - please try again");
            } else {
              setError(err.response?.data?.error || "Failed to fetch forecast data");
            }
            setForecast(null);
            setLoading(false);
          })
          .finally(() => {
            clearTimeout(forecastTimeoutId);
          });
      });
  }

  function category(aqi = 0) {
    if (aqi <= 50)
      return {
        label: "Good",
        color: "bg-green-500",
        textColor: "text-green-800 dark:text-green-200",
        bgColor: "bg-green-100 dark:bg-green-900/30",
      };
    if (aqi <= 100)
      return {
        label: "Moderate",
        color: "bg-yellow-500",
        textColor: "text-yellow-800 dark:text-yellow-200",
        bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
      };
    if (aqi <= 200)
      return {
        label: "Unhealthy",
        color: "bg-orange-500",
        textColor: "text-orange-800 dark:text-orange-200",
        bgColor: "bg-orange-100 dark:bg-orange-900/30",
      };
    if (aqi <= 300)
      return {
        label: "Very Unhealthy",
        color: "bg-red-500",
        textColor: "text-red-800 dark:text-red-200",
        bgColor: "bg-red-100 dark:bg-red-900/30",
      };
    return {
      label: "Hazardous",
      color: "bg-purple-500",
      textColor: "text-purple-800 dark:text-purple-200",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
    };
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Air Quality Forecast</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Predicted AQI levels using machine learning</p>
          </div>
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-32 animate-pulse"></div>
        </div>

        <div className="card p-6 animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-4"></div>
          <div className="h-80 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  const historyLabels = history?.readings?.map((r) =>
    new Date(r.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  ) || [];

  const historyValues = history?.readings?.map((r) => r.aqi) || [];

  const forecastLabels = forecast ? Array.from({ length: forecast.horizon }).map((_, i) => `+${i+1}h`) : [];

  const forecastValues = forecast?.forecast || [];

  const confidenceLower = forecast?.ci?.lower || [];
  const confidenceUpper = forecast?.ci?.upper || [];

  const allLabels = [...historyLabels, ...forecastLabels];
  const allHistoryData = [...historyValues, ...Array(forecastLabels.length).fill(null)];
  const allForecastData = [...Array(historyLabels.length).fill(null), ...forecastValues];

  const chartData = {
    labels: allLabels,
    datasets: [
      {
        label: `${city} Historical AQI`,
        data: allHistoryData,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: 2,
        pointHoverRadius: 5
      },
      {
        label: `${city} Forecast`,
        data: allForecastData,
        borderColor: "#0ea5e9",
        borderDash: [6, 4],
        tension: 0.3,
        pointRadius: 2,
        pointHoverRadius: 5
      },
      ...(confidenceUpper.length ? [{
        label: "Confidence Interval",
        data: [
          ...Array(historyLabels.length).fill(null),
          ...confidenceUpper.map((u, i) => ({ y: u, yMin: confidenceLower[i] }))
        ],
        parsing: { yAxisKey: "y", yMinKey: "yMin" },
        type: "line",
        pointRadius: 0,
        borderWidth: 0,
        fill: {
          target: { value: (ctx) => ctx.raw?.yMin },
          above: "rgba(14,165,233,0.15)",
          below: "rgba(14,165,233,0.15)",
        },
      }] : [])
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: document.documentElement.classList.contains('dark') ? '#e2e8f0' : '#0f172a',
          font: { size: 12 }
        }
      },
      tooltip: {
        mode: "index",
        intersect: false,
        backgroundColor: document.documentElement.classList.contains('dark') ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: document.documentElement.classList.contains('dark') ? '#e2e8f0' : '#0f172a',
        bodyColor: document.documentElement.classList.contains('dark') ? '#e2e8f0' : '#0f172a',
        borderColor: document.documentElement.classList.contains('dark') ? '#334155' : '#cbd5e1',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        title: { 
          display: true, 
          text: "Time",
          color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b'
        },
        grid: {
          color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b'
        }
      },
      y: {
        title: { 
          display: true, 
          text: "AQI Index",
          color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b'
        },
        grid: {
          color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b'
        },
        min: 0
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Air Quality Forecast</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Predicted AQI levels using machine learning</p>
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg">
          Updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="card p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Error:</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <Search className="inline w-4 h-4 mr-1" />
              Select City
            </label>
            <div className="relative">
              <input
                value={query || city}
                onChange={(e) => searchCities(e.target.value)}
                placeholder="Search for a city."
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-brand-300 outline-none bg-white dark:bg-slate-800"
              />
            </div>

            {showSuggestions && suggests && suggests.length > 0 && (
              <div className="absolute z-10 w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg mt-1 border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto">
                {suggests.map((s) => (
                  <div key={s} className="p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50" onClick={() => selectCity(s)}>
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div>
              <div className="text-slate-500 dark:text-slate-400">Horizon</div>
              <div className="font-medium">{forecast?.horizon ?? horizon} hours</div>
            </div>
            <div className="flex-1">
              <input
                type="range"
                min="6"
                max="168"
                step="1"
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">AQI Forecast</h3>
        <div className="h-96">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Summary and list */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <div className="text-slate-500 dark:text-slate-400">Horizon</div>
              <div className="font-medium">{forecast?.horizon ?? horizon} hours</div>
            </div>
            <div className="flex justify-between">
              <div className="text-slate-500 dark:text-slate-400">Expected Range</div>
              <div className="font-medium">
                {forecast && forecast.forecast.length > 0 ? 
                  `${Math.min(...forecast.forecast).toFixed(1)} - ${Math.max(...forecast.forecast).toFixed(1)}` : 
                  'N/A'} AQI
              </div>
            </div>
            <div className="flex justify-between">
              <div className="text-slate-500 dark:text-slate-400">Peak Expected</div>
              <div className="font-medium">
                {forecast && forecast.forecast.length > 0 ? 
                  `${Math.max(...forecast.forecast).toFixed(1)} AQI in ${forecast.forecast.indexOf(Math.max(...forecast.forecast)) + 1} hours` : 
                  'N/A'}
              </div>
            </div>
            <div className="flex justify-between">
              <div className="text-slate-500 dark:text-slate-400">Current AQI</div>
              <div className="font-medium">
                {history?.readings?.[0]?.aqi ? (
                  <span className={`px-2 py-1 rounded-full text-xs ${category(history.readings[0].aqi).bgColor} ${category(history.readings[0].aqi).textColor}`}>
                    {history.readings[0].aqi} ({category(history.readings[0].aqi).label})
                  </span>
                ) : "N/A"}
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6 md:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Next 12 Hours</h3>
          <div className="space-y-3">
            {forecast?.forecast?.slice(0, 12).map((value, index) => {
              const cat = category(value);
              return (
                <div key={index} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition">
                  <span className="font-medium">+{index + 1}h</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg">{value.toFixed(1)}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${cat.bgColor} ${cat.textColor}`}>
                      {cat.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}