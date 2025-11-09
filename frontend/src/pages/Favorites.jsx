import React, { useEffect, useState } from "react";
import axios from "axios";
import { Heart, Trash2, MapPin, Clock, User, RefreshCw } from "lucide-react";

function token() {
  return localStorage.getItem("token");
}

function aqiCategory(aqi) {
  if (aqi <= 50) return { 
    label: "Good", 
    style: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
    color: "text-green-500"
  };
  if (aqi <= 100) return { 
    label: "Moderate", 
    style: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200",
    color: "text-yellow-500"
  };
  if (aqi <= 200) return { 
    label: "Unhealthy", 
    style: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200",
    color: "text-orange-500"
  };
  if (aqi <= 300) return { 
    label: "Very Unhealthy", 
    style: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
    color: "text-red-500"
  };
  return { 
    label: "Hazardous", 
    style: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200",
    color: "text-purple-500"
  };
}

export default function Favorites() {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchUserData() {
    try {
      const res = await axios.get("/api/auth/me", {
        headers: { Authorization: "Bearer " + token() }
      });
      setUserData(res.data.user);
    } catch (e) {
      console.error("Error fetching user data:", e);
    }
  }

  async function fetchFavorites() {
    setLoading(true);
    try {
      const res = await axios.get("/api/favorites/list", {
        headers: { Authorization: "Bearer " + token() }
      });
      // Fetch live data for each favorite city
      const citiesWithData = await Promise.all(
        (res.data.favorites || []).map(async (city) => {
          try {
            const liveRes = await axios.get("/api/live/" + encodeURIComponent(city.city));
            return { ...city, ...liveRes.data };
          } catch (error) {
            console.warn(`Failed to fetch data for ${city.city}:`, error.message);
            return city;
          }
        })
      );
      setCities(citiesWithData);
    } catch (e) {
      console.error("Error fetching favorites:", e);
      setCities([]);
    } finally {
      setLoading(false);
    }
  }

  async function removeFavorite(city) {
    try {
      await axios.post(
        "/api/favorites/remove",
        { city },
        { headers: { Authorization: "Bearer " + token() } }
      );
      fetchFavorites();
    } catch (e) {
      alert("Failed to remove favorite: " + (e.response?.data?.error || e.message));
    }
  }

  async function refreshData() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await fetchFavorites();
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (token()) {
      fetchUserData();
      fetchFavorites();
    }
  }, []);

  if (!token()) {
    return (
      <div className="card p-8 text-center animate-fadeIn">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
          <Heart className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Favorites</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          Please log in to save and view your favorite cities.
        </p>
        <a 
          href="/auth" 
          className="inline-flex items-center gap-2 px-4 py-2 brand-btn rounded-lg"
        >
          <User className="w-4 h-4" />
          Login to Continue
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Heart className="w-8 h-8 text-red-500" />
            Your Favorites
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Quick access to your saved cities
          </p>
        </div>
        <div className="flex items-center gap-3">
          {userData && (
            <div className="flex items-center gap-2 text-sm bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg">
              <User className="w-4 h-4" />
              <span>
                Signed in as <strong>
                  {userData.username || 
                   (userData.email ? 
                     userData.email.length > 20 ? 
                       userData.email.substring(0, 17) + "..." : 
                       userData.email : 
                     "User")}
                </strong>
              </span>
            </div>
          )}
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            aria-label="Refresh data"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : cities.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <Heart className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No favorites yet</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Save your favorite cities to quickly access their air quality data.
          </p>
          <a 
            href="/live" 
            className="inline-flex items-center gap-2 px-4 py-2 brand-btn rounded-lg"
          >
            <MapPin className="w-4 h-4" />
            Browse Cities
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cities.map((c) => {
            const category = aqiCategory(c.aqi);
            return (
              <div
                key={c.city}
                className="card p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-red-500" />
                    {c.city}
                  </h2>
                  <button
                    onClick={() => removeFavorite(c.city)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition"
                    aria-label={`Remove ${c.city} from favorites`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                {c.aqi !== undefined && c.aqi !== null ? (
                  <>
                    <div className="flex items-baseline gap-3 mb-3">
                      <div className={`text-4xl font-extrabold ${category.color}`}>
                        {c.aqi}
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${category.style}`}>
                        {category.label}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
                      <Clock className="w-4 h-4" />
                      {c.recordedAt
                        ? new Date(c.recordedAt).toLocaleString([], { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })
                        : "No recent data"}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                        <div className="text-slate-500 dark:text-slate-400">PM2.5</div>
                        <div className="font-semibold">
                          {c.pollutants?.pm25?.v ?? c.pollutants?.pm25 ?? "-"}
                        </div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                        <div className="text-slate-500 dark:text-slate-400">Temp</div>
                        <div className="font-semibold">
                          {c.weather?.main?.temp ?? c.weather?.temp ?? "-"}°C
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-slate-400 dark:text-slate-500 mb-2">
                      <MapPin className="w-12 h-12 mx-auto" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400">
                      No data available for {c.city}
                    </p>
                  </div>
                )}
                
                <div className="mt-6 flex gap-3">
                  <a
                    href={`/live?city=${encodeURIComponent(c.city)}`}
                    className="flex-1 text-center px-3 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition text-sm font-medium"
                  >
                    View Details
                  </a>
                  <a
                    href={`/history?city=${encodeURIComponent(c.city)}`}
                    className="flex-1 text-center px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition text-sm font-medium"
                  >
                    History
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}