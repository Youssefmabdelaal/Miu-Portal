const express = require('express');
const { createDeposit, getMyDeposits } = require('../controllers/depositController');
const { isStudent } = require('../middleware/auth');

const router = express.Router();

router.use(isStudent);

router.get('/', getMyDeposits);
router.post('/', createDeposit);

module.exports = router;
