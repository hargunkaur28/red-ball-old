const OneTimeAccess = require('../models/OneTimeAccess');
const Sport = require('../models/Sport');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { getEffectiveConfig } = require('../utils/sessionCalculator');
const { invalidateEntitlementCache } = require('../utils/entitlementEngine');
const { createRazorpayOrder, verifyPaymentSignature, fetchPaymentDetails } = require('../config/razorpay');
const jwt = require('jsonwebtoken');

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

// POST /api/onetimeaccess/purchase-order
exports.purchaseOrder = async (req, res) => {
  try {
    const { sportId } = req.body;
    if (!sportId) {
      return res.status(400).json({ success: false, message: 'sportId is required.' });
    }

    const sport = await Sport.findById(sportId);
    if (!sport || sport.deletedAt) {
      return res.status(404).json({ success: false, message: 'Sport not found.' });
    }

    const ratePerHour = sport.hourlyPrice || 0;
    const amount = ratePerHour; // 1 hour access
    const gstAmount = 0; // Removed GST
    const totalAmount = amount + gstAmount;

    const rzpOrder = await createRazorpayOrder({
      amount: Math.round(totalAmount * 100), // in paise
      currency: 'INR',
      receipt: `OTA_ORDER_${Date.now()}`,
    });

    res.json({
      success: true,
      rzpOrder: {
        id: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
      },
      pricing: {
        amount,
        gstAmount,
        totalAmount,
      },
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('purchaseOrder error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/onetimeaccess/verify-purchase
exports.verifyPurchase = async (req, res) => {
  try {
    const {
      sportId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      name,
      email,
      phone,
    } = req.body;

    if (!sportId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ success: false, message: 'Required fields are missing.' });
    }

    const sport = await Sport.findById(sportId);
    if (!sport || sport.deletedAt) {
      return res.status(404).json({ success: false, message: 'Sport not found.' });
    }

    // 1. Verify Razorpay Signature
    const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature.' });
    }

    // 2. Fetch Razorpay Payment Details
    const paymentDetails = await fetchPaymentDetails(razorpayPaymentId);
    if (paymentDetails.status !== 'captured') {
      return res.status(400).json({ success: false, message: 'Payment not captured by Razorpay.' });
    }

    // 3. Idempotency Check using Razorpay Payment ID or Order ID
    const existingPayment = await Payment.findOne({
      $or: [{ razorpayPaymentId }, { razorpayOrderId }],
      status: 'paid',
    });

    if (existingPayment) {
      // Find the pass associated with this payment
      const existingPass = await OneTimeAccess.findOne({ paymentId: existingPayment._id }).populate('sportId');
      return res.json({
        success: true,
        message: 'Payment already verified.',
        pass: existingPass,
      });
    }

    // 4. Resolve User
    let userId = req.user?.userId;
    let isNewUser = false;
    let resolvedUser = null;

    if (!userId) {
      // Guest Checkout Flow: Find or auto-create user
      if (!email || !phone || !name) {
        return res.status(400).json({ success: false, message: 'Name, email, and phone are required for guest checkout.' });
      }

      resolvedUser = await User.findOne({
        $or: [{ email: email.toLowerCase() }, { phone }],
      });

      if (!resolvedUser) {
        // Create new user account with default password
        resolvedUser = await User.create({
          name,
          email: email.toLowerCase(),
          phone,
          password: 'User@123',
          role: 'user',
        });
        isNewUser = true;
      }
      userId = resolvedUser._id;
    } else {
      resolvedUser = await User.findById(userId);
    }

    // 5. Create Payment record
    const ratePerHour = sport.hourlyPrice || 0;
    const amount = ratePerHour;
    const gstAmount = Math.round(amount * 0.18 * 100) / 100;
    const totalAmount = amount + gstAmount;

    const payment = await Payment.create({
      studentId: userId,
      customerName: resolvedUser.name,
      type: 'one-time-play',
      amount,
      gstAmount,
      gstPercent: 18,
      totalAmount,
      amountPaid: totalAmount,
      remainingAmount: 0,
      status: 'paid',
      paymentMode: 'razorpay',
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    // 6. Create OneTimeAccess pass
    const config = await getEffectiveConfig(sport.slug);
    const validityHours = config.accessValidityHours || 24;
    const expiresAt = new Date(Date.now() + validityHours * 60 * 60 * 1000);

    const lateFeePerMinute = config.lateFeePerMinuteOverride != null
      ? config.lateFeePerMinuteOverride
      : (sport.hourlyPrice || 0) / 60;

    const pass = await OneTimeAccess.create({
      userId,
      sportId: sport._id,
      paymentId: payment._id,
      accessStatus: 'unused',
      expiresAt,
      allowedDurationMinutes: config.allowedDurationMinutes || 60,
      hourlyRateSnapshot: sport.hourlyPrice || 0,
      lateFeePerMinuteSnapshot: lateFeePerMinute,
    });

    // 7. Invalidate Entitlement cache
    invalidateEntitlementCache(userId);

    // 8. Generate JWT if guest checkout (to log them in automatically)
    let authResponse = {};
    if (!req.user) {
      const accessToken = generateAccessToken(resolvedUser._id);
      const refreshToken = generateRefreshToken(resolvedUser._id);

      resolvedUser.refreshToken = refreshToken;
      await resolvedUser.save({ validateBeforeSave: false });

      res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
      authResponse = {
        accessToken,
        user: {
          id: resolvedUser._id,
          name: resolvedUser.name,
          email: resolvedUser.email,
          phone: resolvedUser.phone,
          role: resolvedUser.role,
        },
      };
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('dashboard:refresh');
    }

    res.json({
      success: true,
      message: isNewUser
        ? 'Account auto-created (Password: User@123) and pass purchased!'
        : 'One-time access pass purchased successfully.',
      pass,
      ...authResponse,
    });
  } catch (error) {
    console.error('verifyPurchase error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/onetimeaccess/my-passes
exports.getMyPasses = async (req, res) => {
  try {
    const passes = await OneTimeAccess.find({ userId: req.user.userId })
      .populate('sportId')
      .populate('attendanceId')
      .sort({ purchasedAt: -1 });

    res.json({ success: true, passes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/onetimeaccess/admin/passes
exports.getAdminPasses = async (req, res) => {
  try {
    const passes = await OneTimeAccess.find({})
      .populate('userId', 'name email phone')
      .populate('sportId', 'name slug')
      .populate('paymentId', 'status amountPaid paymentMode')
      .populate('attendanceId')
      .sort({ purchasedAt: -1 });

    res.json({ success: true, passes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
