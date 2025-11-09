// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authRequired } = require('../middleware_auth');

// Prefer JWT_SECRET; support old name
const JWT_SECRET = process.env.JWT_SECRET || process.env.JWTSECRET || 'secret';

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password required' });
    }
    
    // Validate username
    if (typeof username !== 'string' || username.trim().length < 3 || username.trim().length > 30) {
      return res.status(400).json({ error: 'username must be between 3 and 30 characters' });
    }
    
    // Validate password
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'password must be at least 6 characters' });
    }
    
    // Validate email if provided
    if (email && (typeof email !== 'string' || !email.includes('@'))) {
      return res.status(400).json({ error: 'invalid email format' });
    }

    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ error: 'username taken' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, passwordHash: hash, email });
    
    // safe response (no password)
    res.json({ id: user._id, username: user.username, email: user.email });
  } catch (err) {
    console.error('Register error', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password required' });
    }
    
    // Validate username
    if (typeof username !== 'string' || username.trim().length < 3) {
      return res.status(400).json({ error: 'invalid username' });
    }
    
    // Validate password
    if (typeof password !== 'string' || password.length < 1) {
      return res.status(400).json({ error: 'password required' });
    }

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ error: 'invalid credentials' });

    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// GET /api/auth/me
router.get('/me', authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ error: 'user not found' });
    delete user.passwordHash;
    res.json({ user });
  } catch (err) {
    console.error('Auth /me error', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

module.exports = router;