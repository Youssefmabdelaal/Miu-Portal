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
    
    // Update course limit warning
    updateCourseLimitWarning();
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
            coursesList.innerHTML = '<p class="no-courses">No courses match your search.</p>';
        } else {
            coursesList.innerHTML = '<p class="no-courses">No courses are currently available. The admin will add courses soon.</p>';
        }
        return;
    }

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
    const card = document.createElement('div');
    card.className = 'course-card';
    const isFull = course.seats <= 0;
    const isLimitReached = currentUser.courses.length >= 5;
    
    card.innerHTML = `
        <h3>${course.courseName}</h3>
        <p><strong>Code:</strong> ${course.courseCode}</p>
        <p><strong>Instructor:</strong> ${course.instructor}</p>
        <p><strong>Schedule:</strong> ${course.schedule}</p>
        <p><strong>Room:</strong> ${course.room}</p>
        <p><strong>Credits:</strong> ${course.creditHours || 3}</p>
        <p class="seats-info"><strong>Available Seats:</strong> <span id="seats-${course.id}">${course.seats}</span></p>
        ${isRegistered ?
            '<button class="btn drop-course" data-course-id="' + course.id + '">Drop Course</button>' :
            (isFull || (isLimitReached && !isRegistered) ?
                '<button class="btn" disabled style="opacity: 0.5; cursor: not-allowed;">' + (isFull ? 'Course Full' : 'Limit Reached') + '</button>' :
                '<button class="btn add-course" data-course-id="' + course.id + '">Add Course</button>')
        }
    `;

    // Add event listener to the button
    const button = card.querySelector('.btn:not([disabled])');
    if (button) {
        button.addEventListener('click', () => {
            if (isRegistered) {
                dropCourse(course.id);
            } else {
                addCourse(course.id);
            }
        });
    }

    return card;
}

/**
 * Render registered courses list
 */
function renderRegisteredCourses() {
    const registeredList = document.getElementById('registered-courses');
    if (!registeredList) return;

    registeredList.innerHTML = '';

    if (currentUser.courses.length === 0) {
        registeredList.innerHTML = '<p class="no-courses">You have not registered for any courses yet.</p>';
        return;
    }

    currentUser.courses.forEach(course => {
        const courseCard = document.createElement('div');
        courseCard.className = 'course-card registered';
        courseCard.innerHTML = `
            <h3>${course.courseName}</h3>
            <p><strong>Code:</strong> ${course.courseCode}</p>
            <p><strong>Instructor:</strong> ${course.instructor}</p>
            <p><strong>Schedule:</strong> ${course.schedule}</p>
            <p><strong>Room:</strong> ${course.room}</p>
            <p><strong>Credits:</strong> ${course.creditHours || 3}</p>
            <button class="btn drop-course" data-course-id="${course.id}">Drop Course</button>
        `;

        const button = courseCard.querySelector('.drop-course');
        button.addEventListener('click', () => dropCourse(course.id));

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

    // Validation: Check if student has reached 5-course limit
    if (currentUser.courses.length >= 5) {
        showErrorMessage('You have reached the maximum course limit of 5 courses. Please drop a course before registering for another.');
        return;
    }

    // Add course to user's courses
    currentUser.courses.push({
        id: course.id,
        courseName: course.courseName,
        courseCode: course.courseCode,
        instructor: course.instructor,
        schedule: course.schedule,
        room: course.room,
        creditHours: course.creditHours || 3
    });

    // Decrement available seats
    course.seats--;

    // Update storage
    saveCourses();
    updateUserInStorage();

    // Real-time UI updates
    updateCourseCard(courseId, false); // Update in available courses
    renderRegisteredCourses(); // Refresh registered courses
    updateCourseLimitWarning(); // Update the warning

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

    // Real-time UI updates
    updateCourseCard(courseId, true); // Update in available courses (now show add button)
    renderRegisteredCourses(); // Refresh registered courses
    updateCourseLimitWarning(); // Update the warning

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
function updateCourseCard(courseId, isNowAvailable) {
    const course = allCourses.find(c => c.id === courseId);
    if (!course) return;

    // Update seats display
    const seatsElement = document.getElementById(`seats-${courseId}`);
    if (seatsElement) {
        seatsElement.textContent = course.seats;
    }

    // Update button
    const card = seatsElement ? seatsElement.closest('.course-card') : null;
    if (card) {
        const button = card.querySelector('.btn');
        if (button) {
            if (isNowAvailable) {
                button.textContent = 'Add Course';
                button.className = 'btn add-course';
                button.removeEventListener('click', dropCourse);
                button.addEventListener('click', () => addCourse(courseId));
            } else {
                button.textContent = 'Drop Course';
                button.className = 'btn drop-course';
                button.removeEventListener('click', addCourse);
                button.addEventListener('click', () => dropCourse(courseId));
            }
        }
    }
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

/**
 * Show message in a temporary overlay or alert
 */
function showMessage(message, type) {
    // For simplicity, use alert. In a real app, use a proper notification system
    if (type === 'error') {
        alert('Error: ' + message);
    } else {
        alert('Success: ' + message);
    }

    // Alternative: Create a message element
    // const messageElement = document.createElement('div');
    // messageElement.className = `message ${type}`;
    // messageElement.textContent = message;
    // document.body.appendChild(messageElement);
    // setTimeout(() => messageElement.remove(), 3000);
}

/**
 * Update course limit warning
 */
function updateCourseLimitWarning() {
    const warning = document.getElementById('course-limit-warning');
    const countSpan = document.getElementById('registered-count');
    
    if (warning && countSpan) {
        countSpan.textContent = currentUser.courses.length;
        
        if (currentUser.courses.length >= 5) {
            warning.style.display = 'block';
        } else if (currentUser.courses.length > 0) {
            warning.style.display = 'block';
        } else {
            warning.style.display = 'none';
        }
    }
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