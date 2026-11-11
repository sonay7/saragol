supabaseClient.auth.getUser().then(function(res) {
  if (!res.data.user) { window.location.href = 'login.html'; return; }

  supabaseClient.from('profiles').select('*').eq('id', res.data.user.id).single().then(function(p) {
    if (!p.data) return;
    var profile = p.data;

    if (profile.status === 'pending') {
      document.body.innerHTML = '<div style="text-align:center;padding:60px 20px;font-family:sans-serif;"><h2>⏳ در انتظار تأیید</h2><p>منتظر تأیید ادمین باش.</p><a href="logout.html">خروج</a></div>';
      return;
    }
    if (profile.status === 'rejected') {
      document.body.innerHTML = '<div style="text-align:center;padding:60px 20px;font-family:sans-serif;"><h2>❌ رد شد</h2><a href="logout.html">خروج</a></div>';
      return;
    }

    // آپدیت اسم
    document.querySelectorAll('.user-name').forEach(function(el) { el.textContent = profile.username; });
    document.querySelectorAll('.avatar').forEach(function(el) { el.textContent = profile.username.charAt(0); });

    // مخفی کردن ادمین
    if (profile.role === 'student') {
      document.querySelectorAll('a[href="admin.html"]').forEach(function(el) { el.remove(); });
      document.querySelectorAll('a[href="counselor-panel.html"]').forEach(function(el) { el.remove(); });
    }
    if (profile.role === 'counselor') {
      document.querySelectorAll('a[href="admin.html"]').forEach(function(el) { el.remove(); });
    }
    
    // ====== این بخش کلاً حذف شد تا کارت کتاب‌خوانی هیچوقت غیب نشه ======
    // if (!profile.is_book_club_member) {
    //   document.querySelectorAll('a[href="books.html"]').forEach(function(el) { el.remove(); });
    // }
    
  });
});
