// backend/routes/forecast.js
const express = require('express');
const router = express.Router();
const AqiReading = require('../models/AqiReading');
const fetch = require('node-fetch');

const MLSERVICEURL = process.env.MLSERVICEURL || 'http://localhost:8000';

router.get('/:city', async (req, res) => {
  const city = req.params.city;
  const horizon = parseInt(req.query.h || '24', 10);

  // Validate inputs
  if (!city || city.trim().length === 0) {
    return res.status(400).json({ error: 'City parameter is required' });
  }
  
  if (isNaN(horizon) || horizon <= 0 || horizon > 168) {
    return res.status(400).json({ error: 'Horizon must be between 1 and 168 hours' });
  }

  try {
    console.log(`Fetching forecast data for city: ${city}, horizon: ${horizon}h`);
    
    // Fetch historical hourly AQI (limit recent 7*24 by default)
    const limit = parseInt(req.query.limit || String(7 * 24), 10);
    
    // Add timeout to prevent hanging database queries
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 10000); // 10 second timeout
    });

    const dbPromise = AqiReading.find({ city })
      .sort({ recordedAt: -1 })
      .limit(limit)
      .lean();

    const docs = await Promise.race([dbPromise, timeoutPromise]);

    if (!docs || docs.length === 0) {
      return res.status(404).json({ error: 'Not enough historical data' });
    }

    // Reverse to chronological
    const readings = docs.reverse();

    // Prepare series for ML: { ts: ISO string, y: AQI }
    const series = readings
      .map(r => ({ ts: new Date(r.recordedAt).toISOString(), y: typeof r.aqi === 'number' ? r.aqi : null }))
      .filter(r => r.y !== null);

    if (series.length < 24) {
      return res.status(400).json({ error: 'Need at least 24 valid historical points for forecasting' });
    }

    // Call ML service with timeout
    const payload = {
      city,
      series,
      horizon
    };

    console.log(`Calling ML service at ${MLSERVICEURL.replace(/\/$/, '')}/forecast`);
    
    // Add timeout to prevent hanging ML service calls
    const mlController = new AbortController();
    const mlTimeoutId = setTimeout(() => mlController.abort(), 30000); // 30 second timeout
    
    const r = await fetch(`${MLSERVICEURL.replace(/\/$/, '')}/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: mlController.signal
    });
    
    clearTimeout(mlTimeoutId);

    if (!r.ok) {
      const text = await r.text();
      console.error(`ML service error: ${r.status} - ${text}`);
      return res.status(502).json({ error: 'ML service error', details: text });
    }

    const j = await r.json();

    // Expect ML response shape: { forecast: [...], ci: { lower: [...], upper: [...] }, horizon: n }
    res.json({
      city,
      horizon,
      forecast: j.forecast || [],
      ci: j.ci || { lower: [], upper: [] },
      model: j.model || null
    });
  } catch (err) {
    console.error('Forecast error', err);
    if (err.name === 'AbortError') {
      return res.status(500).json({ error: 'ML service timeout - please try again later' });
    }
    if (err.message === 'Database query timeout') {
      return res.status(500).json({ error: 'Database query timeout - please try again later' });
    }
    res.status(500).json({ error: 'Failed to produce forecast: ' + err.message });
  }
});

module.exports = router;