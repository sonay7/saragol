var signupBtn = document.getElementById('signupBtn');
var signupMsg = document.getElementById('signupMsg');

function usernameToEmail(username) {
  var hex = '';
  for (var i = 0; i < username.length; i++) {
    hex += username.codePointAt(i).toString(16);
  }
  return 'user_' + hex + '@example.com';
}

signupBtn.addEventListener('click', function() {
  var username = document.getElementById('username').value.trim();
  var className = document.getElementById('class').value;
  var password = document.getElementById('password').value;

  if (username.length < 3) {
    signupMsg.textContent = 'اسم کاربری حداقل ۳ حرف باشه';
    signupMsg.style.color = '#e74c3c';
    return;
  }

  if (password.length < 6) {
    signupMsg.textContent = 'رمز حداقل ۶ کاراکتر باشه';
    signupMsg.style.color = '#e74c3c';
    return;
  }

  signupMsg.textContent = 'در حال بررسی...';
  signupMsg.style.color = '#8fa3b0';

  // اول چک کن اسم کاربری آزاده یا نه
  supabaseClient.from('profiles').select('username').eq('username', username).then(function(checkRes) {
    if (checkRes.data && checkRes.data.length > 0) {
      signupMsg.textContent = '❌ این اسم کاربری قبلاً گرفته شده، یکی دیگه انتخاب کن';
      signupMsg.style.color = '#e74c3c';
      return;
    }

    // اسم آزاده، ثبت‌نام کن
    var email = usernameToEmail(username);
    signupMsg.textContent = 'در حال ثبت‌نام...';

    supabaseClient.auth.signUp({
      email: email,
      password: password
    }).then(function(res) {
      if (res.error) {
        signupMsg.textContent = 'خطا: ' + res.error.message;
        signupMsg.style.color = '#e74c3c';
        return;
      }

      var userId = res.data.user.id;

      supabaseClient.from('profiles').insert({
        id: userId,
        username: username,
        class_name: className
      }).then(function(profileRes) {
        if (profileRes.error) {
          signupMsg.textContent = 'خطا در ذخیره پروفایل: ' + profileRes.error.message;
          signupMsg.style.color = '#e74c3c';
          return;
        }

        signupMsg.textContent = '✅ ثبت‌نام موفق! حالا وارد شو';
        signupMsg.style.color = '#2ecc71';
        setTimeout(function() {
          window.location.href = 'login.html';
        }, 1500);
      });
    });
  });
});