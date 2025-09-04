const express = require('express');
const { 
  createRisk, 
  getAllRisks, 
  updateRisk, 
  deleteRisk 
} = require('../controller/riskController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all risks
router.get('/', getAllRisks);

// Create risk (Admin, ProjectManager only)
router.post('/', authorizeRoles('Admin', 'ProjectManager'), createRisk);

// Update risk
router.put('/:id', authorizeRoles('Admin', 'ProjectManager'), updateRisk);

// Delete risk (Admin only)
router.delete('/:id', authorizeRoles('Admin'), deleteRisk);

module.exports = router;