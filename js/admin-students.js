/**
 * Admin student roster — GPA management and delete.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = await EduRegAPI.requireAuth({ role: 'admin' });
  if (!user) return;

  const refreshBtn = document.getElementById('refresh-students-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => loadStudents());
  }

  const tbody = document.getElementById('students-body');
  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const saveBtn = e.target.closest('.save-gpa-btn');
      const deleteBtn = e.target.closest('.delete-student-btn');
      const row = e.target.closest('tr[data-student-id]');
      if (!row) return;

      if (saveBtn) {
        e.preventDefault();
        saveStudentGpa(row);
      } else if (deleteBtn) {
        e.preventDefault();
        deleteStudent(row);
      }
    });
  }

  await loadStudents();
});

async function loadStudents() {
  const tbody = document.getElementById('students-body');
  if (!tbody) return;

  tbody.innerHTML =
    '<tr><td colspan="6" class="px-md py-md font-body-sm text-on-surface-variant">Loading students…</td></tr>';

  try {
    const data = await EduRegAPI.apiRequest('/api/admin/students');
    const students = data.data?.students || [];

    if (students.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="px-md py-md font-body-sm text-on-surface-variant">No students registered yet. Students appear here after they sign up on the registration page.</td></tr>';
      return;
    }

    tbody.innerHTML = students
      .map((s) => {
        const studentId = s.id || (s._id != null ? String(s._id) : '');
        return `<tr class="border-t border-outline-variant" data-student-id="${escapeHtml(studentId)}">
        <td class="px-md py-sm">${escapeHtml(s.name)}</td>
        <td class="px-md py-sm text-on-surface-variant">${escapeHtml(s.studentId)}</td>
        <td class="px-md py-sm text-on-surface-variant">${escapeHtml(s.email)}</td>
        <td class="px-md py-sm">
          <input type="number" min="0" max="4" step="0.01" class="gpa-input w-24 rounded-lg border border-outline-variant bg-surface px-sm py-xs" value="${s.gpa != null ? escapeHtml(String(s.gpa)) : ''}" placeholder="—">
        </td>
        <td class="px-md py-sm">
          <label class="inline-flex items-center gap-xs">
            <input type="checkbox" class="show-gpa-input rounded border-outline-variant" ${s.showGpa ? 'checked' : ''}>
            <span class="font-body-sm text-on-surface-variant">Visible to student</span>
          </label>
        </td>
        <td class="px-md py-sm">
          <div class="flex flex-wrap gap-xs">
            <button type="button" class="save-gpa-btn rounded-lg bg-primary px-sm py-xs font-label-sm text-on-primary hover:bg-primary-container">Save</button>
            <button type="button" class="delete-student-btn rounded-lg border border-error/40 bg-error-container px-sm py-xs font-label-sm text-on-error-container hover:opacity-90">Delete</button>
          </div>
        </td>
      </tr>`;
      })
      .join('');
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      window.location.href = 'login.html?expired=1';
      return;
    }
    const detail = error.message ? escapeHtml(error.message) : 'Unknown error';
    tbody.innerHTML = `<tr><td colspan="6" class="px-md py-md font-body-sm text-on-error-container">Could not load students: ${detail}.</td></tr>`;
  }
}

async function deleteStudent(row) {
  const studentId = row.getAttribute('data-student-id');
  const name = row.querySelector('td')?.textContent?.trim() || 'this student';
  const messageEl = document.getElementById('gpa-message');

  if (!studentId) {
    showGpaMessage(messageEl, 'Invalid student. Refresh the page and try again.', 'error');
    return;
  }

  if (!window.confirm(`Delete ${name}? This removes their account, enrollments, and payment history.`)) {
    return;
  }

  try {
    const data = await EduRegAPI.apiRequest(`/api/admin/students/${encodeURIComponent(studentId)}`, {
      method: 'DELETE',
    });
    showGpaMessage(messageEl, data.message || 'Student deleted.', 'success');
    await loadStudents();
  } catch (error) {
    const msg =
      error.message ||
      (error.status === 404
        ? 'Delete failed — restart the server (npm start) so admin routes load.'
        : 'Failed to delete student.');
    showGpaMessage(messageEl, msg, 'error');
  }
}

async function saveStudentGpa(row) {
  const studentId = row.getAttribute('data-student-id');
  const gpaInput = row.querySelector('.gpa-input');
  const showGpaInput = row.querySelector('.show-gpa-input');
  const messageEl = document.getElementById('gpa-message');
  const saveBtn = row.querySelector('.save-gpa-btn');

  const gpaRaw = gpaInput ? gpaInput.value.trim() : '';
  const showGpa = showGpaInput ? showGpaInput.checked : false;

  if (gpaRaw !== '') {
    const gpaVal = parseFloat(gpaRaw);
    if (Number.isNaN(gpaVal) || gpaVal < 0 || gpaVal > 4) {
      showGpaMessage(messageEl, 'GPA must be between 0 and 4.0', 'error');
      return;
    }
  }

  if (saveBtn) saveBtn.disabled = true;

  try {
    const result = await EduRegAPI.apiRequest(`/api/admin/students/${encodeURIComponent(studentId)}/gpa`, {
      method: 'PATCH',
      body: {
        gpa: gpaRaw === '' ? null : parseFloat(gpaRaw),
        showGpa,
      },
    });
    const saved = result.data?.student;
    const gpaText =
      saved && saved.showGpa && saved.gpa != null
        ? ` GPA ${Number(saved.gpa).toFixed(2)} is visible to the student.`
        : saved && saved.gpa != null
          ? ` GPA ${Number(saved.gpa).toFixed(2)} saved (hidden from student).`
          : ' GPA cleared.';
    showGpaMessage(messageEl, `Saved.${gpaText}`, 'success');
  } catch (error) {
    showGpaMessage(messageEl, error.message || 'Failed to save GPA.', 'error');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

function showGpaMessage(element, text, type) {
  if (!element) return;
  element.textContent = text;
  element.classList.remove('hidden');
  const base = 'rounded-lg border px-md py-sm font-body-sm ';
  element.className =
    base +
    (type === 'error'
      ? 'border-error/30 bg-error-container text-on-error-container'
      : 'border-primary/30 bg-primary-container text-on-primary-container');
  setTimeout(() => element.classList.add('hidden'), 6000);
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML;
}
