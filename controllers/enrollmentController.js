const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const Student = require('../models/Student');
const { AppError } = require('../middleware/errorHandler');
const { MAX_COURSES } = require('./authController');
const { mapCourseForFrontend } = require('./courseController');

const restoreSeat = async (courseId) => {
  await Course.findByIdAndUpdate(courseId, { $inc: { availableSeats: 1 } });
};

const enrollInCourse = async (req, res, next) => {
  let seatReserved = false;
  let courseId;

  try {
    const studentId = req.session.user.id;
    courseId = req.body.courseId;

    if (!courseId) {
      throw new AppError('Course ID is required', 400);
    }

    const activeCount = await Enrollment.countDocuments({
      student: studentId,
      status: 'enrolled',
    });

    if (activeCount >= MAX_COURSES) {
      throw new AppError(
        'You have reached the maximum course limit of 5 courses. Please drop a course before registering for another.',
        400
      );
    }

    const alreadyEnrolled = await Enrollment.findOne({
      student: studentId,
      course: courseId,
      status: 'enrolled',
    });

    if (alreadyEnrolled) {
      throw new AppError('You are already registered for this course.', 409);
    }

    const student = await Student.findById(studentId);
    if (!student) {
      throw new AppError('Student not found', 404);
    }

    const coursePreview = await Course.findById(courseId);
    if (!coursePreview) {
      throw new AppError('Course not found', 404);
    }

    if (student.department && coursePreview.faculty !== student.department) {
      throw new AppError('This course is not available for your faculty.', 403);
    }

    const course = await Course.findOneAndUpdate(
      { _id: courseId, availableSeats: { $gt: 0 } },
      { $inc: { availableSeats: -1 } },
      { new: true }
    );

    if (!course) {
      throw new AppError('This course is full. No available seats.', 400);
    }

    seatReserved = true;

    let enrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
    });

    if (enrollment) {
      enrollment.status = 'enrolled';
      enrollment.enrollmentDate = new Date();
      await enrollment.save();
    } else {
      enrollment = await Enrollment.create({
        student: studentId,
        course: courseId,
        status: 'enrolled',
      });
    }

    await Student.findByIdAndUpdate(studentId, {
      $addToSet: { enrolledCourses: courseId },
    });

    console.log(`[SUCCESS] Enrollment saved to MongoDB. Student: ${studentId}, Course: ${courseId}`);

    res.status(201).json({
      success: true,
      message: `Successfully registered for ${course.name}!`,
      data: {
        enrollment,
        course: mapCourseForFrontend(course),
      },
    });
  } catch (error) {
    console.error('[ERROR] Failed to save enrollment to MongoDB:', error.message);
    if (seatReserved && courseId) {
      try {
        await restoreSeat(courseId);
      } catch (rollbackError) {
        console.error('Failed to restore seat after enrollment error:', rollbackError.message);
      }
    }
    next(error);
  }
};

const dropCourse = async (req, res, next) => {
  try {
    const studentId = req.session.user.id;
    const { courseId } = req.params;

    const enrollment = await Enrollment.findOneAndDelete({
      student: studentId,
      course: courseId,
      status: 'enrolled',
    });

    if (!enrollment) {
      throw new AppError('You are not enrolled in this course.', 404);
    }

    const course = await Course.findByIdAndUpdate(
      courseId,
      { $inc: { availableSeats: 1 } },
      { new: true }
    );

    await Student.findByIdAndUpdate(studentId, {
      $pull: { enrolledCourses: courseId },
    });

    res.json({
      success: true,
      message: course ? `Successfully dropped ${course.name}.` : 'Course dropped successfully.',
      data: { course: course ? mapCourseForFrontend(course) : null },
    });
  } catch (error) {
    next(error);
  }
};

const getMyEnrollments = async (req, res, next) => {
  try {
    const studentId = req.session.user.id;

    const enrollments = await Enrollment.find({
      student: studentId,
      status: 'enrolled',
    }).populate('course');

    const courses = enrollments
      .filter((e) => e.course)
      .map((e) => mapCourseForFrontend(e.course));

    res.json({
      success: true,
      data: { enrollments, courses },
    });
  } catch (error) {
    next(error);
  }
};

const getBillingSummary = async (req, res, next) => {
  try {
    const studentId = req.session.user.id;

    const enrollments = await Enrollment.find({
      student: studentId,
      status: 'enrolled',
      paymentStatus: 'pending',
    }).populate('course');

    const items = enrollments
      .filter((e) => e.course)
      .map((e) => ({
        courseId: e.course._id.toString(),
        courseCode: e.course.code,
        courseName: e.course.name,
        instructor: e.course.instructor || '',
        fee: e.course.fee != null ? e.course.fee : 0,
      }));

    const total = items.reduce((sum, item) => sum + item.fee, 0);

    res.json({
      success: true,
      data: { items, total },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { enrollInCourse, dropCourse, getMyEnrollments, getBillingSummary };
