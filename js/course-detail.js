/**
 * Course detail page — loads a single course by ?id= query parameter.
 */
document.addEventListener('DOMContentLoaded', async function () {
  const user = await EduRegAPI.requireAuth({ role: 'student' });
  if (!user) return;

  const params = new URLSearchParams(window.location.search);
  const courseId = params.get('id');

  if (!courseId) return;

  try {
    const [courseRes, enrollRes] = await Promise.all([
      EduRegAPI.apiRequest(`/api/courses/${courseId}`),
      EduRegAPI.apiRequest('/api/enrollments').catch(() => ({ data: { courses: user.courses || [] } })),
    ]);

    const course = courseRes.data.course;
    if (!course) return;

    const enrolledCourses = enrollRes.data?.courses || user.courses || [];

    const codeEl = document.getElementById('course-code');
    const nameEl = document.getElementById('course-name');
    const instructorEl = document.getElementById('course-instructor');
    const descEl = document.getElementById('course-description');
    const statusEl = document.getElementById('course-status');
    const creditsEl = document.getElementById('course-credits');
    const enrollBtn = document.getElementById('enroll-btn');
    const conflictBox = document.getElementById('schedule-conflict-warning');
    const conflictMsg = document.getElementById('schedule-conflict-message');

    if (codeEl) codeEl.textContent = course.courseCode;
    if (nameEl) nameEl.textContent = course.courseName;
    if (instructorEl) instructorEl.textContent = course.instructor;
    if (descEl) descEl.textContent = course.description || 'No description provided.';
    if (creditsEl) creditsEl.textContent = String(course.creditHours || 3);

    const conflicts = window.ScheduleConflict
      ? ScheduleConflict.findConflicts(course, enrolledCourses)
      : [];

    if (conflictBox && conflictMsg) {
      if (conflicts.length > 0) {
        const list = conflicts
          .map((c) => `${escapeHtml(c.courseCode)} (${escapeHtml(c.courseName || c.name)})`)
          .join(', ');
        conflictMsg.innerHTML = `This course overlaps with your enrolled class${conflicts.length > 1 ? 'es' : ''}: <strong>${list}</strong>. Check <a class="font-medium underline" href="schedule.html">My Schedule</a> before enrolling.`;
        conflictBox.classList.remove('hidden');
        conflictBox.classList.add('flex');
      } else {
        conflictBox.classList.add('hidden');
        conflictBox.classList.remove('flex');
      }
    }

    const open = course.seats > 0;
    if (statusEl) {
      statusEl.innerHTML = open
        ? '<span class="h-2 w-2 rounded-full bg-emerald-500"></span> Open'
        : '<span class="h-2 w-2 rounded-full bg-error"></span> Full';
    }

    if (enrollBtn) {
      const enrolled = enrolledCourses.some((c) => c.id === course.id);
      if (enrolled) {
        enrollBtn.textContent = 'Already enrolled';
        enrollBtn.classList.add('opacity-60', 'pointer-events-none');
      } else if (!open) {
        enrollBtn.textContent = 'Course full';
        enrollBtn.classList.add('opacity-60', 'pointer-events-none');
      } else {
        enrollBtn.href = 'courses.html';
        enrollBtn.textContent = 'Enroll in catalog';
      }
    }

    document.title = `${course.courseCode} — MIU Portal`;
  } catch (error) {
    if (error.status === 401) {
      window.location.href = 'login.html?expired=1';
    }
  }
});

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML;
}
