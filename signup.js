// ===== گرفتن المان‌های فرم =====
var signupBtn = document.getElementById('signupBtn');
var msgEl = document.getElementById('signupMsg');
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
    
    // چک کردن وجود فیلدها (برای جلوگیری از خطای null)
    var userEl = document.getElementById('username');
    var emailEl = document.getElementById('email');
    var passEl = document.getElementById('password');
    var classEl = document.getElementById('className');
    
    if (!userEl || !emailEl || !passEl || !classEl) {
      if (msgEl) {
        msgEl.textContent = 'خطا: فیلدهای فرم پیدا نشدند. صفحه را رفرش کنید.';
        msgEl.style.color = '#e74c3c';
      }
      return;
    }

    // گرفتن مقادیر
    var username = userEl.value.trim();
    var email = emailEl.value.trim();
    var password = passEl.value;
    var class_name = classEl.value;
    var inviteCode = inviteCodeInput ? inviteCodeInput.value.trim() : '';

    if (!username || !email || !password || !class_name) {
      if (msgEl) {
        msgEl.textContent = 'همه فیلدها (به جز کد دعوت) را پر کنید!';
        msgEl.style.color = '#e74c3c';
      }
      return;
    }

    if (msgEl) {
      msgEl.textContent = 'در حال ثبت‌نام...';
      msgEl.style.color = 'var(--text-dim)';
    }
    signupBtn.disabled = true;

    // ۱. ساخت کاربر در Supabase Auth
    supabaseClient.auth.signUp({
      email: email,
      password: password,
    }).then(function(res) {
      if (res.error) {
        if (msgEl) {
          msgEl.textContent = 'خطا: ' + res.error.message;
          msgEl.style.color = '#e74c3c';
        }
        signupBtn.disabled = false;
        return;
      }

      var userId = res.data.user.id;

      // ۲. ساخت کد دعوت هوشمند (اسم + ۳ عدد)
      var cleanUsername = username.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
      if (cleanUsername === '') cleanUsername = 'user';
      var randomNum = Math.floor(100 + Math.random() * 900);
      var generatedInviteCode = cleanUsername + randomNum;

      // ۳. ساخت پروفایل توی دیتابیس
      supabaseClient.from('profiles').insert({
        id: userId,
        username: username,
        class_name: class_name,
        role: 'student',
        status: 'approved', // برای اینکه مستقیم بتونه وارد بشه
        xp: 0,
        total_minutes: 0,
        invite_code: generatedInviteCode
      }).then(function(profileRes) {
        if (profileRes.error) {
          if (msgEl) {
            msgEl.textContent = 'خطا در ساخت پروفایل: ' + profileRes.error.message;
            msgEl.style.color = '#e74c3c';
          }
          signupBtn.disabled = false;
          return;
        }

        // ۴. پردازش کد دعوت (اگر وارد شده بود)
        if (inviteCode) {
          supabaseClient.rpc('process_invite', {
            new_user_id: userId,
            code: inviteCode
          }).then(function(inviteRes) {
            if (inviteRes.error) console.error('خطا در ثبت دعوت:', inviteRes.error);
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
  if (msgEl) {
    msgEl.textContent = '✅ ثبت‌نام با موفقیت انجام شد!';
    msgEl.style.color = 'var(--green)';
  }
  setTimeout(function() {
    window.location.href = 'index.html';
  }, 1500);
}
