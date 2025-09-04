const express = require('express');
const { 
  createRFQ, 
  getAllRFQs, 
  getRFQById, 
  updateRFQ, 
  deleteRFQ 
} = require('../controller/rfqController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateRequest, rfqSchemas } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all RFQs
router.get('/', getAllRFQs);

// Get RFQ by ID
router.get('/:id', getRFQById);

// Create RFQ (Admin, ProjectManager only)
router.post('/', 
  authorizeRoles('Admin', 'ProjectManager'), 
  validateRequest(rfqSchemas.create), 
  createRFQ
);

// Update RFQ
router.put('/:id', 
  authorizeRoles('Admin', 'ProjectManager'), 
  validateRequest(rfqSchemas.update), 
  updateRFQ
);

// Delete RFQ (Admin only)
router.delete('/:id', authorizeRoles('Admin'), deleteRFQ);

module.exports = router;