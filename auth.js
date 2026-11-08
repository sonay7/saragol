supabaseClient.auth.getUser().then(function(res) {
  if (!res.data.user) {
    window.location.href = 'login.html';
    return;
  }

  supabaseClient.from('profiles').select('*').eq('id', res.data.user.id).single().then(function(p) {
    if (!p.data) return;

    if (p.data.status === 'pending') {
      document.body.innerHTML = '<div style="text-align:center;padding:60px 20px;font-family:sans-serif;"><h2>⏳ در انتظار تأیید</h2><p style="color:#8fa3b0;margin-top:12px;">ثبت‌نامت انجام شد. منتظر تأیید ادمین باش.</p><a href="logout.html" style="color:#2ecc71;display:inline-block;margin-top:20px;">خروج</a></div>';
      return;
    }

    if (p.data.status === 'rejected') {
      document.body.innerHTML = '<div style="text-align:center;padding:60px 20px;font-family:sans-serif;"><h2>❌ درخواستت رد شد</h2><p style="color:#8fa3b0;margin-top:12px;">اگه فکر می‌کنی اشتباهه، با ادمین تماس بگیر.</p><a href="logout.html" style="color:#2ecc71;display:inline-block;margin-top:20px;">خروج</a></div>';
      return;
    }

    var nameEls = document.querySelectorAll('.user-name');
    nameEls.forEach(function(el) { el.textContent = p.data.username; });

    var avatarEls = document.querySelectorAll('.avatar');
    avatarEls.forEach(function(el) { el.textContent = p.data.username.charAt(0); });
  });
});