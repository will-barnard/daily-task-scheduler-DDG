const jwksRsa = require('jwks-rsa');
const jwt = require('jsonwebtoken');

const JWKS_URI = process.env.AUTH_JWKS_URL || 'https://auth.drugansdrums.com/.well-known/jwks.json';
const ISSUER = process.env.AUTH_ISSUER || 'https://auth.drugansdrums.com';
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'brew_token';

const jwksClient = jwksRsa({
  jwksUri: JWKS_URI,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
});

function getKey(header, cb) {
  jwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) return cb(err);
    cb(null, key.getPublicKey());
  });
}

function authenticate(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, getKey, { algorithms: ['RS256'], issuer: ISSUER }, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    // Normalise brew-auth claims to req.user shape the app expects
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.username,
      role: decoded.role === 'super_admin' ? 'superadmin' : decoded.role,
    };
    next();
  });
}

function requireSuperAdmin(req, res, next) {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
}

module.exports = { authenticate, requireSuperAdmin };
