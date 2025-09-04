const express = require('express');
const { 
  createInvoice, 
  getAllInvoices, 
  recordPayment, 
  getFinancialSummary 
} = require('../controller/financialController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateRequest, financialSchemas } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get financial summary
router.get('/summary', getFinancialSummary);

// Get all invoices
router.get('/invoices', getAllInvoices);

// Create invoice (Admin, ProjectManager, Finance)
router.post('/invoices', 
  authorizeRoles('Admin', 'ProjectManager', 'Finance'), 
  validateRequest(financialSchemas.createInvoice), 
  createInvoice
);

// Record payment (Admin, Finance)
router.post('/payments', 
  authorizeRoles('Admin', 'Finance'), 
  validateRequest(financialSchemas.recordPayment), 
  recordPayment
);

module.exports = router;