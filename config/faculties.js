const FACULTIES = [
  { value: 'cs', label: 'Computer Science' },
  { value: 'eng', label: 'Engineering' },
  { value: 'bus', label: 'Business Administration' },
  { value: 'arts', label: 'Liberal Arts' },
  { value: 'sci', label: 'Natural Sciences' },
];

const FACULTY_CODES = FACULTIES.map((f) => f.value);

function getFacultyLabel(value) {
  const faculty = FACULTIES.find((f) => f.value === value);
  return faculty ? faculty.label : value || '—';
}

function isValidFaculty(value) {
  return FACULTY_CODES.includes(value);
}

module.exports = { FACULTIES, FACULTY_CODES, getFacultyLabel, isValidFaculty };
