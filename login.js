var loginBtn = document.getElementById('loginBtn');
var loginMsg = document.getElementById('loginMsg');

// این تابع بررسی می‌کنه که کاربر "ایمیل" زده یا "اسم کاربری"
function usernameToEmail(username) {
  // اگه توش @ بود، یعنی ایمیل واقعیه (مثل اکانت مشاور یا ادمین)
  if (username.includes('@')) {
    return username;
  }
  
  // اگه اسم کاربری بود (برای بچه‌ها)، به ایمیل ساختگی تبدیلش می‌کنه
  var hex = '';
  for (var i = 0; i < username.length; i++) {
    hex += username.codePointAt(i).toString(16);
  }
  return 'user_' + hex + '@example.com';
}

loginBtn.addEventListener('click', function() {
  var username = document.getElementById('username').value.trim();
  var password = document.getElementById('password').value;

  if (username.length < 3 || password.length < 6) {
    loginMsg.textContent = 'اسم کاربری (یا ایمیل) و رمز رو کامل بزن';
    loginMsg.style.color = '#e74c3c';
    return;
  }

  var email = usernameToEmail(username);
  loginMsg.textContent = 'در حال ورود...';
  loginMsg.style.color = '#8fa3b0';

  supabaseClient.auth.signInWithPassword({
    email: email,
    password: password
  }).then(function(res) {
    if (res.error) {
      loginMsg.textContent = '❌ اسم کاربری/ایمیل یا رمز اشتباهه';
      loginMsg.style.color = '#e74c3c';
      return;
    }

    loginMsg.textContent = '✅ خوش اومدی!';
    loginMsg.style.color = '#2ecc71';
    setTimeout(function() {
      window.location.href = 'index.html';
    }, 1000);
  });
});