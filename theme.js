// ============ THEMES (برای سیستم لقب/سطح - profile.js ازش استفاده می‌کند) ============
// هر کلید = اسم لقب، مقدار = آرایه ۱۰ رنگ (profile.js به [0] و [9] نیاز دارد)
var THEMES = {
  'پیش فرض': ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed'],
  'طلایی':    ['#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#fcd34d', '#fde68a', '#fef3c7', '#fffbeb', '#fef9c3'],
  'اقیانوسی': ['#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e', '#38bdf8', '#7dd3fc', '#bae6fd', '#e0f2fe', '#f0f9ff'],
  'ساکورا':   ['#ec4899', '#db2777', '#be185d', '#9d174d', '#831843', '#f472b6', '#f9a8d4', '#fbcfe8', '#fce7f3', '#fdf2f8'],
  'جنگلی':    ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#4ade80', '#86efac', '#bbf7d0', '#dcfce7', '#f0fdf4']
};

// ============ تم رنگی سایت (داخل IIFE تا با فایل‌های دیگر تصادم نکند) ============
(function () {
  var savedTheme = localStorage.getItem('site-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
})();

window.createThemeSwitcher = function () {
  if (document.getElementById('themeSwitcherBtn')) return;

  var userArea = document.querySelector('.user-area');
  if (!userArea) return;

  var btn = document.createElement('button');
  btn.id = 'themeSwitcherBtn';
  btn.className = 'theme-btn';
  btn.innerHTML = '🎨';
  btn.title = 'تغییر تم سایت';

  userArea.insertBefore(btn, userArea.firstChild);

  btn.addEventListener('click', function () {
    var themes = ['dark', 'light', 'sakura', 'cafe', 'galaxy', 'ocean', 'lavender', 'peach', 'forest'];
    var current = localStorage.getItem('site-theme') || 'dark';
    var currentIndex = themes.indexOf(current);
    var nextIndex = (currentIndex + 1) % themes.length;
    var newTheme = themes[nextIndex];

    var msgMap = {
      'dark': 'شب 🌙', 'light': 'روز ☀️', 'sakura': 'ساکورا 🌸',
      'cafe': 'کافه ☕', 'galaxy': 'کهکشان 🌌', 'ocean': 'اقیانوس 🌊',
      'lavender': 'اسطوخودوس 🪻', 'peach': 'هلویی 🍑', 'forest': 'جنگل 🌲'
    };

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('site-theme', newTheme);

    var toast = document.createElement('div');
    toast.textContent = 'تم تغییر کرد به: ' + msgMap[newTheme];
    toast.style.cssText = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); background:var(--green); color:#fff; padding:10px 20px; border-radius:20px; z-index:9999; font-family:inherit; font-size:0.85rem; box-shadow:0 4px 10px rgba(0,0,0,0.2); transition: opacity 0.3s;';
    document.body.appendChild(toast);

    setTimeout(function () {
      toast.style.opacity = '0';
      setTimeout(function () { toast.remove(); }, 300);
    }, 2000);
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.createThemeSwitcher);
} else {
  window.createThemeSwitcher();
}
