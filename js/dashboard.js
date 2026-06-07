/**
 * Student dashboard — loads user data, GPA, and external API content.
 */
const DEFAULT_AVATAR = '/images/default-avatar.svg';
const NO_GRADING_MESSAGE = 'no grading for you';

document.addEventListener('DOMContentLoaded', async function () {
  const user = await EduRegAPI.requireAuth({ role: 'student' });
  if (!user) return;

  if (user.name) {
    const first = user.name.split(/\s+/)[0];
    const w = document.getElementById('welcome-name');
    if (w) w.textContent = first;
  }

  updateFacultyDisplay(user);
  updateGpaDisplay(user);

  const avatar = document.querySelector('header a[href="profile.html"] img');
  if (avatar) avatar.src = DEFAULT_AVATAR;

  try {
    const data = await EduRegAPI.apiRequest('/api/auth/me');
    const freshUser = data.data.user;
    EduRegAPI.cacheUser(freshUser);

    const count = (freshUser.courses && freshUser.courses.length) || 0;
    const el = document.getElementById('dash-course-count');
    if (el) el.textContent = String(count);

    updateFacultyDisplay(freshUser);
    updateGpaDisplay(freshUser);
  } catch {
    /* user info already shown from requireAuth */
  }

  loadExternalContent();
});

function updateFacultyDisplay(user) {
  const facultyEl = document.getElementById('dash-faculty');
  if (!facultyEl) return;

  const label = user.departmentLabel || user.department;
  facultyEl.textContent = label && label !== '—' ? label : 'Not assigned';
}

function updateGpaDisplay(user) {
  const valueEl = document.getElementById('dash-gpa-value');
  const messageEl = document.getElementById('dash-gpa-message');
  if (!valueEl) return;

  if (user.showGpa && user.gpa != null) {
    valueEl.textContent = Number(user.gpa).toFixed(2);
    if (messageEl) messageEl.textContent = '';
  } else {
    valueEl.textContent = '—';
    if (messageEl) {
      messageEl.textContent = NO_GRADING_MESSAGE;
      messageEl.classList.remove('hidden');
    }
  }
}

async function loadExternalContent() {
  const container = document.getElementById('external-content');
  if (!container) return;

  try {
    const data = await EduRegAPI.apiRequest('/api/dashboard/external');
    const { quotes, fact } = data.data;

    let html = '';
    if (quotes && quotes.length > 0) {
      const q = quotes[0];
      html += `<blockquote class="font-body-sm italic text-on-surface">"${escapeHtml(q.quote)}"</blockquote>`;
      html += `<p class="mt-xs font-label-sm text-secondary">— ${escapeHtml(q.author)}</p>`;
    }
    if (fact) {
      html += `<p class="mt-md font-body-sm text-on-surface-variant"><span class="font-medium">Did you know?</span> ${escapeHtml(fact)}</p>`;
    }

    container.innerHTML = html || '<p class="font-body-sm text-on-surface-variant">Stay curious and keep learning!</p>';
  } catch {
    container.innerHTML = '<p class="font-body-sm text-on-surface-variant">Browse the course catalog to plan your semester.</p>';
  }
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML;
}
