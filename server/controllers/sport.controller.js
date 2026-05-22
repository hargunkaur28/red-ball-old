const Sport = require('../models/Sport');
const MembershipPlan = require('../models/MembershipPlan');
const Membership = require('../models/Membership');
const Slot = require('../models/Slot');
const SlotBooking = require('../models/SlotBooking');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');
const mongoose = require('mongoose');
const { DEFAULT_ALLOWED_DURATION_MINUTES, applySessionCheckout, getEffectiveConfig } = require('../utils/sessionCalculator');
const { calculateEntitlement, validateCheckIn, isAllServicesKey } = require('../utils/entitlementEngine');

// Helper to run operations within a transaction, falling back gracefully on standalone mongo
const runTransaction = async (workFn) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await workFn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    // Fallback if standalone MongoDB doesn't support replica set transactions
    const isStandaloneErr = error.message.includes('replica set') || 
                            error.codeName === 'TransactionSystemFailed' || 
                            error.message.includes('transaction');
    if (isStandaloneErr) {
      console.warn('⚠️ Standalone MongoDB detected. Falling back to non-transactional execution for compatibility.');
      return await workFn(null);
    }
    throw error;
  } finally {
    session.endSession();
  }
};

const enrichSportWithQR = async (sport) => {
  if (!sport) return null;

  // Lazy migration: if qrSlug is missing, generate and save it
  if (!sport.qrSlug) {
    sport.qrSlug = require('crypto').randomBytes(16).toString('hex');
    await sport.save();
  }

  const QRCode = require('qrcode');
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const qrUrl = `${clientUrl}/entry/${sport.qrSlug}`;
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl);
    return {
      ...sport.toObject(),
      qrCodeDataUrl
    };
  } catch (err) {
    console.error('QR generation error:', err);
    return sport.toObject();
  }
};

// GET /api/sports - Get all sports
exports.getAllSports = async (req, res) => {
  try {
    const { includeArchived } = req.query;
    const filter = { deletedAt: null };
    
    if (includeArchived === 'true') {
      delete filter.deletedAt;
    }

    const sports = await Sport.find(filter).sort({ name: 1 });
    const enrichedSports = await Promise.all(sports.map(enrichSportWithQR));
    res.json({ success: true, sports: enrichedSports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// GET /api/sports/public - Get active sports (public)
exports.getPublicSports = async (req, res) => {
  try {
    const sports = await Sport.find({ active: true, deletedAt: null }).sort({ name: 1 });
    res.json({ success: true, sports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/sports/public/:slug - Get single active sport by slug (public) + its membership plans
exports.getPublicSportBySlug = async (req, res) => {
  try {
    const sport = await Sport.findOne({ slug: req.params.slug, active: true, deletedAt: null });
    if (!sport) return res.status(404).json({ success: false, message: 'Sport not found' });

    const activeSportKeys = await getActiveSportKeys();
    const allPlans = await MembershipPlan.find({ isActive: true }).sort({ price: 1 });
    const plans = allPlans.filter(p => planIsValidForSmartEntry(p, sport, activeSportKeys));

    res.json({ success: true, sport, plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/sports/:id - Get sport details
exports.getSportById = async (req, res) => {
  try {
    const sport = await Sport.findById(req.params.id);
    if (!sport || sport.deletedAt) {
      return res.status(404).json({ success: false, message: 'Sport not found' });
    }
    const enrichedSport = await enrichSportWithQR(sport);
    res.json({ success: true, sport: enrichedSport });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper function to sync MembershipPlans for a sport
const syncMembershipPlans = async (sport, session) => {
  const opts = session ? { session } : {};
  
  // Define standard plans we automatically manage
  const planDefinitions = [
    { key: 'oneMonthPrice', nameSuffix: 'Monthly', duration: '1 Month', durationValue: 1, durationUnit: 'months', optional: true },
    { key: 'threeMonthPrice', nameSuffix: 'Quarterly', duration: '3 Months', durationValue: 3, durationUnit: 'months' },
    { key: 'sixMonthPrice', nameSuffix: 'Half-Yearly', duration: '6 Months', durationValue: 6, durationUnit: 'months' },
    { key: 'twelveMonthPrice', nameSuffix: 'Yearly', duration: '1 Year', durationValue: 1, durationUnit: 'years' }
  ];

  for (const def of planDefinitions) {
    const price = sport[def.key];
    if (def.optional && (price === undefined || price === null || price === 0)) {
      // If optional and price not provided, archive existing auto-sync yearly plan if any
      await MembershipPlan.findOneAndUpdate(
        { sportsIncluded: sport.slug, duration: def.duration, autoSync: { $ne: false } },
        { isActive: false },
        opts
      );
      continue;
    }

    // Find if plan already exists for this sport & duration
    const existingPlan = await MembershipPlan.findOne(
      { sportsIncluded: sport.slug, duration: def.duration },
      null,
      opts
    );

    if (existingPlan) {
      // If autoSync is disabled, skip updating to prevent overwriting manual edits
      if (existingPlan.autoSync === false) {
        console.log(`ℹ️ Skipping manual plan override for: ${existingPlan.name}`);
        continue;
      }

      // Update existing autoSync plan
      existingPlan.price = price;
      existingPlan.isActive = sport.active && !sport.deletedAt;
      existingPlan.name = `${sport.name} ${def.nameSuffix}`;
      await existingPlan.save(opts);
    } else {
      // Create new plan if it doesn't exist
      await MembershipPlan.create([{
        name: `${sport.name} ${def.nameSuffix}`,
        duration: def.duration,
        durationValue: def.durationValue,
        durationUnit: def.durationUnit,
        sportsIncluded: [sport.slug],
        price: price,
        isActive: sport.active && !sport.deletedAt,
        autoSync: true,
        features: [`Full access to ${sport.name} facilities`]
      }], opts);
    }
  }
};

// POST /api/sports - Create a new sport
exports.createSport = async (req, res) => {
  try {
    const { name, hourlyPrice, dayPrice, oneMonthPrice, threeMonthPrice, sixMonthPrice, twelveMonthPrice, active } = req.body;
    
    // Duplicate prevention
    const existing = await Sport.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') }, deletedAt: null });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A sport with this name already exists.' });
    }

    const sportData = {
      name,
      hourlyPrice: hourlyPrice || 0,
      dayPrice,
      oneMonthPrice,
      threeMonthPrice,
      sixMonthPrice,
      twelveMonthPrice,
      active: active !== undefined ? active : true
    };

    const newSport = await runTransaction(async (session) => {
      const opts = session ? { session } : {};
      
      // 1. Create Sport
      const [sport] = await Sport.create([sportData], opts);
      
      // 2. Synchronize plans inside transaction
      await syncMembershipPlans(sport, session);
      
      return sport;
    });

    res.status(201).json({ success: true, sport: newSport });
  } catch (error) {
    console.error('Create Sport Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/sports/:id - Update an existing sport
exports.updateSport = async (req, res) => {
  try {
    const { name, hourlyPrice, dayPrice, oneMonthPrice, threeMonthPrice, sixMonthPrice, twelveMonthPrice, active, forceDeactivate } = req.body;
    const sportId = req.params.id;

    const sport = await Sport.findById(sportId);
    if (!sport || sport.deletedAt) {
      return res.status(404).json({ success: false, message: 'Sport not found' });
    }

    // Safety checks: if trying to deactivate, check for active sessions/bookings
    if (active === false && sport.active === true && forceDeactivate !== true) {
      const stats = await getActiveStats(sport.slug);
      if (stats.activeMemberships > 0 || stats.activeBookings > 0) {
        return res.status(409).json({
          success: false,
          error: 'CONFIRMATION_REQUIRED',
          message: `This sport currently has ${stats.activeMemberships} active memberships and ${stats.activeBookings} active bookings. Are you sure you want to deactivate it?`,
          stats
        });
      }
    }

    // Name change duplicate check
    if (name && name !== sport.name) {
      const duplicate = await Sport.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') }, 
        _id: { $ne: sportId },
        deletedAt: null 
      });
      if (duplicate) {
        return res.status(400).json({ success: false, message: 'Another sport with this name already exists.' });
      }
      sport.name = name;
    }

    if (hourlyPrice !== undefined) sport.hourlyPrice = hourlyPrice;
    if (dayPrice !== undefined) sport.dayPrice = dayPrice;
    if (oneMonthPrice !== undefined) sport.oneMonthPrice = oneMonthPrice;
    if (threeMonthPrice !== undefined) sport.threeMonthPrice = threeMonthPrice;
    if (sixMonthPrice !== undefined) sport.sixMonthPrice = sixMonthPrice;
    if (twelveMonthPrice !== undefined) sport.twelveMonthPrice = twelveMonthPrice;
    if (active !== undefined) sport.active = active;

    const updatedSport = await runTransaction(async (session) => {
      const opts = session ? { session } : {};
      
      // Save Sport details
      await sport.save(opts);
      
      // Sync Membership Plans
      await syncMembershipPlans(sport, session);
      
      return sport;
    });

    res.json({ success: true, sport: updatedSport });
  } catch (error) {
    console.error('Update Sport Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/sports/:id - Soft Delete / Archive a sport
exports.deleteSport = async (req, res) => {
  try {
    const sportId = req.params.id;
    const { forceDeactivate } = req.query;

    const sport = await Sport.findById(sportId);
    if (!sport || sport.deletedAt) {
      return res.status(404).json({ success: false, message: 'Sport not found or already archived' });
    }

    // Deactivation safety checks
    if (forceDeactivate !== 'true') {
      const stats = await getActiveStats(sport.slug);
      if (stats.activeMemberships > 0 || stats.activeBookings > 0) {
        return res.status(409).json({
          success: false,
          error: 'CONFIRMATION_REQUIRED',
          message: `This sport currently has ${stats.activeMemberships} active memberships and ${stats.activeBookings} active bookings. Archiving it will deactivate facility listings. Are you sure you want to proceed?`,
          stats
        });
      }
    }

    sport.active = false;
    sport.deletedAt = new Date();

    const archivedSport = await runTransaction(async (session) => {
      const opts = session ? { session } : {};
      await sport.save(opts);

      // Mark associated auto-sync plans as inactive
      await MembershipPlan.updateMany(
        { sportsIncluded: sport.slug, autoSync: { $ne: false } },
        { isActive: false },
        opts
      );

      return sport;
    });

    res.json({ success: true, message: 'Sport archived and deactivated successfully', sport: archivedSport });
  } catch (error) {
    console.error('Archive Sport Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/sports/:id/toggle - Toggle active state
exports.toggleActive = async (req, res) => {
  try {
    const sportId = req.params.id;
    const { forceDeactivate } = req.body;

    const sport = await Sport.findById(sportId);
    if (!sport || sport.deletedAt) {
      return res.status(404).json({ success: false, message: 'Sport not found' });
    }

    const nextActiveState = !sport.active;

    // Safety checks if deactivating
    if (!nextActiveState && forceDeactivate !== true) {
      const stats = await getActiveStats(sport.slug);
      if (stats.activeMemberships > 0 || stats.activeBookings > 0) {
        return res.status(409).json({
          success: false,
          error: 'CONFIRMATION_REQUIRED',
          message: `This sport currently has ${stats.activeMemberships} active memberships and ${stats.activeBookings} active bookings. Are you sure you want to deactivate it?`,
          stats
        });
      }
    }

    sport.active = nextActiveState;

    const updatedSport = await runTransaction(async (session) => {
      const opts = session ? { session } : {};
      await sport.save(opts);

      // Sync plan status
      await MembershipPlan.updateMany(
        { sportsIncluded: sport.slug, autoSync: { $ne: false } },
        { isActive: sport.active },
        opts
      );

      return sport;
    });

    res.json({ success: true, sport: updatedSport });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper: Get active memberships and bookings counts for a sport
async function getActiveStats(sportSlug) {
  // 1. Active memberships
  const matchingPlans = await MembershipPlan.find({ sportsIncluded: sportSlug }).select('_id');
  const planIds = matchingPlans.map(p => p._id);
  const activeMemberships = await Membership.countDocuments({
    planId: { $in: planIds },
    status: 'active',
    endDate: { $gt: new Date() }
  });

  // 2. Active future bookings
  const matchingSlots = await Slot.find({ sport: { $regex: new RegExp(`^${sportSlug}$`, 'i') } }).select('_id');
  const slotIds = matchingSlots.map(s => s._id);
  
  const activeBookings = await SlotBooking.countDocuments({
    $or: [
      { slotId: { $in: slotIds } },
      { slotName: { $regex: new RegExp(`^${sportSlug}`, 'i') } } // Fallback match
    ],
    status: { $in: ['pending', 'confirmed', 'checked-in'] },
    startTime: { $ne: '' } // Exclude canceled or completed bookings
  });

  return { activeMemberships, activeBookings };
}

// ==========================================
// PHASE 3 — SPORT QR ACCESS & SMART ENTRY SYSTEM
// ==========================================

const entryRateLimitMap = {};

const normalizeKey = (value) => (value || '').trim().toLowerCase();

const getActiveSportKeys = async () => {
  const sports = await Sport.find({ active: true, deletedAt: null }).select('name slug').lean();
  const keys = new Set();
  sports.forEach((sport) => {
    if (sport.slug) keys.add(normalizeKey(sport.slug));
    if (sport.name) keys.add(normalizeKey(sport.name));
  });
  return keys;
};

const planIsValidForSmartEntry = (plan, sport, activeSportKeys) => {
  if (!plan?.isActive || !Array.isArray(plan.sportsIncluded) || plan.sportsIncluded.length === 0) {
    return false;
  }

  const includedKeys = plan.sportsIncluded.map(normalizeKey).filter(Boolean);
  const hasOnlyKnownSports = includedKeys.every((key) => isAllServicesKey(key) || activeSportKeys.has(key));
  if (!hasOnlyKnownSports) return false;

  const sportSlug = normalizeKey(sport.slug);
  const sportName = normalizeKey(sport.name);
  return includedKeys.some((key) => key === sportSlug || key === sportName);
};

// Custom in-memory rate-limiter middleware for public entry endpoints
exports.entryRateLimiter = (req, res, next) => {
  const clientIdentifier = req.user?.userId || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();
  const windowMs = 10 * 1000; // 10 seconds
  const limit = 5; // 5 requests per 10 seconds
  
  if (!entryRateLimitMap[clientIdentifier]) {
    entryRateLimitMap[clientIdentifier] = [];
  }
  
  entryRateLimitMap[clientIdentifier] = entryRateLimitMap[clientIdentifier].filter(t => now - t < windowMs);
  
  if (entryRateLimitMap[clientIdentifier].length >= limit) {
    return res.status(429).json({
      success: false,
      message: 'Too many scan requests. Please wait a few seconds and try again.'
    });
  }
  
  entryRateLimitMap[clientIdentifier].push(now);
  next();
};

// GET /api/sports/entry-check/:qrSlug - Check validation/membership status for a scanned QR code
exports.entryCheck = async (req, res) => {
  try {
    const sport = await Sport.findOne({ $or: [{ qrSlug: req.params.qrSlug }, { slug: req.params.qrSlug }] });
    if (!sport || sport.deletedAt) {
      return res.status(404).json({ success: false, message: 'Invalid or expired QR code.' });
    }

    // Lazy migration: assign qrSlug if missing
    if (!sport.qrSlug) {
      sport.qrSlug = require('crypto').randomBytes(16).toString('hex');
      await sport.save();
    }

    // Find if user has an active entitlement for this sport
    let activeCheckIn = null;
    let hasMembership = false;
    let entitlement = null;
    let validationAllowed = true;
    let validationReason = null;
    
    let hasPrepaidPass = false;
    let entitlementSource = 'membership';
    
    if (req.user) {
      const validation = await validateCheckIn(req.user.userId, sport.slug);
      entitlement = validation.entitlement;
      validationAllowed = validation.allowed;
      validationReason = validation.reason;
      entitlementSource = validation.entitlementSource || 'membership';
      hasPrepaidPass = !!validation.matchingPass;
      
      // If entitlement allows this sport (or all services)
      if (entitlement.entitlementType !== 'none' && 
         (entitlement.isAllServices || entitlement.allowedSports.includes(sport.slug))) {
        hasMembership = true;
      }
      
      // Look for an existing checkin in the activeSessions returned by validation
      activeCheckIn = validation.activeSessions.find(
        (s) => (s.sport || '').trim().toLowerCase() === sport.slug || (s.sport || '').trim().toLowerCase() === sport.name.toLowerCase()
      ) || null;
      
      const wrongSportCheckIn = validation.activeSessions.find(
        (s) => (s.sport || '').trim().toLowerCase() !== sport.slug && (s.sport || '').trim().toLowerCase() !== sport.name.toLowerCase()
      );
      if (wrongSportCheckIn) {
        validationAllowed = false;
        validationReason = `Wrong QR Code! You are currently checked in for ${wrongSportCheckIn.sport || 'another sport'}. Please scan the ${wrongSportCheckIn.sport || 'correct'} QR to check out before checking into a new sport.`;
      }
    }

    const activeSportKeys = await getActiveSportKeys();

    // Get available membership plans for this sport (match by slug or name for compatibility)
    const allPlans = await MembershipPlan.find({ isActive: true });
    const plans = allPlans.filter(p => {
      return planIsValidForSmartEntry(p, sport, activeSportKeys);
    });

    res.json({
      success: true,
      sport: {
        id: sport._id,
        name: sport.name,
        slug: sport.slug,
        hourlyPrice: sport.hourlyPrice,
        dayPrice: sport.dayPrice,
        activeOccupancy: sport.activeOccupancy,
      },
      hasActiveCheckIn: !!activeCheckIn,
      activeCheckIn,
      hasMembership,
      hasPrepaidPass,
      entitlementSource,
      entitlement,
      validationAllowed,
      validationReason,
      plans
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// In-memory lock to prevent double-click write skew race conditions
const checkInLocks = new Set();

// POST /api/sports/entry-checkin/:qrSlug - Check in user via QR code
exports.entryCheckIn = async (req, res) => {
  const lockKey = `${req.user.userId}-${req.params.qrSlug}`;
  if (checkInLocks.has(lockKey)) {
    return res.status(429).json({ success: false, message: 'Check-in already in progress. Please wait.' });
  }
  checkInLocks.add(lockKey);

  try {
    const sport = await Sport.findOne({ $or: [{ qrSlug: req.params.qrSlug }, { slug: req.params.qrSlug }] });
    if (!sport || sport.deletedAt) return res.status(404).json({ success: false, message: 'Invalid QR code.' });

    // Validate membership using the Entitlement Engine
    const validation = await validateCheckIn(req.user.userId, sport.slug);
    
    if (!validation.allowed) {
      return res.status(403).json({ success: false, message: validation.reason, activeSessions: validation.activeSessions });
    }
    
    const { entitlement } = validation;

    const config = await getEffectiveConfig(sport.slug);

    // Get full entitlement with activeMemberships (validateCheckIn only returns baseEntitlement)
    const fullEntitlement = await calculateEntitlement(req.user.userId);

    // Find the membership that actually grants access to this sport
    let matchingMembership = null;
    if (fullEntitlement && fullEntitlement.activeMemberships) {
      matchingMembership = fullEntitlement.activeMemberships.find(m => {
        const plan = m.planId;
        if (!plan) return false;
        if (plan.isAllServices) return true;
        const includedKeys = (plan.sportsIncluded || []).map(s => (s || '').trim().toLowerCase());
        return includedKeys.some(k => k === 'all' || k === 'all-services' || k === sport.slug || k === sport.name.toLowerCase());
      });
      if (!matchingMembership) matchingMembership = fullEntitlement.activeMemberships[0];
    }

    // Execute writes inside transaction
    const result = await runTransaction(async (session) => {
      const opts = session ? { session } : {};
      
      // Re-check for duplicates inside the transaction to prevent race conditions
      if (!entitlement.isAllServices) {
        const existing = await Attendance.findOne({ 
          userId: req.user.userId, 
          sport: { $regex: new RegExp(`^${sport.name}$`, 'i') }, 
          checkOutTime: null, 
          sessionStatus: 'Active' 
        }, null, opts);
        
        if (existing) {
          throw new Error(`You already have an active session for ${sport.name}. Please check out first.`);
        }
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let allowedDurationMinutes = config.allowedDurationMinutes;
      let hourlyRateAtCheckIn = sport.hourlyPrice || 0;
      let relatedBookingId = matchingMembership?._id || null;
      let relatedBookingType = 'membership';
      let membershipPlanSnapshot = matchingMembership?.planId?.name || null;
      let currentSessionConfig = config;

      if (validation.entitlementSource === 'one-time-play') {
        const pass = validation.matchingPass;
        allowedDurationMinutes = pass.allowedDurationMinutes || 60;
        hourlyRateAtCheckIn = pass.hourlyRateSnapshot || 0;
        relatedBookingId = pass._id;
        relatedBookingType = 'one-time-play';
        membershipPlanSnapshot = '1 Hour Flexible Access Pass';
        currentSessionConfig = {
          allowedDurationMinutes: pass.allowedDurationMinutes || 60,
          overtimeThresholdMinutes: 0,
          lateFeePerMinute: pass.lateFeePerMinuteSnapshot || 0,
          configVersionSnapshot: 1
        };
      }

      const [attendance] = await Attendance.create([{
        userId: req.user.userId,
        date: today,
        checkInTime: new Date(),
        status: 'present',
        sessionStatus: 'Active',
        allowedDurationMinutes,
        hourlyRateAtCheckIn,
        feeCollectionStatus: 'Not Applicable',
        checkInMethod: 'qr-scan',
        sport: sport.name,
        sportId: sport._id,
        entitlementType: entitlement.entitlementType,
        currentSessionConfig,
        configVersionSnapshot: currentSessionConfig.configVersion || 1,
        sportNameSnapshot: sport.name,
        membershipPlanSnapshot,
        relatedBookingId,
        relatedBookingType
      }], opts);

      if (validation.entitlementSource === 'one-time-play') {
        const OneTimeAccess = require('../models/OneTimeAccess');
        await OneTimeAccess.findByIdAndUpdate(validation.matchingPass._id, {
          accessStatus: 'active',
          usedAt: new Date(),
          attendanceId: attendance._id
        }, opts);
      }

      sport.activeOccupancy = (sport.activeOccupancy || 0) + 1;
      await sport.save(opts);

      return attendance;
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('attendance:check-in', { userId: req.user.userId, sport: sport.name, attendanceId: result._id, timestamp: result.checkInTime });
      io.to(`user:${req.user.userId}`).emit('session:started', { attendance: result });
      io.emit('dashboard:refresh');
    }

    res.json({ success: true, message: 'Checked In Successfully', attendance: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    checkInLocks.delete(lockKey);
  }
};

// POST /api/sports/entry-checkout/:qrSlug - Check out user via QR code
exports.entryCheckOut = async (req, res) => {
  try {
    const sport = await Sport.findOne({ $or: [{ qrSlug: req.params.qrSlug }, { slug: req.params.qrSlug }] });
    if (!sport || sport.deletedAt) return res.status(404).json({ success: false, message: 'Invalid QR code.' });

    const attendance = await Attendance.findOne({
      userId: req.user.userId,
      sport: sport.name,
      checkOutTime: null,
      sessionStatus: 'Active'
    });

    if (!attendance) {
      const wrongSportAttendance = await Attendance.findOne({
        userId: req.user.userId,
        checkOutTime: null,
        sessionStatus: 'Active'
      });
      
      if (wrongSportAttendance) {
        return res.status(400).json({ 
          success: false, 
          message: `Wrong QR Code! You are currently checked in for ${wrongSportAttendance.sport}. Please scan the ${wrongSportAttendance.sport} QR to check out.` 
        });
      }
      return res.status(404).json({ success: false, message: 'No active check-in session found for this sport.' });
    }

    // Rule 13: Checkout constraints
    // A. Throttling: recent scan activity (within 30 seconds of checkInTime)
    const scanThrottlingWindow = 30 * 1000;
    if (Date.now() - new Date(attendance.checkInTime).getTime() < scanThrottlingWindow) {
      return res.status(400).json({
        success: false,
        message: 'Recent check-in detected. Please wait at least 30 seconds before checking out to prevent accidental exit.'
      });
    }

    // B. Manual hold state check
    const membership = await Membership.findOne({ studentId: req.user.userId, status: 'frozen' });
    if (membership) {
      return res.status(400).json({
        success: false,
        message: 'Your membership is currently on manual hold (frozen). Checkout is blocked.'
      });
    }

    // C. Active booking extension check
    const activeBookingExtension = await SlotBooking.findOne({
      userId: req.user.userId,
      status: 'checked-in',
      notes: { $regex: /extended|extension/i }
    });
    if (activeBookingExtension) {
      return res.status(400).json({
        success: false,
        message: 'You have an active booking extension. Checkout is restricted until the extension is completed.'
      });
    }

    // Execute writes inside transaction
    const result = await runTransaction(async (session) => {
      const opts = session ? { session } : {};
      
      const checkoutAt = new Date();
      applySessionCheckout(attendance, {
        checkOutTime: checkoutAt,
        hourlyPrice: sport.hourlyPrice || 0,
      });
      await attendance.save(opts);

      if (attendance.relatedBookingType === 'one-time-play') {
        const OneTimeAccess = require('../models/OneTimeAccess');
        await OneTimeAccess.findByIdAndUpdate(attendance.relatedBookingId, {
          accessStatus: 'completed'
        }, opts);
      }

      sport.activeOccupancy = Math.max(0, (sport.activeOccupancy || 0) - 1);
      await sport.save(opts);

      return attendance;
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('attendance:check-out', {
        userId: req.user.userId,
        sport: sport.name,
        attendanceId: result._id,
        timestamp: result.checkOutTime,
        overtimeMinutes: result.overtimeMinutes || 0,
        lateAmount: result.lateAmount || 0
      });
      if ((result.lateAmount || 0) > 0) {
        io.emit('session:overtime', {
          userId: req.user.userId,
          sport: sport.name,
          attendanceId: result._id,
          overtimeMinutes: result.overtimeMinutes,
          lateAmount: result.lateAmount
        });
      }
      io.to(`user:${req.user.userId}`).emit('session:ended', { attendance: result });
      io.emit('dashboard:refresh');
    }

    res.json({ success: true, message: 'Check-out successful!', attendance: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/sports/entry-pay-instant/:qrSlug - Prepare Razorpay order for instant walk-in payment
exports.entryPayInstant = async (req, res) => {
  try {
    const sport = await Sport.findOne({ $or: [{ qrSlug: req.params.qrSlug }, { slug: req.params.qrSlug }] });
    if (!sport || sport.deletedAt) return res.status(404).json({ success: false, message: 'Invalid QR code.' });

    const activeCheckIn = await Attendance.findOne({
      userId: req.user.userId,
      sport: sport.name,
      checkOutTime: null
    });
    if (activeCheckIn) {
      return res.status(409).json({ success: false, message: 'Active session already exists. Please check out first.', activeCheckIn });
    }

    const ratePerHour = sport.hourlyPrice || 0;
    const hours = 1;
    const amount = ratePerHour * hours;
    const gstAmount = Math.round(amount * 0.18 * 100) / 100;
    const totalAmount = amount + gstAmount;

    const { createRazorpayOrder } = require('../config/razorpay');
    
    const rzpOrder = await createRazorpayOrder({
      amount: Math.round(totalAmount * 100), // paise
      currency: 'INR',
      receipt: `OTP_QR_${Date.now()}`
    });

    res.json({
      success: true,
      rzpOrder: {
        id: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency
      },
      amount,
      gstAmount,
      totalAmount,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('entryPayInstant error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/sports/entry-pay-verify/:qrSlug - Verify Razorpay instant payment and perform check-in
exports.entryPayVerify = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, customerDetails = {} } = req.body;
    const sport = await Sport.findOne({ $or: [{ qrSlug: req.params.qrSlug }, { slug: req.params.qrSlug }] });
    if (!sport) return res.status(404).json({ success: false, message: 'Sport not found' });

    const activeCheckIn = await Attendance.findOne({
      userId: req.user.userId,
      sport: sport.name,
      checkOutTime: null
    });
    if (activeCheckIn) {
      return res.status(409).json({ success: false, message: 'Active session already exists. Please check out first.', activeCheckIn });
    }

    // 1. Verify Payment signature
    const { verifyPaymentSignature, fetchPaymentDetails } = require('../config/razorpay');
    const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) return res.status(400).json({ success: false, message: 'Invalid payment signature' });

    // 2. Fetch payment details from Razorpay
    const paymentDetails = await fetchPaymentDetails(razorpayPaymentId);
    if (paymentDetails.status !== 'captured') {
      return res.status(400).json({ success: false, message: 'Payment not captured by Razorpay' });
    }

    // 3. Idempotency Check using Razorpay Payment ID or Order ID
    const existingPayment = await Payment.findOne({
      $or: [{ razorpayPaymentId }, { razorpayOrderId }],
      status: 'paid'
    });
    if (existingPayment) {
      return res.json({ success: true, message: 'Payment already processed', payment: existingPayment });
    }

    // 4. Calculate prices
    const ratePerHour = sport.hourlyPrice || 0;
    const hours = 1;
    const amount = ratePerHour * hours;
    const gstAmount = Math.round(amount * 0.18 * 100) / 100;
    const totalAmount = amount + gstAmount;

    // 5. Execute critical writes inside a transaction
    const result = await runTransaction(async (session) => {
      const opts = session ? { session } : {};

      // A. Create Payment
      const [payment] = await Payment.create([{
        studentId: req.user.userId,
        customerName: customerDetails.name || req.user.name,
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
        razorpaySignature
      }], opts);

      const User = require('../models/User');
      const user = await User.findById(req.user.userId).session(session);

      // B. Fetch configuration and create OneTimeAccess pass (active status)
      const config = await getEffectiveConfig(sport.slug);
      const validityHours = config.accessValidityHours || 24;
      const expiresAt = new Date(Date.now() + validityHours * 60 * 60 * 1000);
      const lateFeePerMinute = config.lateFeePerMinuteOverride != null
        ? config.lateFeePerMinuteOverride
        : (sport.hourlyPrice || 0) / 60;

      const OneTimeAccess = require('../models/OneTimeAccess');
      const [pass] = await OneTimeAccess.create([{
        userId: user._id,
        sportId: sport._id,
        paymentId: payment._id,
        accessStatus: 'active',
        purchasedAt: new Date(),
        expiresAt,
        usedAt: new Date(),
        allowedDurationMinutes: config.allowedDurationMinutes || 60,
        hourlyRateSnapshot: sport.hourlyPrice || 0,
        lateFeePerMinuteSnapshot: lateFeePerMinute,
      }], opts);

      // C. Create Attendance check-in
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentSessionConfig = {
        allowedDurationMinutes: config.allowedDurationMinutes || 60,
        overtimeThresholdMinutes: 0,
        lateFeePerMinute,
        configVersionSnapshot: 1
      };

      const [attendance] = await Attendance.create([{
        userId: user._id,
        date: today,
        checkInTime: new Date(),
        status: 'present',
        sessionStatus: 'Active',
        allowedDurationMinutes: config.allowedDurationMinutes || 60,
        hourlyRateAtCheckIn: sport.hourlyPrice || 0,
        feeCollectionStatus: 'Not Applicable',
        checkInMethod: 'qr-scan',
        sport: sport.name,
        sportId: sport._id,
        entitlementType: 'one-time-play',
        currentSessionConfig,
        configVersionSnapshot: 1,
        sportNameSnapshot: sport.name,
        membershipPlanSnapshot: '1 Hour Flexible Access Pass',
        relatedBookingId: pass._id,
        relatedBookingType: 'one-time-play'
      }], opts);

      // D. Link attendanceId back to the pass
      pass.attendanceId = attendance._id;
      await pass.save(opts);

      // E. Increment Sport cached occupancy
      sport.activeOccupancy = (sport.activeOccupancy || 0) + 1;
      await sport.save(opts);

      return { payment, pass, attendance };
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('attendance:check-in', { userId: req.user.userId, sport: sport.name, attendanceId: result.attendance._id, timestamp: result.attendance.checkInTime });
      io.to(`user:${req.user.userId}`).emit('session:started', { attendance: result.attendance });
      io.emit('dashboard:refresh');
    }

    res.json({ success: true, message: 'One-time access purchase verified and check-in logged!', attendance: result.attendance });
  } catch (error) {
    console.error('entryPayVerify error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/sports/entry-buy-membership/:qrSlug - Prepare Razorpay order for membership purchase
exports.entryBuyMembership = async (req, res) => {
  try {
    const { planId } = req.body;
    const sport = await Sport.findOne({ $or: [{ qrSlug: req.params.qrSlug }, { slug: req.params.qrSlug }] });
    if (!sport || sport.deletedAt) return res.status(404).json({ success: false, message: 'Invalid QR code.' });

    const activeCheckIn = await Attendance.findOne({
      userId: req.user.userId,
      sport: sport.name,
      checkOutTime: null
    });
    if (activeCheckIn) {
      return res.status(409).json({ success: false, message: 'Active session already exists. Please check out first.', activeCheckIn });
    }

    const plan = await MembershipPlan.findById(planId);
    if (!plan) return res.status(404).json({ success: false, message: 'Membership plan not found' });

    const { calculateGST } = require('../utils/gstCalculator');
    const gst = calculateGST(plan.price, plan.gstPercent || 18);

    const { createRazorpayOrder } = require('../config/razorpay');

    const rzpOrder = await createRazorpayOrder({
      amount: Math.round(gst.totalAmount * 100), // paise
      currency: 'INR',
      receipt: `MEMB_QR_${Date.now()}`
    });

    res.json({
      success: true,
      rzpOrder: {
        id: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency
      },
      plan,
      totalAmount: gst.totalAmount,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('entryBuyMembership error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/sports/entry-verify-membership/:qrSlug - Verify Razorpay membership payment and check-in
exports.entryVerifyMembership = async (req, res) => {
  try {
    const { planId, razorpayOrderId, razorpayPaymentId, razorpaySignature, customerDetails = {} } = req.body;
    const sport = await Sport.findOne({ $or: [{ qrSlug: req.params.qrSlug }, { slug: req.params.qrSlug }] });
    if (!sport) return res.status(404).json({ success: false, message: 'Sport not found' });

    const activeCheckIn = await Attendance.findOne({
      userId: req.user.userId,
      sport: sport.name,
      checkOutTime: null
    });
    if (activeCheckIn) {
      return res.status(409).json({ success: false, message: 'Active session already exists. Please check out first.', activeCheckIn });
    }

    const plan = await MembershipPlan.findById(planId);
    if (!plan) return res.status(404).json({ success: false, message: 'Membership plan not found' });

    // 1. Verify signature
    const { verifyPaymentSignature, fetchPaymentDetails } = require('../config/razorpay');
    const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) return res.status(400).json({ success: false, message: 'Invalid payment signature' });

    // 2. Fetch payment details
    const paymentDetails = await fetchPaymentDetails(razorpayPaymentId);
    if (paymentDetails.status !== 'captured') {
      return res.status(400).json({ success: false, message: 'Payment not captured by Razorpay' });
    }

    // 3. Idempotency Check
    const existingPayment = await Payment.findOne({
      $or: [{ razorpayPaymentId }, { razorpayOrderId }],
      status: 'paid'
    });
    if (existingPayment) {
      return res.json({ success: true, message: 'Payment already processed', payment: existingPayment });
    }

    const { calculateGST } = require('../utils/gstCalculator');
    const gst = calculateGST(plan.price, plan.gstPercent || 18);

    const getDurationMs = (p) => {
      const val = p.durationValue || 1;
      const unit = p.durationUnit || 'months';
      if (unit === 'years') return val * 365 * 24 * 60 * 60 * 1000;
      return val * 30 * 24 * 60 * 60 * 1000; // default months
    };

    // 4. Execute inside a transaction
    const result = await runTransaction(async (session) => {
      const opts = session ? { session } : {};

      // A. Create Payment
      const [payment] = await Payment.create([{
        studentId: req.user.userId,
        customerName: customerDetails.name || req.user.name,
        type: 'membership',
        referenceId: plan._id,
        amount: gst.amount,
        gstAmount: gst.gstAmount,
        gstPercent: gst.gstPercent,
        totalAmount: gst.totalAmount,
        amountPaid: gst.totalAmount,
        remainingAmount: 0,
        status: 'paid',
        paymentMode: 'razorpay',
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      }], opts);

      // B. Create Membership
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + getDurationMs(plan));
      const [membership] = await Membership.create([{
        studentId: req.user.userId,
        planId: plan._id,
        startDate,
        endDate,
        status: 'active',
        paymentId: payment._id
      }], opts);

      // C. Create Attendance
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [attendance] = await Attendance.create([{
        userId: req.user.userId,
        date: today,
        checkInTime: new Date(),
        status: 'present',
        sessionStatus: 'Active',
        allowedDurationMinutes: DEFAULT_ALLOWED_DURATION_MINUTES,
        hourlyRateAtCheckIn: sport.hourlyPrice || 0,
        feeCollectionStatus: 'Not Applicable',
        checkInMethod: 'qr-scan',
        sport: sport.name,
        relatedBookingId: membership._id,
        relatedBookingType: 'membership'
      }], opts);

      // D. Increment Sport cached occupancy
      sport.activeOccupancy = (sport.activeOccupancy || 0) + 1;
      await sport.save(opts);

      return { payment, membership, attendance };
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('attendance:check-in', { userId: req.user.userId, sport: sport.name, attendanceId: result.attendance._id, timestamp: result.attendance.checkInTime });
      io.to(`user:${req.user.userId}`).emit('session:started', { attendance: result.attendance });
      io.emit('dashboard:refresh');
    }

    res.json({ success: true, message: 'Membership purchased and check-in logged!', attendance: result.attendance });
  } catch (error) {
    console.error('entryVerifyMembership error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/sports/:id/regenerate-qr - Regenerate a sport's qrSlug (Super Admin)
exports.regenerateQR = async (req, res) => {
  try {
    const sport = await Sport.findById(req.params.id);
    if (!sport || sport.deletedAt) return res.status(404).json({ success: false, message: 'Sport not found' });

    sport.qrSlug = require('crypto').randomBytes(16).toString('hex');
    await sport.save();

    const QRCode = require('qrcode');
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const qrUrl = `${clientUrl}/entry/${sport.qrSlug}`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl);

    res.json({
      success: true,
      message: 'QR code regenerated successfully!',
      sport: {
        ...sport.toObject(),
        qrCodeDataUrl
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
