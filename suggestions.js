function loadSuggestions() {
  var listEl = document.getElementById('listContent');
  if (!listEl) return;

  supabaseClient.from('suggestions').select('*, profiles(username)').order('created_at', { ascending: false }).then(function(res) {
    listEl.innerHTML = '';
    var rows = res.data || [];
    if (rows.length === 0) {
      listEl.innerHTML = '<p class="lock-note">هنوز پیشنهادی ثبت نشده.</p>';
      return;
    }
    rows.forEach(function(s) {
      var div = document.createElement('div');
      div.className = 'admin-row';
      div.style.flexDirection = 'column';
      div.style.alignItems = 'flex-start';
      div.innerHTML = '<div style="width:100%;"><strong>' + (s.profiles ? s.profiles.username : 'ناشناس') + '</strong>' +
        '<p style="margin-top:8px; font-size:0.85rem; background:var(--bg); padding:10px; border-radius:8px; border-right:3px solid var(--blue);">' + s.text + '</p></div>';
      listEl.appendChild(div);
    });
  });
}

if (document.getElementById('sendSuggestionBtn')) {
  document.getElementById('sendSuggestionBtn').addEventListener('click', function() {
    var text = document.getElementById('suggestionText').value.trim();
    var msg = document.getElementById('suggestionMsg');
    if (text.length < 5) { msg.textContent = 'متن خیلی کوتاهه'; msg.style.color = '#e74c3c'; return; }

    supabaseClient.auth.getUser().then(function(res) {
      if (!res.data.user) return;
      supabaseClient.from('suggestions').insert({ user_id: res.data.user.id, text: text }).then(function(insRes) {
        if (insRes.error) { msg.textContent = 'خطا: ' + insRes.error.message; msg.style.color = '#e74c3c'; return; }
        msg.textContent = '✅ پیشنهادت ثبت شد'; msg.style.color = 'var(--green)';
        document.getElementById('suggestionText').value = '';
        loadSuggestions();
      });
    });
  });
  loadSuggestions();
}
