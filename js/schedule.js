/**
 * Schedule page — weekly grid, enrolled list, schedule conflict detection.
 */
document.addEventListener('DOMContentLoaded', async function () {
  const user = await EduRegAPI.requireAuth({ role: 'student' });
  if (!user) return;

  const listEl = document.getElementById('enrolled-list');
  const gridEl = document.getElementById('weekly-grid');
  const conflictEl = document.getElementById('schedule-conflict-alert');
  const creditsEl = document.getElementById('semester-credits');

  try {
    const data = await EduRegAPI.apiRequest('/api/enrollments');
    const courses = data.data.courses || [];

    renderConflictAlert(conflictEl, courses);
    renderWeeklyGrid(gridEl, courses);
    renderEnrolledList(listEl, courses);

    if (creditsEl) {
      const total = courses.reduce((sum, c) => sum + (c.creditHours || 0), 0);
      creditsEl.textContent = String(total);
    }
  } catch (error) {
    if (error.status === 401) {
      window.location.href = 'login.html?expired=1';
      return;
    }
    if (listEl) {
      listEl.innerHTML =
        '<p class="font-body-sm text-on-error-container">Could not load your schedule. Please try again.</p>';
    }
    if (gridEl) {
      gridEl.innerHTML =
        '<p class="p-md font-body-sm text-on-error-container">Could not load weekly view.</p>';
    }
  }
});

function renderConflictAlert(el, courses) {
  if (!el || !window.ScheduleConflict) return;

  const message = ScheduleConflict.buildConflictMessage(courses);
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
      <h3 class="mb-xs font-label-md font-bold">Schedule conflict</h3>
      <p class="font-body-sm">${escapeHtml(message)}</p>
      <p class="mt-xs font-body-sm">Drop one of the conflicting courses in <a href="courses.html" class="font-medium underline">Course Search</a>.</p>
    </div>`;
}

function renderWeeklyGrid(container, courses) {
  if (!container || !window.ScheduleConflict) return;

  const SC = ScheduleConflict;
  const { GRID_START_MINUTES, GRID_END_MINUTES, HOUR_HEIGHT_PX, DAY_LABELS } = SC;
  const hourCount = (GRID_END_MINUTES - GRID_START_MINUTES) / 60;

  if (!courses.length) {
    container.innerHTML =
      '<p class="p-md font-body-sm text-on-surface-variant">Enroll in courses to see them on your weekly timetable.</p>';
    return;
  }

  const slots = [];
  courses.forEach((course) => {
    SC.expandCourseSlots(course).forEach((slot) => slots.push(slot));
  });

  const rowHeight = `${HOUR_HEIGHT_PX}px`;
  const templateRows = `auto repeat(${hourCount}, ${rowHeight})`;

  let html = `<div class="grid min-w-[800px] grid-cols-[64px_repeat(5,1fr)]" style="grid-template-rows:${templateRows}">`;
  html += '<div class="border-b border-outline-variant/50 bg-surface-bright p-sm"></div>';
  DAY_LABELS.forEach((label) => {
    html += `<div class="border-b border-l border-outline-variant/50 bg-surface-bright p-sm text-center font-label-md text-on-surface">${label}</div>`;
  });

  for (let h = 0; h < hourCount; h++) {
    const hourStart = GRID_START_MINUTES + h * 60;
    html += `<div class="border-b border-outline-variant/30 py-sm text-center font-label-sm text-on-surface-variant">${SC.formatHourLabel(hourStart / 60)}</div>`;
    for (let d = 0; d < 5; d++) {
      html += `<div class="border-b border-l border-outline-variant/30 bg-surface-container-lowest"></div>`;
    }
  }

  const colors = [
    'border-primary-fixed-dim bg-secondary-container text-on-secondary-container',
    'border-tertiary-fixed-dim bg-tertiary-container text-on-tertiary-container',
    'border-secondary-fixed-dim bg-primary-fixed-dim text-on-primary-fixed',
  ];

  slots.forEach((slot, idx) => {
    const rowStart = Math.floor((slot.start - GRID_START_MINUTES) / 60) + 2;
    const rowSpan = Math.max(1, Math.ceil((slot.end - slot.start) / 60));
    const col = slot.day + 2;
    const color = colors[idx % colors.length];

    html += `<div class="z-10 m-[2px] flex flex-col overflow-hidden rounded-md border p-xs shadow-sm ${color}" style="grid-column:${col};grid-row:${rowStart}/span ${rowSpan}">
      <span class="truncate font-label-sm font-bold">${escapeHtml(slot.course.courseCode)}</span>
      <span class="truncate text-[10px] opacity-90">${escapeHtml(SC.formatTimeLabel(slot.start))} – ${escapeHtml(SC.formatTimeLabel(slot.end))}</span>
      <span class="truncate text-[10px] opacity-80">${escapeHtml(slot.course.room || '')}</span>
    </div>`;
  });

  html += '</div>';
  container.innerHTML = html;
}

function renderEnrolledList(listEl, courses) {
  if (!listEl) return;

  if (courses.length === 0) {
    listEl.innerHTML =
      '<p class="font-body-sm text-on-surface-variant">You have not registered for any courses yet. Visit <a href="courses.html" class="font-medium text-primary hover:underline">Course Search</a> to enroll.</p>';
    return;
  }

  const SC = window.ScheduleConflict;

  listEl.innerHTML = courses
    .map((c) => {
      const parsed = SC?.parseSchedule(c.schedule);
      const timeLabel =
        parsed?.time != null
          ? `${SC.formatTimeLabel(parsed.time.start)} – ${SC.formatTimeLabel(parsed.time.end)}`
          : '';
      return `<div class="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
          <div class="flex flex-wrap items-center justify-between gap-sm">
            <div>
              <span class="rounded-sm bg-primary-fixed px-xs py-[2px] font-label-sm text-primary">${escapeHtml(c.courseCode)}</span>
              <h3 class="mt-xs font-headline-sm text-on-surface">${escapeHtml(c.courseName)}</h3>
            </div>
            <div class="text-right font-body-sm text-on-surface-variant">
              <p>${escapeHtml(c.schedule)}</p>
              ${timeLabel ? `<p class="mt-xs font-label-sm text-primary">${escapeHtml(timeLabel)}</p>` : ''}
              <p class="mt-xs">${escapeHtml(c.room || 'TBA')}</p>
            </div>
          </div>
        </div>`;
    })
    .join('');
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML;
}
