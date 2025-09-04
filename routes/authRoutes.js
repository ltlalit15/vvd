const express = require('express');
const { register, login, getCurrentUser, changePassword } = require('../controller/authController');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest, userSchemas } = require('../middleware/validation');

const router = express.Router();

// Public Routes
router.post('/register', validateRequest(userSchemas.register), register);
router.post('/login', validateRequest(userSchemas.login), login);

// Protected Routes
router.get('/me', authenticateToken, getCurrentUser);
router.post('/change-password', authenticateToken, changePassword);

module.exports = router;