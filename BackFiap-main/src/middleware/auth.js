const jwt = require('jsonwebtoken');
const User = require('../models/User');

const requireAuth = async (req, res, next) => {
  const authorization = req.get('authorization') || '';
  const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);

  if (!tokenMatch) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    console.error('JWT_SECRET must be configured with at least 32 characters.');
    return res.status(500).json({ error: 'Authentication is not configured.' });
  }

  let payload;
  try {
    payload = jwt.verify(tokenMatch[1], secret, { algorithms: ['HS256'] });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.NotBeforeError) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
    console.error('Error validating authentication token:', error);
    return res.status(500).json({ error: 'Error validating authentication.' });
  }

  if (!payload || typeof payload === 'string' || typeof payload.sub !== 'string') {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  try {
    const user = await User.findById(payload.sub).select('name email role approved');
    if (!user || user.approved !== true) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    req.user = user;
    return next();
  } catch (error) {
    console.error('Error loading authenticated user:', error);
    return res.status(500).json({ error: 'Error validating authentication.' });
  }
};

const optionalAuth = (req, res, next) => {
  const authorization = req.get('authorization') || '';
  if (!/^Bearer\s+.+$/i.test(authorization)) return next();
  return requireAuth(req, res, next);
};

const requireTeacher = (req, res, next) => {
  if (req.user?.role !== 'teacher') {
    return res.status(403).json({ error: 'Teacher access required.' });
  }

  return next();
};

module.exports = { optionalAuth, requireAuth, requireTeacher };
