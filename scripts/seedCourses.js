/**
 * Seed sample courses for first-run demo.
 * Run: npm run seed:courses
 */
require('dotenv').config();
const connectDB = require('../config/db');
const Course = require('../models/Course');

const SAMPLE_COURSES = [
  {
    name: 'Introduction to Computer Science',
    code: 'CS101',
    instructor: 'Dr. Sarah Chen',
    description: 'Fundamentals of programming, algorithms, and computational thinking.',
    schedule: 'Mon/Wed 10:00 AM - 11:30 AM',
    room: 'Hall A-204',
    creditHours: 3,
    capacity: 30,
    availableSeats: 30,
    fee: 450,
  },
  {
    name: 'Data Structures and Algorithms',
    code: 'CS201',
    instructor: 'Prof. James Wilson',
    description: 'Arrays, trees, graphs, sorting, and algorithm analysis.',
    schedule: 'Tue/Thu 1:00 PM - 2:30 PM',
    room: 'Lab B-112',
    creditHours: 4,
    capacity: 25,
    availableSeats: 25,
    fee: 520,
  },
  {
    name: 'Database Systems',
    code: 'CS301',
    instructor: 'Dr. Emily Rodriguez',
    description: 'Relational databases, SQL, normalization, and MongoDB basics.',
    schedule: 'Mon/Wed/Fri 9:00 AM - 10:00 AM',
    room: 'Hall C-301',
    creditHours: 3,
    capacity: 35,
    availableSeats: 35,
    fee: 480,
  },
  {
    name: 'Web Development',
    code: 'CS350',
    instructor: 'Prof. Michael Brown',
    description: 'HTML, CSS, JavaScript, Node.js, and REST API design.',
    schedule: 'Tue/Thu 3:00 PM - 4:30 PM',
    room: 'Lab D-105',
    creditHours: 3,
    capacity: 28,
    availableSeats: 28,
    fee: 500,
  },
];

async function seedCourses() {
  try {
    await connectDB();

    for (const course of SAMPLE_COURSES) {
      const exists = await Course.findOne({ code: course.code });
      if (exists) {
        if (exists.fee == null || exists.fee === 0) {
          exists.fee = course.fee;
          await exists.save();
          console.log(`Updated fee for course: ${course.code}`);
        } else {
          console.log(`Course ${course.code} already exists — skipped`);
        }
      } else {
        await Course.create(course);
        console.log(`Created course: ${course.code} — ${course.name}`);
      }
    }

    console.log('Course seeding complete.');
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  } finally {
    const mongoose = require('mongoose');
    await mongoose.disconnect();
  }
}

seedCourses();
