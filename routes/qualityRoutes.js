const express = require('express');
const { 
  createInspection, 
  getAllInspections, 
  updateInspection 
} = require('../controller/qualityController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all inspections
router.get('/inspections', getAllInspections);

// Create inspection (Admin, ProjectManager, Quality)
router.post('/inspections', 
  authorizeRoles('Admin', 'ProjectManager', 'Quality'), 
  createInspection
);

// Update inspection
router.put('/inspections/:id', 
  authorizeRoles('Admin', 'ProjectManager', 'Quality'), 
  updateInspection
);

module.exports = router;