/* ========================================
   COURSES PAGE - JAVASCRIPT
   MIU Portal Course Registration System
   REST API + fetch integration
   ======================================== */

let allCourses = [];
let currentUser = null;
let filteredCourses = [];
let pendingCourseId = null;
let currentPage = 1;
let totalPages = 1;
let facultyFilterLabel = '';


document.addEventListener('DOMContentLoaded', async function () {
  currentUser = await EduRegAPI.requireAuth({ role: 'student' });
  if (!currentUser) return;

  await loadCourses();
  updateFacultyFilterNote();
  await loadEnrollments();
  updateScheduleConflictBanner();
  setupSearch();
  setupPaymentModal();
  renderCourses();
  renderPagination();
  renderRegisteredCourses();
  await loadBillingSummary();
  updateCourseLimitWarning();
});

function formatMoney(amount) {
  if (typeof currentLang !== 'undefined' && currentLang === 'ar') {
    return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount != null ? amount : 0);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount != null ? amount : 0);
}

function setupPaymentModal() {
  const modal = document.getElementById('payment-modal');
  const overlay = document.getElementById('payment-modal-overlay');
  const cancelBtn = document.getElementById('payment-cancel');
  const confirmBtn = document.getElementById('payment-confirm');

  if (cancelBtn) cancelBtn.addEventListener('click', closePaymentModal);
  if (overlay) overlay.addEventListener('click', closePaymentModal);
  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      if (pendingCourseId) {
        const id = pendingCourseId;
        closePaymentModal();
        await completeEnrollment(id);
      }
    });
  }
}

function openPaymentModal(course) {
  const modal = document.getElementById('payment-modal');
  const body = document.getElementById('payment-modal-body');
  if (!modal || !body) return;

  const fee = course.fee != null ? course.fee : 0;
  const enrolled = currentUser.courses || [];
  const enrolledTotal = enrolled.reduce((sum, c) => sum + (c.fee != null ? c.fee : 0), 0);
  const newTotal = enrolledTotal + fee;

  body.innerHTML = `
    <p class="mb-sm text-on-surface"><strong>${escapeHtml(course.courseCode)}</strong> — ${escapeHtml(course.courseName)}</p>
    <ul class="mb-md space-y-xs border-y border-outline-variant py-sm">
      <li class="flex justify-between"><span>${typeof translate === 'function' ? translate('fee') : 'Course fee'}</span><span class="font-medium text-on-surface">${formatMoney(fee)}</span></li>
    </ul>
    <p class="flex justify-between font-label-md text-on-surface">
      <span>${typeof translate === 'function' ? translate('total') : 'Total after enrollment'}</span>
      <span class="font-bold">${formatMoney(newTotal)}</span>
    </p>
  `;

  pendingCourseId = course.id;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closePaymentModal() {
  const modal = document.getElementById('payment-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  pendingCourseId = null;
}

async function loadBillingSummary() {
  const container = document.getElementById('billing-summary');
  if (!container) return;

  try {
    const data = await EduRegAPI.apiRequest('/api/enrollments/billing');
    renderBillingSummary(data.data.items || [], data.data.total || 0);
  } catch {
    const courses = currentUser.courses || [];
    const items = courses.map((c) => ({
      courseCode: c.courseCode,
      courseName: c.courseName,
      fee: c.fee != null ? c.fee : 0,
    }));
    const total = items.reduce((sum, i) => sum + i.fee, 0);
    renderBillingSummary(items, total);
  }
}

function renderBillingSummary(items, total) {
  const container = document.getElementById('billing-summary');
  if (!container) return;

  if (!items.length) {
    container.innerHTML = '<p class="text-on-surface-variant">No enrolled courses yet. Fees appear here after you register.</p>';
    return;
  }

  const rows = items
    .map(
      (item) => `<li class="flex justify-between gap-md border-b border-outline-variant/50 py-xs last:border-0">
        <span><strong>${escapeHtml(item.courseCode)}</strong> — ${escapeHtml(item.courseName)}</span>
        <span class="shrink-0 font-medium text-on-surface">${formatMoney(item.fee)}</span>
      </li>`
    )
    .join('');

  container.innerHTML = `
    <ul class="mb-md">${rows}</ul>
    <p class="flex justify-between border-t border-outline-variant pt-sm font-label-md font-bold text-on-surface">
      <span>Total</span>
      <span>${formatMoney(total)}</span>
    </p>`;
}

/**
 * Load courses from API with optional search.
 */
async function loadCourses(search = '', page = 1) {
  try {
    const params = new URLSearchParams({ limit: '20', page: page });
    if (search) params.set('search', search);

    const data = await EduRegAPI.apiRequest(`/api/courses?${params}`);
    allCourses = data.data.courses || [];
    filteredCourses = [...allCourses];
    
    if (data.data.pagination) {
      currentPage = data.data.pagination.page || 1;
      totalPages = data.data.pagination.totalPages || 1;
    }

    facultyFilterLabel = data.data.facultyFilter?.label || '';
    updateFacultyFilterNote();
  } catch (error) {
    showErrorMessage(error.message || 'Failed to load courses.');
    allCourses = [];
    filteredCourses = [];
    currentPage = 1;
    totalPages = 1;
    facultyFilterLabel = '';
    updateFacultyFilterNote();
  }
}

function updateFacultyFilterNote() {
  const note = document.getElementById('faculty-filter-note');
  if (!note) return;

  const label =
    facultyFilterLabel ||
    currentUser?.departmentLabel ||
    (currentUser?.department ? currentUser.department : '');

  if (label && label !== '—' && currentUser?.department) {
    note.textContent = `Showing courses for your faculty: ${label}`;
    note.classList.remove('hidden');
  } else {
    note.textContent = 'No faculty assigned to your account. Contact an administrator.';
    note.classList.remove('hidden');
  }
}

function renderPagination() {
  const container = document.getElementById('pagination-controls');
  if (!container) return;

  container.innerHTML = '';
  if (totalPages <= 1) return;

  const prevBtn = document.createElement('button');
  prevBtn.className = 'rounded-lg border border-outline-variant px-sm py-[2px] font-label-sm text-on-surface hover:bg-surface-container-high disabled:opacity-50 disabled:pointer-events-none';
  prevBtn.textContent = 'Previous';
  prevBtn.disabled = currentPage <= 1;
  prevBtn.onclick = async () => {
    if (currentPage > 1) {
      const searchInput = document.getElementById('search-input');
      await loadCourses(searchInput ? searchInput.value.trim() : '', currentPage - 1);
      renderCourses();
      renderPagination();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const pageInfo = document.createElement('span');
  pageInfo.className = 'font-label-md text-on-surface-variant mx-md';
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

  const nextBtn = document.createElement('button');
  nextBtn.className = 'rounded-lg border border-outline-variant px-sm py-[2px] font-label-sm text-on-surface hover:bg-surface-container-high disabled:opacity-50 disabled:pointer-events-none';
  nextBtn.textContent = 'Next';
  nextBtn.disabled = currentPage >= totalPages;
  nextBtn.onclick = async () => {
    if (currentPage < totalPages) {
      const searchInput = document.getElementById('search-input');
      await loadCourses(searchInput ? searchInput.value.trim() : '', currentPage + 1);
      renderCourses();
      renderPagination();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  container.appendChild(prevBtn);
  container.appendChild(pageInfo);
  container.appendChild(nextBtn);
}

/**
 * Load student's enrolled courses from API.
 */
async function loadEnrollments() {
  try {
    const data = await EduRegAPI.apiRequest('/api/enrollments');
    currentUser.courses = data.data.courses || [];
    EduRegAPI.cacheUser(currentUser);
    updateScheduleConflictBanner();
    await loadBillingSummary();
  } catch (error) {
    if (error.status === 401) {
      window.location.href = 'login.html?expired=1';
      return;
    }
    currentUser.courses = currentUser.courses || [];
  }
}

function setupSearch() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', (event) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        const term = event.target.value.trim();
        await loadCourses(term, 1);
        filteredCourses = [...allCourses];
        renderCourses();
        renderPagination();
      }, 300);
    });
  }
}

function renderCourses() {
  const coursesList = document.getElementById('courses-list');
  if (!coursesList) return;

  coursesList.innerHTML = '';

  if (filteredCourses.length === 0) {
    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    if (searchTerm !== '') {
      coursesList.innerHTML =
        '<p class="col-span-full rounded-xl border border-outline-variant bg-surface-container-low p-lg text-center font-body-sm text-on-surface-variant">No courses match your search.</p>';
    } else if (facultyFilterLabel || currentUser?.department) {
      const facultyName = facultyFilterLabel || currentUser?.departmentLabel || 'your faculty';
      coursesList.innerHTML =
        `<p class="col-span-full rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-lg text-center font-body-sm text-on-surface-variant">No courses are currently available for ${escapeHtml(facultyName)}. Ask an admin to add courses for your faculty.</p>`;
    } else {
      coursesList.innerHTML =
        '<p class="col-span-full rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-lg text-center font-body-sm text-on-surface-variant">No faculty assigned to your account. Contact an administrator.</p>';
    }
    return;
  }

  const countEl = document.getElementById('course-count');
  if (countEl) countEl.textContent = String(filteredCourses.length);

  filteredCourses.forEach((course) => {
    const isRegistered = (currentUser.courses || []).some((c) => c.id === course.id);
    coursesList.appendChild(createCourseCard(course, isRegistered));
  });
}

function createCourseCard(course, isRegistered) {
  const card = document.createElement('article');
  card.dataset.courseCard = String(course.id);
  card.className =
    'flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-md transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.05)] group';

  const open = course.seats > 0;
  const seatPct =
    course.maxSeats && course.maxSeats > 0
      ? Math.min(100, Math.round(((course.maxSeats - course.seats) / course.maxSeats) * 100))
      : open
        ? Math.min(90, 25 + Math.min(course.seats, 20) * 3)
        : 100;

  const statusBadge = open
    ? `<span class="flex items-center gap-[2px] rounded-full bg-[#e6f4ea] px-sm py-[2px] font-label-sm text-label-sm text-[#137333]"><span class="h-2 w-2 rounded-full bg-[#137333]"></span> ${typeof translate === 'function' ? translate('open') : 'Open'}</span>`
    : `<span class="flex items-center gap-[2px] rounded-full bg-error-container px-sm py-[2px] font-label-sm text-label-sm text-on-error-container"><span class="h-2 w-2 rounded-full bg-error"></span> ${typeof translate === 'function' ? translate('full') : 'Full'}</span>`;

  let actionHtml = '';
  if (isRegistered) {
    actionHtml = `<button type="button" class="course-action shrink-0 rounded-lg border border-outline-variant bg-surface-container-high px-md py-sm font-label-md text-label-md text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container" data-course-id="${course.id}" data-action="drop">${typeof translate === 'function' ? translate('drop') : 'Drop'}</button>`;
  } else if (!open) {
    actionHtml = `<button type="button" disabled class="shrink-0 cursor-not-allowed rounded-lg border border-outline-variant bg-surface-container-high px-md py-sm font-label-md text-label-md text-on-surface-variant">${typeof translate === 'function' ? translate('closed') : 'Closed'}</button>`;
  } else {
    actionHtml = `<button type="button" class="course-action shrink-0 rounded-lg bg-primary px-md py-sm font-label-md text-label-md text-on-primary shadow-sm transition-colors hover:bg-primary-container" data-course-id="${course.id}" data-action="add">${typeof translate === 'function' ? translate('enroll') : 'Enroll'}</button>`;
  }

  card.innerHTML = `
        <div class="mb-xs flex items-start justify-between">
            <span class="rounded border border-outline-variant bg-surface-container-high px-sm py-[2px] font-label-sm font-bold text-on-surface-variant">${escapeHtml(course.courseCode)}</span>
            ${statusBadge}
        </div>
        <div>
            <h3 class="mb-xs font-headline-sm text-headline-sm leading-tight text-on-surface transition-colors group-hover:text-primary">${escapeHtml(course.courseName)}</h3>
            <p class="flex items-center gap-xs font-body-sm text-body-sm text-on-surface-variant">
                <span class="material-symbols-outlined text-[16px]">person</span> ${escapeHtml(course.instructor)}
            </p>
            <p class="mt-[2px] flex items-center gap-xs font-body-sm text-body-sm text-on-surface-variant">
                <span class="material-symbols-outlined text-[16px]">schedule</span> ${escapeHtml(course.schedule)}
            </p>
            <p class="mt-[2px] flex items-center gap-xs font-body-sm text-body-sm text-on-surface-variant">
                <span class="material-symbols-outlined text-[16px]">location_on</span> ${escapeHtml(course.room || 'TBA')}
            </p>
            <p class="mt-[2px] flex items-center gap-xs font-body-sm font-medium text-primary">
                <span class="material-symbols-outlined text-[16px]">payments</span> ${typeof translate === 'function' ? translate('fee') : 'Fee:'} ${formatMoney(course.fee)}
            </p>
        </div>
        <div class="mt-auto flex items-end justify-between border-t border-surface-container-highest pt-md ${!open && !isRegistered ? 'opacity-70' : ''}">
            <div class="mr-md w-full">
                <div class="mb-xs flex justify-between font-label-sm text-label-sm text-secondary">
                    <span>${typeof translate === 'function' ? translate('seats_left') : 'Seats left'}</span>
                    <span id="seats-${course.id}">${course.seats}</span>
                </div>
                <div class="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
                    <div class="h-full rounded-full ${open ? 'bg-primary' : 'bg-error'}" style="width:${seatPct}%"></div>
                </div>
            </div>
            ${actionHtml}
        </div>
    `;

  const btn = card.querySelector('.course-action');
  if (btn) {
    btn.addEventListener('click', () => {
      if (btn.getAttribute('data-action') === 'drop') dropCourse(course.id);
      else promptEnroll(course);
    });
  }

  return card;
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML;
}

function renderRegisteredCourses() {
  const registeredList = document.getElementById('registered-courses');
  if (!registeredList) return;

  registeredList.innerHTML = '';
  const courses = currentUser.courses || [];

  if (courses.length === 0) {
    registeredList.innerHTML =
      '<p class="rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-lg text-center font-body-sm text-on-surface-variant">You have not registered for any courses yet.</p>';
    return;
  }

  courses.forEach((course) => {
    const courseCard = document.createElement('div');
    courseCard.className =
      'flex flex-col gap-md rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-sm transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]';
    courseCard.innerHTML = `
            <div class="flex items-start justify-between gap-md">
                <div>
                    <div class="mb-xs flex flex-wrap items-center gap-xs">
                        <span class="rounded-sm bg-primary-fixed px-xs py-[2px] font-label-sm text-label-sm text-primary">${escapeHtml(course.courseCode)}</span>
                    </div>
                    <h3 class="font-headline-sm text-headline-sm leading-tight text-on-surface">${escapeHtml(course.courseName)}</h3>
                </div>
                <span class="flex items-center gap-xs rounded-full bg-secondary-container px-sm py-xs font-label-sm text-label-sm text-on-secondary-container">
                    <span class="h-1.5 w-1.5 rounded-full bg-primary"></span> Enrolled
                </span>
            </div>
            <div class="grid grid-cols-2 gap-sm font-body-sm text-on-surface-variant">
                <div class="flex items-center gap-xs"><span class="material-symbols-outlined text-[16px]">person</span>${escapeHtml(course.instructor)}</div>
                <div class="flex items-center gap-xs"><span class="material-symbols-outlined text-[16px]">location_on</span>${escapeHtml(course.room || 'TBA')}</div>
                <div class="col-span-2 flex items-center gap-xs text-on-surface">
                    <span class="material-symbols-outlined text-[16px]">schedule</span>${escapeHtml(course.schedule)}
                </div>
                <div class="col-span-2 flex items-center gap-xs font-medium text-primary">
                    <span class="material-symbols-outlined text-[16px]">payments</span> ${typeof translate === 'function' ? translate('fee') : 'Fee:'} ${formatMoney(course.fee)}
                </div>
            </div>
            <div class="mt-sm flex justify-end border-t border-outline-variant/50 pt-md">
                <button type="button" class="flex items-center gap-xs rounded-lg border border-outline-variant px-md py-sm font-label-md text-label-md text-secondary transition-colors duration-200 hover:border-error-container hover:bg-error-container hover:text-on-error-container reg-drop" data-course-id="${course.id}">
                    <span class="material-symbols-outlined text-[18px]">close</span> ${typeof translate === 'function' ? translate('drop_course') : 'Drop course'}
                </button>
            </div>
        `;
    courseCard.querySelector('.reg-drop').addEventListener('click', () => dropCourse(course.id));
    registeredList.appendChild(courseCard);
  });
}

function updateScheduleConflictBanner() {
  const el = document.getElementById('schedule-conflict-banner');
  if (!el || !window.ScheduleConflict) return;

  const message = ScheduleConflict.buildConflictMessage(currentUser.courses || []);
  if (!message) {
    el.classList.add('hidden');
    el.innerHTML = '';
    return;
  }

  el.classList.remove('hidden');
  el.className =
    'mb-md flex items-start gap-sm rounded-lg border border-error/30 bg-error-container p-md text-on-error-container';
  el.innerHTML = `
    <span class="material-symbols-outlined shrink-0">error</span>
    <div>
      <p class="font-label-md font-bold">Schedule conflict</p>
      <p class="mt-xs font-body-sm">${escapeHtml(message)}</p>
    </div>`;
}

function promptEnroll(course) {
  if (window.ScheduleConflict) {
    const conflicts = ScheduleConflict.findConflicts(course, currentUser.courses || []);
    if (conflicts.length) {
      const names = conflicts.map((c) => c.courseCode).join(', ');
      showErrorMessage(
        `Cannot enroll: ${course.courseCode} overlaps with ${names}. Drop the conflicting course first.`
      );
      return;
    }
  }
  openPaymentModal(course);
}

async function completeEnrollment(courseId) {
  const course = allCourses.find((c) => c.id === courseId);
  if (!course) return;

  try {
    const data = await EduRegAPI.apiRequest('/api/enrollments', {
      method: 'POST',
      body: { courseId },
    });

    if (course && data.data.course) {
      course.seats = data.data.course.seats;
    }

    await loadEnrollments();
    updateCourseCard(courseId);
    renderRegisteredCourses();
    await loadBillingSummary();
    updateCourseLimitWarning();
    showSuccessMessage(data.message || 'Payment confirmed. Successfully registered!');
  } catch (error) {
    if (error.status === 401) {
      window.location.href = 'login.html?expired=1';
      return;
    }
    showErrorMessage(error.message || 'Enrollment failed.');
  }
}

async function dropCourse(courseId) {
  try {
    const data = await EduRegAPI.apiRequest(`/api/enrollments/${courseId}`, {
      method: 'DELETE',
    });

    const course = allCourses.find((c) => c.id === courseId);
    if (course && data.data.course) {
      course.seats = data.data.course.seats;
    }

    await loadEnrollments();
    updateCourseCard(courseId);
    renderRegisteredCourses();
    await loadBillingSummary();
    updateCourseLimitWarning();
    showSuccessMessage(data.message || 'Course dropped successfully.');
  } catch (error) {
    if (error.status === 401) {
      window.location.href = 'login.html?expired=1';
      return;
    }
    showErrorMessage(error.message || 'Failed to drop course.');
  }
}

function updateCourseCard(courseId) {
  const course = allCourses.find((c) => c.id === courseId);
  if (!course) return;
  const card = document.querySelector(`[data-course-card="${courseId}"]`);
  if (!card) return;
  const isRegistered = (currentUser.courses || []).some((c) => c.id === courseId);
  card.replaceWith(createCourseCard(course, isRegistered));
}

function showErrorMessage(message) {
  showMessage(message, 'error');
}

function showSuccessMessage(message) {
  showMessage(message, 'success');
}

let toastTimer = null;

function showMessage(message, type) {
  const toast = document.getElementById('toast');
  if (!toast) {
    window.alert(type === 'error' ? 'Error: ' + message : message);
    return;
  }
  toast.textContent = message;
  toast.classList.remove('hidden', 'pointer-events-none');
  toast.className =
    'fixed bottom-6 left-1/2 z-50 max-w-md -translate-x-1/2 rounded-lg border px-lg py-md font-body-sm shadow-lg ' +
    (type === 'error'
      ? 'border-error/30 bg-error-container text-on-error-container'
      : 'border-outline-variant bg-inverse-surface text-inverse-on-surface');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toast.classList.add('hidden', 'pointer-events-none');
  }, 3200);
}

function updateCourseLimitWarning() {
  const warning = document.getElementById('course-limit-warning');
  const countSpan = document.getElementById('registered-count');
  const count = (currentUser.courses || []).length;

  if (warning && countSpan) {
    countSpan.textContent = count;
    warning.style.display = count > 0 ? 'block' : 'none';
  }
}
