const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true,
      minlength: [3, 'Course name must be at least 3 characters'],
      maxlength: [100, 'Course name cannot exceed 100 characters'],
    },
    code: {
      type: String,
      required: [true, 'Course code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    instructor: {
      type: String,
      required: [true, 'Instructor is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    schedule: {
      type: String,
      required: [true, 'Schedule is required'],
      trim: true,
    },
    room: {
      type: String,
      required: [true, 'Room is required'],
      trim: true,
    },
    creditHours: {
      type: Number,
      required: [true, 'Credit hours is required'],
      min: [1, 'Credit hours must be at least 1'],
      max: [6, 'Credit hours cannot exceed 6'],
    },
    availableSeats: {
      type: Number,
      required: [true, 'Available seats is required'],
      min: [0, 'Available seats cannot be negative'],
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
    },
    fee: {
      type: Number,
      required: [true, 'Course fee is required'],
      min: [0, 'Course fee cannot be negative'],
      default: 0,
    },
  },
  { timestamps: true }
);

courseSchema.pre('validate', function validateSeats(next) {
  if (this.availableSeats > this.capacity) {
    this.invalidate('availableSeats', 'Available seats cannot exceed capacity');
  }
  next();
});

courseSchema.pre('save', function setDefaultSeats(next) {
  if (this.isNew && this.availableSeats == null) {
    this.availableSeats = this.capacity;
  }
  next();
});

module.exports = mongoose.model('Course', courseSchema);
