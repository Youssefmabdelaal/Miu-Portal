const express = require('express');
const {
  registerStudent,
  loginStudent,
  registerAdmin,
  loginAdmin,
  login,
  logout,
  getMe,
} = require('../controllers/authController');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

router.post('/student/register', registerStudent);
router.post('/student/login', loginStudent);
router.post('/admin/register', registerAdmin);
router.post('/admin/login', loginAdmin);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', isAuthenticated, getMe);

module.exports = router;
