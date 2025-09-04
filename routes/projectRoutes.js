const express = require('express');
const { 
  createProject, 
  getAllProjects, 
  getProjectById, 
  updateProject, 
  deleteProject, 
  getProjectStats 
} = require('../controller/projectController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateRequest, projectSchemas } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get project statistics
router.get('/stats', getProjectStats);

// Get all projects
router.get('/', getAllProjects);

// Get project by ID
router.get('/:id', getProjectById);

// Create project (Admin, ProjectManager only)
router.post('/', 
  authorizeRoles('Admin', 'ProjectManager'), 
  validateRequest(projectSchemas.create), 
  createProject
);

// Update project
router.put('/:id', 
  authorizeRoles('Admin', 'ProjectManager'), 
  validateRequest(projectSchemas.update), 
  updateProject
);

// Delete project (Admin only)
router.delete('/:id', authorizeRoles('Admin'), deleteProject);

module.exports = router;