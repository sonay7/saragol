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
    
    var firstNameEl = document.getElementById('firstName');
    var lastNameEl = document.getElementById('lastName');
    var passEl = document.getElementById('password');
    var classEl = document.getElementById('className');
    
    if (!firstNameEl || !lastNameEl || !passEl || !classEl) {
      if (msgEl) { msgEl.textContent = 'خطا: فیلدها پیدا نشدند.'; msgEl.style.color = '#e74c3c'; }
      return;
    }

    var firstName = firstNameEl.value.trim();
    var lastName = lastNameEl.value.trim();
    var fullName = firstName + ' ' + lastName;
    var password = passEl.value;
    var class_name = classEl.value;
    var inviteCode = inviteCodeInput ? inviteCodeInput.value.trim() : '';

    if (!firstName || !lastName || !password || !class_name) {
      if (msgEl) { msgEl.textContent = 'همه فیلدها را پر کنید!'; msgEl.style.color = '#e74c3c'; }
      return;
    }

    if (password.length < 6) {
      if (msgEl) { msgEl.textContent = 'رمز باید حداقل ۶ کاراکتر باشد!'; msgEl.style.color = '#e74c3c'; }
      return;
    }

    if (msgEl) { msgEl.textContent = 'در حال ثبت‌نام...'; msgEl.style.color = 'var(--text-dim)'; }
    signupBtn.disabled = true;

    var fakeEmail = 'user_' + Math.floor(Math.random() * 1000000) + '@saragol.local';

    supabaseClient.auth.signUp({ email: fakeEmail, password: password }).then(function(res) {
      if (res.error) {
        if (msgEl) { msgEl.textContent = 'خطا: ' + res.error.message; msgEl.style.color = '#e74c3c'; }
        signupBtn.disabled = false;
        return;
      }

      var userId = res.data.user.id;
      var cleanUsername = firstName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
      if (cleanUsername === '') cleanUsername = 'user';
      var randomNum = Math.floor(100 + Math.random() * 900);
      var generatedInviteCode = cleanUsername + randomNum;

      supabaseClient.from('profiles').insert({
        id: userId,
        username: fullName,
        class_name: class_name,
        role: 'student',
        status: 'pending', // ⬅️ اینجا برگشت به pending
        xp: 0,
        total_minutes: 0,
        invite_code: generatedInviteCode,
        email: fakeEmail
      }).then(function(profileRes) {
        if (profileRes.error) {
          if (msgEl) { msgEl.textContent = 'خطا در ساخت پروفایل: ' + profileRes.error.message; msgEl.style.color = '#e74c3c'; }
          signupBtn.disabled = false;
          return;
        }

        if (inviteCode) {
          supabaseClient.rpc('process_invite', { new_user_id: userId, code: inviteCode });
        }

        if (msgEl) {
          msgEl.textContent = '✅ ثبت‌نام انجام شد! منتظر تایید ادمین باشید.';
          msgEl.style.color = 'var(--green)';
        }
        setTimeout(function() {
          window.location.href = 'login.html';
        }, 3000);
      });
    });
  });
}
