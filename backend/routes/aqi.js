// backend/routes/aqi.js
const express = require('express');
const router = express.Router();
const AqiReading = require('../models/AqiReading');

/**
 * GET /api/aqi/:city?limit=48&from=&to=
 * Returns recent readings (chronological order) and statistics.
 */
router.get('/:city', async (req, res) => {
  const city = req.params.city;
  
  // Validate city parameter
  if (!city || city.trim().length === 0) {
    return res.status(400).json({ error: 'City parameter is required' });
  }
  
  const limit = parseInt(req.query.limit || '48', 10);
  const from = req.query.from ? new Date(req.query.from) : null;
  const to = req.query.to ? new Date(req.query.to) : null;

  // Validate limit
  if (isNaN(limit) || limit <= 0 || limit > 1000) {
    return res.status(400).json({ error: 'Limit must be between 1 and 1000' });
  }

  try {
    console.log(`Fetching AQI data for city: ${city}, limit: ${limit}`);
    
    const query = { city };
    if (from || to) {
      query.recordedAt = {};
      if (from) query.recordedAt.$gte = from;
      if (to) query.recordedAt.$lte = to;
    }

    // Add timeout to prevent hanging database queries
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 10000); // 10 second timeout
    });

    const dbPromise = AqiReading.find(query)
      .sort({ recordedAt: -1 })
      .limit(limit)
      .lean();

    const docs = await Promise.race([dbPromise, timeoutPromise]);

    // Reverse to chronological order (oldest first)
    const readings = docs.reverse();

    // Filter valid numeric AQI values
    const validReadings = readings.filter(r => typeof r.aqi === 'number' && isFinite(r.aqi) && r.aqi >= 0);
    const aqiVals = validReadings.map(r => r.aqi);

    const stats = {
      count: validReadings.length,
      avg: null,
      peak: null,
      min: null,
      median: null,
      stdDev: null
    };

    if (aqiVals.length > 0) {
      // Use precise mean for math, round only for presentation
      const sum = aqiVals.reduce((a, b) => a + b, 0);
      const mean = sum / aqiVals.length;

      stats.avg = Math.round(mean);
      stats.peak = Math.max(...aqiVals);
      stats.min = Math.min(...aqiVals);

      // Median
      const sorted = [...aqiVals].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      stats.median = (sorted.length % 2 !== 0) ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

      // Standard deviation (population)
      const squareDiffs = aqiVals.map(v => Math.pow(v - mean, 2));
      const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
      stats.stdDev = Math.round(Math.sqrt(avgSquareDiff));
    }

    res.json({
      city,
      readings,
      stats,
      query: {
        limit,
        from: from ? from.toISOString() : null,
        to: to ? to.toISOString() : null
      }
    });
  } catch (err) {
    console.error('Error fetching AQI data for', city, err);
    if (err.message === 'Database query timeout') {
      return res.status(500).json({ 
        error: 'Database query timeout - please try again later',
        city,
        readings: [],
        stats: {
          count: 0,
          avg: null,
          peak: null,
          min: null,
          median: null,
          stdDev: null
        },
        query: {
          limit,
          from: from ? from.toISOString() : null,
          to: to ? to.toISOString() : null
        }
      });
    }
    
    // Return empty data structure instead of error to allow frontend to handle gracefully
    res.json({
      city,
      readings: [],
      stats: {
        count: 0,
        avg: null,
        peak: null,
        min: null,
        median: null,
        stdDev: null
      },
      query: {
        limit,
        from: from ? from.toISOString() : null,
        to: to ? to.toISOString() : null
      }
    });
  }
});

module.exports = router;