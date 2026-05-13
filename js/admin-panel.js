
let courses = []; // Store all courses
let currentEditingCourseId = null; // Track which course is being edited
let courseToDelete = null; // Track which course is being deleted

const STORAGE_CURRENT_USER_KEY = 'smartUniversityCurrentUser';

// ========== INITIALIZATION ==========
// Run when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('✓ Admin Panel Loaded');
    
    // Check if user is admin
    if (!isAdmin()) {
        alert('Access denied. Admin privileges required.');
        window.location.href = 'login.html';
        return;
    }
    
    // Load initial data
    loadCoursesFromStorage();
    
    // Attach event listeners
    attachEventListeners();
    
    // Render the table
    renderCoursesTable();
    updateStats();
});

// Function to check if current user is admin
function isAdmin() {
    const storedUser = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
    if (!storedUser) return false;
    try {
        const user = JSON.parse(storedUser);
        return user.role === 'admin';
    } catch (error) {
        return false;
    }
}

// ========== EVENT LISTENERS ==========
function attachEventListeners() {
    // Form submission
    document.getElementById('courseForm').addEventListener('submit', handleFormSubmit);
    
    // Form reset
    document.getElementById('resetBtn').addEventListener('click', resetForm);
    
    // Cancel edit button
    document.getElementById('cancelBtn').addEventListener('click', cancelEdit);
    
    // Search input
    document.getElementById('searchBox').addEventListener('keyup', handleSearch);
    
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', function() {
        loadCoursesFromStorage();
        renderCoursesTable();
        showSuccessMessage('Courses refreshed successfully!');
    });
    
    // Modal buttons
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
    document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);
    document.getElementById('modalOverlay').addEventListener('click', closeDeleteModal);
    
    // Logout button
    document.querySelector('.logout-btn').addEventListener('click', handleLogout);
}

// ========== LOGOUT FUNCTION ==========
function handleLogout(e) {
    e.preventDefault();
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
        alert('Logged out successfully!');
        window.location.href = 'login.html';
    }
}

// ========== FORM VALIDATION ==========
/**
 * Validates all form inputs
 * Returns true if all validations pass, false otherwise
 */
function validateForm() {
    // Clear previous errors
    clearFormErrors();
    
    let isValid = true;
    
    // Get form values
    const courseName = document.getElementById('courseName').value.trim();
    const courseCode = document.getElementById('courseCode').value.trim();
    const instructor = document.getElementById('instructor').value.trim();
    const seats = document.getElementById('seats').value.trim();
    const schedule = document.getElementById('schedule').value.trim();
    const room = document.getElementById('room').value.trim();
    
    // Validate Course Name
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
    // Validate Course Code (format: letters + numbers, e.g., CS101)
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
    
    // Validate Instructor Name
    if (instructor === '') {
        showFieldError('instructor', 'Instructor name is required');
        isValid = false;
    } else if (instructor.length < 3) {
        showFieldError('instructor', 'Instructor name must be at least 3 characters');
        isValid = false;
    }
    
    // Validate Seats
    if (seats === '') {
        showFieldError('seats', 'Available seats is required');
        isValid = false;
    } else if (isNaN(seats) || seats < 1 || seats > 500) {
        showFieldError('seats', 'Seats must be a number between 1 and 500');
        isValid = false;
    }
    
    // Validate Schedule
    if (schedule === '') {
        showFieldError('schedule', 'Schedule is required');
        isValid = false;
    } else if (schedule.length < 5) {
        showFieldError('schedule', 'Please enter a valid schedule');
        isValid = false;
    }
    
    // Validate Room
    if (room === '') {
        showFieldError('room', 'Room number is required');
        isValid = false;
    } else if (room.length < 2) {
        showFieldError('room', 'Please enter a room or location (at least 2 characters)');
        isValid = false;
    }
    
    return isValid;
}

/**
 * Check if course code already exists (to prevent duplicates)
 * Excludes the current course being edited
 */
function isCourseDuplicate(courseCode) {
    const norm = courseCode.toUpperCase();
    return courses.some(course =>
        String(course.courseCode || '').toUpperCase() === norm &&
        course.id !== currentEditingCourseId
    );
}

/**
 * Display error message for a specific form field
 */
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorElement = document.getElementById(fieldId + 'Error');
    
    field.parentElement.classList.add('error');
    errorElement.textContent = message;
}

/**
 * Clear all form validation errors
 */
function clearFormErrors() {
    document.querySelectorAll('.form-group').forEach(group => {
        group.classList.remove('error');
    });
    document.querySelectorAll('.error-message').forEach(msg => {
        msg.textContent = '';
    });
}

// ========== FORM SUBMISSION & CRUD OPERATIONS ==========
/**
 * Handle form submission (Add or Update course)
 */
function handleFormSubmit(e) {
    e.preventDefault();
    
    // Validate form before processing
    if (!validateForm()) {
        showErrorMessage('Please fix the errors above');
        return;
    }
    
    // Get form values
    const courseData = {
        courseName: document.getElementById('courseName').value.trim(),
        courseCode: document.getElementById('courseCode').value.trim().toUpperCase(),
        instructor: document.getElementById('instructor').value.trim(),
        seats: parseInt(document.getElementById('seats').value),
        schedule: document.getElementById('schedule').value.trim(),
        room: document.getElementById('room').value.trim(),
        description: document.getElementById('description').value.trim(),
        enrolledStudents: 0
    };
    
    // Check if we're updating an existing course or adding a new one
    if (currentEditingCourseId) {
        // UPDATE existing course
        updateCourse(currentEditingCourseId, courseData);
    } else {
        // ADD new course
        addCourse(courseData);
    }
}

/**
 * Add a new course
 */
function addCourse(courseData) {
    // Generate unique ID (timestamp + random)
    const newId = 'course_' + Date.now();
    
    // Create course object
    const newCourse = {
        id: newId,
        ...courseData,
        createdAt: new Date().toLocaleDateString()
    };
    
    // Add to array
    courses.push(newCourse);
    
    // Save to storage
    saveCoursesToStorage();
    
    // Reset form
    resetForm();
    
    // Update display
    renderCoursesTable();
    updateStats();
    
    // Show success message
    showSuccessMessage(`✓ Course "${courseData.courseName}" added successfully!`);
    
    console.log('✓ Course added:', newCourse);
}

/**
 * Update an existing course
 */
function updateCourse(courseId, courseData) {
    // Find course index
    const courseIndex = courses.findIndex(c => c.id === courseId);
    
    if (courseIndex === -1) {
        showErrorMessage('Course not found!');
        return;
    }
    
    // Preserve enrolled students count
    courseData.enrolledStudents = courses[courseIndex].enrolledStudents;
    
    // Update course
    courses[courseIndex] = {
        ...courses[courseIndex],
        ...courseData
    };
    
    // Save to storage
    saveCoursesToStorage();
    
    // Reset form and editing state
    resetForm();
    cancelEdit();
    
    // Update display
    renderCoursesTable();
    updateStats();
    
    // Show success message
    showSuccessMessage(`✓ Course "${courseData.courseName}" updated successfully!`);
    
    console.log('✓ Course updated:', courses[courseIndex]);
}

/**
 * Delete a course
 */
function deleteCourse(courseId) {
    // Find and remove course
    courses = courses.filter(c => c.id !== courseId);
    
    // Save to storage
    saveCoursesToStorage();
    
    // Update display
    renderCoursesTable();
    updateStats();
    
    // Show success message
    showSuccessMessage('✓ Course deleted successfully!');
    
    console.log('✓ Course deleted:', courseId);
}

// ========== EDIT & DELETE OPERATIONS ==========
/**
 * Load course data into form for editing
 */
function editCourse(courseId) {
    // Find course
    const course = courses.find(c => c.id === courseId);
    
    if (!course) {
        showErrorMessage('Course not found!');
        return;
    }
    
    // Set editing flag
    currentEditingCourseId = courseId;
    
    // Populate form with course data
    document.getElementById('courseName').value = course.courseName;
    document.getElementById('courseCode').value = course.courseCode;
    document.getElementById('instructor').value = course.instructor;
    document.getElementById('seats').value = course.seats;
    document.getElementById('schedule').value = course.schedule;
    document.getElementById('room').value = course.room;
    document.getElementById('description').value = course.description || '';
    
    // Update button labels and visibility
    document.getElementById('submitBtn').textContent = 'Update Course';
    document.getElementById('submitBtn').classList.add('btn-update');
    document.getElementById('resetBtn').style.display = 'none';
    document.getElementById('cancelBtn').style.display = 'inline-block';
    
    // Scroll to form
    document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
    
    // Focus first field
    document.getElementById('courseName').focus();
    
    console.log('✓ Editing course:', course);
}

/**
 * Cancel editing and reset form
 */
function cancelEdit() {
    currentEditingCourseId = null;
    
    // Reset form
    resetForm();
    
    // Update button labels and visibility
    document.getElementById('submitBtn').textContent = 'Add Course';
    document.getElementById('submitBtn').classList.remove('btn-update');
    document.getElementById('resetBtn').style.display = 'inline-block';
    document.getElementById('cancelBtn').style.display = 'none';
    
    console.log('✓ Edit cancelled');
}

/**
 * Show delete confirmation modal
 */
function showDeleteModal(courseId) {
    // Find course
    const course = courses.find(c => c.id === courseId);
    
    if (!course) {
        showErrorMessage('Course not found!');
        return;
    }
    
    // Set course to delete
    courseToDelete = courseId;
    
    // Show modal
    document.getElementById('deleteModal').style.display = 'flex';
    
    // Focus buttons
    document.getElementById('confirmDeleteBtn').focus();
}

/**
 * Close delete confirmation modal
 */
function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    courseToDelete = null;
}

/**
 * Confirm deletion
 */
function confirmDelete() {
    if (courseToDelete) {
        deleteCourse(courseToDelete);
        closeDeleteModal();
    }
}

// ========== FORM RESET ==========
/**
 * Reset form to initial state
 */
function resetForm() {
    document.getElementById('courseForm').reset();
    clearFormErrors();
    clearMessages();
    currentEditingCourseId = null;
}

// ========== TABLE RENDERING ==========
/**
 * Render courses table with all courses
 */
function renderCoursesTable() {
    const tableBody = document.getElementById('tableBody');
    const emptyState = document.getElementById('emptyState');
    
    // Check if there are courses
    if (courses.length === 0) {
        tableBody.innerHTML = '';
        emptyState.textContent = 'No courses found. Add a new course to get started.';
        emptyState.style.display = 'block';
        return;
    }
    
    // Hide empty state
    emptyState.style.display = 'none';
    
    // Clear table body
    tableBody.innerHTML = '';
    
    // Add each course as a table row
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
    
    console.log(`✓ Table rendered with ${courses.length} courses`);
}

// ========== SEARCH & FILTER ==========
/**
 * Handle search functionality
 */
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    // If search is empty, show all courses
    if (searchTerm === '') {
        renderCoursesTable();
        return;
    }
    
    // Filter courses based on search term
    const filteredCourses = courses.filter(course => {
        return course.courseName.toLowerCase().includes(searchTerm) ||
               course.courseCode.toLowerCase().includes(searchTerm) ||
               course.instructor.toLowerCase().includes(searchTerm);
    });
    
    // Display filtered results
    displayFilteredCourses(filteredCourses);
}

/**
 * Display filtered courses
 */
function displayFilteredCourses(filteredCourses) {
    const tableBody = document.getElementById('tableBody');
    const emptyState = document.getElementById('emptyState');
    
    // Check if there are filtered courses
    if (filteredCourses.length === 0) {
        tableBody.innerHTML = '';
        emptyState.textContent = 'No courses match your search.';
        emptyState.style.display = 'block';
        return;
    }
    
    // Hide empty state
    emptyState.style.display = 'none';
    
    // Clear table body
    tableBody.innerHTML = '';
    
    // Add filtered courses
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

// ========== STATISTICS ==========
/**
 * Update statistics displayed at bottom of table
 */
function updateStats() {
    // Calculate total courses
    const totalCourses = courses.length;
    
    // Calculate total available seats
    const totalSeats = courses.reduce((sum, course) => {
        return sum + course.seats;
    }, 0);
    
    // Update display
    document.getElementById('totalCourses').textContent = totalCourses;
    document.getElementById('totalSeats').textContent = totalSeats;
}

// ========== LOCAL STORAGE (Data Persistence) ==========
/**
 * Save courses to browser's local storage
 */
function saveCoursesToStorage() {
    try {
        localStorage.setItem('smartUniversity_courses', JSON.stringify(courses));
        console.log('✓ Courses saved to storage');
    } catch (error) {
        console.error('Error saving to storage:', error);
        showErrorMessage('Error saving data. Please try again.');
    }
}

/**
 * Load courses from browser's local storage
 */
function loadCoursesFromStorage() {
    try {
        const storedData = localStorage.getItem('smartUniversity_courses');
        
        if (storedData) {
            courses = JSON.parse(storedData);
            console.log('✓ Courses loaded from storage:', courses.length);
        } else {
            // Start with no courses so admin can add them manually
            courses = [];
            console.log('✓ No saved courses found. Add courses from the admin panel.');
        }
    } catch (error) {
        console.error('Error loading from storage:', error);
        courses = [];
    }
}

// ========== MESSAGE UTILITIES ==========
/**
 * Show success message
 */
function showSuccessMessage(message) {
    const element = document.getElementById('successMessage');
    element.textContent = message;
    element.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

/**
 * Show error message
 */
function showErrorMessage(message) {
    const element = document.getElementById('errorMessage');
    element.textContent = message;
    element.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

/**
 * Clear all messages
 */
function clearMessages() {
    document.getElementById('successMessage').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'none';
}

// ========== UTILITY FUNCTIONS ==========
/**
 * Escape HTML special characters to prevent XSS attacks
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// ========== KEYBOARD SHORTCUTS ==========
document.addEventListener('keydown', function(e) {
    // Escape key closes modal
    if (e.key === 'Escape') {
        closeDeleteModal();
    }
});
