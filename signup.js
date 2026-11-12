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
    
    // گرفتن مقادیر
    var username = document.getElementById('username').value.trim();
    var email = document.getElementById('email').value.trim();
    var password = document.getElementById('password').value;
    var class_name = document.getElementById('className').value;
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
        status: 'approved',
        xp: 0,
        total_minutes: 0,
        invite_code: generatedInviteCode // ثبت کد ساخته شده
      }).then(function(profileRes) {
        if (profileRes.error) {
          msgEl.textContent = 'خطا در ساخت پروفایل: ' + profileRes.error.message;
          msgEl.style.color = '#e74c3c';
          signupBtn.disabled = false;
          return;
        }

        // ۴. پردازش کد دعوت (اگر وارد شده بود)
        if (inviteCode) {
          supabaseClient.rpc('process_invite', {
            new_user_id: userId,
            code: inviteCode
          }).then(function(inviteRes) {
            if (inviteRes.error) {
              console.error('خطا در ثبت دعوت:', inviteRes.error);
            }
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
