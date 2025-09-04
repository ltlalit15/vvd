const express = require('express');
const { 
  createMaterial, 
  getAllMaterials, 
  updateMaterial, 
  generateGRN 
} = require('../controller/procurementController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all materials
router.get('/materials', getAllMaterials);

// Create material (Admin, ProjectManager, ProcurementOfficer)
router.post('/materials', 
  authorizeRoles('Admin', 'ProjectManager', 'ProcurementOfficer'), 
  createMaterial
);

// Update material
router.put('/materials/:id', 
  authorizeRoles('Admin', 'ProjectManager', 'ProcurementOfficer'), 
  updateMaterial
);

// Generate GRN for material
router.post('/materials/:id/grn', 
  authorizeRoles('Admin', 'ProjectManager', 'ProcurementOfficer'), 
  generateGRN
);

module.exports = router;