/* ========================================
   COURSES PAGE - JAVASCRIPT
   Smart University Course Registration System

   Part 5: AJAX + Real-time Updates + Validation + Error Handling

   Handles:
   - Loading and displaying courses
   - Student course registration (add/drop)
   - Real-time seat count updates
   - Client-side validation and error handling
   - Search and filter functionality (innovation feature)
   ======================================== */

// ========== GLOBAL VARIABLES ==========
const STORAGE_COURSES_KEY = 'smartUniversity_courses';
const STORAGE_USERS_KEY = 'smartUniversityUsers';
const STORAGE_CURRENT_USER_KEY = 'smartUniversityCurrentUser';

let allCourses = []; // All available courses
let currentUser = null; // Current logged-in user
let filteredCourses = []; // For search functionality

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('✓ Courses Page Loaded');

    // Load current user
    loadCurrentUser();

    // Load courses
    loadCourses();

    // Setup search functionality
    setupSearch();

    // Render courses
    renderCourses();

    // Render registered courses
    renderRegisteredCourses();
});

// ========== DATA LOADING ==========
/**
 * Load current user from localStorage
 */
function loadCurrentUser() {
    const storedUser = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        console.log('Current user loaded:', currentUser.name);
    } else {
        // Redirect to login if no user
        window.location.href = 'login.html';
    }
}

/**
 * Load courses from localStorage
 * Initialize with sample data if none exist
 */
function loadCourses() {
    const storedCourses = localStorage.getItem(STORAGE_COURSES_KEY);
    if (storedCourses) {
        allCourses = JSON.parse(storedCourses);
    } else {
        // Start empty so admin can add courses manually
        allCourses = [];
    }
    filteredCourses = [...allCourses]; // Initialize filtered courses
}

/**
 * Save courses to localStorage
 */
function saveCourses() {
    localStorage.setItem(STORAGE_COURSES_KEY, JSON.stringify(allCourses));
}

/**
 * Get users from localStorage
 */
function getStoredUsers() {
    const storedValue = localStorage.getItem(STORAGE_USERS_KEY);
    try {
        return storedValue ? JSON.parse(storedValue) : [];
    } catch (error) {
        return [];
    }
}

/**
 * Save users to localStorage
 */
function saveUsers(users) {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
}

// ========== SEARCH FUNCTIONALITY (INNOVATION FEATURE) ==========
/**
 * Setup search input event listener
 */
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
}

/**
 * Handle search input
 */
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    if (searchTerm === '') {
        filteredCourses = [...allCourses];
    } else {
        filteredCourses = allCourses.filter(course =>
            course.courseName.toLowerCase().includes(searchTerm) ||
            course.courseCode.toLowerCase().includes(searchTerm) ||
            course.instructor.toLowerCase().includes(searchTerm)
        );
    }
    renderCourses();
}

// ========== RENDERING FUNCTIONS ==========
/**
 * Render available courses list
 */
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
        } else {
            coursesList.innerHTML =
                '<p class="col-span-full rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-lg text-center font-body-sm text-on-surface-variant">No courses are currently available. Ask an admin to add courses.</p>';
        }
        return;
    }

    const countEl = document.getElementById('course-count');
    if (countEl) countEl.textContent = String(filteredCourses.length);

    filteredCourses.forEach(course => {
        const isRegistered = currentUser.courses.some(c => c.id === course.id);
        const courseCard = createCourseCard(course, isRegistered);
        coursesList.appendChild(courseCard);
    });
}

/**
 * Create a course card element
 */
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
        ? `<span class="flex items-center gap-[2px] rounded-full bg-[#e6f4ea] px-sm py-[2px] font-label-sm text-label-sm text-[#137333]"><span class="h-2 w-2 rounded-full bg-[#137333]"></span> Open</span>`
        : `<span class="flex items-center gap-[2px] rounded-full bg-error-container px-sm py-[2px] font-label-sm text-label-sm text-on-error-container"><span class="h-2 w-2 rounded-full bg-error"></span> Full</span>`;

    let actionHtml = '';
    if (isRegistered) {
        actionHtml = `<button type="button" class="course-action shrink-0 rounded-lg border border-outline-variant bg-surface-container-high px-md py-sm font-label-md text-label-md text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container" data-course-id="${course.id}" data-action="drop">Drop</button>`;
    } else if (!open) {
        actionHtml = `<button type="button" disabled class="shrink-0 cursor-not-allowed rounded-lg border border-outline-variant bg-surface-container-high px-md py-sm font-label-md text-label-md text-on-surface-variant">Closed</button>`;
    } else {
        actionHtml = `<button type="button" class="course-action shrink-0 rounded-lg bg-primary px-md py-sm font-label-md text-label-md text-on-primary shadow-sm transition-colors hover:bg-primary-container" data-course-id="${course.id}" data-action="add">Enroll</button>`;
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
        </div>
        <div class="mt-auto flex items-end justify-between border-t border-surface-container-highest pt-md ${!open && !isRegistered ? 'opacity-70' : ''}">
            <div class="mr-md w-full">
                <div class="mb-xs flex justify-between font-label-sm text-label-sm text-secondary">
                    <span>Seats left</span>
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
            else addCourse(course.id);
        });
    }

    return card;
}

function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
}

/**
 * Render registered courses list
 */
function renderRegisteredCourses() {
    const registeredList = document.getElementById('registered-courses');
    if (!registeredList) return;

    registeredList.innerHTML = '';

    if (currentUser.courses.length === 0) {
        registeredList.innerHTML =
            '<p class="rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-lg text-center font-body-sm text-on-surface-variant">You have not registered for any courses yet.</p>';
        return;
    }

    currentUser.courses.forEach(course => {
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
            </div>
            <div class="mt-sm flex justify-end border-t border-outline-variant/50 pt-md">
                <button type="button" class="flex items-center gap-xs rounded-lg border border-outline-variant px-md py-sm font-label-md text-label-md text-secondary transition-colors duration-200 hover:border-error-container hover:bg-error-container hover:text-on-error-container reg-drop" data-course-id="${course.id}">
                    <span class="material-symbols-outlined text-[18px]">close</span> Drop course
                </button>
            </div>
        `;
        courseCard.querySelector('.reg-drop').addEventListener('click', () => dropCourse(course.id));
        registeredList.appendChild(courseCard);
    });
}

// ========== COURSE ACTIONS ==========
/**
 * Add a course to student's registration
 * Includes validation and real-time updates
 */
function addCourse(courseId) {
    // Find the course
    const course = allCourses.find(c => c.id === courseId);
    if (!course) {
        showErrorMessage('Course not found.');
        return;
    }

    // Validation: Check if already registered
    if (currentUser.courses.some(c => c.id === courseId)) {
        showErrorMessage('You are already registered for this course.');
        return;
    }

    // Validation: Check if course has available seats
    if (course.seats <= 0) {
        showErrorMessage('This course is full. No available seats.');
        return;
    }

    // Add course to user's courses
    currentUser.courses.push({
        id: course.id,
        courseName: course.courseName,
        courseCode: course.courseCode,
        instructor: course.instructor,
        schedule: course.schedule,
        room: course.room
    });

    // Decrement available seats
    course.seats--;

    // Update storage
    saveCourses();
    updateUserInStorage();

    updateCourseCard(courseId);
    renderRegisteredCourses();

    // Show success message
    showSuccessMessage(`Successfully registered for ${course.courseName}!`);
}

/**
 * Drop a course from student's registration
 * Includes real-time updates
 */
function dropCourse(courseId) {
    // Find the course
    const course = allCourses.find(c => c.id === courseId);
    if (!course) {
        showErrorMessage('Course not found.');
        return;
    }

    // Remove from user's courses
    currentUser.courses = currentUser.courses.filter(c => c.id !== courseId);

    // Increment available seats
    course.seats++;

    // Update storage
    saveCourses();
    updateUserInStorage();

    updateCourseCard(courseId);
    renderRegisteredCourses();

    // Show success message
    showSuccessMessage(`Successfully dropped ${course.courseName}.`);
}

/**
 * Update user in localStorage
 */
function updateUserInStorage() {
    const users = getStoredUsers();
    const userIndex = users.findIndex(u => u.email === currentUser.email);
    if (userIndex !== -1) {
        users[userIndex] = currentUser;
        saveUsers(users);
        // Update current user in storage
        localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(currentUser));
    }
}

/**
 * Update a specific course card in the available courses list
 * For real-time seat count updates
 */
function updateCourseCard(courseId) {
    const course = allCourses.find((c) => c.id === courseId);
    if (!course) return;
    const card = document.querySelector(`[data-course-card="${courseId}"]`);
    if (!card) return;
    const isRegistered = currentUser.courses.some((c) => c.id === courseId);
    card.replaceWith(createCourseCard(course, isRegistered));
}

// ========== MESSAGE DISPLAY ==========
/**
 * Show error message
 */
function showErrorMessage(message) {
    showMessage(message, 'error');
}

/**
 * Show success message
 */
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

// ========== UTILITY FUNCTIONS ==========
/**
 * Check if user is logged in (additional validation)
 */
function isLoggedIn() {
    return currentUser !== null;
}

/**
 * Logout function
 */
function logout() {
    localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
    window.location.href = 'login.html';
}