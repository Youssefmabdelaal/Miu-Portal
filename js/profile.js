const DEFAULT_AVATAR = '/images/default-avatar.svg';

window.addEventListener('DOMContentLoaded', () => {
  initializeProfilePage();
});

async function initializeProfilePage() {
  const currentUser = await EduRegAPI.requireAuth({ role: 'student' });
  if (!currentUser) return;

  await loadProfile(currentUser);

  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', (event) => handleProfileSubmit(event));
  }
}

async function loadProfile(user) {
  try {
    const data = await EduRegAPI.apiRequest('/api/profile');
    populateProfileForm(data.data.user);
    const img = document.getElementById('profile-preview');
    if (img) img.src = data.data.user.profileImage || DEFAULT_AVATAR;
  } catch {
    populateProfileForm(user);
    const img = document.getElementById('profile-preview');
    if (img) img.src = user.profileImage || DEFAULT_AVATAR;
  }
}

function populateProfileForm(user) {
  const nameEl = document.getElementById('name');
  const emailEl = document.getElementById('email');
  if (nameEl) nameEl.value = user.name || '';
  if (emailEl) emailEl.value = user.email || '';
}

async function handleProfileSubmit(event) {
  event.preventDefault();

  const name = document.getElementById('name').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const messageElement = document.getElementById('formMessage');
  const submitBtn = event.target.querySelector('button[type="submit"]');

  if (!name) {
    showMessage(messageElement, 'Please enter your full name.', 'error');
    return;
  }

  const body = new FormData();
  body.append('name', name);

  if (password || confirmPassword) {
    if (password !== confirmPassword) {
      showMessage(messageElement, 'Passwords do not match.', 'error');
      return;
    }
    if (!validatePassword(password)) {
      showMessage(
        messageElement,
        'Password must be at least 8 characters long and include uppercase, lowercase, and a number.',
        'error'
      );
      return;
    }
    body.append('password', password);
  }

  const fileInput = document.getElementById('profileImage');
  if (fileInput && fileInput.files[0]) {
    body.append('profileImage', fileInput.files[0]);
  }

  if (submitBtn) submitBtn.disabled = true;

  try {
    const data = await EduRegAPI.apiRequest('/api/profile', {
      method: 'PUT',
      body,
    });

    const user = EduRegAPI.getCachedUser() || {};
    user.name = data.data.user.name;
    user.profileImage = data.data.user.profileImage;
    EduRegAPI.cacheUser(user);

    const img = document.getElementById('profile-preview');
    if (img) img.src = data.data.user.profileImage || DEFAULT_AVATAR;

    showMessage(messageElement, 'Profile updated successfully.', 'success');
    document.getElementById('password').value = '';
    document.getElementById('confirmPassword').value = '';
  } catch (error) {
    if (error.status === 401) {
      window.location.href = 'login.html?expired=1';
      return;
    }
    showMessage(messageElement, error.message || 'Unable to update profile.', 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

function validatePassword(password) {
  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasLength && hasUpper && hasLower && hasNumber;
}

function showMessage(element, text, type) {
  if (!element) return;
  element.textContent = text;
  element.classList.remove('hidden');
  const base = 'rounded-lg border px-md py-sm font-body-sm text-body-sm ';
  if (type === 'error') {
    element.className = base + 'border-error/30 bg-error-container text-on-error-container';
  } else {
    element.className = base + 'border-primary-fixed-dim bg-primary-fixed text-on-primary-fixed';
  }
}
