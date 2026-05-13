document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('[data-logout]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      localStorage.removeItem('smartUniversityCurrentUser');
      window.location.href = 'login.html';
    });
  });
});
