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
