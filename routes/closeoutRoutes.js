const express = require('express');
const { 
  createCloseout, 
  getAllCloseouts, 
  updateCloseout 
} = require('../controller/closeoutController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all closeouts
router.get('/', getAllCloseouts);

// Create closeout (Admin, ProjectManager only)
router.post('/', authorizeRoles('Admin', 'ProjectManager'), createCloseout);

// Update closeout
router.put('/:id', authorizeRoles('Admin', 'ProjectManager'), updateCloseout);

module.exports = router;