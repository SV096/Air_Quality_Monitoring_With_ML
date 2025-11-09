import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Line, Bar } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
import { Search, TrendingUp, Calendar, BarChart3, Download, AlertTriangle } from "lucide-react";
Chart.register(...registerables);

export default function History() {
  const params = new URLSearchParams(window.location.search);
  const [city, setCity] = useState(params.get("city") || "Delhi");
  const [range, setRange] = useState(24);
  const [type, setType] = useState("line");
  const [data, setData] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [suggests, setSuggests] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef(null);
  const searchContainerRef = useRef(null);

  // Function to search for cities
  const searchCities = (q) => {
    setQuery(q);
    
    // Clear previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    // If query is empty, clear suggestions
    if (!q) {
      setSuggests([]);
      setShowSuggestions(false);
      return;
    }
    
    // Debounce the search request
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

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Select a city from suggestions
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
    fetchForecast(); 
    /* eslint-disable-next-line */ 
  }, [city, range]);

  function fetchData() {
    setLoading(true);
    setError(null);
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    axios.get("/api/aqi/" + encodeURIComponent(city) + "?limit=" + range, { signal: controller.signal })
      .then((r) => setData(r.data))
      .catch((err) => {
        if (err.name === 'AbortError') {
          setError("Request timeout - please try again");
        } else {
          setError(err.response?.data?.error || "Failed to fetch history data");
        }
        setData(null);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });
  }

  function fetchForecast() {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    axios.get("/api/forecast/" + encodeURIComponent(city) + "?h=24", { signal: controller.signal })
      .then((r) => setForecast(r.data))
      .catch(() => setForecast(null))
      .finally(() => clearTimeout(timeoutId));
  }

  // Export data to CSV
  const exportToCSV = () => {
    if (!data || !data.readings) {
      alert("No data to export");
      return;
    }
    
    const rows = [["Date", "AQI", "PM2.5", "PM10"]];
    data.readings.forEach(reading => {
      rows.push([
        new Date(reading.recordedAt).toISOString(),
        reading.aqi,
        reading.pollutants?.pm25?.v ?? reading.pollutants?.pm25 ?? "",
        reading.pollutants?.pm10?.v ?? reading.pollutants?.pm10 ?? ""
      ]);
    });
    
    const csv = rows
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
      
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aqi-history-${city}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get AQI category
  const getAqiCategory = (aqi) => {
    if (aqi <= 50) return { label: "Good", color: "bg-green-500" };
    if (aqi <= 100) return { label: "Moderate", color: "bg-yellow-500" };
    if (aqi <= 200) return { label: "Unhealthy", color: "bg-orange-500" };
    if (aqi <= 300) return { label: "Very Unhealthy", color: "bg-red-500" };
    return { label: "Hazardous", color: "bg-purple-500" };
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">History</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Analysis and trends</p>
          </div>
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-32 animate-pulse"></div>
        </div>
        
        <div className="card p-6 animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  const labels = data?.readings?.map((r) => new Date(r.recordedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit' })) || [];
  const values = data?.readings?.map((r) => r.aqi) || [];
  
  const fcLabels = forecast ? [...Array(forecast.horizon)].map((_, i) => `+${i+1}h`) : [];
  const fcDataset = forecast ? {
    label: "Forecast",
    data: forecast.forecast.map(v => v ?? null),
    borderColor: "#0ea5e9",
    borderDash: [6,4],
    tension: 0.3,
    yAxisID: "y",
    pointRadius: 3,
    pointHoverRadius: 5
  } : null;

  const band = forecast ? {
    label: "Confidence Interval",
    data: forecast.ci.upper.map((u, i) => ({ y: u, yMin: forecast.ci.lower[i] })),
    parsing: { yAxisKey: "y", yMinKey: "yMin" },
    type: "line",
    pointRadius: 0,
    borderWidth: 0,
    fill: {
      target: { value: (ctx) => ctx.raw?.yMin },
      above: "rgba(14,165,233,0.15)",
      below: "rgba(14,165,233,0.15)",
    },
  } : null;

  // Combine historical and forecast data for the chart
  const allLabels = [...labels, ...fcLabels];
  const allData = [...values, ...Array(fcLabels.length).fill(null)];
  
  const chartData = {
    labels: allLabels,
    datasets: [
      {
        label: city + " AQI",
        data: allData,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.08)",
        fill: true,
        tension: 0.3,
        pointRadius: 2,
        pointHoverRadius: 5
      },
      ...(fcDataset ? [fcDataset] : []),
      ...(band ? [band] : [])
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: document.documentElement.classList.contains('dark') ? '#e2e8f0' : '#0f172a',
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        mode: 'index',
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
        grid: {
          color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b',
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        grid: {
          color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b'
        },
        title: {
          display: true,
          text: 'AQI Index',
          color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b'
        }
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
          <h1 className="text-3xl font-bold">AQI History</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Historical trends and analysis for {city}</p>
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg">
          Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* City Selection */}
          <div className="relative" ref={searchContainerRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
              <input
                value={query || city}
                onChange={(e) => searchCities(e.target.value)}
                placeholder="Search for a city..."
                className="pl-10 pr-4 py-3 w-full border rounded-lg focus:ring-2 focus:ring-brand-300 outline-none bg-white dark:bg-slate-800"
                onFocus={() => query && setShowSuggestions(true)}
              />
            </div>
            
            {showSuggestions && suggests.length > 0 && (
              <div className="absolute z-10 w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg mt-1 border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto">
                {suggests.map((suggestion) => (
                  <div
                    key={suggestion}
                    className="p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition flex items-center gap-2"
                    onClick={() => selectCity(suggestion)}
                  >
                    <Search className="w-4 h-4 text-slate-400" />
                    <span>{suggestion}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Time Range */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <Calendar className="inline w-4 h-4 mr-1" />
              Time Range
            </label>
            <div className="flex gap-2 flex-wrap">
              <button 
                onClick={() => setRange(24)} 
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  range === 24 
                    ? "bg-brand-500 text-white shadow" 
                    : "bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                24h
              </button>
              <button 
                onClick={() => setRange(24 * 7)} 
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  range === 24 * 7 
                    ? "bg-brand-500 text-white shadow" 
                    : "bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                7d
              </button>
              <button 
                onClick={() => setRange(24 * 30)} 
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  range === 24 * 30 
                    ? "bg-brand-500 text-white shadow" 
                    : "bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                30d
              </button>
            </div>
          </div>
          
          {/* Chart Type & Export */}
          <div className="flex flex-col gap-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              <BarChart3 className="inline w-4 h-4 mr-1" />
              Chart Options
            </label>
            <div className="flex gap-2">
              <button 
                onClick={() => setType(type === "line" ? "bar" : "line")} 
                className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition text-sm font-medium"
              >
                Toggle {type === "line" ? "Bar" : "Line"}
              </button>
              <button 
                onClick={exportToCSV} 
                disabled={!data}
                className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-5 text-center">
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Average AQI</div>
          <div className="text-2xl font-bold text-brand-600 dark:text-brand-400">{data?.stats?.avg ?? "-"}</div>
        </div>
        <div className="card p-5 text-center">
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Peak AQI</div>
          <div className="text-2xl font-bold text-red-500">{data?.stats?.peak ?? "-"}</div>
        </div>
        <div className="card p-5 text-center">
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Records</div>
          <div className="text-2xl font-bold">{data?.readings?.length ?? 0}</div>
        </div>
        <div className="card p-5 text-center">
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Current Status</div>
          <div className="text-2xl font-bold">
            {data?.readings?.[0]?.aqi ? (
              <span className={`px-2 py-1 rounded-full text-sm ${getAqiCategory(data.readings[0].aqi).color} text-white`}>
                {getAqiCategory(data.readings[0].aqi).label}
              </span>
            ) : "-"}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            AQI Trends for {city}
          </h2>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {range === 24 ? "Last 24 hours" : range === 168 ? "Last 7 days" : "Last 30 days"}
          </div>
        </div>
        <div className="h-96">
          {type === "line" ? 
            <Line data={chartData} options={chartOptions} /> : 
            <Bar data={chartData} options={chartOptions} />
          }
        </div>
      </div>
    </div>
  );
}