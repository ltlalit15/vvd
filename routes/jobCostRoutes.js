const express = require('express');
const { 
  createJobCost, 
  getAllJobCosts, 
  updateJobCost 
} = require('../controller/jobCostController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all job costs
router.get('/', getAllJobCosts);

// Create job cost (Admin, ProjectManager, Finance)
router.post('/', 
  authorizeRoles('Admin', 'ProjectManager', 'Finance'), 
  createJobCost
);

// Update job cost
router.put('/:id', 
  authorizeRoles('Admin', 'ProjectManager', 'Finance'), 
  updateJobCost
);

module.exports = router;