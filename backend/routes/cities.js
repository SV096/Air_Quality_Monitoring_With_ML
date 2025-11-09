const express = require('express');
const router = express.Router();
const axios = require('axios');

// Expanded list of major cities worldwide
const majorCities = [
  // Indian cities
  "Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata", "Hyderabad", "Pune", "Ahmedabad", 
  "Jaipur", "Lucknow", "Patna", "Noida", "Gurgaon", "Bhopal", "Indore", "Thane", "Surat", 
  "Vadodara", "Kanpur", "Nagpur", "Agra", "Varanasi", "Amritsar", "Allahabad", "Bhubaneswar",
  "Chandigarh", "Coimbatore", "Dehradun", "Guwahati", "Jammu", "Jamshedpur", "Kochi", "Ludhiana",
  "Madurai", "Mysore", "Nashik", "Rajkot", "Srinagar", "Trivandrum", "Visakhapatnam",
  
  // Major world cities
  "New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", 
  "San Diego", "Dallas", "San Jose", "London", "Paris", "Berlin", "Madrid", "Rome", "Athens",
  "Tokyo", "Osaka", "Beijing", "Shanghai", "Hong Kong", "Seoul", "Singapore", "Bangkok", 
  "Kuala Lumpur", "Jakarta", "Manila", "Sydney", "Melbourne", "Toronto", "Vancouver", 
  "Montreal", "Mexico City", "São Paulo", "Buenos Aires", "Lima", "Santiago", "Bogotá", 
  "Caracas", "Cairo", "Lagos", "Johannesburg", "Nairobi", "Casablanca", "Istanbul", 
  "Moscow", "Dubai", "Tel Aviv", "Riyadh", "Doha", "Kuwait City", "Amman", "Beirut"
];

// GET /api/cities?q=del
router.get('/', async (req, res) => {
  try {
    const q = (req.query.q || '').toLowerCase();
    
    // If no query, return all major cities
    if (!q) {
      return res.json({ cities: majorCities });
    }
    
    // Filter from major cities first
    const filtered = majorCities.filter(c => c.toLowerCase().includes(q)).slice(0, 50);
    
    // If we have enough results, return them
    if (filtered.length >= 10) {
      return res.json({ cities: filtered });
    }
    
    // Otherwise, try to get more cities from WAQI API if token is available
    if (process.env.WAQI_TOKEN) {
      try {
        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await axios.get(`https://api.waqi.info/search/?token=${process.env.WAQI_TOKEN}&keyword=${encodeURIComponent(q)}`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.data && response.data.data) {
          const apiCities = response.data.data.map(item => item.station.name).slice(0, 50);
          // Combine with filtered results and remove duplicates
          const combined = [...new Set([...filtered, ...apiCities])].slice(0, 50);
          return res.json({ cities: combined });
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.error('WAQI API timeout:', error.message);
        } else {
          console.error('Error fetching cities from WAQI API:', error.message);
        }
      }
    }
    
    // Fallback to filtered major cities
    res.json({ cities: filtered });
  } catch (error) {
    console.error('Error in cities route:', error);
    // Even in case of error, return some cities
    res.json({ cities: majorCities });
  }
});

module.exports = router;