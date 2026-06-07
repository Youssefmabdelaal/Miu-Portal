const Student = require('../models/Student');
const Admin = require('../models/Admin');
const { AppError } = require('../middleware/errorHandler');
const { getFacultyLabel, isValidFaculty } = require('../config/faculties');

const MAX_COURSES = 5;

/**
 * Build a safe session user object (no password).
 */
const DEFAULT_AVATAR = '/images/default-avatar.svg';

const buildSessionUser = (user, role) => {
  const base = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role,
    studentId: user.studentId || '',
    department: user.department || '',
    departmentLabel: getFacultyLabel(user.department),
    profileImage: DEFAULT_AVATAR,
    permissions: user.permissions || [],
  };

  if (role === 'student') {
    base.gpa = user.gpa != null ? user.gpa : null;
    base.showGpa = Boolean(user.showGpa);
  }

  return base;
};

/**
 * Register a new student account.
 */
const registerStudent = async (req, res, next) => {
  try {
    const { name, email, password, studentId, department } = req.body;

    if (!name || !email || !password) {
      throw new AppError('Name, email, and password are required', 400);
    }

    if (!department || !isValidFaculty(department)) {
      throw new AppError('Please select a valid faculty', 400);
    }

    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters', 400);
    }

    const existingEmail = await Student.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      throw new AppError('This email is already registered. Please log in instead.', 409);
    }

    if (studentId) {
      const existingId = await Student.findOne({ studentId });
      if (existingId) {
        throw new AppError('This Student ID is already registered.', 409);
      }
    }

    const student = await Student.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      studentId: studentId ? studentId.trim() : undefined,
      department: department || '',
    });

    console.log(`[SUCCESS] Student saved to MongoDB. Email: ${student.email}`);

    req.session.user = buildSessionUser(student, 'student');

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user: req.session.user },
    });
  } catch (error) {
    console.error('[ERROR] Failed to save student to MongoDB:', error.message);
    next(error);
  }
};

/**
 * Authenticate a student and create a session.
 */
const loginStudent = async (req, res, next) => {
  try {
    const { email, identifier, password } = req.body;
    const loginId = (identifier || email || '').trim();

    if (!loginId || !password) {
      throw new AppError('Email/Student ID and password are required', 400);
    }

    let student;
    if (loginId.includes('@')) {
      student = await Student.findOne({ email: loginId.toLowerCase() }).select('+password');
    } else {
      student = await Student.findOne({ studentId: loginId }).select('+password');
    }

    if (!student) {
      throw new AppError('Login failed. Check your credentials and try again.', 401);
    }

    const isMatch = await student.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Login failed. Check your credentials and try again.', 401);
    }

    req.session.user = buildSessionUser(student, 'student');

    res.json({
      success: true,
      message: 'Login successful',
      data: { user: req.session.user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Register a new admin account.
 */
const registerAdmin = async (req, res, next) => {
  try {
    const { name, email, password, permissions } = req.body;

    if (!name || !email || !password) {
      throw new AppError('Name, email, and password are required', 400);
    }

    const existing = await Admin.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new AppError('This admin email is already registered.', 409);
    }

    const admin = await Admin.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      permissions: permissions || undefined,
    });

    console.log(`[SUCCESS] Admin saved to MongoDB. Email: ${admin.email}`);

    req.session.user = buildSessionUser(admin, 'admin');

    res.status(201).json({
      success: true,
      message: 'Admin registration successful',
      data: { user: req.session.user },
    });
  } catch (error) {
    console.error('[ERROR] Failed to save admin to MongoDB:', error.message);
    next(error);
  }
};

/**
 * Authenticate an admin and create a session.
 */
const loginAdmin = async (req, res, next) => {
  try {
    const { email, identifier, password } = req.body;
    const loginId = (identifier || email || '').trim();

    if (!loginId || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const admin = await Admin.findOne({ email: loginId.toLowerCase() }).select('+password');

    if (!admin) {
      throw new AppError('Login failed. Check your credentials and try again.', 401);
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Login failed. Check your credentials and try again.', 401);
    }

    req.session.user = buildSessionUser(admin, 'admin');

    res.json({
      success: true,
      message: 'Login successful',
      data: { user: req.session.user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Unified login — tries admin first if email matches admin pattern, else student.
 */
const login = async (req, res, next) => {
  try {
    const { identifier, email, password } = req.body;
    const loginId = (identifier || email || '').trim().toLowerCase();

    if (!loginId || !password) {
      throw new AppError('Email/Student ID and password are required', 400);
    }

    // Try admin login by email
    if (loginId.includes('@')) {
      const admin = await Admin.findOne({ email: loginId }).select('+password');
      if (admin) {
        const isMatch = await admin.comparePassword(password);
        if (isMatch) {
          req.session.user = buildSessionUser(admin, 'admin');
          return res.json({
            success: true,
            message: 'Login successful',
            data: { user: req.session.user },
          });
        }
        throw new AppError('Login failed. Check your credentials and try again.', 401);
      }
    }

    // Fall through to student login
    return loginStudent(req, res, next);
  } catch (error) {
    next(error);
  }
};

/**
 * Destroy the current session (logout).
 */
const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Could not log out. Please try again.',
      });
    }
    res.clearCookie('connect.sid');
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  });
};

/**
 * Return the currently authenticated user from session.
 */
const getMe = async (req, res, next) => {
  try {
    if (!req.session.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { role, id } = req.session.user;
    let user;

    if (role === 'admin') {
      user = await Admin.findById(id);
    } else {
      user = await Student.findById(id).populate('enrolledCourses');
    }

    if (!user) {
      req.session.destroy(() => {});
      throw new AppError('Session expired. Please log in again.', 401);
    }

    const sessionUser = buildSessionUser(user, role);

    if (role === 'student' && user.enrolledCourses) {
      sessionUser.courses = user.enrolledCourses.map((c) => ({
        id: c._id.toString(),
        courseName: c.name,
        courseCode: c.code,
        instructor: c.instructor,
        schedule: c.schedule,
        room: c.room,
        creditHours: c.creditHours,
        fee: c.fee != null ? c.fee : 0,
      }));
      sessionUser.gpa = user.gpa != null ? user.gpa : null;
      sessionUser.showGpa = Boolean(user.showGpa);
    } else {
      sessionUser.courses = [];
    }

    req.session.user = sessionUser;

    res.json({
      success: true,
      data: { user: sessionUser },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerStudent,
  loginStudent,
  registerAdmin,
  loginAdmin,
  login,
  logout,
  getMe,
  MAX_COURSES,
};
