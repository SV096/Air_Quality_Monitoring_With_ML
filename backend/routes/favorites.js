// backend/routes/favorites.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authRequired } = require('../middleware_auth');

// Helper to map stored favorite strings -> objects expected by frontend
function formatFavorites(arr) {
  return (arr || []).map(city => {
    if (typeof city === 'string') return { city, addedAt: null };
    if (city && typeof city === 'object') return city;
    return { city: String(city), addedAt: null };
  });
}

// GET /api/favorites/ -> list user's favorites
router.get('/', authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ error: 'user not found' });
    const favs = formatFavorites(user.favorites);
    res.json({ favorites: favs });
  } catch (err) {
    console.error('Favorites list error', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// GET /api/favorites/list -> alias (frontend expects /list)
router.get('/list', authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ error: 'user not found' });
    const favs = formatFavorites(user.favorites);
    res.json({ favorites: favs });
  } catch (err) {
    console.error('Favorites list error', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// POST /api/favorites/add { city }
router.post('/add', authRequired, async (req, res) => {
  try {
    const city = req.body.city;
    if (!city) return res.status(400).json({ error: 'city required' });
    
    // Validate city name
    if (typeof city !== 'string' || city.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid city name' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'user not found' });

    if (!user.favorites.includes(city)) user.favorites.push(city);
    await user.save();
    res.json({ favorites: formatFavorites(user.favorites) });
  } catch (err) {
    console.error('Favorites add error', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// POST /api/favorites/remove { city }
router.post('/remove', authRequired, async (req, res) => {
  try {
    const city = req.body.city;
    if (!city) return res.status(400).json({ error: 'city required' });
    
    // Validate city name
    if (typeof city !== 'string' || city.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid city name' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'user not found' });

    user.favorites = user.favorites.filter(c => c !== city);
    await user.save();
    res.json({ favorites: formatFavorites(user.favorites) });
  } catch (err) {
    console.error('Favorites remove error', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

module.exports = router;