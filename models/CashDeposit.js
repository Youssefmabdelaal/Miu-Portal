const mongoose = require('mongoose');

const cashDepositSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Deposit amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
    },
    facultyName: {
      type: String,
      required: [true, 'Faculty name is required'],
      trim: true,
      maxlength: [120, 'Faculty name cannot exceed 120 characters'],
    },
    note: {
      type: String,
      trim: true,
      maxlength: [300, 'Note cannot exceed 300 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CashDeposit', cashDepositSchema);
