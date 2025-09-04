const express = require('express');
const { 
  uploadDrawing, 
  getAllDrawings, 
  updateDrawingStatus 
} = require('../controller/designController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all drawings
router.get('/drawings', getAllDrawings);

// Upload drawing (Admin, ProjectManager, Designer)
router.post('/drawings/upload', 
  authorizeRoles('Admin', 'ProjectManager', 'Designer'), 
  uploadDrawing
);

// Update drawing status
router.put('/drawings/:id/status', 
  authorizeRoles('Admin', 'ProjectManager', 'Designer'), 
  updateDrawingStatus
);

module.exports = router;