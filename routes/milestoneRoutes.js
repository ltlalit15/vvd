const express = require('express');
const { 
  createMilestone, 
  getAllMilestones, 
  updateMilestone, 
  deleteMilestone 
} = require('../controller/milestoneController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all milestones
router.get('/', getAllMilestones);

// Create milestone (Admin, ProjectManager only)
router.post('/', authorizeRoles('Admin', 'ProjectManager'), createMilestone);

// Update milestone
router.put('/:id', authorizeRoles('Admin', 'ProjectManager'), updateMilestone);

// Delete milestone (Admin only)
router.delete('/:id', authorizeRoles('Admin'), deleteMilestone);

module.exports = router;