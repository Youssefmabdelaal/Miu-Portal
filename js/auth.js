// Authentication script for Smart University
// This file handles student registration, login validation, and basic admin credentials.

const STORAGE_USERS_KEY = 'smartUniversityUsers';
const STORAGE_CURRENT_USER_KEY = 'smartUniversityCurrentUser';

// Default admin account to support admin login later.
const DEFAULT_ADMIN = {
    name: 'Administrator',
    email: 'admin@smartuniversity.com',
    password: 'Admin123!',
    role: 'admin',
    courses: []
};

window.addEventListener('DOMContentLoaded', () => {
    initializeAdminAccount();
    setupRegisterForm();
    setupLoginForm();
});

// Ensure one admin account is always stored in localStorage.
function initializeAdminAccount() {
    const users = getStoredUsers();
    const adminExists = users.some(user => user.role === 'admin');
    if (!adminExists) {
        users.push(DEFAULT_ADMIN);
        saveUsers(users);
    }
}

function setupRegisterForm() {
    const registerForm = document.getElementById('register-form');
    if (!registerForm) return;

    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const showPasswordCheckbox = document.getElementById('show-password');
    const strengthBar = document.getElementById('strength-bar');
    const strengthText = document.getElementById('strength-text');

    passwordInput.addEventListener('input', () => updatePasswordStrength(passwordInput.value, strengthBar, strengthText));

    showPasswordCheckbox.addEventListener('change', () => {
        const type = showPasswordCheckbox.checked ? 'text' : 'password';
        passwordInput.type = type;
        confirmPasswordInput.type = type;
    });

    registerForm.addEventListener('submit', handleRegister);
}

function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;
    
    const passwordInput = document.getElementById('password');
    const showPasswordCheckbox = document.getElementById('show-password');

    if (showPasswordCheckbox) {
        showPasswordCheckbox.addEventListener('change', () => {
            const type = showPasswordCheckbox.checked ? 'text' : 'password';
            passwordInput.type = type;
        });
    }

    loginForm.addEventListener('submit', handleLogin);
}

function getStoredUsers() {
    const storedValue = localStorage.getItem(STORAGE_USERS_KEY);
    try {
        return storedValue ? JSON.parse(storedValue) : [];
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

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

function validatePassword(password) {
    const hasLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    return hasLength && hasUpper && hasLower && hasNumber;
}

function updatePasswordStrength(password, barElement, textElement) {
    if (!password) {
        barElement.className = '';
        barElement.style.width = '0%';
        textElement.querySelector('span').textContent = 'Empty';
        return;
    }

    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 2) {
        barElement.className = 'weak';
        barElement.style.width = '30%';
        textElement.querySelector('span').textContent = 'Weak';
    } else if (score <= 4) {
        barElement.className = 'medium';
        barElement.style.width = '65%';
        textElement.querySelector('span').textContent = 'Medium';
    } else {
        barElement.className = 'strong';
        barElement.style.width = '100%';
        textElement.querySelector('span').textContent = 'Strong';
    }
}

function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const messageElement = document.getElementById('form-message');

    if (!name || !email || !password || !confirmPassword) {
        showMessage(messageElement, 'Please complete all fields.', 'error');
        return;
    }

    if (!validateEmail(email)) {
        showMessage(messageElement, 'Enter a valid email address.', 'error');
        return;
    }

    if (!validatePassword(password)) {
        showMessage(messageElement, 'Password must be at least 8 characters long and include uppercase, lowercase, and a number.', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showMessage(messageElement, 'Passwords do not match. Please try again.', 'error');
        return;
    }

    const users = getStoredUsers();
    const duplicateUser = users.find(user => user.email === email);
    if (duplicateUser) {
        showMessage(messageElement, 'This email is already registered. Please login instead.', 'error');
        return;
    }

    const newUser = {
        name,
        email,
        password,
        role: 'student',
        courses: []
    };

    users.push(newUser);
    saveUsers(users);
    showMessage(messageElement, 'Registration successful! Redirecting to login...', 'success');

    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1200);
}

function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const selectedRole = document.getElementById('role').value;
    const messageElement = document.getElementById('form-message');

    if (!email || !password) {
        showMessage(messageElement, 'Please enter both email and password.', 'error');
        return;
    }

    if (!validateEmail(email)) {
        showMessage(messageElement, 'Enter a valid email address.', 'error');
        return;
    }

    const users = getStoredUsers();
    const account = users.find(user => user.email === email && user.password === password);

    if (!account) {
        showMessage(messageElement, 'Login failed. Check your email and password.', 'error');
        return;
    }

    // Check if the selected role matches the account role
    if (account.role !== selectedRole) {
        showMessage(messageElement, `Login failed. This account is not registered as a ${selectedRole}.`, 'error');
        return;
    }

    setCurrentUser(account);
    showMessage(messageElement, 'Login successful! Redirecting...', 'success');

    setTimeout(() => {
        if (account.role === 'admin') {
            window.location.href = 'admin-panel.html';
        } else {
            window.location.href = 'student-dashboard.html';
        }
    }, 900);
}

function showMessage(element, text, type) {
    if (!element) return;
    element.textContent = text;
    element.classList.remove('error', 'success');
    element.classList.add(type);
}
