var userClassName = '';
var allGenres = ['خیال‌پردازی', 'عاشقانه', 'جنایی', 'معمایی', 'علمی-تخیلی', 'طنز', 'تاریخی', 'روانشناسی', 'ماجراجویی', 'شعر و ادبیات'];
var selectedGenres = [];
var showGenreToOthers = true;

supabaseClient.auth.getUser().then(function(res) {
  if (!res.data.user) { window.location.href = 'login.html'; return; }
  var uid = res.data.user.id;

  supabaseClient.from('profiles').select('*').eq('id', uid).single().then(function(p) {
    if (!p.data) return;
    var profile = p.data;
    userClassName = profile.class_name;
    showGenreToOthers = profile.show_genre_title !== false;

    document.querySelector('.profile-name').textContent = profile.username;
    document.querySelector('.profile-class').textContent = profile.class_name;
    document.querySelector('.profile-avatar').textContent = profile.username.charAt(0);
    document.querySelector('.user-name').textContent = profile.username;
    document.querySelector('.avatar').textContent = profile.username.charAt(0);
    document.getElementById('myClassName').textContent = profile.class_name;

    var stats = document.querySelectorAll('.stat-value');
    stats[0].textContent = profile.total_minutes || 0;
    stats[1].textContent = profile.xp || 0;

    // ===== سطح =====
    var minutes = profile.total_minutes || 0;
    var theme = profile.level_theme || 'پیش فرض';
    var level = getLevel(minutes);
    var title = getTitle(level, theme);

    document.getElementById('levelBox').textContent = 'سطح ' + level + ' • ' + title;

    var nextH = getNextLevelHours(level);
    var bar = document.getElementById('levelBar');
    var nextEl = document.getElementById('levelNext');

    if (nextH === null) {
      bar.style.width = '100%';
      nextEl.textContent = 'به بالاترین سطح رسیدی! 🏆';
    } else {
      var currentH = LEVEL_HOURS[level - 1];
      var progress = ((minutes / 60) - currentH) / (nextH - currentH) * 100;
      if (progress < 0) progress = 0;
      if (progress > 100) progress = 100;
      bar.style.width = progress + '%';
      var remainMin = Math.ceil((nextH * 60) - minutes);
      nextEl.textContent = 'تا سطح بعدی: ' + remainMin + ' دقیقه';
    }

    // ===== محاسبه‌ی رتبه‌ی کلاس =====
    supabaseClient.from('profiles').select('class_name, total_minutes').then(function(cr) {
      var totals = {};
      (cr.data || []).forEach(function(row) {
        if (!row.class_name) return;
        if (!totals[row.class_name]) totals[row.class_name] = 0;
        totals[row.class_name] += row.total_minutes || 0;
      });
      var sorted = Object.keys(totals).sort(function(a, b) { return totals[b] - totals[a]; });
      var rank = sorted.indexOf(profile.class_name) + 1;
      var rankEl = document.getElementById('myClassRank');
      if (rankEl) rankEl.textContent = rank > 0 ? 'رتبه ' + rank + ' در لیگ' : 'بدون رتبه';
    });

    // ===== آمار مطالعه =====
    supabaseClient.from('study_sessions').select('questions, minutes, created_at').eq('user_id', uid).then(function(s) {
      var rows = s.data || [];
      var totalQ = 0;
      var hasMorning = false;

      rows.forEach(function(r) {
        totalQ += r.questions || 0;
        var h = new Date(r.created_at).getHours();
        if (h >= 4 && h < 8) hasMorning = true;
      });
      stats[3].textContent = totalQ;

      var days = {};
      rows.forEach(function(r) {
        var d = new Date(r.created_at);
        var key = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
        days[key] = true;
      });

      var streak = 0;
      var today = new Date();
      for (var i = 0; i < 365; i++) {
        var d = new Date(today);
        d.setDate(today.getDate() - i);
        var key = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
        if (days[key]) { streak++; }
        else if (i === 0) { continue; }
        else { break; }
      }
      stats[2].textContent = streak;
      document.querySelector('.streak-number').textContent = streak;

      var weekMinutes = [0, 0, 0, 0, 0, 0, 0];
      rows.forEach(function(r) {
        var d = new Date(r.created_at);
        var diff = Math.floor((today - d) / (1000 * 60 * 60 * 24));
        if (diff >= 0 && diff < 7) weekMinutes[6 - diff] += r.minutes || 0;
      });
      var maxMin = Math.max.apply(null, weekMinutes);
      if (maxMin === 0) maxMin = 1;
      document.querySelectorAll('.chart-bar .bar').forEach(function(b, i) {
        var h = Math.round((weekMinutes[i] / maxMin) * 100);
        b.style.height = (h < 5 ? 5 : h) + '%';
      });

      var unlocked = {
        min100: (profile.total_minutes || 0) >= 100,
        min500: (profile.total_minutes || 0) >= 500,
        streak7: streak >= 7,
        streak30: streak >= 30,
        q100: totalQ >= 100,
        q500: totalQ >= 500,
        morning: hasMorning
      };

      document.querySelectorAll('.badge').forEach(function(b) {
        if (unlocked[b.dataset.id] === true) b.classList.remove('locked');
        else b.textContent = '؟؟؟';
      });
    });

    loadExams();
    loadProfileProgress(uid);
    loadGenres(uid);
  });
});

// ===== توابع آزمون =====
function toShamsi(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr);
  return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
}

function loadExams() {
  var listEl = document.getElementById('examCountdownList');
  if (!listEl) return;

  supabaseClient.auth.getUser().then(function(res) {
    if (!res.data.user) return;
    var uid = res.data.user.id;

    supabaseClient.from('exams').select('*').or('is_public.eq.true,user_id.eq.' + uid).order('exam_date', { ascending: true }).then(function(examRes) {
      var rows = examRes.data || [];
      var today = new Date();
      today.setHours(0, 0, 0, 0);

      var upcoming = rows.filter(function(e) {
        if (new Date(e.exam_date) < today) return false;
        if (e.is_public && e.class_name !== 'همه' && userClassName.indexOf(e.class_name) === -1) return false;
        return true;
      });

      if (upcoming.length === 0) {
        listEl.innerHTML = '<p class="lock-note">هیچ آزمونی پیش رو نداری 😎</p>';
        return;
      }

      listEl.innerHTML = '';
      upcoming.forEach(function(exam) {
        var examDate = new Date(exam.exam_date);
        examDate.setHours(0, 0, 0, 0);
        var diffDays = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));

        var div = document.createElement('div');
        div.className = 'admin-row';
        div.style.borderColor = diffDays <= 3 ? '#e74c3c' : 'var(--border)';

        var label = exam.is_public ? '🏫 آزمون مدرسه' : '📝 آزمون شخصی';
        var countdown = diffDays === 0 ? 'امروز!' : (diffDays === 1 ? 'فردا' : diffDays + ' روز مونده');

        div.innerHTML =
          '<div>' +
            '<strong>' + exam.subject + '</strong>' +
            '<span class="admin-sub">' + label + ' | ' + toShamsi(exam.exam_date) + '</span>' +
          '</div>' +
          '<div class="admin-actions">' +
            '<span style="color:' + (diffDays <= 3 ? '#e74c3c' : 'var(--green)') + ';font-weight:700;font-size:0.85rem;">⏳ ' + countdown + '</span>' +
            (!exam.is_public ? '<button class="btn btn-dim btn-sm" data-del-my-exam="' + exam.id + '">حذف</button>' : '') +
          '</div>';
        listEl.appendChild(div);
      });

      listEl.querySelectorAll('[data-del-my-exam]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var id = btn.getAttribute('data-del-my-exam');
          supabaseClient.from('exams').delete().eq('id', id).then(function() { loadExams(); });
        });
      });
    });
  });
}

if (document.getElementById('addMyExamBtn')) {
  document.getElementById('addMyExamBtn').addEventListener('click', function() {
    var subject = document.getElementById('myExamSubject').value.trim();
    var examDate = document.getElementById('myExamDate').value;

    if (subject.length < 2 || !examDate) { alert('نام درس و تاریخ رو کامل بزن'); return; }

    supabaseClient.auth.getUser().then(function(res) {
      if (!res.data.user) return;
      supabaseClient.from('exams').insert({
        subject: subject, exam_date: examDate, class_name: 'شخصی', is_public: false, user_id: res.data.user.id
      }).then(function(insRes) {
        if (insRes.error) { alert('خطا: ' + insRes.error.message); return; }
        document.getElementById('myExamSubject').value = '';
        document.getElementById('myExamDate').value = '';
        loadExams();
      });
    });
  });
}

// ===== ردیاب مطالعه =====
function loadProfileProgress(uid) {
  var list = document.getElementById('profileProgressList');
  if (!list) return;

  supabaseClient.from('book_progress').select('*').eq('user_id', uid).eq('status', 'reading').then(function(res) {
    list.innerHTML = '';
    var rows = res.data || [];
    if (rows.length === 0) { list.innerHTML = '<p class="lock-note">در حال حاضر کتابی نمی‌خونی.</p>'; return; }

    rows.forEach(function(b) {
      var percent = Math.round((b.current_page / b.total_pages) * 100);
      var remain = b.total_pages - b.current_page;
      var daysLeft = Math.ceil(remain / b.pages_per_day);
      var targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysLeft);
      var dateStr = new Intl.DateTimeFormat('fa-IR', { month: 'long', day: 'numeric' }).format(targetDate);

      var div = document.createElement('div');
      div.className = 'progress-card';
      div.innerHTML = 
        '<div style="display:flex; justify-content:space-between; align-items:center;"><strong>' + b.title + '</strong></div>' +
        '<div class="progress-stats"><span>صفحه ' + b.current_page + ' از ' + b.total_pages + '</span><span>' + percent + '%</span></div>' +
        '<div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ' + percent + '%"></div></div>' +
        '<div class="estim">⏳ با روزی ' + b.pages_per_day + ' صفحه، تا <strong>' + dateStr + '</strong> تمومش می‌کنی</div>';
      list.appendChild(div);
    });
  });
}

// ===== سیستم ژانرها =====
function loadGenres(uid) {
  supabaseClient.from('user_genres').select('*').eq('user_id', uid).order('id', { ascending: true }).then(function(res) {
    if (res.error) {
      alert('خطا در خواندن ژانرها: ' + res.error.message);
      return;
    }
    selectedGenres = (res.data || []).map(function(g) { return g.genre; });
    updateGenreUI();
  });
}

function updateGenreUI() {
  var title = getTitleFromGenres(selectedGenres);
  var display = document.getElementById('genreTitleDisplay');
  var text = document.getElementById('genreTitleText');
  var list = document.getElementById('myGenresList');

  if (selectedGenres.length > 0) {
    display.style.display = 'block';
    text.textContent = title;
    list.textContent = selectedGenres.join(' + ');
  } else {
    display.style.display = 'none';
    list.textContent = 'هنوز ژانری انتخاب نکردی!';
  }
}

// ===== منطق جدید و منطقی برای ترکیب لقب‌ها =====
function getTitleFromGenres(genres) {
  if (!genres || genres.length === 0) return '';

  // name: اسم، adj: صفت
  var dict = {
    'خیال‌پردازی': { text: 'رویاباف', type: 'name', emoji: '🪄' },
    'عاشقانه': { text: 'رمانتیک', type: 'adj', emoji: '❤️' },
    'جنایی': { text: 'کارآگاه', type: 'name', emoji: '🕵️‍♀️' },
    'معمایی': { text: 'رازگشا', type: 'name', emoji: '🔍' },
    'علمی-تخیلی': { text: 'آینده‌نگر', type: 'adj', emoji: '🚀' },
    'طنز': { text: 'شوخ‌طبع', type: 'adj', emoji: '🎭' },
    'تاریخی': { text: 'تاریخ‌دان', type: 'name', emoji: '📜' },
    'روانشناسی': { text: 'ذهن‌کاو', type: 'name', emoji: '🧠' },
    'ماجراجویی': { text: 'ماجراجو', type: 'name', emoji: '🧭' },
    'شعر و ادبیات': { text: 'شاعر', type: 'name', emoji: '🖋️' }
  };

  var parts = [];
  genres.forEach(function(g) {
    if (dict[g]) parts.push(dict[g]);
  });

  if (parts.length === 1) {
    return parts[0].text + ' ' + parts[0].emoji;
  }
  
  if (parts.length === 2) {
    var p1 = parts[0];
    var p2 = parts[1];
    
    if (p1.type === 'name' && p2.type === 'adj') {
      return p1.text + 'ِ ' + p2.text + ' ' + p2.emoji; // کارآگاهِ رمانتیک
    }
    if (p1.type === 'adj' && p2.type === 'name') {
      return p2.text + 'ِ ' + p1.text + ' ' + p1.emoji; // کارآگاهِ رمانتیک (حتی اگه برعکس انتخاب کنه)
    }
    if (p1.type === 'adj' && p2.type === 'adj') {
      return p1.text + ' و ' + p2.text + ' ' + p2.emoji; // رمانتیک و شوخ‌طبع
    }
    return p1.text + ' و ' + p2.text + ' ' + p2.emoji; // ماجراجو و تاریخ‌دان
  }
  
  if (parts.length === 3) {
    return parts[0].text + '، ' + parts[1].text + ' و ' + parts[2].text + ' 🎬';
  }
  
  if (parts.length >= 4) {
    return 'کتاب‌خوانِ لجند 👑';
  }
}

// مودال انتخاب ژانر
var genreModal = document.getElementById('genreModal');
var selectGenreBtn = document.getElementById('selectGenreBtn');
var closeGenreBtn = document.getElementById('closeGenreBtn');
var saveGenreBtn = document.getElementById('saveGenreBtn');
var genreOptions = document.getElementById('genreOptions');
var showGenreToggle = document.getElementById('showGenreToggle');

if (selectGenreBtn) {
  selectGenreBtn.addEventListener('click', function() {
    genreModal.classList.remove('hidden');
    renderGenreOptions();
  });

  closeGenreBtn.addEventListener('click', function() { genreModal.classList.add('hidden'); });

  showGenreToggle.checked = showGenreToOthers;
  showGenreToggle.addEventListener('change', function() { showGenreToOthers = this.checked; });

  saveGenreBtn.addEventListener('click', function() {
    saveGenreBtn.textContent = 'در حال ذخیره...';
    supabaseClient.auth.getUser().then(function(res) {
      if (!res.data.user) return;
      var uid = res.data.user.id;

      supabaseClient.from('user_genres').delete().eq('user_id', uid).then(function(delRes) {
        if (delRes.error) { alert('خطای پاکسازی: ' + delRes.error.message); saveGenreBtn.textContent = 'ذخیره'; return; }

        if (selectedGenres.length === 0) {
          finishSave(uid); return;
        }
        
        var inserts = selectedGenres.map(function(g) { return { user_id: uid, genre: g }; });
        supabaseClient.from('user_genres').insert(inserts).then(function(insRes) {
          if (insRes.error) { alert('خطای ذخیره ژانر: ' + insRes.error.message); saveGenreBtn.textContent = 'ذخیره'; return; }
          finishSave(uid);
        });
      });
    });
  });
}

function finishSave(uid) {
  supabaseClient.from('profiles').update({ show_genre_title: showGenreToOthers }).eq('id', uid).then(function(profRes) {
    saveGenreBtn.textContent = 'ذخیره';
    if (profRes.error) alert('خطا در تنظیمات نمایش: ' + profRes.error.message);
    genreModal.classList.add('hidden');
    loadGenres(uid); 
  });
}

function renderGenreOptions() {
  genreOptions.innerHTML = '';
  allGenres.forEach(function(g) {
    var btn = document.createElement('button');
    var index = selectedGenres.indexOf(g);
    var isSelected = index !== -1;
    
    btn.className = 'genre-btn' + (isSelected ? ' selected' : '');
    
    if (isSelected) {
      btn.innerHTML = (index + 1) + '. ' + g;
    } else {
      btn.textContent = g;
    }
    
    btn.type = 'button';
    
    btn.addEventListener('click', function() {
      if (isSelected) {
        selectedGenres = selectedGenres.filter(function(item) { return item !== g; });
      } else {
        selectedGenres.push(g);
      }
      renderGenreOptions();
    });

    genreOptions.appendChild(btn);
  });

  // اپدیت پیش‌نمایش زنده
  var previewEl = document.getElementById('liveGenrePreview');
  if (previewEl) {
    var title = getTitleFromGenres(selectedGenres);
    previewEl.textContent = title ? '✨ لقب تو میشه: ' + title : 'هنوز ژانری انتخاب نکردی';
  }
}

// ===== تغییر تم و خروج =====
var changeThemeBtn = document.getElementById('changeThemeBtn');
var themeModal = document.getElementById('themeModal');
var closeThemeBtn = document.getElementById('closeThemeBtn');
var themeList = document.getElementById('themeList');

if (changeThemeBtn) {
  changeThemeBtn.addEventListener('click', function() { themeModal.classList.remove('hidden'); });
  closeThemeBtn.addEventListener('click', function() { themeModal.classList.add('hidden'); });
  Object.keys(THEMES).forEach(function(name) {
    var btn = document.createElement('button');
    btn.className = 'theme-option';
    btn.textContent = name + ' (' + THEMES[name][0] + ' → ' + THEMES[name][9] + ')';
    btn.addEventListener('click', function() {
      supabaseClient.auth.getUser().then(function(res) {
        if (!res.data.user) return;
        supabaseClient.from('profiles').update({ level_theme: name }).eq('id', res.data.user.id).then(function() {
          themeModal.classList.add('hidden');
          location.reload();
        });
      });
    });
    themeList.appendChild(btn);
  });
}

if (document.getElementById('logoutBtn')) {
  document.getElementById('logoutBtn').addEventListener('click', function() {
    if (confirm('از حساب کاربری خارج می‌شی؟')) {
      supabaseClient.auth.signOut().then(function() { window.location.href = 'login.html'; });
    }
  });
}