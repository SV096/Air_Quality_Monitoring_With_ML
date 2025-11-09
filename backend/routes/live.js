// backend/routes/live.js
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch'); // ensure installed in backend package.json
const WAQI_TOKEN = process.env.WAQI_TOKEN;
const OPENWEATHER_KEY = process.env.OPENWEATHER_KEY;

/**
 * EPA breakpoint method for PM2.5 -> AQI
 * Returns integer AQI (0 - 500)
 */
function pm25ToAQI(pm25) {
  if (pm25 === null || pm25 === undefined || !isFinite(pm25)) return null;
  const c = Number(pm25);
  // Breakpoints per EPA (24-hour) truncated to 1 decimal in concentration used for AQI calc
  const breakpoints = [
    { Clow: 0.0, Chigh: 12.0, Ilow: 0, Ihigh: 50 },
    { Clow: 12.1, Chigh: 35.4, Ilow: 51, Ihigh: 100 },
    { Clow: 35.5, Chigh: 55.4, Ilow: 101, Ihigh: 150 },
    { Clow: 55.5, Chigh: 150.4, Ilow: 151, Ihigh: 200 },
    { Clow: 150.5, Chigh: 250.4, Ilow: 201, Ihigh: 300 },
    { Clow: 250.5, Chigh: 350.4, Ilow: 301, Ihigh: 400 },
    { Clow: 350.5, Chigh: 500.4, Ilow: 401, Ihigh: 500 }
  ];

  for (const bp of breakpoints) {
    if (c >= bp.Clow && c <= bp.Chigh) {
      const aqi = ((bp.Ihigh - bp.Ilow) / (bp.Chigh - bp.Clow)) * (c - bp.Clow) + bp.Ilow;
      return Math.round(aqi);
    }
  }
  // If out of range high, cap
  return c > 500.4 ? 500 : null;
}

/**
 * GET /api/live/:city
 * Try WAQI, fallback to OpenWeather geocoding + air pollution if possible.
 */
router.get('/:city', async (req, res) => {
  const city = req.params.city;
  
  // Validate city parameter
  if (!city || city.trim().length === 0) {
    return res.status(400).json({ error: 'City parameter is required' });
  }
  
  try {
    console.log(`Fetching live data for city: ${city}`);
    
    // Try WAQI first (if token present)
    if (WAQI_TOKEN) {
      try {
        console.log(`Trying WAQI API for ${city}`);
        const url = `https://api.waqi.info/feed/${encodeURIComponent(city)}/?token=${WAQI_TOKEN}`;
        
        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const r = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!r.ok) {
          throw new Error(`WAQI API returned status ${r.status}`);
        }
        
        const j = await r.json();
        if (j.status === 'ok' && j.data) {
          const data = j.data;
          // WAQI returns aqi and iaqi map
          const pm25 = data.iaqi && (data.iaqi.pm25?.v ?? null);
          const pm10 = data.iaqi && (data.iaqi.pm10?.v ?? null);
          const aqi = typeof data.aqi === 'number' ? data.aqi : (pm25 !== null ? pm25ToAQI(pm25) : null);

          return res.json({
            city: data.city?.name || city,
            aqi,
            pollutants: data.iaqi || {},
            weather: data.weather || {},
            recordedAt: data.time?.iso || new Date().toISOString(),
            source: 'waqi'
          });
        } else {
          console.warn(`WAQI API returned non-ok status for ${city}:`, j);
        }
      } catch (e) {
        if (e.name === 'AbortError') {
          console.warn('WAQI lookup timeout for', city);
        } else {
          console.warn('WAQI lookup failed, falling back', e.message);
        }
      }
    }

    // Fallback: use OpenWeather: geocode city -> weather & air_pollution
    if (!OPENWEATHER_KEY) {
      return res.status(500).json({ error: 'No external API keys available for live data' });
    }

    console.log(`Trying OpenWeather API for ${city}`);
    
    // Geocoding with timeout
    const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${OPENWEATHER_KEY}`;
    const geoController = new AbortController();
    const geoTimeoutId = setTimeout(() => geoController.abort(), 5000); // 5 second timeout
    
    const geoRes = await fetch(geoUrl, { signal: geoController.signal });
    clearTimeout(geoTimeoutId);
    
    if (!geoRes.ok) {
      throw new Error(`OpenWeather geocoding API returned status ${geoRes.status}`);
    }
    
    const geoJson = await geoRes.json();
    if (!Array.isArray(geoJson) || geoJson.length === 0) {
      return res.status(404).json({ error: 'City not found in OpenWeather data' });
    }
    const { lat, lon, name } = geoJson[0];

    // Weather with timeout
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}&units=metric`;
    const weatherController = new AbortController();
    const weatherTimeoutId = setTimeout(() => weatherController.abort(), 5000); // 5 second timeout
    
    const weatherRes = await fetch(weatherUrl, { signal: weatherController.signal });
    clearTimeout(weatherTimeoutId);
    
    if (!weatherRes.ok) {
      throw new Error(`OpenWeather weather API returned status ${weatherRes.status}`);
    }
    
    const weatherJson = await weatherRes.json();

    // Air pollution with timeout
    const airUrl = `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}`;
    const airController = new AbortController();
    const airTimeoutId = setTimeout(() => airController.abort(), 5000); // 5 second timeout
    
    const airRes = await fetch(airUrl, { signal: airController.signal });
    clearTimeout(airTimeoutId);
    
    if (!airRes.ok) {
      throw new Error(`OpenWeather air pollution API returned status ${airRes.status}`);
    }
    
    const airJson = await airRes.json();

    const components = airJson.list?.[0]?.components || {};
    const pm25 = components.pm2_5 ?? null;
    const pm10 = components.pm10 ?? null;
    const aqi = pm25 !== null ? pm25ToAQI(pm25) : (components.aqi ? components.aqi : null);

    // Return all available data
    return res.json({
      city: name || city,
      aqi,
      pollutants: { pm25, pm10, ...components },
      weather: weatherJson,
      recordedAt: airJson.list?.[0]?.dt ? new Date(airJson.list[0].dt * 1000).toISOString() : new Date().toISOString(),
      source: 'openweather'
    });
  } catch (err) {
    console.error('Live lookup error for', city, err);
    if (err.name === 'AbortError') {
      return res.status(500).json({ 
        error: 'Request timeout - please try again later',
        city: city,
        aqi: null,
        pollutants: {},
        weather: {},
        recordedAt: new Date().toISOString(),
        source: 'none'
      });
    }
    
    // Even if we have an error, try to return partial data if possible
    res.status(500).json({ 
      error: 'Failed to fetch live data: ' + err.message,
      city: city,
      aqi: null,
      pollutants: {},
      weather: {},
      recordedAt: new Date().toISOString(),
      source: 'none'
    });
  }
});

module.exports = router;