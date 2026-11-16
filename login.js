// ===== ورود با نام کاربری =====
var loginBtn = document.getElementById('loginBtn');
var msgEl = document.getElementById('loginMsg');

if (loginBtn) {
  loginBtn.addEventListener('click', function(e) {
    e.preventDefault();

    var usernameEl = document.getElementById('username');
    var passwordEl = document.getElementById('password');

    if (!usernameEl || !passwordEl) return;

    var username = usernameEl.value.trim();
    var password = passwordEl.value;

    if (!username || !password) {
      if (msgEl) {
        msgEl.textContent = 'نام کاربری و رمز عبور را وارد کنید.';
        msgEl.style.color = '#e74c3c';
      }
      return;
    }

    if (msgEl) {
      msgEl.textContent = 'در حال ورود...';
      msgEl.style.color = 'var(--text-dim)';
    }
    loginBtn.disabled = true;

    // ۱. پیدا کردن ایمیل فیکِ مربوط به این نام کاربری
    supabaseClient.from('profiles').select('email').eq('username', username).single().then(function(res) {
      if (res.error || !res.data || !res.data.email) {
        if (msgEl) {
          msgEl.textContent = 'کاربری با این نام پیدا نشد!';
          msgEl.style.color = '#e74c3c';
        }
        loginBtn.disabled = false;
        return;
      }

      var fakeEmail = res.data.email;

      // ۲. ورود با ایمیل فیک و رمز عبور
      supabaseClient.auth.signInWithPassword({
        email: fakeEmail,
        password: password
      }).then(function(authRes) {
        if (authRes.error) {
          if (msgEl) {
            msgEl.textContent = 'رمز عبور اشتباه است!';
            msgEl.style.color = '#e74c3c';
          }
          loginBtn.disabled = false;
          return;
        }

        // ورود موفق
        if (msgEl) {
          msgEl.textContent = '✅ ورود موفق! در حال انتقال...';
          msgEl.style.color = 'var(--green)';
        }
        window.location.href = 'index.html';
      });
    });
  });
}
