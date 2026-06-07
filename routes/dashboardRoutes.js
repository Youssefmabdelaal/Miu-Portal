const express = require('express');
const { getExternalDashboardData } = require('../controllers/dashboardController');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

router.get('/external', isAuthenticated, getExternalDashboardData);

module.exports = router;
