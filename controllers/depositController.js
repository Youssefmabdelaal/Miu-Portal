const CashDeposit = require('../models/CashDeposit');
const Enrollment = require('../models/Enrollment');
const { AppError } = require('../middleware/errorHandler');

const getEnrollmentBilling = async (studentId) => {
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

  return { items, total };
};

const buildCourseFeesNote = (items, userNote) => {
  const lines = items.map(
    (item) => `${item.courseCode} — ${item.courseName}: $${Number(item.fee).toFixed(2)}`
  );
  const summary = `Course fees: ${lines.join('; ')}`;
  return userNote ? `${userNote.trim()}\n${summary}` : summary;
};

const createDeposit = async (req, res, next) => {
  try {
    const { amount, facultyName, note, payEnrollmentFees } = req.body;
    const studentId = req.session.user.id;

    let amountToCharge = parseFloat(amount);
    let depositNote = note ? String(note).trim() : '';
    let facultyNameVal = facultyName ? String(facultyName).trim() : '';

    if (payEnrollmentFees) {
      const billing = await getEnrollmentBilling(studentId);

      if (billing.items.length === 0) {
        throw new AppError('Register for courses before confirming payment.', 400);
      }

      if (billing.total <= 0) {
        throw new AppError('No course fees are due for your current enrollments.', 400);
      }

      amountToCharge = billing.total;
      facultyNameVal = 'Course registration payment';
      depositNote = buildCourseFeesNote(billing.items, depositNote);
    } else if (!facultyNameVal) {
      throw new AppError('Faculty name is required', 400);
    } else if (!Number.isFinite(amountToCharge) || amountToCharge <= 0) {
      throw new AppError('Enter a valid payment amount greater than zero', 400);
    }

    if (!Number.isFinite(amountToCharge) || amountToCharge <= 0) {
      throw new AppError('Enter a valid payment amount greater than zero', 400);
    }

    const deposit = await CashDeposit.create({
      student: studentId,
      amount: Math.round(amountToCharge * 100) / 100,
      facultyName: facultyNameVal,
      note: depositNote,
    });

    if (payEnrollmentFees) {
      await Enrollment.updateMany(
        { student: studentId, status: 'enrolled', paymentStatus: 'pending' },
        { $set: { paymentStatus: 'paid' } }
      );
    }

    res.status(201).json({
      success: true,
      message: 'Payment confirmed successfully.',
      data: { deposit },
    });
  } catch (error) {
    next(error);
  }
};

const getMyDeposits = async (req, res, next) => {
  try {
    const deposits = await CashDeposit.find({ student: req.session.user.id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { deposits },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createDeposit, getMyDeposits };
