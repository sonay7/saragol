supabaseClient.auth.getUser().then(function(res) {
  if (!res.data.user) {
    window.location.href = 'login.html';
    return;
  }

  supabaseClient.from('profiles').select('*').eq('id', res.data.user.id).single().then(function(p) {
    if (!p.data) return;
    var profile = p.data;

    // چک کردن وضعیت تایید
    if (profile.status === 'pending') {
      document.body.innerHTML = '<div style="text-align:center;padding:60px 20px;font-family:sans-serif;"><h2>⏳ در انتظار تأیید</h2><p style="color:#8fa3b0;margin-top:12px;">ثبت‌نامت انجام شد. منتظر تأیید ادمین باش.</p><a href="logout.html" style="color:#2ecc71;display:inline-block;margin-top:20px;">خروج</a></div>';
      return;
    }

    if (profile.status === 'rejected') {
      document.body.innerHTML = '<div style="text-align:center;padding:60px 20px;font-family:sans-serif;"><h2>❌ درخواستت رد شد</h2><p style="color:#8fa3b0;margin-top:12px;">اگه فکر می‌کنی اشتباهه، با ادمین تماس بگیر.</p><a href="logout.html" style="color:#2ecc71;display:inline-block;margin-top:20px;">خروج</a></div>';
      return;
    }

    // آپدیت اسم و آواتار
    var nameEls = document.querySelectorAll('.user-name');
    nameEls.forEach(function(el) { el.textContent = profile.username; });

    var avatarEls = document.querySelectorAll('.avatar');
    avatarEls.forEach(function(el) { el.textContent = profile.username.charAt(0); });

    // مخفی کردن دکمه‌ها بر اساس نقش
    if (profile.role === 'student') {
      document.querySelectorAll('a[href="admin.html"]').forEach(function(el) { el.style.display = 'none'; });
      document.querySelectorAll('a[href="counselor-panel.html"]').forEach(function(el) { el.style.display = 'none'; });
    }

    if (profile.role === 'counselor') {
      document.querySelectorAll('a[href="admin.html"]').forEach(function(el) { el.style.display = 'none'; });
    }

    // 👇 اینجا تغییر کرد 👇
    // مخفی کردن کتاب‌خوانی برای غیر عضوها، فقط توی نوار پایین (نه کارت صفحه اصلی)
    if (!profile.is_book_club_member) {
      document.querySelectorAll('.nav-item[href="books.html"]').forEach(function(el) { el.style.display = 'none'; });
    }
  });
});
