
let courses = [];
let currentEditingCourseId = null;
let courseToDelete = null;

document.addEventListener('DOMContentLoaded', async function () {
  const user = await EduRegAPI.requireAuth({ role: 'admin' });
  if (!user) return;

  await loadCoursesFromAPI();
  await loadEnrollmentsFromAPI();
  attachEventListeners();
  renderCoursesTable();
  renderEnrollmentsTable();
  updateStats();
});

function attachEventListeners() {
  document.getElementById('courseForm').addEventListener('submit', handleFormSubmit);
  document.getElementById('resetBtn').addEventListener('click', resetForm);
  document.getElementById('cancelBtn').addEventListener('click', cancelEdit);
  document.getElementById('searchBox').addEventListener('keyup', handleSearch);
  document.getElementById('refreshBtn').addEventListener('click', async function () {
    await loadCoursesFromAPI();
    renderCoursesTable();
    showSuccessMessage('Courses refreshed successfully!');
  });
  document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
  document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);
  document.getElementById('modalOverlay').addEventListener('click', closeDeleteModal);

  const enrollmentsBody = document.getElementById('enrollmentsBody');
  if (enrollmentsBody) {
    enrollmentsBody.addEventListener('click', (e) => {
      const btn = e.target.closest('.drop-enrollment-btn');
      if (!btn) return;
      e.preventDefault();
      const enrollmentId = btn.getAttribute('data-enrollment-id');
      if (enrollmentId) adminDropEnrollment(enrollmentId, btn);
    });
  }

  const logoutBtn = document.querySelector('.logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
}

async function handleLogout(e) {
  e.preventDefault();
  if (confirm('Are you sure you want to logout?')) {
    await EduRegAPI.apiLogout();
    window.location.href = 'login.html';
  }
}

function validateForm() {
  clearFormErrors();
  let isValid = true;

  const courseName = document.getElementById('courseName').value.trim();
  const courseCode = document.getElementById('courseCode').value.trim();
  const instructor = document.getElementById('instructor').value.trim();
  const seats = document.getElementById('seats').value.trim();
  const schedule = document.getElementById('schedule').value.trim();
  const room = document.getElementById('room').value.trim();
  const creditHours = document.getElementById('creditHours').value.trim();
  const fee = document.getElementById('fee').value.trim();

  if (courseName === '') {
    showFieldError('courseName', 'Course name is required');
    isValid = false;
  } else if (courseName.length < 3) {
    showFieldError('courseName', 'Course name must be at least 3 characters');
    isValid = false;
  } else if (courseName.length > 100) {
    showFieldError('courseName', 'Course name cannot exceed 100 characters');
    isValid = false;
  }

  const courseCodeNorm = courseCode.toUpperCase();
  if (courseCode === '') {
    showFieldError('courseCode', 'Course code is required');
    isValid = false;
  } else if (!/^[A-Z]{2,4}\d{3,4}$/.test(courseCodeNorm)) {
    showFieldError('courseCode', 'Invalid format (e.g., CS101). Use 2-4 letters followed by 3-4 digits');
    isValid = false;
  } else if (isCourseDuplicate(courseCodeNorm)) {
    showFieldError('courseCode', 'This course code already exists');
    isValid = false;
  }

  if (instructor === '') {
    showFieldError('instructor', 'Instructor name is required');
    isValid = false;
  } else if (instructor.length < 3) {
    showFieldError('instructor', 'Instructor name must be at least 3 characters');
    isValid = false;
  }

  if (seats === '') {
    showFieldError('seats', 'Available seats is required');
    isValid = false;
  } else if (isNaN(seats) || seats < 1 || seats > 500) {
    showFieldError('seats', 'Seats must be a number between 1 and 500');
    isValid = false;
  }

  if (schedule === '') {
    showFieldError('schedule', 'Schedule is required');
    isValid = false;
  } else if (schedule.length < 5) {
    showFieldError('schedule', 'Please enter a valid schedule');
    isValid = false;
  }

  if (room === '') {
    showFieldError('room', 'Room number is required');
    isValid = false;
  } else if (room.length < 2) {
    showFieldError('room', 'Please enter a room or location (at least 2 characters)');
    isValid = false;
  }

  if (creditHours === '') {
    showFieldError('creditHours', 'Credit hours is required');
    isValid = false;
  } else if (isNaN(creditHours) || creditHours < 1 || creditHours > 4) {
    showFieldError('creditHours', 'Credit hours must be a number between 1 and 4');
    isValid = false;
  }

  if (fee === '') {
    showFieldError('fee', 'Course fee is required');
    isValid = false;
  } else if (isNaN(fee) || parseFloat(fee) < 0) {
    showFieldError('fee', 'Course fee must be zero or greater');
    isValid = false;
  }

  return isValid;
}

function isCourseDuplicate(courseCode) {
  const norm = courseCode.toUpperCase();
  return courses.some(
    (course) => String(course.courseCode || '').toUpperCase() === norm && course.id !== currentEditingCourseId
  );
}

function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const errorElement = document.getElementById(fieldId + 'Error');
  field.parentElement.classList.add('error');
  errorElement.textContent = message;
}

function clearFormErrors() {
  document.querySelectorAll('.form-group').forEach((group) => group.classList.remove('error'));
  document.querySelectorAll('.error-message').forEach((msg) => {
    msg.textContent = '';
  });
}

async function handleFormSubmit(e) {
  e.preventDefault();

  if (!validateForm()) {
    showErrorMessage('Please fix the errors above');
    return;
  }

  const courseData = {
    courseName: document.getElementById('courseName').value.trim(),
    courseCode: document.getElementById('courseCode').value.trim().toUpperCase(),
    instructor: document.getElementById('instructor').value.trim(),
    seats: parseInt(document.getElementById('seats').value, 10),
    capacity: parseInt(document.getElementById('seats').value, 10),
    creditHours: parseInt(document.getElementById('creditHours').value, 10),
    schedule: document.getElementById('schedule').value.trim(),
    room: document.getElementById('room').value.trim(),
    description: document.getElementById('description').value.trim(),
    fee: parseFloat(document.getElementById('fee').value),
  };

  if (currentEditingCourseId) {
    await updateCourse(currentEditingCourseId, courseData);
  } else {
    await addCourse(courseData);
  }
}

async function addCourse(courseData) {
  try {
    const data = await EduRegAPI.apiRequest('/api/admin/courses', {
      method: 'POST',
      body: courseData,
    });

    await loadCoursesFromAPI();
    resetForm();
    renderCoursesTable();
    updateStats();
    showSuccessMessage(`✓ Course "${courseData.courseName}" added successfully!`);
  } catch (error) {
    if (error.status === 401) {
      window.location.href = 'login.html?expired=1';
      return;
    }
    showErrorMessage(error.message || 'Failed to add course.');
  }
}

async function updateCourse(courseId, courseData) {
  try {
    const result = await EduRegAPI.apiRequest(`/api/admin/courses/${courseId}`, {
      method: 'PUT',
      body: courseData,
    });

    await loadCoursesFromAPI();
    cancelEdit();
    renderCoursesTable();
    updateStats();
    const savedFee = result.data?.course?.fee;
    const feeNote =
      savedFee != null ? ` Fee saved: $${Number(savedFee).toFixed(2)}.` : '';
    showSuccessMessage(`✓ Course "${courseData.courseName}" updated successfully!${feeNote}`);
  } catch (error) {
    if (error.status === 401) {
      window.location.href = 'login.html?expired=1';
      return;
    }
    showErrorMessage(error.message || 'Failed to update course.');
  }
}

async function deleteCourse(courseId) {
  try {
    await EduRegAPI.apiRequest(`/api/admin/courses/${courseId}`, {
      method: 'DELETE',
    });

    await loadCoursesFromAPI();
    renderCoursesTable();
    updateStats();
    showSuccessMessage('✓ Course deleted successfully!');
  } catch (error) {
    showErrorMessage(error.message || 'Failed to delete course.');
  }
}

function editCourse(courseId) {
  const course = courses.find((c) => c.id === courseId);
  if (!course) {
    showErrorMessage('Course not found!');
    return;
  }

  currentEditingCourseId = courseId;
  document.getElementById('courseName').value = course.courseName;
  document.getElementById('courseCode').value = course.courseCode;
  document.getElementById('instructor').value = course.instructor;
  document.getElementById('seats').value = course.seats;
  document.getElementById('creditHours').value = course.creditHours || 3;
  document.getElementById('fee').value = course.fee != null ? course.fee : 0;
  document.getElementById('schedule').value = course.schedule;
  document.getElementById('room').value = course.room;
  document.getElementById('description').value = course.description || '';

  document.getElementById('submitBtn').textContent = 'Update Course';
  document.getElementById('submitBtn').classList.add('btn-update');
  document.getElementById('resetBtn').style.display = 'none';
  document.getElementById('cancelBtn').style.display = 'inline-block';
  document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
  document.getElementById('courseName').focus();
}

function cancelEdit() {
  currentEditingCourseId = null;
  resetForm();
  document.getElementById('submitBtn').textContent = 'Add Course';
  document.getElementById('submitBtn').classList.remove('btn-update');
  document.getElementById('resetBtn').style.display = 'inline-block';
  document.getElementById('cancelBtn').style.display = 'none';
}

function showDeleteModal(courseId) {
  const course = courses.find((c) => c.id === courseId);
  if (!course) {
    showErrorMessage('Course not found!');
    return;
  }
  courseToDelete = courseId;
  document.getElementById('deleteModal').style.display = 'flex';
  document.getElementById('confirmDeleteBtn').focus();
}

function closeDeleteModal() {
  document.getElementById('deleteModal').style.display = 'none';
  courseToDelete = null;
}

function confirmDelete() {
  if (courseToDelete) {
    deleteCourse(courseToDelete);
    closeDeleteModal();
  }
}

function resetForm() {
  document.getElementById('courseForm').reset();
  clearFormErrors();
  clearMessages();
  currentEditingCourseId = null;
}

function renderCoursesTable() {
  const tableBody = document.getElementById('tableBody');
  const emptyState = document.getElementById('emptyState');

  if (courses.length === 0) {
    tableBody.innerHTML = '';
    emptyState.textContent = 'No courses found. Add a new course to get started.';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  tableBody.innerHTML = '';

  courses.forEach((course, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
            <td>${index + 1}</td>
            <td>
                <strong>${escapeHtml(course.courseName)}</strong>
                ${course.description ? `<br><small style="color: #999;">${escapeHtml(course.description)}</small>` : ''}
            </td>
            <td><strong>${escapeHtml(course.courseCode)}</strong></td>
            <td>${escapeHtml(course.instructor)}</td>
            <td>
                <span class="inline-block rounded-md bg-surface-container-high px-sm py-xs font-label-sm text-on-surface-variant">${escapeHtml(String(course.seats))}</span>
            </td>
            <td><strong>${course.creditHours || 3}</strong></td>
            <td><strong>$${Number(course.fee != null ? course.fee : 0).toFixed(2)}</strong></td>
            <td>${escapeHtml(course.schedule)}</td>
            <td>${escapeHtml(course.room)}</td>
            <td>
                <div class="table-actions">
                    <button class="action-btn edit" onclick="editCourse('${course.id}')">Edit</button>
                    <button class="action-btn delete" onclick="showDeleteModal('${course.id}')">Delete</button>
                </div>
            </td>
        `;
    tableBody.appendChild(row);
  });
}

function handleSearch(e) {
  const searchTerm = e.target.value.toLowerCase().trim();
  if (searchTerm === '') {
    renderCoursesTable();
    return;
  }

  const filteredCourses = courses.filter(
    (course) =>
      course.courseName.toLowerCase().includes(searchTerm) ||
      course.courseCode.toLowerCase().includes(searchTerm) ||
      course.instructor.toLowerCase().includes(searchTerm)
  );

  displayFilteredCourses(filteredCourses);
}

function displayFilteredCourses(filteredCourses) {
  const tableBody = document.getElementById('tableBody');
  const emptyState = document.getElementById('emptyState');

  if (filteredCourses.length === 0) {
    tableBody.innerHTML = '';
    emptyState.textContent = 'No courses match your search.';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  tableBody.innerHTML = '';

  filteredCourses.forEach((course, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
            <td>${index + 1}</td>
            <td>
                <strong>${escapeHtml(course.courseName)}</strong>
                ${course.description ? `<br><small style="color: #999;">${escapeHtml(course.description)}</small>` : ''}
            </td>
            <td><strong>${escapeHtml(course.courseCode)}</strong></td>
            <td>${escapeHtml(course.instructor)}</td>
            <td>
                <span class="inline-block rounded-md bg-surface-container-high px-sm py-xs font-label-sm text-on-surface-variant">${escapeHtml(String(course.seats))}</span>
            </td>
            <td><strong>${course.creditHours || 3}</strong></td>
            <td><strong>$${Number(course.fee != null ? course.fee : 0).toFixed(2)}</strong></td>
            <td>${escapeHtml(course.schedule)}</td>
            <td>${escapeHtml(course.room)}</td>
            <td>
                <div class="table-actions">
                    <button class="action-btn edit" onclick="editCourse('${course.id}')">Edit</button>
                    <button class="action-btn delete" onclick="showDeleteModal('${course.id}')">Delete</button>
                </div>
            </td>
        `;
    tableBody.appendChild(row);
  });
}

function updateStats() {
  document.getElementById('totalCourses').textContent = courses.length;
  document.getElementById('totalSeats').textContent = courses.reduce((sum, course) => sum + course.seats, 0);
}

async function loadCoursesFromAPI() {
  try {
    const data = await EduRegAPI.apiRequest('/api/admin/courses?limit=100');
    courses = data.data.courses || [];
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      window.location.href = 'login.html?expired=1';
      return;
    }
    courses = [];
    showErrorMessage(error.message || 'Failed to load courses.');
  }
}

let enrollments = [];

async function loadEnrollmentsFromAPI() {
  try {
    const data = await EduRegAPI.apiRequest('/api/admin/enrollments?limit=100');
    enrollments = data.data.enrollments || [];
  } catch {
    enrollments = [];
  }
}

function renderEnrollmentsTable() {
  const tbody = document.getElementById('enrollmentsBody');
  if (!tbody) return;

  if (enrollments.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="px-md py-md font-body-sm text-on-surface-variant">No enrollment data yet. Students appear here after they register for courses.</td></tr>';
    return;
  }

  tbody.innerHTML = enrollments
    .map((e) => {
      const student = e.student || {};
      const course = e.course || {};
      const date = e.enrollmentDate ? formatDate(e.enrollmentDate) : '—';
      const enrollmentId = e.id || (e._id != null ? String(e._id) : '');
      return `<tr data-enrollment-id="${escapeHtml(enrollmentId)}">
        <td class="px-md py-sm font-body-sm">${escapeHtml(course.code || '—')} — ${escapeHtml(course.name || '—')}</td>
        <td class="px-md py-sm font-body-sm">${escapeHtml(student.name || '—')}</td>
        <td class="px-md py-sm font-body-sm">${escapeHtml(student.email || '—')}</td>
        <td class="px-md py-sm font-body-sm"><span class="rounded-full bg-primary-container px-sm py-xs font-label-sm text-on-primary-container">${escapeHtml(e.status || 'enrolled')}</span> <span class="text-on-surface-variant">${date}</span></td>
        <td class="px-md py-sm font-body-sm">
          <button type="button" class="drop-enrollment-btn rounded-lg border border-error/40 bg-error-container px-sm py-xs font-label-sm text-on-error-container hover:opacity-90" data-enrollment-id="${escapeHtml(enrollmentId)}">Drop</button>
        </td>
      </tr>`;
    })
    .join('');
}

async function adminDropEnrollment(enrollmentId, btn) {
  if (!enrollmentId) {
    showErrorMessage('Invalid enrollment. Refresh the page and try again.');
    return;
  }

  const row = enrollments.find((e) => (e.id || String(e._id || '')) === enrollmentId);
  const studentName = row?.student?.name || 'this student';
  const courseName = row?.course?.name || 'this course';

  if (!window.confirm(`Drop ${studentName} from ${courseName}?`)) return;

  if (btn) btn.disabled = true;

  try {
    const data = await EduRegAPI.apiRequest(`/api/admin/enrollments/${encodeURIComponent(enrollmentId)}`, {
      method: 'DELETE',
    });
    await loadEnrollmentsFromAPI();
    renderEnrollmentsTable();
    showSuccessMessage(data.message || 'Student dropped from course.');
  } catch (error) {
    const msg =
      error.message ||
      (error.status === 404
        ? 'Drop failed — restart the server (npm start) so admin routes load.'
        : 'Failed to drop enrollment.');
    showErrorMessage(msg);
  } finally {
    if (btn) btn.disabled = false;
  }
}

function showSuccessMessage(message) {
  const element = document.getElementById('successMessage');
  if (!element) return;
  element.textContent = message;
  element.classList.remove('hidden');
  setTimeout(() => element.classList.add('hidden'), 5000);
}

function showErrorMessage(message) {
  const element = document.getElementById('errorMessage');
  if (!element) return;
  element.textContent = message;
  element.classList.remove('hidden');
  setTimeout(() => element.classList.add('hidden'), 5000);
}

function clearMessages() {
  const success = document.getElementById('successMessage');
  const error = document.getElementById('errorMessage');
  if (success) success.classList.add('hidden');
  if (error) error.classList.add('hidden');
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeDeleteModal();
});
