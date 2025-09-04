const express = require('express');
const { 
  createTask, 
  getAllTasks, 
  getTaskById, 
  updateTask, 
  deleteTask 
} = require('../controller/taskController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateRequest, taskSchemas } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all tasks
router.get('/', getAllTasks);

// Get task by ID
router.get('/:id', getTaskById);

// Create task (Admin, ProjectManager only)
router.post('/', 
  authorizeRoles('Admin', 'ProjectManager'), 
  validateRequest(taskSchemas.create), 
  createTask
);

// Update task
router.put('/:id', 
  validateRequest(taskSchemas.update), 
  updateTask
);

// Delete task (Admin, ProjectManager only)
router.delete('/:id', authorizeRoles('Admin', 'ProjectManager'), deleteTask);

module.exports = router;