supabaseClient.auth.getUser().then(function(res) {
  if (!res.data.user) { window.location.href = 'login.html'; return; }
  var uid = res.data.user.id;

  supabaseClient.from('profiles').select('*').eq('id', uid).single().then(function(p) {
    if (!p.data) return;
    var profile = p.data;
    var status = profile.status;
    
    // محاسبه روزهای غیبت
    var lastSeenDate = profile.last_seen ? new Date(profile.last_seen) : new Date();
    var daysAway = Math.floor((Date.now() - lastSeenDate.getTime()) / (1000*60*60*24));

    // آپدیت last_seen به الان
    supabaseClient.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', uid);

    // --- چک کردن وضعیت ---
    if (status === 'pending') {
      document.body.innerHTML = '<div style="text-align:center;padding:60px 20px;font-family:sans-serif;direction:rtl;"><h2>⏳ در انتظار تأیید</h2><p>منتظر تأیید ادمین باش.</p><a href="logout.html">خروج</a></div>';
      return;
    }
    if (status === 'rejected') {
      document.body.innerHTML = '<div style="text-align:center;padding:60px 20px;font-family:sans-serif;direction:rtl;"><h2>❌ رد شد</h2><a href="logout.html">خروج</a></div>';
      return;
    }
    
    // اگر ۱۰ روز یا بیشتر غایب بوده، خودکار غیرفعال
    if (daysAway >= 10 && status === 'approved') {
      supabaseClient.from('profiles').update({ status: 'inactive' }).eq('id', uid);
      showInactiveScreen();
      return;
    }
    
    if (status === 'inactive') {
      showInactiveScreen();
      return;
    }
    
    // اگر ۳ تا ۹ روز غایب بوده و توی صفحه اصلی هستیم، پیام "دلمون تنگ شده" نشون بده
    var path = window.location.pathname;
    var isHomepage = path.endsWith('index.html') || path === '/' || path.endsWith('/') || path.endsWith('sarago');
    var today = new Date().toISOString().split('T')[0];
    if (daysAway >= 3 && isHomepage && profile.last_welcome_shown !== today) {
      setTimeout(function() { showWelcomeBack(profile.username, daysAway); }, 800);
      supabaseClient.from('profiles').update({ last_welcome_shown: today }).eq('id', uid);
    }

    // آپدیت اسم و آواتار
    document.querySelectorAll('.user-name').forEach(function(el) { el.textContent = profile.username; });
    document.querySelectorAll('.avatar').forEach(function(el) { el.textContent = profile.username.charAt(0); });

    // مخفی کردن لینک‌های ادمین
    if (profile.role === 'student') {
      document.querySelectorAll('a[href="admin.html"]').forEach(function(el) { el.remove(); });
      document.querySelectorAll('a[href="counselor-panel.html"]').forEach(function(el) { el.remove(); });
    }
    if (profile.role === 'counselor') {
      document.querySelectorAll('a[href="admin.html"]').forEach(function(el) { el.remove(); });
    }
  });
});

function showInactiveScreen() {
  document.body.innerHTML = '<div style="text-align:center;padding:60px 20px;font-family:sans-serif;direction:rtl;"><div style="font-size:4rem;">😴</div><h2>حساب شما غیرفعال شده</h2><p>به دلیل عدم فعالیت طولانی، حساب شما موقتاً غیرفعال شده است.</p><p style="margin-top:20px;">برای فعال‌سازی مجدد به ادمین پیام دهید:<br><a href="https://t.me/Aysonaizadi" style="color:#3498db;font-weight:bold;">@Aysonaizadi</a></p><a href="logout.html" style="display:inline-block;margin-top:30px;color:#e74c3c;">خروج از حساب</a></div>';
}

function showWelcomeBack(username, days) {
  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.85); display:flex; justify-content:center; align-items:center; z-index:99999; padding:20px;';
  modal.innerHTML = '<div style="background:#1a2530; border:2px solid #2ecc71; border-radius:20px; padding:30px 24px; max-width:400px; text-align:center; direction:rtl; color:#e8f0f5;"><div style="font-size:4rem; margin-bottom:10px;">🌻</div><h2 style="color:#2ecc71; margin-bottom:12px;">دلمون برات تنگ شده بود!</h2><p style="line-height:1.8;">' + username + ' جان، ' + days + ' روزه که بهمون سر نزدی! 😊<br>بیا یه سر بزن، کلی چیز جدید داریم.</p><button onclick="this.closest(\'div\').parentElement.remove()" style="margin-top:20px; padding:12px 24px; background:#2ecc71; color:#fff; border:none; border-radius:10px; cursor:pointer; font-family:inherit; font-size:1rem;">حتماً! 🚀</button></div>';
  document.body.appendChild(modal);
}
