const savedTheme = localStorage.getItem('site-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

function createThemeSwitcher() {
  if (document.getElementById('themeSwitcherBtn')) return;

  const userArea = document.querySelector('.user-area');
  if (!userArea) return;

  const btn = document.createElement('button');
  btn.id = 'themeSwitcherBtn';
  btn.className = 'theme-btn';
  btn.innerHTML = '🎨';
  btn.title = 'تغییر تم سایت';

  userArea.insertBefore(btn, userArea.firstChild);

  btn.addEventListener('click', function() {
    const themes = ['dark', 'light', 'sakura', 'cafe', 'galaxy', 'ocean', 'lavender', 'peach', 'forest'];
    let current = localStorage.getItem('site-theme') || 'dark';
    let currentIndex = themes.indexOf(current);
    let nextIndex = (currentIndex + 1) % themes.length;
    let newTheme = themes[nextIndex];

    let msgMap = {
      'dark': 'شب 🌙', 'light': 'روز ☀️', 'sakura': 'ساکورا 🌸', 
      'cafe': 'کافه ☕', 'galaxy': 'کهکشان 🌌', 'ocean': 'اقیانوس 🌊',
      'lavender': 'اسطوخودوس 🪻', 'peach': 'هلویی 🍑', 'forest': 'جنگل 🌲'
    };

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('site-theme', newTheme);
    
    let toast = document.createElement('div');
    toast.textContent = 'تم تغییر کرد به: ' + msgMap[newTheme];
    toast.style.cssText = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); background:var(--green); color:#fff; padding:10px 20px; border-radius:20px; z-index:9999; font-family:inherit; font-size:0.85rem; box-shadow:0 4px 10px rgba(0,0,0,0.2); transition: opacity 0.3s;';
    document.body.appendChild(toast);
    
    setTimeout(() => { 
      toast.style.opacity = '0'; 
      setTimeout(() => toast.remove(), 300); 
    }, 2000);
  });
}

document.addEventListener('DOMContentLoaded', createThemeSwitcher);
