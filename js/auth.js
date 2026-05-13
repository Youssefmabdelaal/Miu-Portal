// Authentication — EduReg / Smart University (localStorage)

const STORAGE_USERS_KEY = 'smartUniversityUsers';
const STORAGE_CURRENT_USER_KEY = 'smartUniversityCurrentUser';

const DEFAULT_ADMIN = {
  name: 'Administrator',
  email: 'admin@smartuniversity.com',
  studentId: 'ADMIN001',
  password: 'Admin123!',
  role: 'admin',
  department: 'Administration',
  courses: [],
};

window.addEventListener('DOMContentLoaded', () => {
  initializeAdminAccount();
  setupRegisterForm();
  setupLoginForm();
});

function initializeAdminAccount() {
  const users = getStoredUsers();
  const adminExists = users.some((user) => user.role === 'admin');
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

  if (passwordInput && strengthBar && strengthText) {
    passwordInput.addEventListener('input', () =>
      updatePasswordStrength(passwordInput.value, strengthBar, strengthText)
    );
  }

  if (showPasswordCheckbox && passwordInput && confirmPasswordInput) {
    showPasswordCheckbox.addEventListener('change', () => {
      const type = showPasswordCheckbox.checked ? 'text' : 'password';
      passwordInput.type = type;
      confirmPasswordInput.type = type;
    });
  }

  registerForm.addEventListener('submit', handleRegister);
}

function setupLoginForm() {
  const loginForm = document.getElementById('login-form');
  if (!loginForm) return;

  const passwordInput = document.getElementById('password');
  const showPasswordCheckbox = document.getElementById('show-password');
  const togglePasswordBtn = document.getElementById('toggle-password');
  const togglePasswordIcon = document.getElementById('toggle-password-icon');

  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const next = passwordInput.type === 'password' ? 'text' : 'password';
      passwordInput.type = next;
      if (togglePasswordIcon) {
        togglePasswordIcon.textContent = next === 'password' ? 'visibility_off' : 'visibility';
      }
    });
  }

  if (showPasswordCheckbox && passwordInput) {
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
  } catch {
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

function validateIdentifier(raw) {
  const id = raw.trim();
  if (!id) return false;
  if (id.includes('@')) return validateEmail(id);
  return /^[A-Za-z0-9._-]{4,32}$/.test(id);
}

function findUserByIdentifier(users, raw) {
  const id = raw.trim();
  const lower = id.toLowerCase();
  return users.find((u) => {
    if (u.email && u.email.toLowerCase() === lower) return true;
    if (u.studentId && String(u.studentId).toLowerCase() === lower) return true;
    return false;
  });
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
    const span = textElement.querySelector('span');
    if (span) span.textContent = 'Empty';
    return;
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const span = textElement.querySelector('span');
  if (score <= 2) {
    barElement.className = 'weak';
    barElement.style.width = '30%';
    if (span) span.textContent = 'Weak';
  } else if (score <= 4) {
    barElement.className = 'medium';
    barElement.style.width = '65%';
    if (span) span.textContent = 'Medium';
  } else {
    barElement.className = 'strong';
    barElement.style.width = '100%';
    if (span) span.textContent = 'Strong';
  }
}

function handleRegister(event) {
  event.preventDefault();
  const nameEl = document.getElementById('name');
  const studentIdEl = document.getElementById('studentId');
  const emailEl = document.getElementById('email');
  const departmentEl = document.getElementById('department');
  const termsEl = document.getElementById('terms');

  const name = nameEl ? nameEl.value.trim() : '';
  const studentId = studentIdEl ? studentIdEl.value.trim() : '';
  const email = emailEl ? emailEl.value.trim().toLowerCase() : '';
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  const department = departmentEl ? departmentEl.value : '';
  const messageElement = document.getElementById('form-message');

  if (!name || !studentId || !email || !password || !confirmPassword) {
    showMessage(messageElement, 'Please complete all required fields.', 'error');
    return;
  }

  if (!department) {
    showMessage(messageElement, 'Please select your department.', 'error');
    return;
  }

  if (termsEl && !termsEl.checked) {
    showMessage(messageElement, 'You must agree to the Terms of Service and Privacy Policy.', 'error');
    return;
  }

  if (!validateEmail(email)) {
    showMessage(messageElement, 'Enter a valid university email address.', 'error');
    return;
  }

  if (!validateIdentifier(studentId)) {
    showMessage(messageElement, 'Student ID must be 4–32 characters (letters, numbers, . _ -).', 'error');
    return;
  }

  if (!validatePassword(password)) {
    showMessage(
      messageElement,
      'Password must be at least 8 characters and include uppercase, lowercase, and a number.',
      'error'
    );
    return;
  }

  if (password !== confirmPassword) {
    showMessage(messageElement, 'Passwords do not match.', 'error');
    return;
  }

  const users = getStoredUsers();
  if (users.some((u) => u.email === email)) {
    showMessage(messageElement, 'This email is already registered. Please log in instead.', 'error');
    return;
  }
  if (users.some((u) => u.studentId && String(u.studentId).toLowerCase() === studentId.toLowerCase())) {
    showMessage(messageElement, 'This Student ID is already registered.', 'error');
    return;
  }

  const newUser = {
    name,
    studentId,
    email,
    department,
    password,
    role: 'student',
    courses: [],
  };

  users.push(newUser);
  saveUsers(users);
  showMessage(messageElement, 'Registration successful! Redirecting to login…', 'success');

  setTimeout(() => {
    window.location.href = 'login.html';
  }, 1200);
}

function handleLogin(event) {
  event.preventDefault();
  const identifierEl = document.getElementById('identifier');
  const emailLegacy = document.getElementById('email');
  const rawId = identifierEl ? identifierEl.value : emailLegacy ? emailLegacy.value : '';
  const password = document.getElementById('password').value;
  const messageElement = document.getElementById('form-message');

  if (!rawId || !password) {
    showMessage(messageElement, 'Please enter your email or Student ID and password.', 'error');
    return;
  }

  if (!validateIdentifier(rawId)) {
    showMessage(messageElement, 'Enter a valid email or Student ID.', 'error');
    return;
  }

  const users = getStoredUsers();
  const account = findUserByIdentifier(users, rawId);

  if (!account || account.password !== password) {
    showMessage(messageElement, 'Login failed. Check your credentials and try again.', 'error');
    return;
  }

  setCurrentUser(account);
  showMessage(messageElement, 'Login successful! Redirecting…', 'success');

  setTimeout(() => {
    if (account.role === 'admin') {
      window.location.href = 'admin-dashboard.html';
    } else {
      window.location.href = 'student-dashboard.html';
    }
  }, 900);
}

function showMessage(element, text, type) {
  if (!element) return;
  element.textContent = text;
  const base =
    'rounded-lg border px-md py-sm font-body-sm text-body-sm ';
  if (type === 'error') {
    element.className =
      base +
      'border-error/30 bg-error-container text-on-error-container';
  } else {
    element.className =
      base +
      'border-primary-fixed-dim bg-primary-fixed text-on-primary-fixed';
  }
}
