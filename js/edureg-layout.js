document.addEventListener('DOMContentLoaded', async function () {
  const authRole = document.body.dataset.authRole;
  if (authRole && window.EduRegAPI) {
    await EduRegAPI.requireAuth({ role: authRole });
  }

  document.querySelectorAll('[data-logout]').forEach(function (el) {
    el.addEventListener('click', async function (e) {
      e.preventDefault();
      await EduRegAPI.apiLogout();
      window.location.href = 'login.html';
    });
  });
});
