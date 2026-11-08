var userClassName = '';
var allGenres = ['خیال‌پردازی', 'عاشقانه', 'جنایی', 'معمایی', 'علمی-تخیلی', 'طنز', 'تاریخی', 'روانشناسی', 'ماجراجویی', 'شعر و ادبیات'];
var selectedGenres = [];

supabaseClient.auth.getUser().then(function(res) {
  if (!res.data.user) { window.location.href = 'login.html'; return; }
  var uid = res.data.user.id;

  supabaseClient.from('profiles').select('*').eq('id', uid).single().then(function(p) {
    if (!p.data) return;
    var profile = p.data;
    userClassName = profile.class_name;
    var titleTheme = profile.level_theme || 'پیش فرض';

    // آپدیت هدر و کارت پروفایل (با چک کردن وجود المان)
    var nameEl = document.querySelector('.profile-name'); if(nameEl) nameEl.textContent = profile.username;
    var classEl = document.querySelector('.profile-class'); if(classEl) classEl.textContent = profile.class_name;
    var pAvatarEl = document.querySelector('.profile-avatar'); if(pAvatarEl) pAvatarEl.textContent = profile.username.charAt(0);
    var uNameEl = document.querySelector('.user-name'); if(uNameEl) uNameEl.textContent = profile.username;
    var avatarEl = document.querySelector('.avatar'); if(avatarEl) avatarEl.textContent = profile.username.charAt(0);

    var stats = document.querySelectorAll('.stat-value');
    if(stats[0]) stats[0].textContent = profile.total_minutes || 0;
    if(stats[1]) stats[1].textContent = profile.xp || 0;

    // ===== سطح =====
    var minutes = profile.total_minutes || 0;
    var level = getLevel(minutes);
    var title = getTitle(level, titleTheme);
    
    var levelBox = document.getElementById('levelBox');
    if(levelBox) levelBox.textContent = 'سطح ' + level + ' • ' + title;

    var nextH = getNextLevelHours(level);
    var bar = document.getElementById('levelBar');
    var nextEl = document.getElementById('levelNext');

    if (nextH === null) {
      if(bar) bar.style.width = '100%';
      if(nextEl) nextEl.textContent = 'به بالاترین سطح رسیدی! 🏆';
    } else {
      var currentH = LEVEL_HOURS[level - 1];
      var progress = ((minutes / 60) - currentH) / (nextH - currentH) * 100;
      if (progress < 0) progress = 0;
      if (progress > 100) progress = 100;
      if(bar) bar.style.width = progress + '%';
      var remainMin = Math.ceil((nextH * 60) - minutes);
      if(nextEl) nextEl.textContent = 'تا سطح بعدی: ' + remainMin + ' دقیقه';
    }

    // ===== بارگذاری باغ/کافه =====
    var colorTheme = localStorage.getItem('site-theme') || 'dark';
    loadGarden(uid, colorTheme);

    // ===== محاسبه‌ی رتبه‌ی کلاس =====
    var rankEl = document.getElementById('myClassRank');
    if(rankEl) {
      supabaseClient.from('profiles').select('class_name, total_minutes').then(function(cr) {
        var totals = {};
        (cr.data || []).forEach(function(row) {
          if (!row.class_name) return;
          if (!totals[row.class_name]) totals[row.class_name] = 0;
          totals[row.class_name] += row.total_minutes || 0;
        });
        var sorted = Object.keys(totals).sort(function(a, b) { return totals[b] - totals[a]; });
        var rank = sorted.indexOf(profile.class_name) + 1;
        rankEl.textContent = rank > 0 ? 'رتبه ' + rank + ' در لیگ' : 'بدون رتبه';
      });
    }

    // ===== آمار مطالعه =====
    supabaseClient.from('study_sessions').select('questions, minutes, created_at').eq('user_id', uid).then(function(s) {
      var rows = s.data || [];
      var totalQ = 0;
      rows.forEach(function(r) { totalQ += r.questions || 0; });
      if(stats[3]) stats[3].textContent = totalQ;

      var days = {};
      rows.forEach(function(r) {
        var d = new Date(r.created_at);
        days[d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate()] = true;
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
      
      if(stats[2]) stats[2].textContent = streak;
      var streakNumberEl = document.querySelector('.streak-number');
      if(streakNumberEl) streakNumberEl.textContent = streak;

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
    });

    loadExams();
    loadGenres(uid);
  });
});

// ===== منطق کافه / باغ =====
function loadGarden(uid, theme) {
  var widget = document.getElementById('gardenWidget');
  if (!widget) return;
  
  if (theme !== 'cafe' && theme !== 'sakura') {
    widget.innerHTML = '<div style="font-size: 3rem; margin-bottom: 10px;">🚧</div><p style="color:var(--text-dim); font-size:0.9rem;">برای دیدن همراه روزانه، از دکمه 🎨 تم کافه یا ساکورا رو انتخاب کن.</p>';
    return;
  }

  supabaseClient.from('user_gardens').select('*').eq('user_id', uid).single().then(function(res) {
    if (res.error && res.error.code !== 'PGRST116') {
       widget.innerHTML = '<p style="color:red; font-size:0.8rem;">خطای دیتابیس: ' + res.error.message + '</p>';
       return;
    }
    
    if (!res.data) {
      supabaseClient.from('user_gardens').insert({ user_id: uid }).then(function(insRes) {
        if (insRes.error) {
          widget.innerHTML = '<p style="color:red; font-size:0.8rem;">خطا در ساخت: ' + insRes.error.message + '</p>';
          return;
        }
        loadGarden(uid, theme); 
      });
      return;
    }

    var garden = res.data;
    var todayStr = new Date().toISOString().split('T')[0];
    
    if (garden.last_active_date !== todayStr) {
      supabaseClient.from('user_gardens').update({ last_active_date: todayStr, minutes_today: 0 }).eq('user_id', uid).then(function() {
        garden.minutes_today = 0;
        renderGardenUI(uid, theme, garden);
      });
    } else {
      renderGardenUI(uid, theme, garden);
    }
  });
}

function renderGardenUI(uid, theme, garden) {
  var widget = document.getElementById('gardenWidget');
  if (!widget) return;
  
  var isCafe = (theme === 'cafe');
  var goal = garden.daily_goal || 30;
  var done = garden.minutes_today || 0;
  var coins = garden.coins || 0;
  var percent = Math.min(Math.round((done / goal) * 100), 100);

  var graphic = isCafe ? '☕' : '🌸';
  var title = isCafe ? 'کافه‌ی امروز' : 'باغ ساکورا';
  var coinName = isCafe ? 'دانه قهوه' : 'شکوفه';

  widget.innerHTML = 
    '<h3 style="font-size: 1rem; color: var(--text-dim); margin-bottom: 10px;">' + title + '</h3>' +
    '<div class="garden-graphic">' + graphic + '</div>' +
    '<p style="font-size: 0.85rem; margin-bottom: 10px;">هدف امروز: <strong>' + done + ' از ' + goal + ' دقیقه</strong></p>' +
    '<div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ' + percent + '%"></div></div>' +
    '<p style="font-size: 0.8rem; color: var(--text-dim); margin: 10px 0;">هدفت رو انتخاب کن:</p>' +
    '<div style="margin-bottom: 15px;">' +
      '<button class="goal-btn ' + (goal === 15 ? 'active' : '') + '" onclick="setGoal(' + uid + ', \'' + theme + '\', 15)">۱۵ دقیقه</button>' +
      '<button class="goal-btn ' + (goal === 30 ? 'active' : '') + '" onclick="setGoal(' + uid + ', \'' + theme + '\', 30)">۳۰ دقیقه</button>' +
      '<button class="goal-btn ' + (goal === 60 ? 'active' : '') + '" onclick="setGoal(' + uid + ', \'' + theme + '\', 60)">۶۰ دقیقه</button>' +
    '</div>' +
    '<div class="garden-coins">🪙 ' + coins + ' ' + coinName + '</div>';

  if (percent >= 100) {
    widget.innerHTML += '<p style="color: var(--green); font-weight: bold; margin-top: 10px;">✅ آفرین! هدف امروزت رو کامل کردی.</p>';
  }
}

window.setGoal = function(uid, theme, mins) {
  supabaseClient.from('user_gardens').update({ daily_goal: mins }).eq('user_id', uid).then(function() {
    loadGarden(uid, theme);
  });
};

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
      if (examRes.error) {
         listEl.innerHTML = '<p style="color:red; font-size:0.8rem;">خطای آزمون‌ها: ' + examRes.error.message + '</p>';
         return;
      }
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

        div.innerHTML = '<div><strong>' + exam.subject + '</strong><span class="admin-sub">' + label + ' | ' + toShamsi(exam.exam_date) + '</span></div>' +
          '<div class="admin-actions"><span style="color:' + (diffDays <= 3 ? '#e74c3c' : 'var(--green)') + ';font-weight:700;font-size:0.85rem;">⏳ ' + countdown + '</span>' +
          (!exam.is_public ? '<button class="btn btn-dim btn-sm" onclick="delExam(' + exam.id + ')">حذف</button>' : '') + '</div>';
        listEl.appendChild(div);
      });
    });
  });
}
window.delExam = function(id) { supabaseClient.from('exams').delete().eq('id', id).then(loadExams); }

// ===== سیستم ژانرها =====
function loadGenres(uid) {
  supabaseClient.from('user_genres').select('*').eq('user_id', uid).order('id', { ascending: true }).then(function(res) {
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
    if(display) display.style.display = 'inline-block';
    if(text) text.textContent = title;
    if(list) list.textContent = selectedGenres.join(' + ');
  } else {
    if(display) display.style.display = 'none';
    if(list) list.textContent = 'هنوز ژانری انتخاب نکردی!';
  }
}

function getTitleFromGenres(genres) {
  if (!genres || genres.length === 0) return '';
  if (genres.includes('خیال‌پردازی') && genres.includes('عاشقانه')) return 'رویاپرداز 🌙';
  if (genres.includes('جنایی') && genres.includes('معمایی')) return 'کارآگاه 🕵️';
  var mainGenre = genres[0];
  if (mainGenre === 'خیال‌پردازی') return 'خواب‌بین 💭';
  if (mainGenre === 'عاشقانه') return 'دل‌باخته ❤️';
  if (mainGenre === 'جنایی' || mainGenre === 'معمایی') return 'کارآگاه 🕵️';
  return 'کتاب‌خوان 📖';
}

// مودال ژانر
var genreModal = document.getElementById('genreModal');
var selectGenreBtn = document.getElementById('selectGenreBtn');
var closeGenreBtn = document.getElementById('closeGenreBtn');
var saveGenreBtn = document.getElementById('saveGenreBtn');
var genreOptions = document.getElementById('genreOptions');

if (selectGenreBtn) {
  selectGenreBtn.addEventListener('click', function() {
    if(genreModal) genreModal.classList.remove('hidden');
    renderGenreOptions();
  });
  if(closeGenreBtn) closeGenreBtn.addEventListener('click', function() { if(genreModal) genreModal.classList.add('hidden'); });

  if(saveGenreBtn) saveGenreBtn.addEventListener('click', function() {
    supabaseClient.auth.getUser().then(function(res) {
      if (!res.data.user) return;
      var uid = res.data.user.id;
      supabaseClient.from('user_genres').delete().eq('user_id', uid).then(function() {
        if (selectedGenres.length === 0) { if(genreModal) genreModal.classList.add('hidden'); updateGenreUI(); return; }
        var inserts = selectedGenres.map(function(g) { return { user_id: uid, genre: g }; });
        supabaseClient.from('user_genres').insert(inserts).then(function() {
          if(genreModal) genreModal.classList.add('hidden');
          updateGenreUI();
        });
      });
    });
  });
}

function renderGenreOptions() {
  if(!genreOptions) return;
  genreOptions.innerHTML = '';
  allGenres.forEach(function(g) {
    var btn = document.createElement('button');
    btn.className = 'genre-btn' + (selectedGenres.includes(g) ? ' selected' : '');
    btn.textContent = g;
    btn.type = 'button';
    btn.onclick = function() {
      if (selectedGenres.includes(g)) selectedGenres = selectedGenres.filter(function(item) { return item !== g; });
      else selectedGenres.push(g);
      renderGenreOptions();
    };
    genreOptions.appendChild(btn);
  });
}

// ===== تغییر تم (لقب) =====
var changeThemeBtn = document.getElementById('changeThemeBtn');
var themeModal = document.getElementById('themeModal');
var closeThemeBtn = document.getElementById('closeThemeBtn');
var themeList = document.getElementById('themeList');

if (changeThemeBtn) {
  changeThemeBtn.addEventListener('click', function() { if(themeModal) themeModal.classList.remove('hidden'); });
  if(closeThemeBtn) closeThemeBtn.addEventListener('click', function() { if(themeModal) themeModal.classList.add('hidden'); });
  if(themeList) Object.keys(THEMES).forEach(function(name) {
    var btn = document.createElement('button');
    btn.className = 'theme-option';
    btn.textContent = name + ' (' + THEMES[name][0] + ' → ' + THEMES[name][9] + ')';
    btn.onclick = function() {
      supabaseClient.auth.getUser().then(function(res) {
        if (!res.data.user) return;
        supabaseClient.from('profiles').update({ level_theme: name }).eq('id', res.data.user.id).then(function() {
          if(themeModal) themeModal.classList.add('hidden');
          location.reload();
        });
      });
    };
    themeList.appendChild(btn);
  });
}

// ===== دکمه خروج =====
if (document.getElementById('logoutBtn')) {
  document.getElementById('logoutBtn').addEventListener('click', function() {
    if (confirm('از حساب کاربری خارج می‌شی؟')) {
      supabaseClient.auth.signOut().then(function() { window.location.href = 'login.html'; });
    }
  });
}
