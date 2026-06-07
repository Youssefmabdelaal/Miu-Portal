/**
 * Detect overlapping class times from free-form schedule strings
 * (e.g. "Mon/Wed 10:00 AM - 11:30 AM").
 */
(function (global) {
  const DAY_ALIASES = {
    mon: 0,
    monday: 0,
    tue: 1,
    tuesday: 1,
    wed: 2,
    wednesday: 2,
    thu: 3,
    thursday: 3,
    fri: 4,
    friday: 4,
    sat: 5,
    saturday: 5,
    sun: 6,
    sunday: 6,
  };

  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  const GRID_START_MINUTES = 8 * 60;
  const GRID_END_MINUTES = 18 * 60;
  const HOUR_HEIGHT_PX = 52;

  function parseDays(text) {
    const days = new Set();
    const re = /\b(mon|tue|wed|thu|fri|sat|sun)(?:day)?\b/gi;
    let match;
    while ((match = re.exec(text)) !== null) {
      const key = match[1].toLowerCase();
      if (DAY_ALIASES[key] != null) days.add(DAY_ALIASES[key]);
    }
    return days;
  }

  function parseTimeToMinutes(token) {
    const m = token.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (!m) return null;
    let hours = parseInt(m[1], 10);
    const minutes = m[2] ? parseInt(m[2], 10) : 0;
    const meridiem = (m[3] || '').toLowerCase();
    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
    if (!meridiem && hours <= 7) hours += 12;
    return hours * 60 + minutes;
  }

  function parseTimeRange(text) {
    const range = text.match(
      /(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[-–—to]+\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i
    );
    if (!range) return null;
    const start = parseTimeToMinutes(range[1]);
    const end = parseTimeToMinutes(range[2]);
    if (start == null || end == null || end <= start) return null;
    return { start, end };
  }

  function parseSchedule(schedule) {
    const raw = (schedule || '').trim();
    if (!raw) return { days: new Set(), time: null };
    return { days: parseDays(raw), time: parseTimeRange(raw) };
  }

  function formatTimeLabel(minutes) {
    const h24 = Math.floor(minutes / 60);
    const m = minutes % 60;
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 || 12;
    return m ? `${h12}:${String(m).padStart(2, '0')} ${ampm}` : `${h12} ${ampm}`;
  }

  function formatHourLabel(hour24) {
    return formatTimeLabel(hour24 * 60);
  }

  function timesOverlap(a, b) {
    return a.start < b.end && b.start < a.end;
  }

  function schedulesConflict(scheduleA, scheduleB) {
    const a = parseSchedule(scheduleA);
    const b = parseSchedule(scheduleB);
    if (!a.days.size || !b.days.size) return false;

    const sharedDay = [...a.days].some((d) => b.days.has(d));
    if (!sharedDay) return false;

    if (a.time && b.time) return timesOverlap(a.time, b.time);

    return false;
  }

  function findConflicts(targetCourse, enrolledCourses) {
    if (!targetCourse?.schedule) return [];
    return (enrolledCourses || []).filter((c) => {
      if (!c?.schedule || c.id === targetCourse.id) return false;
      return schedulesConflict(targetCourse.schedule, c.schedule);
    });
  }

  function findConflictPairs(courses) {
    const pairs = [];
    const list = courses || [];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (list[i]?.schedule && list[j]?.schedule && schedulesConflict(list[i].schedule, list[j].schedule)) {
          pairs.push({ a: list[i], b: list[j] });
        }
      }
    }
    return pairs;
  }

  function expandCourseSlots(course) {
    const parsed = parseSchedule(course.schedule);
    if (!parsed.time || !parsed.days.size) return [];

    const slots = [];
    parsed.days.forEach((day) => {
      if (day >= 0 && day <= 4) {
        slots.push({
          day,
          start: parsed.time.start,
          end: parsed.time.end,
          course,
        });
      }
    });
    return slots;
  }

  function describeConflict(pair) {
    const a = pair.a;
    const b = pair.b;
    return `${a.courseCode} and ${b.courseCode} (${a.schedule} · ${b.schedule})`;
  }

  function buildConflictMessage(courses) {
    const pairs = findConflictPairs(courses);
    if (!pairs.length) return null;
    const lines = pairs.map((p) => describeConflict(p));
    return `Schedule conflict: you have more than one class at the same time — ${lines.join('; ')}.`;
  }

  global.ScheduleConflict = {
    schedulesConflict,
    findConflicts,
    findConflictPairs,
    expandCourseSlots,
    buildConflictMessage,
    describeConflict,
    parseSchedule,
    formatTimeLabel,
    formatHourLabel,
    DAY_LABELS,
    GRID_START_MINUTES,
    GRID_END_MINUTES,
    HOUR_HEIGHT_PX,
  };
})(typeof window !== 'undefined' ? window : global);
