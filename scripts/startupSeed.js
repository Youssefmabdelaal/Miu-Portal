/**
 * Seed default admin and sample courses when the database is empty.
 */
const Admin = require('../models/Admin');
const Course = require('../models/Course');

const DEFAULT_ADMIN = {
  name: 'Administrator',
  email: 'admin@smartuniversity.com',
  password: 'Admin123!',
  permissions: ['manage_courses', 'view_enrollments', 'super_admin'],
};

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

/**
 * Run idempotent seed for admin account and demo courses.
 */
async function startupSeed() {
  const adminExists = await Admin.findOne({ email: DEFAULT_ADMIN.email });
  if (!adminExists) {
    await Admin.create(DEFAULT_ADMIN);
    console.log('Seeded default admin: admin@smartuniversity.com / Admin123!');
  }

  for (const course of SAMPLE_COURSES) {
    const exists = await Course.findOne({ code: course.code });
    if (!exists) {
      await Course.create(course);
      console.log(`Seeded course: ${course.code}`);
    } else if (exists.fee == null || exists.fee === 0) {
      exists.fee = course.fee;
      await exists.save();
      console.log(`Updated fee for course: ${course.code}`);
    }
  }
}

module.exports = startupSeed;
