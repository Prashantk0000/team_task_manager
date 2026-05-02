const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_me';

// Generate JWT token
function generateToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });
}

// Middleware: require authentication
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Please provide a valid token.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found. Token may be invalid.' });
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token. Please login again.' });
    }
    return res.status(500).json({ error: 'Authentication failed.' });
  }
}

module.exports = { generateToken, authenticate };
