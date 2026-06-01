const express = require('express');
const {
  getAdminStats,
  createCourse,
  getAdminCourses,
  updateCourse,
  deleteCourse,
  getEnrollments,
  adminDropEnrollment,
  getStudents,
  updateStudentGpa,
  deleteStudent,
} = require('../controllers/adminController');
const { isAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(isAdmin);

router.get('/stats', getAdminStats);
router.get('/courses', getAdminCourses);
router.post('/courses', createCourse);
router.put('/courses/:id', updateCourse);
router.delete('/courses/:id', deleteCourse);
router.get('/enrollments', getEnrollments);
router.delete('/enrollments/:id', adminDropEnrollment);
router.get('/students', getStudents);
router.patch('/students/:id/gpa', updateStudentGpa);
router.delete('/students/:id', deleteStudent);

module.exports = router;
