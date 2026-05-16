const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const pc = require('../controllers/payment.controller');

router.get('/', auth, authorize('superadmin', 'admin', 'receptionist'), pc.getAll);
router.post('/create-order', pc.createOrder);
router.post('/verify', pc.verifyPayment);
router.post('/manual', auth, authorize('superadmin', 'admin', 'receptionist'), pc.manualPayment);
router.post('/webhook/razorpay', pc.webhookHandler);
router.post('/:id/mark-paid', auth, authorize('superadmin', 'admin', 'receptionist'), pc.markPaid);
router.post('/:id/retry', auth, pc.retryPayment);
router.put('/:id/refund', auth, authorize('superadmin', 'admin'), pc.refundPayment);
router.get('/:id/invoice', auth, pc.getInvoice);
router.get('/:id/invoice/print', pc.printInvoice);

module.exports = router;
