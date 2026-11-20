var currentUser = null, currentRole = null;

function toShamsi(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr);
  return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
}

function dateTimeShamsi(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr);
  return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
}

supabaseClient.auth.getUser().then(function(res) {
  if (!res.data.user) { window.location.href = 'login.html'; return; }
  currentUser = res.data.user;
  supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single().then(function(p) {
    if (!p.data) return;
    currentRole = p.data.role;
    if (currentRole !== 'admin' && currentRole !== 'superadmin') {
      alert('دسترسی نداری'); window.location.href = 'index.html'; return;
    }
    document.querySelector('.user-name').textContent = p.data.username;
    document.querySelector('.avatar').textContent = p.data.username.charAt(0);

    loadRequests(); loadUsers(); loadAdminNotices(); loadAdminBadges();
    loadAdminCinema(); loadTickets(); loadLikes();
    loadAdminPacks(); loadAdminWheel(); loadAdminQuests();
    loadUserMonitoring(); loadExams(); loadQuotes(); loadInbox();
  });
});

// ===== اعلانات =====
if (document.getElementById('addNoticeBtn')) {
  document.getElementById('addNoticeBtn').addEventListener('click', function() {
    var text = document.getElementById('noticeText').value.trim();
    var type = document.getElementById('noticeType').value;
    if (text.length < 3) return alert('متن کوتاهه');
    supabaseClient.from('notices').insert({ text: text, type: type }).then(function(res) {
      if (res.error) return alert('خطا: ' + res.error.message);
      document.getElementById('noticeText').value = '';
      loadAdminNotices();
    });
  });
}

function loadAdminNotices() {
  var list = document.getElementById('adminNoticesList'); if (!list) return;
  supabaseClient.from('notices').select('*').order('created_at', { ascending: false }).then(function(res) {
    list.innerHTML = '';
    (res.data || []).forEach(function(n) {
      var div = document.createElement('div');
      div.className = 'admin-row';
      div.innerHTML = '<div style="flex:1;"><strong>' + n.text + '</strong><span class="admin-sub">' + (n.type || 'عادی') + '</span></div>' +
        '<button class="btn btn-dim btn-sm" onclick="delNotice(' + n.id + ')" style="color:#e74c3c;">حذف</button>';
      list.appendChild(div);
    });
  });
}
window.delNotice = function(id) {
  if (confirm('حذف؟')) supabaseClient.from('notices').delete().eq('id', id).then(loadAdminNotices);
};

// ===== کاربران =====
function loadRequests() {
  var box = document.getElementById('requestsList'); if (!box) return;
  supabaseClient.from('profiles').select('*').eq('status', 'pending').then(function(res) {
    var rows = res.data || [];
    if (rows.length === 0) { box.innerHTML = '<p class="lock-note">درخواستی نیست ✅</p>'; return; }
    box.innerHTML = '';
    rows.forEach(function(u) {
      var div = document.createElement('div');
      div.className = 'admin-row';
      div.innerHTML = '<div><strong>' + u.username + '</strong><span class="admin-sub">' + u.class_name + '</span></div>' +
        '<div style="display:flex; gap:4px;"><button class="btn btn-green btn-sm" onclick="setStatus(\'' + u.id + '\',\'approved\')">تأیید</button>' +
        '<button class="btn btn-dim btn-sm" onclick="setStatus(\'' + u.id + '\',\'rejected\')">رد</button></div>';
      box.appendChild(div);
    });
  });
}
window.setStatus = function(id, s) {
  supabaseClient.from('profiles').update({ status: s }).eq('id', id).then(function() { loadRequests(); loadUsers(); });
};

function loadUsers() {
  var box = document.getElementById('usersList'); if (!box) return;
  supabaseClient.from('profiles').select('*').eq('status', 'approved').order('created_at', { ascending: false }).then(function(res) {
    var rows = res.data || [];
    if (rows.length === 0) { box.innerHTML = '<p class="lock-note">کاربری نیست</p>'; return; }
    box.innerHTML = '';
    rows.forEach(function(u) {
      var div = document.createElement('div');
      div.className = 'admin-row';
      div.innerHTML = '<div><strong>✅ ' + u.username + '</strong><span class="admin-sub">' + u.class_name + '</span></div>' +
        '<select class="input" onchange="setRole(\'' + u.id + '\',this.value)" style="width:auto; padding:4px; font-size:0.75rem;">' +
        '<option value="student"' + (u.role === 'student' ? ' selected' : '') + '>دانش‌آموز</option>' +
        '<option value="admin"' + (u.role === 'admin' ? ' selected' : '') + '>ادمین</option>' +
        '</select>';
      box.appendChild(div);
    });
  });
}
window.setRole = function(id, r) {
  supabaseClient.from('profiles').update({ role: r }).eq('id', id).then(loadUsers);
};

// ===== نشان‌ها =====
window.giveBadge = function() {
  var un = document.getElementById('badgeUsername').value.trim();
  var bn = document.getElementById('badgeName').value;
  if (!un) return alert('نام رو بنویس');
  supabaseClient.from('profiles').select('id, username').ilike('username', '%' + un + '%').then(function(res) {
    if (!res.data || res.data.length === 0) return alert('کاربر پیدا نشد');
    var user = res.data[0];
    if (!confirm('به ' + user.username + ' نشان ' + bn + ' بدی؟')) return;
    supabaseClient.from('user_badges').insert({ user_id: user.id, badge_name: bn, badge_icon: '🌟' }).then(function() {
      supabaseClient.from('notifications').insert({ user_id: user.id, title: '🌟 نشان جدید!', body: 'ادمین به شما نشان «' + bn + '» را اهدا کرد.', link: 'profile.html' });
      alert('✅ اهدا شد');
      document.getElementById('badgeUsername').value = '';
      loadAdminBadges();
    });
  });
};

function loadAdminBadges() {
  var list = document.getElementById('adminBadgesList'); if (!list) return;
  supabaseClient.from('user_badges').select('*, profiles(username)').order('created_at', { ascending: false }).then(function(res) {
    list.innerHTML = '';
    (res.data || []).forEach(function(b) {
      var div = document.createElement('div');
      div.className = 'admin-row';
      div.innerHTML = '<div><strong>' + (b.badge_icon || '🏅') + ' ' + b.badge_name + '</strong><span class="admin-sub">به: ' + (b.profiles ? b.profiles.username : '?') + '</span></div>' +
        '<button class="btn btn-dim btn-sm" onclick="delBadge(' + b.id + ')" style="color:#e74c3c;">حذف</button>';
      list.appendChild(div);
    });
  });
}
window.delBadge = function(id) {
  if (confirm('حذف؟')) supabaseClient.from('user_badges').delete().eq('id', id).then(loadAdminBadges);
};

// ===== سینما =====
window.addCinemaVideo = function() {
  var t = document.getElementById('cinemaTitle').value.trim();
  var d = document.getElementById('cinemaDesc').value.trim();
  var u = document.getElementById('cinemaUrl').value.trim();
  var p = parseInt(document.getElementById('cinemaPrice').value);
  if (!t || !u || !p) return alert('عنوان، لینک و قیمت الزامی');
  supabaseClient.from('cinema_videos').insert({ title: t, description: d, video_url: u, price: p }).then(function(res) {
    if (res.error) return alert('خطا: ' + res.error.message);
    document.getElementById('cinemaTitle').value = '';
    document.getElementById('cinemaDesc').value = '';
    document.getElementById('cinemaUrl').value = '';
    document.getElementById('cinemaPrice').value = '';
    loadAdminCinema();
  });
};

function loadAdminCinema() {
  var list = document.getElementById('adminCinemaList'); if (!list) return;
  supabaseClient.from('cinema_videos').select('*').order('created_at', { ascending: false }).then(function(res) {
    list.innerHTML = '';
    (res.data || []).forEach(function(v) {
      var div = document.createElement('div');
      div.className = 'admin-row';
      div.innerHTML = '<div><strong>' + v.title + '</strong><span class="admin-sub">' + v.price + ' XP</span></div>' +
        '<button class="btn btn-dim btn-sm" onclick="delCinema(' + v.id + ')" style="color:#e74c3c;">حذف</button>';
      list.appendChild(div);
    });
  });
}
window.delCinema = function(id) {
  if (confirm('حذف؟')) supabaseClient.from('cinema_videos').delete().eq('id', id).then(loadAdminCinema);
};

// ===== تاریخچه بلیط‌ها =====
function loadTickets() {
  var list = document.getElementById('ticketsList'); if (!list) return;
  list.innerHTML = '<p class="lock-note">در حال بارگذاری...</p>';
  supabaseClient.from('cinema_tickets').select('*, profiles(username), cinema_videos(title)').order('created_at', { ascending: false }).then(function(res) {
    list.innerHTML = '';
    var rows = res.data || [];
    if (rows.length === 0) { list.innerHTML = '<p class="lock-note">هنوز کسی بلیط نخریده.</p>'; return; }
    rows.forEach(function(t) {
      var div = document.createElement('div');
      div.className = 'admin-row';
      var un = t.profiles ? t.profiles.username : 'ناشناس';
      var title = t.cinema_videos ? t.cinema_videos.title : '؟';
      div.innerHTML = '<div><strong>' + un + '</strong><span class="admin-sub">فیلم: ' + title + ' | ' + dateTimeShamsi(t.created_at) + '</span></div>';
      list.appendChild(div);
    });
  });
}

// ===== تاریخچه لایک‌ها =====
function loadLikes() {
  var list = document.getElementById('likesList'); if (!list) return;
  list.innerHTML = '<p class="lock-note">در حال بارگذاری...</p>';
  supabaseClient.from('explore_likes').select('*, profiles(username), admin_inbox(file_url, file_type)').order('created_at', { ascending: false }).then(function(res) {
    list.innerHTML = '';
    var rows = res.data || [];
    if (rows.length === 0) { list.innerHTML = '<p class="lock-note">هنوز کسی لایک نکرده.</p>'; return; }
    rows.forEach(function(l) {
      var div = document.createElement('div');
      div.className = 'admin-row';
      var un = l.profiles ? l.profiles.username : 'ناشناس';
      var postType = l.admin_inbox && l.admin_inbox.file_type && l.admin_inbox.file_type.indexOf('video') === 0 ? '🎬 ویدیو' : '🖼️ عکس';
      var url = l.admin_inbox ? l.admin_inbox.file_url : '#';
      div.innerHTML = '<div><strong>' + un + '</strong><span class="admin-sub">' + postType + ' | ' + dateTimeShamsi(l.created_at) + '</span></div>' +
        (url !== '#' ? '<a href="' + url + '" target="_blank" class="btn btn-blue btn-sm">مشاهده</a>' : '');
      list.appendChild(div);
    });
  });
}

// ===== استیکرها =====
window.createStickerPack = function() {
  var n = document.getElementById('newPackName').value.trim();
  var p = parseInt(document.getElementById('newPackPrice').value);
  var i = document.getElementById('newPackIcon').value.trim() || '📦';
  if (!n || !p) return alert('نام و قیمت رو بزن');
  supabaseClient.from('sticker_packs').insert({ name: n, price: p, icon: i }).then(function() {
    document.getElementById('newPackName').value = '';
    document.getElementById('newPackPrice').value = '';
    document.getElementById('newPackIcon').value = '';
    loadAdminPacks();
  });
};

function loadAdminPacks() {
  var list = document.getElementById('adminPacksList'); if (!list) return;
  supabaseClient.from('sticker_packs').select('*, stickers(id, image_url)').order('created_at', { ascending: false }).then(function(res) {
    list.innerHTML = '';
    (res.data || []).forEach(function(p) {
      var cnt = p.stickers ? p.stickers.length : 0;
      var div = document.createElement('div');
      div.className = 'admin-row';
      div.innerHTML = '<div><strong>' + p.icon + ' ' + p.name + '</strong><span class="admin-sub">' + p.price + ' XP | ' + cnt + ' استیکر</span></div>' +
        '<div style="display:flex; gap:4px;">' +
        '<button class="btn btn-blue btn-sm" onclick="uploadSticker(\'' + p.id + '\')">+ استیکر</button>' +
        '<button class="btn btn-dim btn-sm" onclick="delPack(\'' + p.id + '\')" style="color:#e74c3c;">حذف</button></div>';
      list.appendChild(div);
    });
  });
}
window.uploadSticker = function(packId) {
  var input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
  input.onchange = function(e) {
    var file = e.target.files[0]; if (!file) return;
    var fn = 'sticker_' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9.]/g, '');
    supabaseClient.storage.from('videos').upload(fn, file).then(function(u) {
      if (u.error) return alert('خطا: ' + u.error.message);
      var url = supabaseClient.storage.from('videos').getPublicUrl(fn).data.publicUrl;
      supabaseClient.from('stickers').insert({ pack_id: packId, image_url: url }).then(loadAdminPacks);
    });
  };
  input.click();
};
window.delPack = function(id) {
  if (confirm('حذف پک و استیکرهاش؟')) supabaseClient.from('sticker_packs').delete().eq('id', id).then(loadAdminPacks);
};

// ===== گردونه =====
window.addWheelSlice = function() {
  var l = document.getElementById('wheelLabel').value.trim();
  var c = document.getElementById('wheelColor').value;
  var t = document.getElementById('wheelType').value;
  var v = parseInt(document.getElementById('wheelValue').value) || 0;
  if (!l) return alert('متن رو بنویس');
  supabaseClient.from('wheel_config').insert({ label: l, color: c, prize_type: t, prize_value: v }).then(function() {
    document.getElementById('wheelLabel').value = '';
    loadAdminWheel();
  });
};

function loadAdminWheel() {
  var list = document.getElementById('wheelSlicesList'); if (!list) return;
  supabaseClient.from('wheel_config').select('*').order('created_at', { ascending: true }).then(function(res) {
    list.innerHTML = '';
    (res.data || []).forEach(function(s) {
      var div = document.createElement('div');
      div.className = 'admin-row';
      div.innerHTML = '<div style="display:flex; align-items:center; gap:8px;"><div style="width:18px;height:18px;border-radius:50%;background:' + s.color + ';"></div><strong>' + s.label + '</strong></div>' +
        '<button class="btn btn-dim btn-sm" onclick="delWheel(' + s.id + ')" style="color:#e74c3c;">حذف</button>';
      list.appendChild(div);
    });
  });
}
window.delWheel = function(id) {
  if (confirm('حذف؟')) supabaseClient.from('wheel_config').delete().eq('id', id).then(loadAdminWheel);
};

// ===== ماموریت‌ها =====
window.addQuest = function() {
  var t = document.getElementById('questTitle').value.trim();
  var tp = document.getElementById('questType').value;
  var tg = parseInt(document.getElementById('questTarget').value) || 0;
  var xp = parseInt(document.getElementById('questXp').value) || 5;
  if (!t || tg < 1) return alert('عنوان و هدف رو درست بزن');
  supabaseClient.from('daily_quests').insert({ title: t, type: tp, target_value: tg, xp_reward: xp }).then(function() {
    document.getElementById('questTitle').value = '';
    document.getElementById('questTarget').value = '';
    document.getElementById('questXp').value = '';
    loadAdminQuests();
  });
};

function loadAdminQuests() {
  var list = document.getElementById('adminQuestsList'); if (!list) return;
  supabaseClient.from('daily_quests').select('*').order('created_at', { ascending: false }).then(function(res) {
    list.innerHTML = '';
    (res.data || []).forEach(function(q) {
      var div = document.createElement('div');
      div.className = 'admin-row';
      div.innerHTML = '<div><strong>' + q.title + '</strong><span class="admin-sub">' + q.type + ' | هدف: ' + q.target_value + ' | ' + q.xp_reward + ' XP</span></div>' +
        '<button class="btn btn-dim btn-sm" onclick="delQuest(' + q.id + ')" style="color:#e74c3c;">حذف</button>';
      list.appendChild(div);
    });
  });
}
window.delQuest = function(id) {
  if (confirm('حذف؟')) supabaseClient.from('daily_quests').delete().eq('id', id).then(loadAdminQuests);
};

// ===== پایش کاربران =====
function loadUserMonitoring() {
  var inactiveList = document.getElementById('inactiveUsersList');
  var wanderingList = document.getElementById('wanderingUsersList');
  if (!inactiveList || !wanderingList) return;

  supabaseClient.from('profiles').select('*').eq('status', 'inactive').then(function(res) {
    inactiveList.innerHTML = '';
    var rows = res.data || [];
    if (rows.length === 0) { inactiveList.innerHTML = '<p class="lock-note">کاربر غیرفعالی نیست.</p>'; return; }
    rows.forEach(function(u) {
      var days = u.last_seen ? Math.floor((Date.now() - new Date(u.last_seen).getTime()) / 86400000) : '?';
      var div = document.createElement('div');
      div.className = 'admin-row';
      div.innerHTML = '<div><strong>😴 ' + u.username + '</strong><span class="admin-sub">' + days + ' روز غیرفعال</span></div>' +
        '<button class="btn btn-green btn-sm" onclick="reactivate(\'' + u.id + '\')">فعال‌سازی</button>';
      inactiveList.appendChild(div);
    });
  });

  supabaseClient.from('profiles').select('*').eq('status', 'approved').then(function(res) {
    wanderingList.innerHTML = '';
    var rows = (res.data || []).filter(function(u) {
      if (!u.last_seen) return false;
      return Math.floor((Date.now() - new Date(u.last_seen).getTime()) / 86400000) >= 3;
    });
    if (rows.length === 0) { wanderingList.innerHTML = '<p class="lock-note">همه فعالن ✅</p>'; return; }

    var groups = {};
    rows.forEach(function(u) {
      var days = Math.floor((Date.now() - new Date(u.last_seen).getTime()) / 86400000);
      if (!groups[days]) groups[days] = [];
      groups[days].push(u);
    });
    Object.keys(groups).sort(function(a,b){return b-a;}).forEach(function(d) {
      var h = document.createElement('h4');
      h.style.cssText = 'font-size:0.85rem; color:#f1c40f; margin:12px 0 8px;';
      h.textContent = '💤 ' + d + ' روز غیبت (' + groups[d].length + ' نفر)';
      wanderingList.appendChild(h);
      groups[d].forEach(function(u) {
        var div = document.createElement('div');
        div.className = 'admin-row';
        div.innerHTML = '<div><strong>' + u.username + '</strong></div>' +
          '<button class="btn btn-dim btn-sm" style="color:#e74c3c;" onclick="deactivate(\'' + u.id + '\')">غیرفعال</button>';
        wanderingList.appendChild(div);
      });
    });
  });
}
window.reactivate = function(id) {
  if (confirm('فعال بشه؟')) supabaseClient.from('profiles').update({ status: 'approved', last_seen: new Date().toISOString() }).eq('id', id).then(loadUserMonitoring);
};
window.deactivate = function(id) {
  if (confirm('غیرفعال بشه؟')) supabaseClient.from('profiles').update({ status: 'inactive' }).eq('id', id).then(loadUserMonitoring);
};

// ===== آزمون‌ها و جمله‌ها =====
function loadExams() {
  var list = document.getElementById('examsList'); if (!list) return;
  supabaseClient.from('exams').select('*').eq('is_public', true).order('exam_date', { ascending: true }).then(function(res) {
    list.innerHTML = '';
    (res.data || []).forEach(function(e) {
      var div = document.createElement('div');
      div.className = 'admin-row';
      div.innerHTML = '<div><strong>' + e.subject + '</strong><span class="admin-sub">' + toShamsi(e.exam_date) + '</span></div>' +
        '<button class="btn btn-dim btn-sm" onclick="delExam(' + e.id + ')" style="color:#e74c3c;">حذف</button>';
      list.appendChild(div);
    });
  });
}
window.delExam = function(id) {
  supabaseClient.from('exams').delete().eq('id', id).then(loadExams);
};

if (document.getElementById('addExamBtn')) {
  document.getElementById('addExamBtn').addEventListener('click', function() {
    var s = document.getElementById('examSubject').value.trim();
    var d = document.getElementById('examDate').value;
    if (!s || !d) return alert('پر کن');
    supabaseClient.from('exams').insert({ subject: s, exam_date: d, class_name: 'همه', is_public: true, created_by: currentUser.id }).then(function() {
      document.getElementById('examSubject').value = '';
      document.getElementById('examDate').value = '';
      loadExams();
    });
  });
}

function loadQuotes() {
  var list = document.getElementById('quotesList'); if (!list) return;
  supabaseClient.from('quotes').select('*').order('created_at', { ascending: false }).then(function(res) {
    list.innerHTML = '';
    (res.data || []).forEach(function(q) {
      var div = document.createElement('div');
      div.className = 'admin-row';
      div.innerHTML = '<div>' + q.text + '</div>' +
        '<button class="btn btn-dim btn-sm" onclick="delQuote(' + q.id + ')" style="color:#e74c3c;">حذف</button>';
      list.appendChild(div);
    });
  });
}
window.delQuote = function(id) {
  supabaseClient.from('quotes').delete().eq('id', id).then(loadQuotes);
};

// ===== صندوق ورودی =====
function loadInbox() {
  var list = document.getElementById('inboxList'); if (!list) return;
  supabaseClient.from('admin_inbox').select('*, profiles(username)').eq('status', 'pending').order('created_at', { ascending: false }).then(function(res) {
    list.innerHTML = '';
    (res.data || []).forEach(function(i) {
      var div = document.createElement('div');
      div.className = 'admin-row';
      div.innerHTML = '<div><strong>' + (i.profiles ? i.profiles.username : '?') + '</strong>' +
        '<span class="admin-sub">' + (i.file_type || 'پیام') + '</span></div>' +
        '<div style="display:flex; gap:4px;">' +
        '<button class="btn btn-green btn-sm" onclick="approveInbox(' + i.id + ')">تأیید</button>' +
        '<button class="btn btn-dim btn-sm" onclick="delInbox(' + i.id + ')" style="color:#e74c3c;">رد</button></div>';
      list.appendChild(div);
    });
    if (list.innerHTML === '') list.innerHTML = '<p class="lock-note">خالیه ✅</p>';
  });
}
window.approveInbox = function(id) {
  supabaseClient.from('admin_inbox').update({ status: 'approved' }).eq('id', id).then(loadInbox);
};
window.delInbox = function(id) {
  supabaseClient.from('admin_inbox').delete().eq('id', id).then(loadInbox);
};
