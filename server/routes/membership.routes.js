const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const mc = require('../controllers/membership.controller');

// Plans
router.get('/plans', mc.getPlans);
router.post('/plans', auth, authorize('superadmin', 'admin'), mc.createPlan);
router.put('/plans/:id', auth, authorize('superadmin', 'admin'), mc.updatePlan);
router.delete('/plans/:id', auth, authorize('superadmin', 'admin'), mc.deletePlan);

// Memberships
router.get('/memberships/all', auth, authorize('superadmin', 'admin', 'receptionist'), mc.getAllMemberships);
router.get('/memberships/:studentId', auth, mc.getStudentMembership);
router.post('/memberships/assign', auth, authorize('superadmin', 'admin', 'receptionist'), mc.assignMembership);
router.put('/memberships/:id/renew', auth, authorize('superadmin', 'admin', 'receptionist'), mc.renewMembership);
router.put('/memberships/:id/freeze', auth, authorize('superadmin', 'admin'), mc.freezeMembership);
router.put('/memberships/:id/unfreeze', auth, authorize('superadmin', 'admin'), mc.unfreezeMembership);

// QR Check-in Integrations
router.get('/memberships/validate/:id', auth, authorize('superadmin', 'admin', 'receptionist'), mc.validateMembershipQR);
router.post('/memberships/:id/check-in', auth, authorize('superadmin', 'admin', 'receptionist'), mc.checkInMembership);

module.exports = router;
