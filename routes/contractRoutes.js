const express = require('express');
const { 
  createContract, 
  getAllContracts, 
  getContractById, 
  updateContract, 
  deleteContract 
} = require('../controller/contractController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all contracts
router.get('/', getAllContracts);

// Get contract by ID
router.get('/:id', getContractById);

// Create contract (Admin, ProjectManager only)
router.post('/', authorizeRoles('Admin', 'ProjectManager'), createContract);

// Update contract
router.put('/:id', authorizeRoles('Admin', 'ProjectManager'), updateContract);

// Delete contract (Admin only)
router.delete('/:id', authorizeRoles('Admin'), deleteContract);

module.exports = router;