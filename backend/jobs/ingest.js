// backend/jobs/ingest.js
const fetch = require('node-fetch');
const AqiReading = require('../models/AqiReading');

const WAQI_TOKEN = process.env.WAQI_TOKEN;
const OPENWEATHER_KEY = process.env.OPENWEATHER_KEY;

/**
 * Normalize station name to simple city name (tries to trim station suffixes)
 */
function normalizeCityName(name) {
  if (!name) return null;
  // WAQI station names often contain " - " or comma; pick last part or first meaningful part
  const parts = name.split('-').map(s => s.trim());
  if (parts.length > 1) return parts[0];
  // fallback: remove parenthesis content
  return name.replace(/\s*\(.*?\)\s*/g, '').trim();
}

/**
 * Save reading into MongoDB AqiReading model
 */
async function saveReading(city, aqi, pollutants = {}, weather = {}, recordedAt = new Date()) {
  try {
    // Validate inputs
    if (!city) {
      throw new Error('City value is required');
    }
    
    // Allow null/undefined AQI values to be saved (for cases where we have partial data)
    const doc = new AqiReading({
      city,
      aqi: typeof aqi === 'number' ? aqi : null,
      pollutants,
      weather,
      recordedAt
    });
    await doc.save();
    return doc;
  } catch (err) {
    console.error('Error saving reading for', city, err);
    throw err;
  }
}

/**
 * Fetch live reading from WAQI feed or OpenWeather fallback
 */
async function fetchFromWaqi(city) {
  if (!WAQI_TOKEN) throw new Error('WAQI token missing');
  const url = `https://api.waqi.info/feed/${encodeURIComponent(city)}/?token=${WAQI_TOKEN}`;
  const r = await fetch(url);
  const j = await r.json();
  if (j.status !== 'ok' || !j.data) throw new Error('WAQI returned no data');
  const data = j.data;
  const pm25 = data.iaqi && (data.iaqi.pm25?.v ?? null);
  const pm10 = data.iaqi && (data.iaqi.pm10?.v ?? null);
  const aqi = typeof data.aqi === 'number' ? data.aqi : (pm25 !== null ? pm25 : null);
  return {
    city: normalizeCityName(data.city?.name || city),
    aqi,
    pollutants: data.iaqi || {},
    weather: data.weather || {},
    recordedAt: data.time?.iso ? new Date(data.time.iso) : new Date()
  };
}

async function fetchFromOpenWeather(city) {
  if (!OPENWEATHER_KEY) throw new Error('OpenWeather key missing');
  // geocode
  const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${OPENWEATHER_KEY}`;
  const geoRes = await fetch(geoUrl);
  const geoJson = await geoRes.json();
  if (!Array.isArray(geoJson) || geoJson.length === 0) throw new Error('OpenWeather geocode failed');
  const { lat, lon, name } = geoJson[0];

  const airUrl = `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}`;
  const airRes = await fetch(airUrl);
  const airJson = await airRes.json();

  const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}&units=metric`;
  const weatherRes = await fetch(weatherUrl);
  const weatherJson = await weatherRes.json();

  const components = airJson.list?.[0]?.components || {};
  const pm25 = components.pm2_5 ?? null;
  const pm10 = components.pm10 ?? null;
  const aqi = pm25 !== null ? pm25 : null;

  return {
    city: name || city,
    aqi,
    pollutants: components,
    weather: weatherJson || {},
    recordedAt: airJson.list?.[0]?.dt ? new Date(airJson.list[0].dt * 1000) : new Date()
  };
}

/**
 * Main ingest function - accepts array of city names
 */
async function ingestOnce(cities = []) {
  if (!Array.isArray(cities)) throw new Error('cities must be an array');
  
  console.log(`Starting ingestion for ${cities.length} cities`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const city of cities) {
    try {
      let reading;
      try {
        if (WAQI_TOKEN) {
          console.log(`Fetching data from WAQI for ${city}`);
          reading = await fetchFromWaqi(city);
        } else {
          throw new Error('no waqi token');
        }
      } catch (waqiErr) {
        console.warn(`WAQI failed for ${city}:`, waqiErr.message);
        // fallback to OpenWeather
        try {
          console.log(`Falling back to OpenWeather for ${city}`);
          reading = await fetchFromOpenWeather(city);
        } catch (owErr) {
          console.warn(`Both WAQI and OpenWeather failed for ${city}`, waqiErr.message, owErr.message);
          // Even if we can't get AQI, we might still want to save partial data
          // But for now, we'll skip cities where we can't get any data
          errorCount++;
          continue;
        }
      }

      if (!reading) {
        errorCount++;
        continue;
      }

      await saveReading(reading.city, reading.aqi, reading.pollutants, reading.weather, reading.recordedAt);
      console.log(`Ingested ${reading.city} @ ${reading.recordedAt.toISOString()} AQI=${reading.aqi}`);
      successCount++;
      
      // Small delay between requests to avoid hitting rate limits
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error('Error ingesting city', city, err.message || err);
      errorCount++;
    }
  }
  
  console.log(`Ingestion completed. Success: ${successCount}, Errors: ${errorCount}`);
}

module.exports = ingestOnce;