const express = require('express');
const { 
  createResource, 
  getAllResources, 
  getResourceById, 
  updateResource, 
  deleteResource 
} = require('../controller/resourceController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all resources
router.get('/', getAllResources);

// Get resource by ID
router.get('/:id', getResourceById);

// Create resource (Admin, ProjectManager only)
router.post('/', authorizeRoles('Admin', 'ProjectManager'), createResource);

// Update resource
router.put('/:id', authorizeRoles('Admin', 'ProjectManager'), updateResource);

// Delete resource (Admin only)
router.delete('/:id', authorizeRoles('Admin'), deleteResource);

module.exports = router;