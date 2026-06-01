document.addEventListener('DOMContentLoaded', async function () {
  const user = await EduRegAPI.requireAuth({ role: 'admin' });
  if (!user) return;

  const coursesEl = document.getElementById('stat-total-courses');
  const studentsEl = document.getElementById('stat-total-students');

  try {
    const data = await EduRegAPI.apiRequest('/api/admin/stats');
    const stats = data.data || {};

    if (coursesEl) coursesEl.textContent = String(stats.totalCourses ?? 0);
    if (studentsEl) studentsEl.textContent = String(stats.totalStudents ?? 0);
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      window.location.href = 'login.html?expired=1';
      return;
    }
    if (coursesEl) coursesEl.textContent = '—';
    if (studentsEl) studentsEl.textContent = '—';
  }
});
