const Course = require('../models/Course');
const { getFacultyLabel, isValidFaculty } = require('../config/faculties');
const { AppError } = require('../middleware/errorHandler');

const mapCourseForFrontend = (course) => ({
  id: course._id.toString(),
  courseName: course.name,
  courseCode: course.code,
  instructor: course.instructor,
  description: course.description || '',
  schedule: course.schedule,
  room: course.room,
  creditHours: course.creditHours,
  seats: course.availableSeats,
  maxSeats: course.capacity,
  capacity: course.capacity,
  availableSeats: course.availableSeats,
  fee: course.fee != null ? course.fee : 0,
  faculty: course.faculty || '',
  facultyLabel: getFacultyLabel(course.faculty),
  name: course.name,
  code: course.code,
  createdAt: course.createdAt,
});

const getCourses = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const search = (req.query.search || req.query.q || '').trim();
    const instructor = (req.query.instructor || '').trim();
    const hasSeats = req.query.hasSeats;

    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { instructor: { $regex: search, $options: 'i' } },
      ];
    }

    if (instructor) {
      filter.instructor = { $regex: instructor, $options: 'i' };
    }

    if (hasSeats === 'true') {
      filter.availableSeats = { $gt: 0 };
    }

    let studentFaculty = null;
    const sessionUser = req.session?.user;
    if (sessionUser?.role === 'student') {
      studentFaculty = (sessionUser.department || '').trim();
      if (studentFaculty && isValidFaculty(studentFaculty)) {
        filter.faculty = studentFaculty;
      } else {
        filter.faculty = { $in: [] };
      }
    }

    const [courses, total] = await Promise.all([
      Course.find(filter).sort({ code: 1 }).skip(skip).limit(limit),
      Course.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        courses: courses.map(mapCourseForFrontend),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        facultyFilter: studentFaculty
          ? { code: studentFaculty, label: getFacultyLabel(studentFaculty) }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getCourseById = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const sessionUser = req.session?.user;
    if (
      sessionUser?.role === 'student' &&
      sessionUser.department &&
      course.faculty !== sessionUser.department
    ) {
      throw new AppError('This course is not available for your faculty.', 403);
    }

    res.json({
      success: true,
      data: { course: mapCourseForFrontend(course) },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCourses, getCourseById, mapCourseForFrontend };
