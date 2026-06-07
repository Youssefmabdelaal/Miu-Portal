const express = require('express');
const { updateProfile, getProfile } = require('../controllers/profileController');
const { isStudent } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(isStudent);

router.get('/', getProfile);
router.put('/', upload.single('profileImage'), updateProfile);

module.exports = router;
