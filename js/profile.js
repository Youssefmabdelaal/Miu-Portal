const STORAGE_USERS_KEY = 'smartUniversityUsers';
const STORAGE_CURRENT_USER_KEY = 'smartUniversityCurrentUser';

window.addEventListener('DOMContentLoaded', () => {
    initializeProfilePage();
});

function initializeProfilePage() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    populateProfileForm(currentUser);

    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', event => handleProfileSubmit(event, currentUser));
    }

    // Setup show password functionality
    setupShowPassword();
}

function setupShowPassword() {
    const showPasswordCheckbox = document.getElementById('show-password');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    if (showPasswordCheckbox && passwordInput && confirmPasswordInput) {
        showPasswordCheckbox.addEventListener('change', () => {
            const type = showPasswordCheckbox.checked ? 'text' : 'password';
            passwordInput.type = type;
            confirmPasswordInput.type = type;
        });
    }
}

function getCurrentUser() {
    const storedUser = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
    if (!storedUser) return null;
    try {
        return JSON.parse(storedUser);
    } catch (error) {
        return null;
    }
}

function populateProfileForm(user) {
    document.getElementById('name').value = user.name || '';
    document.getElementById('email').value = user.email || '';
}

function handleProfileSubmit(event, currentUser) {
    event.preventDefault();

    const name = document.getElementById('name').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const messageElement = document.getElementById('formMessage');

    if (!name) {
        showMessage(messageElement, 'Please enter your full name.', 'error');
        return;
    }

    if (password || confirmPassword) {
        if (password !== confirmPassword) {
            showMessage(messageElement, 'Passwords do not match.', 'error');
            return;
        }
        if (!validatePassword(password)) {
            showMessage(messageElement, 'Password must be at least 8 characters long and include uppercase, lowercase, and a number.', 'error');
            return;
        }
        currentUser.password = password;
    }

    currentUser.name = name;

    const users = getStoredUsers();
    const userIndex = users.findIndex(user => user.email === currentUser.email);
    if (userIndex >= 0) {
        users[userIndex] = { ...users[userIndex], ...currentUser };
        saveUsers(users);
        setCurrentUser(currentUser);
        showMessage(messageElement, 'Profile updated successfully.', 'success');
    } else {
        showMessage(messageElement, 'Unable to update profile. Please log in again.', 'error');
    }
}

function validatePassword(password) {
    const hasLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    return hasLength && hasUpper && hasLower && hasNumber;
}

function getStoredUsers() {
    const stored = localStorage.getItem(STORAGE_USERS_KEY);
    try {
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        return [];
    }
}

function saveUsers(users) {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
}

function setCurrentUser(user) {
    localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(user));
}

function showMessage(element, text, type) {
    if (!element) return;
    element.textContent = text;
    element.classList.remove('error', 'success');
    element.classList.add(type);
}
