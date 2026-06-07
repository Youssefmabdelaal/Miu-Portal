const translations = {
  en: {
    course_catalog: 'Course Catalog',
    academic_portal: 'Academic Portal',
    register_classes: 'Register for Classes',
    dashboard: 'Dashboard',
    course_search: 'Course Search',
    my_schedule: 'My Schedule',
    cash_deposit: 'Faculty Cash Deposit',
    profile: 'Profile',
    log_out: 'Log Out',
    billing_summary: 'Billing summary',
    no_enrolled: 'No enrolled courses yet.',
    available_courses: 'Available courses',
    my_registered: 'My registered courses',
    showing: 'Showing',
    courses_count: 'courses',
    search_placeholder: 'Search by course code, title, or instructor...',
    total: 'Total',
    confirm_payment: 'Confirm payment',
    cancel: 'Cancel',
    course_payment: 'Course payment',
    seats_left: 'Seats left',
    open: 'Open',
    full: 'Full',
    enroll: 'Enroll',
    drop: 'Drop',
    drop_course: 'Drop course',
    fee: 'Fee:',
    closed: 'Closed',
    login: 'Login'
  },
  ar: {
    course_catalog: 'دليل المقررات',
    academic_portal: 'البوابة الأكاديمية',
    register_classes: 'تسجيل المقررات',
    dashboard: 'لوحة القيادة',
    course_search: 'البحث عن مقررات',
    my_schedule: 'جدولي',
    cash_deposit: 'الإيداع النقدي للكلية',
    profile: 'الملف الشخصي',
    log_out: 'تسجيل الخروج',
    billing_summary: 'ملخص الفواتير',
    no_enrolled: 'لم تقم بتسجيل أي مقررات بعد.',
    available_courses: 'المقررات المتاحة',
    my_registered: 'مقرراتي المسجلة',
    showing: 'عرض',
    courses_count: 'مقرر',
    search_placeholder: 'ابحث برمز المقرر، العنوان، أو الأستاذ...',
    total: 'المجموع',
    confirm_payment: 'تأكيد الدفع',
    cancel: 'إلغاء',
    course_payment: 'دفع رسوم المقرر',
    seats_left: 'المقاعد المتبقية',
    open: 'متاح',
    full: 'ممتلئ',
    enroll: 'تسجيل',
    drop: 'إلغاء',
    drop_course: 'إلغاء المقرر',
    fee: 'الرسوم:',
    closed: 'مغلق',
    login: 'تسجيل الدخول'
  }
};

let currentLang = localStorage.getItem('edureg_lang') || 'en';

function setLanguage(lang) {
  if (translations[lang]) {
    currentLang = lang;
    localStorage.setItem('edureg_lang', lang);
    applyTranslations();
  }
}

function applyTranslations() {
  document.documentElement.lang = currentLang;
  if (currentLang === 'ar') {
    document.documentElement.dir = 'rtl';
  } else {
    document.documentElement.dir = 'ltr';
  }

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[currentLang] && translations[currentLang][key]) {
      if (el.tagName === 'INPUT' && el.type === 'search') {
        el.placeholder = translations[currentLang][key];
      } else {
        el.childNodes.forEach(child => {
          if (child.nodeType === Node.TEXT_NODE && child.textContent.trim() !== '') {
            child.textContent = translations[currentLang][key];
          }
        });
        if (el.childNodes.length === 0) {
          el.textContent = translations[currentLang][key];
        }
      }
    }
  });

  if (window.renderCourses) {
    window.renderCourses();
    window.renderRegisteredCourses();
    if (window.renderPagination) window.renderPagination();
  }
}

function translate(key) {
  return translations[currentLang][key] || key;
}

function formatDate(dateString) {
  if (!dateString) return '—';
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  if (currentLang === 'ar') {
    return new Date(dateString).toLocaleDateString('ar-EG', options);
  }
  return new Date(dateString).toLocaleDateString('en-US', options);
}

document.addEventListener('DOMContentLoaded', () => {
  applyTranslations();
  
  const langToggle = document.getElementById('lang-toggle');
  if (langToggle) {
    langToggle.value = currentLang;
    langToggle.addEventListener('change', (e) => {
      setLanguage(e.target.value);
    });
  }
});
