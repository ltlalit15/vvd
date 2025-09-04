const express = require('express');
const { 
  getAllUsers, 
  getUserById, 
  updateUser, 
  deleteUser, 
  activateUser 
} = require('../controller/userController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateRequest, userSchemas } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all users (Admin only)
router.get('/', authorizeRoles('Admin'), getAllUsers);

// Get user by ID
router.get('/:id', getUserById);

// Update user
router.put('/:id', validateRequest(userSchemas.updateProfile), updateUser);

// Delete user (Admin only)
router.delete('/:id', authorizeRoles('Admin'), deleteUser);

// Activate user (Admin only)
router.patch('/:id/activate', authorizeRoles('Admin'), activateUser);

module.exports = router;