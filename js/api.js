/**
 * Shared API client — all fetch calls use session cookies (credentials: include).
 */
/**
 * When pages are opened via file://, API calls must target the running server.
 */
const API_BASE =
  window.location.protocol === 'file:'
    ? 'http://localhost:3000'
    : '';

/**
 * Perform a JSON API request with consistent error handling.
 */
async function apiRequest(url, options = {}) {
  const config = {
    credentials: 'include',
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(`${API_BASE}${url}`, config);
  let data;

  try {
    data = await response.json();
  } catch {
    data = { success: false, message: 'Invalid server response' };
  }

  if (!response.ok) {
    const error = new Error(data.message || 'Request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

const SESSION_USER_KEY = 'smartUniversityCurrentUser';

/**
 * Cache user in sessionStorage for UI (server session is source of truth).
 */
function cacheUser(user) {
  if (user) {
    sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(SESSION_USER_KEY);
  }
}

/**
 * Get cached user from sessionStorage.
 */
function getCachedUser() {
  try {
    const raw = sessionStorage.getItem(SESSION_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Verify session with server and refresh cached user.
 */
async function refreshSession() {
  try {
    const data = await apiRequest('/api/auth/me');
    cacheUser(data.data.user);
    return data.data.user;
  } catch (error) {
    cacheUser(null);
    if (error.status === 401) {
      throw error;
    }
    return null;
  }
}

/**
 * Require authenticated user; redirect to login if session expired.
 */
async function requireAuth(options = {}) {
  const { role, redirectTo = 'login.html' } = options;

  try {
    const user = await refreshSession();
    if (!user) {
      window.location.href = redirectTo;
      return null;
    }
    if (role && user.role !== role) {
      window.location.href = user.role === 'admin' ? 'admin-dashboard.html' : 'student-dashboard.html';
      return null;
    }
    return user;
  } catch {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('expired')) {
      window.location.href = `${redirectTo}?expired=1`;
    } else {
      window.location.href = redirectTo;
    }
    return null;
  }
}

/**
 * Logout via API and clear client cache.
 */
async function apiLogout() {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' });
  } catch {
    /* session may already be gone */
  }
  cacheUser(null);
}

window.EduRegAPI = {
  apiRequest,
  cacheUser,
  getCachedUser,
  refreshSession,
  requireAuth,
  apiLogout,
  SESSION_USER_KEY,
};
