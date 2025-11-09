// backend/middleware_auth.js
const jwt = require('jsonwebtoken');

// Prefer JWT_SECRET; support JWTSECRET for backward compatibility
const JWT_SECRET = process.env.JWT_SECRET || process.env.JWTSECRET || 'secret';

function authRequired(req, res, next) {
  const auth = req.headers.authorization || req.headers.Authorization;
  
  // Check if authorization header exists
  if (!auth) {
    return res.status(401).json({ error: 'missing auth header' });
  }
  
  // Check if authorization header has correct format
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({ error: 'bad auth header format, expected: Bearer TOKEN' });
  }
  
  const token = parts[1];
  
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (e) {
    if (e.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'token expired' });
    }
    if (e.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'invalid token' });
    }
    return res.status(401).json({ error: 'invalid token: ' + e.message });
  }
}

module.exports = { authRequired };