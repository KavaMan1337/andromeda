import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendVerificationEmail, sendResetPasswordEmail, VerificationCode } from '../services/email.js';
import { authLimiter, loginLimiter } from '../middleware/rateLimit.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const JWT_EXPIRY = '7d';

// ── Helpers ─────────────────────────────────────────────────────────────────

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function sanitizeUser(user) {
  const obj = user.toObject();
  delete obj.password;
  return obj;
}

// Auth middleware — attach user to request
export function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' });
  }
}

// ── POST /api/auth/register ─────────────────────────────────────────────────

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required', code: 'VALIDATION' });
    if (!email?.match(/^\S+@\S+\.\S+$/)) return res.status(400).json({ error: 'Valid email is required', code: 'VALIDATION' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters', code: 'VALIDATION' });

    // Check if email exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      if (existing.verified) {
        return res.status(409).json({ error: 'Email already registered. Try logging in.', code: 'EMAIL_EXISTS' });
      }
      // Unverified account exists — resend code
      const code = generateCode();
      VerificationCode.set(email.toLowerCase(), 'register', code);
      await sendVerificationEmail(email, code);
      return res.json({ message: 'A new verification code has been sent to your email.', pending: true });
    }

    // Create unverified user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      password, // will be hashed by pre-save hook
      verified: false,
    });
    await user.save();

    // Generate and send verification code
    const code = generateCode();
    VerificationCode.set(email.toLowerCase(), 'register', code);
    await sendVerificationEmail(email, code);

    res.status(201).json({
      message: 'Verification code sent to your email.',
      pending: true,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Email already registered.', code: 'EMAIL_EXISTS' });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error. Please try again.', code: 'SERVER_ERROR' });
  }
});

// ── POST /api/auth/verify ──────────────────────────────────────────────────

router.post('/verify', authLimiter, async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required', code: 'VALIDATION' });
    }

    const stored = VerificationCode.get(email.toLowerCase(), 'register');
    if (!stored) {
      return res.status(400).json({ error: 'No verification code found. Please register again.', code: 'CODE_NOT_FOUND' });
    }
    if (stored.used) {
      return res.status(400).json({ error: 'Code already used. Please request a new one.', code: 'CODE_USED' });
    }
    if (Date.now() > stored.expires) {
      return res.status(400).json({ error: 'Code expired. Please request a new one.', code: 'CODE_EXPIRED' });
    }
    if (stored.code !== code) {
      return res.status(400).json({ error: 'Invalid code. Please check and try again.', code: 'INVALID_CODE' });
    }

    // Mark code as used
    VerificationCode.markUsed(email.toLowerCase(), 'register');

    // Verify the user
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { verified: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    const token = signToken(user._id.toString());
    res.json({
      message: 'Email verified successfully!',
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Server error. Please try again.', code: 'SERVER_ERROR' });
  }
});

// ── POST /api/auth/login ────────────────────────────────────────────────────

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required', code: 'VALIDATION' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDS' });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDS' });
    }

    if (!user.verified) {
      // Resend verification code
      const code = generateCode();
      VerificationCode.set(email.toLowerCase(), 'register', code);
      await sendVerificationEmail(email, code);
      return res.json({
        message: 'Please verify your email first. A new code has been sent.',
        pendingVerification: true,
      });
    }

    const token = signToken(user._id.toString());
    res.json({
      message: 'Login successful!',
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error. Please try again.', code: 'SERVER_ERROR' });
  }
});

// ── POST /api/auth/forgot-password ──────────────────────────────────────────

router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email?.match(/^\S+@\S+\.\S+$/)) {
      return res.status(400).json({ error: 'Valid email is required', code: 'VALIDATION' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal whether email exists
      return res.json({ message: 'If this email is registered, a reset code has been sent.' });
    }

    // Check resend rate
    if (!VerificationCode.canResend(email.toLowerCase(), 'reset')) {
      return res.status(429).json({
        error: 'Too many resend attempts. Please wait a few minutes.',
        code: 'RESEND_LIMITED',
      });
    }

    const code = generateCode();
    VerificationCode.set(email.toLowerCase(), 'reset', code);
    await sendResetPasswordEmail(email, code);

    res.json({ message: 'If this email is registered, a reset code has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error. Please try again.', code: 'SERVER_ERROR' });
  }
});

// ── POST /api/auth/reset-password ──────────────────────────────────────────

router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code, and new password are required', code: 'VALIDATION' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters', code: 'VALIDATION' });
    }

    const stored = VerificationCode.get(email.toLowerCase(), 'reset');
    if (!stored) {
      return res.status(400).json({ error: 'No reset code found. Please request a new one.', code: 'CODE_NOT_FOUND' });
    }
    if (stored.used) {
      return res.status(400).json({ error: 'Code already used. Please request a new one.', code: 'CODE_USED' });
    }
    if (Date.now() > stored.expires) {
      return res.status(400).json({ error: 'Code expired. Please request a new one.', code: 'CODE_EXPIRED' });
    }
    if (stored.code !== code) {
      return res.status(400).json({ error: 'Invalid code.', code: 'INVALID_CODE' });
    }

    VerificationCode.markUsed(email.toLowerCase(), 'reset');

    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { password: newPassword },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    const token = signToken(user._id.toString());
    res.json({
      message: 'Password reset successfully!',
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error. Please try again.', code: 'SERVER_ERROR' });
  }
});

// ── POST /api/auth/resend-code ──────────────────────────────────────────────

router.post('/resend-code', authLimiter, async (req, res) => {
  try {
    const { email, type = 'register' } = req.body;

    if (!email?.match(/^\S+@\S+\.\S+$/)) {
      return res.status(400).json({ error: 'Valid email is required', code: 'VALIDATION' });
    }
    if (!['register', 'reset'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type', code: 'VALIDATION' });
    }

    if (!VerificationCode.canResend(email.toLowerCase(), type)) {
      return res.status(429).json({
        error: 'Too many resend attempts. Please wait a few minutes.',
        code: 'RESEND_LIMITED',
      });
    }

    const entry = VerificationCode.incrementResend(email.toLowerCase(), type);
    const sent = type === 'register'
      ? await sendVerificationEmail(email, entry.code)
      : await sendResetPasswordEmail(email, entry.code);

    if (!sent.success) {
      return res.status(500).json({ error: 'Failed to send email. Please try again.', code: 'SEND_FAILED' });
    }

    res.json({ message: 'New code sent to your email.' });
  } catch (err) {
    console.error('Resend error:', err);
    res.status(500).json({ error: 'Server error. Please try again.', code: 'SERVER_ERROR' });
  }
});

// ── GET /api/auth/me ────────────────────────────────────────────────────────

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Server error.', code: 'SERVER_ERROR' });
  }
});

// ── PUT /api/auth/me ────────────────────────────────────────────────────────

router.put('/me', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    const update = {};
    if (name?.trim()) update.name = name.trim();

    const user = await User.findByIdAndUpdate(req.userId, update, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error('Update me error:', err);
    res.status(500).json({ error: 'Server error.', code: 'SERVER_ERROR' });
  }
});

export default router;