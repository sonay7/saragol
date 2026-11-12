// ===== گرفتن المان‌های فرم =====
var signupBtn = document.getElementById('signupBtn'); // دکمه ثبت‌نام
var msgEl = document.getElementById('signupMsg'); // جایی که پیام خطا یا موفقیت نشون داده میشه
var inviteCodeInput = document.getElementById('inviteCodeInput');

// ===== پر کردن خودکار کد دعوت از URL =====
var urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('ref') && inviteCodeInput) {
  inviteCodeInput.value = urlParams.get('ref');
}

// ===== تابع ثبت‌نام =====
if (signupBtn) {
  signupBtn.addEventListener('click', function(e) {
    e.preventDefault();
    
    // گرفتن مقادیر از فرم (این آیدی‌ها باید با فیلدهای HTML تو یکی باشن)
    var username = document.getElementById('username').value.trim();
    var email = document.getElementById('email').value.trim();
    var password = document.getElementById('password').value;
    var class_name = document.getElementById('className').value; // مثلاً "نهم 1"
    var inviteCode = inviteCodeInput ? inviteCodeInput.value.trim() : '';

    if (!username || !email || !password || !class_name) {
      msgEl.textContent = 'همه فیلدها رو پر کن!';
      msgEl.style.color = '#e74c3c';
      return;
    }

    msgEl.textContent = 'در حال ثبت‌نام...';
    msgEl.style.color = 'var(--text-dim)';
    signupBtn.disabled = true;

    // ۱. ساخت کاربر در Supabase Auth
    supabaseClient.auth.signUp({
      email: email,
      password: password,
    }).then(function(res) {
      if (res.error) {
        msgEl.textContent = 'خطا: ' + res.error.message;
        msgEl.style.color = '#e74c3c';
        signupBtn.disabled = false;
        return;
      }

      var userId = res.data.user.id;

      // ۲. ساخت پروفایل توی جدول profiles
      supabaseClient.from('profiles').insert({
        id: userId,
        username: username,
        class_name: class_name,
        role: 'student',
        status: 'approved',
        xp: 0,
        total_minutes: 0
      }).then(function(profileRes) {
        if (profileRes.error) {
          msgEl.textContent = 'خطا در ساخت پروفایل: ' + profileRes.error.message;
          msgEl.style.color = '#e74c3c';
          signupBtn.disabled = false;
          return;
        }

        // ۳. پردازش کد دعوت (اگر وارد شده بود)
        if (inviteCode) {
          supabaseClient.rpc('process_invite', {
            new_user_id: userId,
            code: inviteCode
          }).then(function(inviteRes) {
            if (inviteRes.error) {
              console.error('خطا در ثبت دعوت:', inviteRes.error);
            }
            // چه دعوت ثبت بشه چه نشه، کاربر باید بره به صفحه اصلی
            finishSignup();
          });
        } else {
          finishSignup();
        }
      });
    });
  });
}

function finishSignup() {
  msgEl.textContent = '✅ ثبت‌نام با موفقیت انجام شد!';
  msgEl.style.color = 'var(--green)';
  setTimeout(function() {
    window.location.href = 'index.html';
  }, 1500);
}
