import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Search, RefreshCw, Star, Thermometer, Wind, Cloud, MapPin, Clock, AlertTriangle, Info } from "lucide-react";

function token() {
  return localStorage.getItem("token");
}

export default function Live() {
  const [city, setCity] = useState(() => {
    const url = new URL(window.location.href);
    return url.searchParams.get("city") || "Delhi";
  });
  const [data, setData] = useState(null);
  const [query, setQuery] = useState("");
  const [suggests, setSuggests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState(null);
  const searchTimeout = useRef(null);

  useEffect(() => { 
    fetchData(); 
    /* eslint-disable-next-line */ 
  }, [city]);

  function fetchData() {
    if (!city) return;
    setLoading(true);
    setError(null);
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    axios.get("/api/live/" + encodeURIComponent(city), { signal: controller.signal })
      .then((r) => {
        setData(r.data);
        // Update URL without refreshing the page
        const url = new URL(window.location);
        url.searchParams.set('city', city);
        window.history.replaceState({}, '', url);
      })
      .catch((err) => {
        if (err.name === 'AbortError') {
          setError("Request timeout - please try again");
        } else {
          setError(err.response?.data?.error || "Failed to fetch data");
        }
        setData(null);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });
  }

  function search(q) {
    setQuery(q);
    
    // Clear previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    // If query is empty, clear suggestions
    if (!q) {
      setSuggests([]);
      return;
    }
    
    // Set loading state
    setSearchLoading(true);
    
    // Debounce the search request
    searchTimeout.current = setTimeout(() => {
      axios.get("/api/cities?q=" + encodeURIComponent(q))
        .then((r) => {
          setSuggests(r.data.cities || []);
          setSearchLoading(false);
        })
        .catch(() => {
          setSuggests([]);
          setSearchLoading(false);
        });
    }, 300);
  }

  function addFav() {
    if (!token()) return alert("Login to save favorites");
    axios.post("/api/favorites/add", { city }, { headers: { Authorization: "Bearer " + token() } })
      .then(() => alert("Added to favorites!"))
      .catch((err) => alert("Failed to add to favorites: " + (err.response?.data?.error || err.message)));
  }

  function aqiCategory(aqi) {
    // Handle null/undefined AQI values
    if (aqi === null || aqi === undefined) {
      return { 
        label: "No Data", 
        style: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
        bgColor: "bg-gray-500",
        textColor: "text-gray-600 dark:text-gray-300"
      };
    }
    
    if (aqi <= 50) return { 
      label: "Good", 
      style: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
      bgColor: "bg-green-500",
      textColor: "text-green-600 dark:text-green-300"
    };
    if (aqi <= 100) return { 
      label: "Moderate", 
      style: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200",
      bgColor: "bg-yellow-500",
      textColor: "text-yellow-600 dark:text-yellow-300"
    };
    if (aqi <= 200) return { 
      label: "Unhealthy", 
      style: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200",
      bgColor: "bg-orange-500",
      textColor: "text-orange-600 dark:text-orange-300"
    };
    if (aqi <= 300) return { 
      label: "Very Unhealthy", 
      style: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
      bgColor: "bg-red-500",
      textColor: "text-red-600 dark:text-red-300"
    };
    return { 
      label: "Hazardous", 
      style: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200",
      bgColor: "bg-purple-500",
      textColor: "text-purple-600 dark:text-purple-300"
    };
  }

  // Format pollutant value with proper units
  function formatPollutant(value, pollutant) {
    if (value === null || value === undefined || value === "-") return "-";
    
    // Round to 1 decimal place for pollutants
    if (typeof value === 'number') {
      return value.toFixed(1);
    }
    
    return value;
  }

  // Get unit for pollutant
  function getPollutantUnit(pollutant) {
    const units = {
      pm25: "µg/m³",
      pm10: "µg/m³",
      no2: "µg/m³",
      o3: "µg/m³",
      so2: "µg/m³",
      co: "mg/m³"
    };
    return units[pollutant] || "";
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold">Live AQI</h1>
        <p className="text-slate-500 dark:text-slate-400">Realtime air quality for your chosen city</p>
      </div>

      {/* Search */}
      <div className="max-w-2xl w-full relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
          <input
            value={query}
            onChange={(e) => search(e.target.value)}
            placeholder="Search for any city worldwide..."
            className="pl-12 pr-4 py-4 w-full border rounded-xl focus:ring-2 focus:ring-brand-300 outline-none bg-white dark:bg-slate-800 dark:border-slate-700 shadow-sm"
          />
          {searchLoading && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
        
        {suggests.length > 0 && (
          <div className="absolute z-10 w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg mt-2 border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto">
            {suggests.map((s) => (
              <div
                key={s}
                className="p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition flex items-center gap-2"
                onClick={() => { 
                  setCity(s); 
                  setQuery(s); 
                  setSuggests([]); 
                }}
              >
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{s}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 brand-btn hover:scale-[1.02] transition rounded-lg shadow"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 
          {loading ? "Refreshing..." : "Refresh Data"}
        </button>
        <button
          onClick={addFav}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:scale-[1.02] transition shadow"
        >
          <Star className="w-4 h-4" /> Add to Favorites
        </button>
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

      {/* Data Card */}
      <div className="card p-6 animate-fadeIn border border-slate-200 dark:border-slate-700">
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
            <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-200 dark:bg-slate-700 rounded"></div>
              ))}
            </div>
          </div>
        ) : data ? (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-slate-500" />
                  {data.city}
                </h2>
                <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                  <Clock className="w-4 h-4" />
                  {data.recordedAt ? new Date(data.recordedAt).toLocaleString() : "No timestamp"}
                  {data.source && (
                    <span className="ml-2 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs">
                      Source: {data.source}
                    </span>
                  )}
                </div>
              </div>
              <div className={`px-4 py-2 rounded-full text-sm font-semibold ${aqiCategory(data.aqi).style}`}>
                {aqiCategory(data.aqi).label}
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="relative">
                <div className={`text-7xl font-extrabold ${data.aqi === null || data.aqi === undefined ? 'text-gray-400' : ''}`}>
                  {data.aqi !== null && data.aqi !== undefined ? data.aqi : "N/A"}
                </div>
                <div className="absolute -bottom-6 left-0 text-sm text-slate-500 dark:text-slate-400">AQI Index</div>
              </div>
              
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className={`p-2 rounded-lg ${aqiCategory(data.aqi).bgColor} text-white`}>
                    <Thermometer className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Temperature</div>
                    <div className="font-semibold">
                      {data.weather?.main?.temp ?? data.weather?.temp ?? "—"}°C
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="p-2 rounded-lg bg-blue-500 text-white">
                    <Wind className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Wind Speed</div>
                    <div className="font-semibold">
                      {data.weather?.wind?.speed ?? "-"} km/h
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="p-2 rounded-lg bg-gray-500 text-white">
                    <Cloud className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Condition</div>
                    <div className="font-semibold">
                      {data.weather?.weather?.[0]?.description ?? "-"}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className={`p-2 rounded-lg ${aqiCategory(data.aqi).bgColor} text-white`}>
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Location</div>
                    <div className="font-semibold truncate max-w-[120px]">
                      {data.city}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Info box for missing AQI data */}
            {(data.aqi === null || data.aqi === undefined) && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-blue-800 dark:text-blue-200">AQI Data Unavailable</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    We couldn't retrieve the AQI data for {data.city}. This could be due to:
                  </p>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 list-disc list-inside space-y-1">
                    <li>The city name might not be recognized by our data sources</li>
                    <li>Temporary issues with our data providers</li>
                    <li>The city might not have air quality monitoring stations</li>
                  </ul>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                    Try searching for a nearby major city or check back later.
                  </p>
                </div>
              </div>
            )}
            
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold mb-3">Pollutant Levels</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="text-sm text-slate-500 dark:text-slate-400">PM2.5</div>
                  <div className="font-semibold text-lg">
                    {formatPollutant(data.pollutants?.pm25?.v ?? data.pollutants?.pm25, 'pm25')}
                    {data.pollutants?.pm25 !== undefined && data.pollutants?.pm25 !== null && data.pollutants?.pm25 !== "-" && 
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                        {getPollutantUnit('pm25')}
                      </span>
                    }
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="text-sm text-slate-500 dark:text-slate-400">PM10</div>
                  <div className="font-semibold text-lg">
                    {formatPollutant(data.pollutants?.pm10?.v ?? data.pollutants?.pm10, 'pm10')}
                    {data.pollutants?.pm10 !== undefined && data.pollutants?.pm10 !== null && data.pollutants?.pm10 !== "-" && 
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                        {getPollutantUnit('pm10')}
                      </span>
                    }
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="text-sm text-slate-500 dark:text-slate-400">NO2</div>
                  <div className="font-semibold text-lg">
                    {formatPollutant(data.pollutants?.no2?.v ?? data.pollutants?.no2, 'no2')}
                    {data.pollutants?.no2 !== undefined && data.pollutants?.no2 !== null && data.pollutants?.no2 !== "-" && 
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                        {getPollutantUnit('no2')}
                      </span>
                    }
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="text-sm text-slate-500 dark:text-slate-400">O3</div>
                  <div className="font-semibold text-lg">
                    {formatPollutant(data.pollutants?.o3?.v ?? data.pollutants?.o3, 'o3')}
                    {data.pollutants?.o3 !== undefined && data.pollutants?.o3 !== null && data.pollutants?.o3 !== "-" && 
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                        {getPollutantUnit('o3')}
                      </span>
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : !loading && !error ? (
          <div className="text-center py-12">
            <div className="text-slate-400 dark:text-slate-500 mb-2">
              <MapPin className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">No data available</h3>
            <p className="text-slate-500 dark:text-slate-400">
              We couldn't find air quality data for <strong>{city}</strong>
            </p>
            <button
              onClick={fetchData}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 brand-btn rounded-lg"
            >
              <RefreshCw className="w-4 h-4" /> Try Again
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}