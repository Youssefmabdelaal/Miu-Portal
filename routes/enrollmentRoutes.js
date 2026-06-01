const express = require('express');
const {
  enrollInCourse,
  dropCourse,
  getMyEnrollments,
  getBillingSummary,
} = require('../controllers/enrollmentController');
const { isStudent } = require('../middleware/auth');

const router = express.Router();

router.use(isStudent);

router.get('/', getMyEnrollments);
router.get('/billing', getBillingSummary);
router.post('/', enrollInCourse);
router.delete('/:courseId', dropCourse);

module.exports = router;
