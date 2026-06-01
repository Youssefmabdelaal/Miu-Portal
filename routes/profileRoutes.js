const express = require('express');
const { updateProfile, getProfile } = require('../controllers/profileController');
const { isStudent } = require('../middleware/auth');

const router = express.Router();

router.use(isStudent);

router.get('/', getProfile);
router.put('/', updateProfile);

module.exports = router;
