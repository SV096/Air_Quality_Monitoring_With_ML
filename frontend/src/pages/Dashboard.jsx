import React, { useEffect, useState } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
import { TrendingUp, MapPin, Clock, Search } from "lucide-react";
Chart.register(...registerables);

function category(aqi = 0) {
  // Handle null/undefined AQI values
  if (aqi === null || aqi === undefined) {
    return {
      label: "No Data",
      color: "bg-gray",
      pill: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
      textColor: "text-gray-600 dark:text-gray-300"
    };
  }
  
  if (aqi <= 50)
    return {
      label: "Good",
      color: "bg-good",
      pill: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
      textColor: "text-green-600 dark:text-green-300"
    };
  if (aqi <= 100)
    return {
      label: "Moderate",
      color: "bg-moderate",
      pill: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200",
      textColor: "text-yellow-600 dark:text-yellow-300"
    };
  if (aqi <= 200)
    return {
      label: "Unhealthy",
      color: "bg-unhealthy",
      pill: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200",
      textColor: "text-orange-600 dark:text-orange-300"
    };
  if (aqi <= 300)
    return {
      label: "Very Unhealthy",
      color: "bg-v-unhealthy",
      pill: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
      textColor: "text-red-600 dark:text-red-300"
    };
  return {
    label: "Hazardous",
    color: "bg-hazard",
    pill: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200",
    textColor: "text-purple-600 dark:text-purple-300"
  };
}

function Spark({ readings = [], color = "#3b82f6" }) {
  // Handle case where all readings are null/undefined
  const validReadings = readings.filter(r => r !== null && r !== undefined && typeof r === 'number');
  
  // If we have no valid readings, show a flat line with "No Data" message
  if (validReadings.length === 0) {
    return (
      <div className="h-16 flex items-center justify-center">
        <span className="text-xs text-slate-500 dark:text-slate-400">No data available</span>
      </div>
    );
  }
  
  // Ensure we have at least 2 points for the chart to render properly
  const chartReadings = validReadings.length < 2 ? [...validReadings, ...validReadings] : validReadings;
  
  // Limit to 8 points for better visualization
  const limitedReadings = chartReadings.length > 8 ? chartReadings.slice(0, 8) : chartReadings;
  
  const data = {
    labels: limitedReadings.map((_, i) => i),
    datasets: [
      {
        data: limitedReadings,
        borderColor: color,
        tension: 0.3,
        pointRadius: 0,
        fill: true,
        backgroundColor: color + "20",
      },
    ],
  };
  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { 
      x: { display: false },
      y: { 
        display: false,
        min: Math.min(...limitedReadings) - 5,
        max: Math.max(...limitedReadings) + 5
      } 
    },
    elements: {
      point: {
        radius: 0
      }
    }
  };
  return (
    <div className="h-16">
      <Line data={data} options={opts} />
    </div>
  );
}

export default function Dashboard() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Major Indian cities
  const indianCities = [
    "Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata", 
    "Hyderabad", "Pune", "Ahmedabad", "Jaipur", "Lucknow"
  ];

  useEffect(() => {
    let cancelled = false;
    
    async function loadCities(cities, setFunction) {
      // Process cities with better error handling
      const results = [];
      for (const city of cities) {
        try {
          // Add timeout to prevent hanging requests
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          const [liveRes, histRes] = await Promise.allSettled([
            axios.get("/api/live/" + encodeURIComponent(city), { signal: controller.signal }),
            axios.get("/api/aqi/" + encodeURIComponent(city) + "?limit=24")
          ]);
          
          clearTimeout(timeoutId);
          
          const live = liveRes.status === 'fulfilled' ? liveRes.value.data : null;
          const hist = histRes.status === 'fulfilled' ? histRes.value.data : null;
          
          results.push({ city, live, history: hist });
        } catch (err) {
          console.error("Error loading data for city:", city, err.message);
          results.push({ city, live: null, history: null });
        }
        
        // Small delay between requests to avoid overwhelming the API
        if (!cancelled) await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (!cancelled) setFunction(results);
    }
    
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Load Indian cities only
        await loadCities(indianCities, setCards);
      } catch (e) {
        console.error("Error loading dashboard data:", e.message);
        setError("Failed to load dashboard data: " + (e.response?.data?.error || e.message));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    
    load();
    const iv = setInterval(load, 300000); // Refresh every 5 minutes
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Air Quality Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time air quality index for major cities
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg">
          <Clock className="w-4 h-4" />
          <span>Updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="flex justify-between">
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
              </div>
              <div className="mt-4 h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
              <div className="mt-6 h-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Indian Cities Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-500" />
              <h2 className="text-xl font-bold">Major Cities</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
              {cards.map((c, i) => {
                const live = c.live || {};
                const latestAQI =
                  live.aqi ?? (c.history?.readings?.[0]?.aqi ?? null);
                const cat = category(latestAQI);
                
                // Extract readings properly
                let readings = [];
                if (c.history && c.history.readings && Array.isArray(c.history.readings)) {
                  readings = c.history.readings
                    .slice(0, 8) // Take only first 8 readings
                    .map((r) => r.aqi)
                    .filter((v) => typeof v === "number" && v !== null);
                } else if (latestAQI !== null && latestAQI !== undefined) {
                  readings = [latestAQI];
                }
                
                const sparkColor =
                  latestAQI === null || latestAQI === undefined ? "#94a3b8" :
                  latestAQI <= 50 ? "#16a34a" :
                  latestAQI <= 100 ? "#facc15" :
                  latestAQI <= 200 ? "#f97316" : "#ef4444";

                return (
                  <div
                    key={c.city + i}
                    className="card p-5 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-lg truncate">{c.city}</h3>
                        <div className="mt-2 flex items-baseline gap-3">
                          <div className={`text-3xl font-extrabold ${cat.textColor}`}>
                            {latestAQI !== null && latestAQI !== undefined ? latestAQI : "—"}
                          </div>
                          <div
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${cat.pill}`}
                          >
                            {cat.label}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <Spark readings={readings} color={sparkColor} />
                    </div>
                    
                    <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {live.recordedAt
                        ? new Date(live.recordedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                        : "No data"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold">AQI Trends</h3>
              </div>
              <div className="h-40">
                <Line
                  data={{
                    labels: Array.from({ length: 12 }).map((_, i) => `${i*2}h`),
                    datasets: [
                      {
                        label: "Delhi",
                        data: Array.from({ length: 12 }).map(
                          () => 150 + Math.random() * 100
                        ),
                        borderColor: "#ef4444",
                        backgroundColor: "rgba(239, 68, 68, 0.1)",
                        fill: true,
                        tension: 0.4,
                      },
                      {
                        label: "Mumbai",
                        data: Array.from({ length: 12 }).map(
                          () => 80 + Math.random() * 80
                        ),
                        borderColor: "#f97316",
                        backgroundColor: "rgba(249, 115, 22, 0.1)",
                        fill: true,
                        tension: 0.4,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                      legend: { 
                        display: true,
                        position: 'top',
                        labels: {
                          color: document.documentElement.classList.contains('dark') ? '#e2e8f0' : '#0f172a',
                          font: {
                            size: 12
                          }
                        }
                      } 
                    },
                    scales: {
                      x: {
                        grid: {
                          color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                          color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b'
                        }
                      },
                      y: {
                        grid: {
                          color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                          color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b'
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
            
            <div className="card p-6 md:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <a
                  href="/live"
                  className="flex flex-col items-center justify-center p-6 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white hover:scale-[1.02] transition-all duration-300 shadow-lg"
                >
                  <Search className="w-8 h-8 mb-2" />
                  <span className="font-semibold">Search City</span>
                  <span className="text-sm opacity-90 mt-1">Find AQI for any city</span>
                </a>
                <a
                  href="/map"
                  className="flex flex-col items-center justify-center p-6 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white hover:scale-[1.02] transition-all duration-300 shadow-lg"
                >
                  <MapPin className="w-8 h-8 mb-2" />
                  <span className="font-semibold">View Map</span>
                  <span className="text-sm opacity-90 mt-1">See all cities on map</span>
                </a>
                <a
                  href="/favorites"
                  className="flex flex-col items-center justify-center p-6 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white hover:scale-[1.02] transition-all duration-300 shadow-lg"
                >
                  <TrendingUp className="w-8 h-8 mb-2" />
                  <span className="font-semibold">Favorites</span>
                  <span className="text-sm opacity-90 mt-1">Your saved cities</span>
                </a>
                <a
                  href="/forecast"
                  className="flex flex-col items-center justify-center p-6 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:scale-[1.02] transition-all duration-300 shadow-lg"
                >
                  <Clock className="w-8 h-8 mb-2" />
                  <span className="font-semibold">Forecast</span>
                  <span className="text-sm opacity-90 mt-1">View AQI predictions</span>
                </a>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}