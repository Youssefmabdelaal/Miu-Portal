const Student = require('../models/Student');
const { AppError } = require('../middleware/errorHandler');

const DEFAULT_AVATAR = '/images/default-avatar.svg';

const updateProfile = async (req, res, next) => {
  try {
    const studentId = req.session.user.id;
    const { name, password } = req.body;

    const student = await Student.findById(studentId).select('+password');
    if (!student) {
      throw new AppError('Student not found', 404);
    }

    if (name) {
      student.name = name.trim();
    }

    if (password) {
      if (password.length < 8) {
        throw new AppError('Password must be at least 8 characters', 400);
      }
      student.password = password;
    }

    await student.save();

    req.session.user.name = student.name;

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        user: {
          id: student._id.toString(),
          name: student.name,
          email: student.email,
          profileImage: DEFAULT_AVATAR,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const student = await Student.findById(req.session.user.id);
    if (!student) {
      throw new AppError('Student not found', 404);
    }

    res.json({
      success: true,
      data: {
        user: {
          id: student._id.toString(),
          name: student.name,
          email: student.email,
          studentId: student.studentId,
          department: student.department,
          profileImage: DEFAULT_AVATAR,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { updateProfile, getProfile };
