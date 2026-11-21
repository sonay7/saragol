var currentUser = null, currentRole = null;

function toShamsi(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr);
  return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
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

    // لود کردن همه بخش‌ها با ترتیب جدید
    loadAdminNotices(); 
    loadAdminCinema(); 
    loadAdminQuotes(); 
    loadAdminExplore(); // بخش جدید
    loadAdminQuests(); 
    loadExams(); 
    loadRequests(); 
    loadUsers(); 
    loadAdminBadges();
    loadInbox();
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

// ===== جمله‌ها =====
window.addQuote = function() {
  var t = document.getElementById('quoteText').value.trim();
  if (t.length < 5) return alert('متن کوتاهه');
  supabaseClient.from('quotes').insert({ text: t }).then(function(res) {
    if (res.error) return alert('خطا در دیتابیس: ' + res.error.message); // برای دیباگ
    document.getElementById('quoteText').value = '';
    loadAdminQuotes();
  });
};

function loadAdminQuotes() {
  var list = document.getElementById('adminQuotesList'); if (!list) return;
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
  if (confirm('حذف؟')) supabaseClient.from('quotes').delete().eq('id', id).then(loadAdminQuotes);
};
// ===== اکسپلور (ویدیوهای جدید) =====
window.addExploreVideo = function() {
  var t = document.getElementById('exploreTitle').value.trim();
  var d = document.getElementById('exploreDesc').value.trim();
  var fileInput = document.getElementById('exploreFile');
  var file = fileInput.files[0]; // گرفتن فایل انتخاب شده

  if (!t || !file) return alert('عنوان و انتخاب فایل ویدیو الزامی است');

  var btn = document.getElementById('addExploreBtn');
  btn.innerText = '⏳ در حال آپلود...'; // نشون دادن وضعیت آپلود
  btn.disabled = true;

  // ساختن یک اسم یکتا برای فایل که با بقیه قاطی نشه
  var fileName = Date.now() + '_' + file.name;

  // آپلود فایل به Supabase Storage (داخل باکتی به اسم videos)
  supabaseClient.storage.from('videos').upload(fileName, file).then(function(res) {
    if (res.error) {
      alert('خطا در آپلود فایل: ' + res.error.message);
      btn.innerText = '➕ آپلود و افزودن';
      btn.disabled = false;
      return;
    }

    // گرفتن لینک عمومی فایل آپلود شده
    var publicUrl = supabaseClient.storage.from('videos').getPublicUrl(fileName).data.publicUrl;

    // ذخیره اطلاعات توی دیتابیس
    supabaseClient.from('explore_videos').insert({ title: t, description: d, video_url: publicUrl }).then(function(dbRes) {
      if (dbRes.error) return alert('خطا در دیتابیس: ' + dbRes.error.message);
      
      // خالی کردن فرم
      document.getElementById('exploreTitle').value = '';
      document.getElementById('exploreDesc').value = '';
      fileInput.value = '';
      
      // برگردوندن دکمه به حالت عادی
      btn.innerText = '➕ آپلود و افزودن';
      btn.disabled = false;
      
      // آپدیت لیست
      loadAdminExplore();
    });
  });
};

function loadAdminExplore() {
  var list = document.getElementById('adminExploreList'); if (!list) return;
  supabaseClient.from('explore_videos').select('*').order('created_at', { ascending: false }).then(function(res) {
    list.innerHTML = '';
    (res.data || []).forEach(function(v) {
      var div = document.createElement('div');
      div.className = 'admin-row';
      div.innerHTML = '<div><strong>' + v.title + '</strong><span class="admin-sub">' + (v.description || 'بدون توضیح') + '</span></div>' +
        '<button class="btn btn-dim btn-sm" onclick="delExplore(' + v.id + ')" style="color:#e74c3c;">حذف</button>';
      list.appendChild(div);
    });
  });
}
window.delExplore = function(id) {
  if (confirm('حذف؟')) supabaseClient.from('explore_videos').delete().eq('id', id).then(loadAdminExplore);
};
function loadAdminExplore() {
  var list = document.getElementById('adminExploreList'); if (!list) return;
  supabaseClient.from('explore_videos').select('*').order('created_at', { ascending: false }).then(function(res) {
    list.innerHTML = '';
    (res.data || []).forEach(function(v) {
      var div = document.createElement('div');
      div.className = 'admin-row';
      div.innerHTML = '<div><strong>' + v.title + '</strong><span class="admin-sub">' + (v.description || 'بدون توضیح') + '</span></div>' +
        '<button class="btn btn-dim btn-sm" onclick="delExplore(' + v.id + ')" style="color:#e74c3c;">حذف</button>';
      list.appendChild(div);
    });
  });
}
window.delExplore = function(id) {
  if (confirm('حذف؟')) supabaseClient.from('explore_videos').delete().eq('id', id).then(loadAdminExplore);
};

// ===== ماموریت‌ها =====
window.addQuest = function() {
  var t = document.getElementById('questTitle').value.trim();
  var tp = document.getElementById('questType').value;
  var tg = parseInt(document.getElementById('questTarget').value) || 0;
  var xp = parseInt(document.getElementById('questXp').value) || 5;
  if (!t || tg < 1) return alert('عنوان و هدف رو درست بزن');
  supabaseClient.from('daily_quests').insert({ title: t, type: tp, target_value: tg, xp_reward: xp }).then(function(res) {
    if (res.error) return alert('خطا: ' + res.error.message);
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

// ===== آزمون‌ها =====
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
        '<option value="counselor"' + (u.role === 'counselor' ? ' selected' : '') + '>مشاور</option>' +
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
    supabaseClient.from('user_badges').insert({ user_id: user.id, badge_name: bn, badge_icon: '🌟' }).then(function(res) {
      if (res.error) return alert('خطا: ' + res.error.message);
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
  if (confirm('حذف؟')) {
    supabaseClient.from('user_badges').delete().eq('id', id).then(function(res) {
      if (res.error) alert('خطا: ' + res.error.message);
      else loadAdminBadges();
    });
  }
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
// ===== فلش‌کارت‌های عمومی =====
window.addPublicFlashcard = function() {
  var grade = document.getElementById('fcGrade').value;
  var subject = document.getElementById('fcSubject').value.trim();
  var q = document.getElementById('fcQuestion').value.trim();
  var a = document.getElementById('fcAnswer').value.trim();
  if (!subject || !q || !a) return alert('همه فیلدها رو پر کن');
  
  supabaseClient.from('flashcards').insert({ grade: grade, subject: subject, question: q, answer: a }).then(function(res) {
    if (res.error) return alert('خطا: ' + res.error.message);
    document.getElementById('fcSubject').value = '';
    document.getElementById('fcQuestion').value = '';
    document.getElementById('fcAnswer').value = '';
    loadAdminFlashcards();
  });
};

function loadAdminFlashcards() {
  var list = document.getElementById('adminFlashcardsList'); if (!list) return;
  supabaseClient.from('flashcards').select('*').order('created_at', { ascending: false }).then(function(res) {
    list.innerHTML = '';
    (res.data || []).forEach(function(f) {
      var div = document.createElement('div');
      div.className = 'admin-row';
      div.innerHTML = '<div><strong>' + f.grade + ' | ' + f.subject + '</strong><span class="admin-sub">' + f.question + ' = ' + f.answer + '</span></div>' +
        '<button class="btn btn-dim btn-sm" onclick="delPublicFlashcard(' + f.id + ')" style="color:#e74c3c;">حذف</button>';
      list.appendChild(div);
    });
  });
}
window.delPublicFlashcard = function(id) {
  if (confirm('حذف؟')) supabaseClient.from('flashcards').delete().eq('id', id).then(loadAdminFlashcards);
};

// لود اولیه
if (document.getElementById('adminFlashcardsList')) loadAdminFlashcards();
