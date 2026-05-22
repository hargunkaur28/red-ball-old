const jwt = require('jsonwebtoken');
const User = require('../models/User');
const axios = require('axios');

const ACCESS_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_secure_123';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_key_secure_456';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 90 * 24 * 60 * 60 * 1000,
};

const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, ACCESS_SECRET, { expiresIn: '15m' });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: '90d' });
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated. Contact admin.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token in DB
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // Set refresh token as httpOnly cookie configured for 30-day session persistence
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

    res.json({
      message: 'Login successful',
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        photo: user.photo,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

// POST /api/auth/register (public - for QR table flow)
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: 'user',
    });

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(201).json({
      message: 'Registration successful',
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
};

// POST /api/auth/refresh
exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token not found.' });
    }

    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = await User.findById(decoded.userId).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: 'Invalid refresh token.' });
    }

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    res.cookie('refreshToken', newRefreshToken, REFRESH_COOKIE_OPTIONS);

    res.json({
      accessToken: newAccessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        photo: user.photo,
      },
    });
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired refresh token.' });
  }
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (refreshToken) {
      const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
      await User.findByIdAndUpdate(decoded.userId, { refreshToken: null });
    }

    res.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS);
    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    res.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS);
    res.json({ message: 'Logged out.' });
  }
};

// POST /api/auth/google
exports.googleAuth = async (req, res) => {
  try {
    const { credential, role = 'user' } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required.' });
    }

    const { data: profile } = await axios.get('https://oauth2.googleapis.com/tokeninfo', {
      params: { id_token: credential },
    });

    const expectedClientId = process.env.GOOGLE_CLIENT_ID;
    if (expectedClientId && profile.aud !== expectedClientId) {
      return res.status(401).json({ message: 'Google credential audience mismatch.' });
    }

    if (!profile.email || profile.email_verified !== 'true') {
      return res.status(401).json({ message: 'Google email is not verified.' });
    }

    let user = await User.findOne({ email: profile.email });
    if (!user) {
      const requestedRole = role === 'user' ? role : 'user';
      user = await User.create({
        name: profile.name || profile.email.split('@')[0],
        email: profile.email,
        photo: profile.picture || '',
        password: `Google@${Date.now()}`,
        role: requestedRole,
      });
    } else {
      if (profile.picture && !user.photo) user.photo = profile.picture;
      if (!user.isActive) {
        return res.status(403).json({ message: 'Account is deactivated. Contact admin.' });
      }
      await user.save({ validateBeforeSave: false });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({
      message: 'Google sign-in successful',
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        photo: user.photo,
      },
    });
  } catch (error) {
    console.error('Google Auth Error:', error.response?.data || error.message);
    res.status(401).json({ message: 'Google sign-in failed.' });
  }
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ message: 'If email exists, OTP has been sent.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOtp = otp;
    user.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save({ validateBeforeSave: false });

    // TODO: Send OTP via Brevo email
    console.log(`OTP for ${email}: ${otp}`);

    res.json({ message: 'If email exists, OTP has been sent.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email }).select('+resetOtp +resetOtpExpiry');

    if (!user || user.resetOtp !== otp || user.resetOtpExpiry < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    user.password = newPassword;
    user.resetOtp = undefined;
    user.resetOtpExpiry = undefined;
    await user.save();

    res.json({ message: 'Password reset successful.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        photo: user.photo,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};
