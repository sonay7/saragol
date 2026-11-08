// بررسی تم ذخیره شده در مرورگر و اعمال اون
const savedTheme = localStorage.getItem('site-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

// ساخت دکمه‌ی تغییر تم و اضافه کردنش به هدر
function createThemeSwitcher() {
  if (document.getElementById('themeSwitcherBtn')) return;

  const userArea = document.querySelector('.user-area');
  if (!userArea) return;

  const btn = document.createElement('button');
  btn.id = 'themeSwitcherBtn';
  btn.className = 'theme-btn';
  btn.innerHTML = '🎨';
  btn.title = 'تغییر تم سایت';

  // دکمه رو به عنوان اولین عنصر به ناحیه کاربر اضافه می‌کنیم
  userArea.insertBefore(btn, userArea.firstChild);

  btn.addEventListener('click', function() {
    let theme = localStorage.getItem('site-theme') || 'dark';
    let newTheme = 'dark';
    let msg = '';

    if (theme === 'dark') {
      newTheme = 'light';
      msg = 'تم روشن ☀️';
    } else if (theme === 'light') {
      newTheme = 'sakura';
      msg = 'تم ساکورا 🌸';
    } else {
      newTheme = 'dark';
      msg = 'تم شب 🌙';
    }

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('site-theme', newTheme);
    
    // نشون دادن یه پیغام کوچیک (Toast)
    let toast = document.createElement('div');
    toast.textContent = 'تم تغییر کرد به: ' + msg;
    toast.style.cssText = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); background:var(--green); color:#fff; padding:10px 20px; border-radius:20px; z-index:9999; font-family:inherit; font-size:0.85rem; box-shadow:0 4px 10px rgba(0,0,0,0.2); transition: opacity 0.3s;';
    document.body.appendChild(toast);
    
    // پاک کردن پیغام بعد از ۲ ثانیه
    setTimeout(() => { 
      toast.style.opacity = '0'; 
      setTimeout(() => toast.remove(), 300); 
    }, 2000);
  });
}

// اجرای تابع بعد از لود شدن کل صفحه
document.addEventListener('DOMContentLoaded', createThemeSwitcher);