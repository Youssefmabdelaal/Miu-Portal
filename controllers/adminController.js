const Course = require('../models/Course');
const Student = require('../models/Student');
const Enrollment = require('../models/Enrollment');
const CashDeposit = require('../models/CashDeposit');
const { AppError } = require('../middleware/errorHandler');
const { mapCourseForFrontend } = require('./courseController');
const { isValidFaculty } = require('../config/faculties');

const getAdminStats = async (req, res, next) => {
  try {
    const [totalCourses, totalStudents] = await Promise.all([
      Course.countDocuments(),
      Student.countDocuments(),
    ]);

    res.json({
      success: true,
      data: { totalCourses, totalStudents },
    });
  } catch (error) {
    next(error);
  }
};

const adminDropEnrollment = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id).populate('course', 'name code');

    if (!enrollment || enrollment.status !== 'enrolled') {
      throw new AppError('Enrollment not found or already dropped', 404);
    }

    const courseId = enrollment.course?._id || enrollment.course;
    const studentId = enrollment.student;

    if (!courseId || !studentId) {
      throw new AppError('Enrollment record is incomplete', 400);
    }

    await Enrollment.findByIdAndDelete(enrollment._id);

    await Course.findByIdAndUpdate(courseId, { $inc: { availableSeats: 1 } });
    await Student.findByIdAndUpdate(studentId, { $pull: { enrolledCourses: courseId } });

    const courseName = enrollment.course?.name || 'Course';

    res.json({
      success: true,
      message: `Student dropped from ${courseName}.`,
    });
  } catch (error) {
    next(error);
  }
};

const deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      throw new AppError('Student not found', 404);
    }

    const enrollments = await Enrollment.find({ student: student._id, status: 'enrolled' });
    for (const enrollment of enrollments) {
      await Course.findByIdAndUpdate(enrollment.course, { $inc: { availableSeats: 1 } });
    }

    await Enrollment.deleteMany({ student: student._id });
    await CashDeposit.deleteMany({ student: student._id });
    await Student.findByIdAndDelete(student._id);

    res.json({
      success: true,
      message: `Student "${student.name}" removed successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

const createCourse = async (req, res, next) => {
  try {
    const {
      name,
      courseName,
      code,
      courseCode,
      instructor,
      description,
      schedule,
      room,
      creditHours,
      availableSeats,
      seats,
      capacity,
      maxSeats,
      fee,
      faculty,
    } = req.body;

    const courseNameVal = (name || courseName || '').trim();
    const codeVal = (code || courseCode || '').trim().toUpperCase();
    const facultyVal = (faculty || '').trim();
    const capacityVal = parseInt(capacity || maxSeats || seats, 10);
    const availableVal =
      availableSeats != null
        ? parseInt(availableSeats, 10)
        : seats != null
          ? parseInt(seats, 10)
          : capacityVal;

    if (!courseNameVal || !codeVal || !instructor || !schedule || !room) {
      throw new AppError('All required course fields must be provided', 400);
    }

    if (!facultyVal || !isValidFaculty(facultyVal)) {
      throw new AppError('A valid faculty must be selected', 400);
    }

    if (!('fee' in req.body) || fee === '' || fee == null) {
      throw new AppError('A valid course fee (0 or greater) is required', 400);
    }
    const feeVal = parseFloat(fee);
    if (Number.isNaN(feeVal) || feeVal < 0) {
      throw new AppError('A valid course fee (0 or greater) is required', 400);
    }

    const course = await Course.create({
      name: courseNameVal,
      code: codeVal,
      instructor: instructor.trim(),
      description: description || '',
      schedule: schedule.trim(),
      room: room.trim(),
      creditHours: parseInt(creditHours, 10) || 3,
      capacity: capacityVal,
      availableSeats: availableVal,
      fee: feeVal,
      faculty: facultyVal,
    });

    res.status(201).json({
      success: true,
      message: `Course "${course.name}" created successfully`,
      data: { course: mapCourseForFrontend(course) },
    });
  } catch (error) {
    next(error);
  }
};

const getAdminCourses = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;
    const search = (req.query.search || '').trim();

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { instructor: { $regex: search, $options: 'i' } },
        { faculty: { $regex: search, $options: 'i' } },
      ];
    }

    const faculty = (req.query.faculty || '').trim();
    if (faculty) {
      filter.faculty = faculty;
    }

    const [courses, total] = await Promise.all([
      Course.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Course.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        courses: courses.map(mapCourseForFrontend),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateCourse = async (req, res, next) => {
  try {
    const {
      name,
      courseName,
      code,
      courseCode,
      instructor,
      description,
      schedule,
      room,
      creditHours,
      availableSeats,
      seats,
      capacity,
      maxSeats,
      fee,
      faculty,
    } = req.body;

    const existing = await Course.findById(req.params.id);
    if (!existing) {
      throw new AppError('Course not found', 404);
    }

    const updates = {};

    if (name || courseName) updates.name = (name || courseName).trim();
    if (code || courseCode) updates.code = (code || courseCode).trim().toUpperCase();
    if (instructor) updates.instructor = instructor.trim();
    if (description !== undefined) updates.description = description;
    if (schedule) updates.schedule = schedule.trim();
    if (room) updates.room = room.trim();
    if (creditHours != null && creditHours !== '') {
      updates.creditHours = parseInt(creditHours, 10);
    }

    if (capacity != null || maxSeats != null) {
      updates.capacity = parseInt(capacity ?? maxSeats, 10);
    }

    if (availableSeats != null || seats != null) {
      updates.availableSeats = parseInt(availableSeats ?? seats, 10);
    }

    if ('fee' in req.body) {
      const feeVal = parseFloat(fee);
      if (Number.isNaN(feeVal) || feeVal < 0) {
        throw new AppError('Course fee must be zero or greater', 400);
      }
      updates.fee = feeVal;
    }

    if (faculty !== undefined) {
      const facultyVal = String(faculty).trim();
      if (!facultyVal || !isValidFaculty(facultyVal)) {
        throw new AppError('A valid faculty must be selected', 400);
      }
      updates.faculty = facultyVal;
    }

    const nextCapacity = updates.capacity ?? existing.capacity;
    const nextSeats = updates.availableSeats ?? existing.availableSeats;
    if (nextSeats > nextCapacity) {
      throw new AppError('Available seats cannot exceed capacity', 400);
    }

    const course = await Course.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: `Course "${course.name}" updated successfully`,
      data: { course: mapCourseForFrontend(course) },
    });
  } catch (error) {
    next(error);
  }
};

const deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    await Enrollment.deleteMany({ course: req.params.id });

    res.json({
      success: true,
      message: 'Course deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

const getEnrollments = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const [enrollments, total] = await Promise.all([
      Enrollment.find({ status: 'enrolled' })
        .populate('student', 'name email studentId department')
        .populate('course', 'name code instructor schedule room creditHours')
        .sort({ enrollmentDate: -1 })
        .skip(skip)
        .limit(limit),
      Enrollment.countDocuments({ status: 'enrolled' }),
    ]);

    res.json({
      success: true,
      data: {
        enrollments: enrollments.map((e) => ({
          id: e._id.toString(),
          status: e.status,
          enrollmentDate: e.enrollmentDate,
          student: e.student
            ? {
                id: e.student._id.toString(),
                name: e.student.name,
                email: e.student.email,
                studentId: e.student.studentId || '—',
              }
            : null,
          course: e.course
            ? {
                id: e.course._id.toString(),
                code: e.course.code,
                name: e.course.name,
                instructor: e.course.instructor,
                fee: e.course.fee != null ? e.course.fee : 0,
              }
            : null,
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

const getStudents = async (req, res, next) => {
  try {
    const students = await Student.find()
      .select('name email studentId gpa showGpa')
      .sort({ name: 1 })
      .lean();

    res.json({
      success: true,
      data: {
        students: students.map((s) => ({
          id: s._id.toString(),
          name: s.name,
          email: s.email,
          studentId: s.studentId || '—',
          gpa: s.gpa,
          showGpa: Boolean(s.showGpa),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateStudentGpa = async (req, res, next) => {
  try {
    const { gpa, showGpa } = req.body;
    const student = await Student.findById(req.params.id);

    if (!student) {
      throw new AppError('Student not found', 404);
    }

    if (gpa !== undefined && gpa !== null && gpa !== '') {
      const gpaVal = parseFloat(gpa);
      if (Number.isNaN(gpaVal) || gpaVal < 0 || gpaVal > 4) {
        throw new AppError('GPA must be a number between 0 and 4.0', 400);
      }
      student.gpa = Math.round(gpaVal * 100) / 100;
    } else {
      student.gpa = null;
    }

    if (showGpa !== undefined) {
      student.showGpa = Boolean(showGpa);
    }

    await student.save();

    res.json({
      success: true,
      message: 'Student GPA settings updated',
      data: {
        student: {
          id: student._id.toString(),
          name: student.name,
          email: student.email,
          studentId: student.studentId || '—',
          gpa: student.gpa,
          showGpa: student.showGpa,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
