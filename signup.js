var signupBtn = document.getElementById('signupBtn');
var signupMsg = document.getElementById('signupMsg');

signupBtn.addEventListener('click', function() {
  var firstName = document.getElementById('firstName').value.trim();
  var lastName = document.getElementById('lastName').value.trim();
  var className = document.getElementById('class').value;
  var password = document.getElementById('password').value;

  // چک کردن فارسی بودن
  var persianRegex = /^[\u0600-\u06FF\s]+$/;
  
  if (!persianRegex.test(firstName) || !persianRegex.test(lastName)) {
    signupMsg.textContent = '❌ لطفاً نام و نام خانوادگی را حتماً فارسی وارد کنید.';
    signupMsg.style.color = '#e74c3c';
    return;
  }

  if (password.length < 6) {
    signupMsg.textContent = 'رمز حداقل ۶ کاراکتر باشه';
    signupMsg.style.color = '#e74c3c';
    return;
  }

  // ساخت ایمیل با نام و نام خانوادگی
  var fullName = firstName + ' ' + lastName;
  var emailHex = '';
  for (var i = 0; i < fullName.length; i++) {
    emailHex += fullName.codePointAt(i).toString(16);
  }
  var email = 'user_' + emailHex + '@example.com';

  signupMsg.textContent = 'در حال ثبت‌نام...';
  signupMsg.style.color = '#8fa3b0';

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
      username: fullName, // کل اسم ذخیره میشه
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
