import rateLimit from 'express-rate-limit';

// General auth routes limiter: 5 attempts per minute per IP
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: {
    error: 'Too many attempts. Please wait a minute and try again.',
    code: 'RATE_LIMITED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login-specific limiter: 10 attempts per minute per IP
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    error: 'Too many login attempts. Please wait a minute.',
    code: 'RATE_LIMITED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});