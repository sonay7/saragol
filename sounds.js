// ===== سیستم افکت‌های صوتی =====
var soundEnabled = true; // اگه کاربر بخواد می‌تونه بعداً قطعش کنه

// لیست صداها
var sounds = {
  click: new Audio('audio/click.mp3'),
  success: new Audio('audio/success.mp3'),
  achievement: new Audio('audio/achievement.mp3'),
  timer: new Audio('audio/timer_end.mp3')
};

// تنظیم صدای اولیه (ملایم باشه)
Object.values(sounds).forEach(function(s) {
  s.volume = 0.4; 
});

// تابع پخش صدا
window.playSound = function(name) {
  if (!soundEnabled) return;
  var s = sounds[name];
  if (!s) return;
  
  // برای اینکه اگه چند بار پشت سر هم کلیک شد، صدا قطع نشه
  s.currentTime = 0;
  s.play().catch(function(e) {
    // اگه مرورگر اجازه پخش نداد (مثلاً کاربر هنوز کلیک نکرده)
    console.log('صدا پخش نشد:', e);
  });
};

// اضافه کردن صدای کلیک به همه دکمه‌ها به صورت خودکار
document.addEventListener('click', function(e) {
  var target = e.target.closest('button, .btn, .forum-card, .nav-item');
  if (target) {
    playSound('click');
  }
});

// اضافه کردن دکمه قطع/وصل صدا به هدر (اختیاری)
document.addEventListener('DOMContentLoaded', function() {
  var header = document.querySelector('.header');
  if (!header) return;

  var soundBtn = document.createElement('button');
  soundBtn.innerHTML = '🔊';
  soundBtn.style.cssText = 'background:none; border:none; font-size:1.2rem; cursor:pointer; margin-right: 8px;';
  soundBtn.title = 'قطع/وصل صدا';
  soundBtn.onclick = function() {
    soundEnabled = !soundEnabled;
    soundBtn.innerHTML = soundEnabled ? '🔊' : '🔇';
  };
  
  // اضافه کردن به هدر (کنار آواتار)
  var userArea = header.querySelector('.user-area');
  if (userArea) {
    userArea.insertBefore(soundBtn, userArea.firstChild);
  }
});
