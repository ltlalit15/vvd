const express = require('express');
const { 
  generateProjectSummaryReport, 
  generateFinancialReport, 
  generateTaskProgressReport, 
  generateQualityReport 
} = require('../controller/reportController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Generate project summary report
router.get('/project-summary', generateProjectSummaryReport);

// Generate financial report
router.get('/financial', generateFinancialReport);

// Generate task progress report
router.get('/task-progress', generateTaskProgressReport);

// Generate quality & HSE report
router.get('/quality', generateQualityReport);

module.exports = router;