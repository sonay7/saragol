var userClassName = '';
var allGenres = ['خیال‌پردازی', 'عاشقانه', 'جنایی', 'معمایی', 'علمی-تخیلی', 'طنز', 'تاریخی', 'روانشناسی', 'ماجراجویی', 'شعر و ادبیات'];
var selectedGenres = [];

var yesterdayMinutes = 0;
var todayMinutes = 0;
var currentTarget = 0;
var selectedOption = 0;
var currentStreak = 0;
var totalQuestions = 0;
var hasMorningStudy = false;

// ===== لود اولیه پروفایل =====
supabaseClient.auth.getUser().then(function(res) {
  if (!res.data.user) { window.location.href = 'login.html'; return; }
  var uid = res.data.user.id;

  supabaseClient.from('profiles').select('*').eq('id', uid).single().then(function(p) {
    if (p.error || !p.data) return;
    var profile = p.data;
    userClassName = profile.class_name;
    var titleTheme = profile.level_theme || 'پیش فرض';

    // آپدیت نام و آواتار
    var nameEl = document.querySelector('.profile-name'); if(nameEl) nameEl.textContent = profile.username;
    var classEl = document.querySelector('.profile-class'); if(classEl) classEl.textContent = profile.class_name;
    var pAvatarEl = document.querySelector('.profile-avatar'); if(pAvatarEl) pAvatarEl.textContent = profile.username.charAt(0);
    var uNameEl = document.querySelector('.user-name'); if(uNameEl) uNameEl.textContent = profile.username;
    var avatarEl = document.querySelector('.avatar'); if(avatarEl) avatarEl.textContent = profile.username.charAt(0);

    // ⬇️ کد دعوت ⬇️
    var inviteInput = document.getElementById('myInviteCode');
    if (inviteInput && profile.invite_code) {
      inviteInput.value = profile.invite_code;
    }

    // تاریخ تولد (اگر قبلاً ثبت شده بود)
    if (profile.birthday) {
      var bdayInput = document.getElementById('userBirthday');
      if (bdayInput) bdayInput.value = profile.birthday;
    }

    var stats = document.querySelectorAll('.stat-value');
    if(stats[0]) stats[0].textContent = profile.total_minutes || 0;
    if(stats[1]) stats[1].textContent = profile.xp || 0;

    // سطح
    try {
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
      renderLevelPath(level);
    } catch (e) { console.error("خطای سطح:", e); }

    loadCupLogic(uid);

    supabaseClient.from('study_sessions').select('questions, minutes, created_at').eq('user_id', uid).then(function(s) {
      var rows = s.data || [];
      totalQuestions = 0;
      
      rows.forEach(function(r) {
        totalQuestions += r.questions || 0;
        var h = new Date(r.created_at).getHours();
        if (h >= 4 && h < 8) hasMorningStudy = true;
      });
      if(stats[3]) stats[3].textContent = totalQuestions;

      var days = {};
      rows.forEach(function(r) {
        var d = new Date(r.created_at);
        days[d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate()] = true;
      });

      currentStreak = 0;
      var today = new Date();
      today.setHours(0,0,0,0);
      for (var i = 0; i < 365; i++) {
        var d = new Date(today);
        d.setDate(today.getDate() - i);
        var key = d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
        if (days[key]) { currentStreak++; }
        else if (i === 0) { continue; }
        else { break; }
      }
      
      if(stats[2]) stats[2].textContent = currentStreak;
      var streakNumberEl = document.querySelector('.streak-number');
      if(streakNumberEl) streakNumberEl.textContent = currentStreak;

      renderBadges(profile.total_minutes || 0);
    });

    loadExams();
    loadGenres(uid);
    
    // لود نشان‌های ویژه
    loadSpecialBadges(uid);
  });
});

// ===== کپی کردن لینک دعوت =====
window.copyInviteLink = function() {
  var code = document.getElementById('myInviteCode').value;
  if (!code) { alert('کد دعوت شما در حال ساخته شدنه، یه بار صفحه رو رفرش کن.'); return; }
  
  var link = 'https://sonay7.github.io/saragol/signup.html?ref=' + code;
  
  navigator.clipboard.writeText(link).then(function() {
    alert('✅ لینک دعوت کپی شد! برای دوستت بفرست.');
  }).catch(function() {
    prompt('لینک دعوت رو کپی کن:', link);
  });
};

// ===== ذخیره تاریخ تولد =====
window.saveBirthday = function() {
  var bday = document.getElementById('userBirthday').value;
  var msg = document.getElementById('birthdayMsg');
  
  if (!bday) {
    msg.textContent = 'لطفاً یک تاریخ انتخاب کن.';
    msg.style.color = '#e74c3c';
    return;
  }

  supabaseClient.auth.getUser().then(function(res) {
    if (!res.data.user) return;
    supabaseClient.from('profiles').update({ birthday: bday }).eq('id', res.data.user.id).then(function(updateRes) {
      if (updateRes.error) {
        msg.textContent = 'خطا: ' + updateRes.error.message;
        msg.style.color = '#e74c3c';
        return;
      }
      msg.textContent = '✅ تاریخ تولد با موفقیت ثبت شد!';
      msg.style.color = 'var(--green)';
    });
  });
};

// ===== لود نشان‌های ویژه =====
function loadSpecialBadges(uid) {
  supabaseClient.from('user_badges').select('*').eq('user_id', uid).then(function(badgeRes) {
    var list = document.getElementById('specialBadgesList');
    if (!list) return;
    
    var badges = badgeRes.data || [];
    list.innerHTML = '';
    
    if (badges.length === 0) {
      list.innerHTML = '<p style="font-size: 0.8rem; color: var(--text-dim);">هنوز نشان ویژه‌ای نداری.</p>';
      return;
    }
    
    badges.forEach(function(b) {
      var span = document.createElement('span');
      span.style.cssText = 'background: linear-gradient(135deg, #f39c12, #f1c40f); color: #000; padding: 8px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: bold; box-shadow: 0 4px 10px rgba(241, 196, 15, 0.3);';
      span.textContent = (b.badge_icon || '🏅') + ' ' + b.badge_name;
      list.appendChild(span);
    });
  });
}

// ===== بقیه توابع (سطح، لیگ، ویجت، آزمون، ژانر، تم) =====
function renderLevelPath(currentLevel) {
  var list = document.getElementById('levelPathList');
  if (!list) return;
  var levels = [{ n: 1, h: 0 }, { n: 2, h: 5 }, { n: 3, h: 15 }, { n: 4, h: 35 }, { n: 5, h: 65 }, { n: 6, h: 105 }, { n: 7, h: 155 }, { n: 8, h: 215 }, { n: 9, h: 285 }, { n: 10, h: 360 }];
  list.innerHTML = '';
  levels.forEach(function(lvl) {
    var div = document.createElement('div');
    div.className = 'level-path-item' + (lvl.n === currentLevel ? ' current' : '');
    div.innerHTML = '<span>سطح ' + lvl.n + '</span><span>' + lvl.h + ' ساعت</span>';
    list.appendChild(div);
  });
}

function renderBadges(totalMinutes) {
  var list = document.getElementById('badgesList');
  if (!list) return;
  var badgesData = [
    { id: 'min100', name: '۱۰۰ دقیقه', unlocked: totalMinutes >= 100 },
    { id: 'min500', name: '۵۰۰ دقیقه', unlocked: totalMinutes >= 500 },
    { id: 'min1000', name: '۱۰۰۰ دقیقه', unlocked: totalMinutes >= 1000 },
    { id: 'streak7', name: '۷ روز پیاپی', unlocked: currentStreak >= 7 },
    { id: 'streak30', name: '۳۰ روز پیاپی', unlocked: currentStreak >= 30 },
    { id: 'q100', name: '۱۰۰ سؤال', unlocked: totalQuestions >= 100 },
    { id: 'q500', name: '۵۰۰ سؤال', unlocked: totalQuestions >= 500 },
    { id: 'morning', name: 'مطالعه صبحگاهی', unlocked: hasMorningStudy },
    { id: 'league1', name: 'برنده لیگ هفته', unlocked: false },
    { id: 'class1', name: 'رتبه اول کلاس', unlocked: false },
    { id: 'top10', name: '۳ هفته تاپ ۱۰', unlocked: false },
    { id: 'book1', name: 'اولین کتاب', unlocked: false },
    { id: 'book5', name: '۵ کتاب', unlocked: false },
    { id: 'bookreview', name: 'نقد کتاب', unlocked: false },
    { id: 'firstmsg', name: 'اولین پیام', unlocked: false }
  ];
  list.innerHTML = '';
  badgesData.forEach(function(b) {
    var span = document.createElement('span');
    span.className = 'badge' + (b.unlocked ? '' : ' locked');
    span.textContent = b.unlocked ? b.name : '؟؟؟';
    list.appendChild(span);
  });
}

function loadCupLogic(uid) {
  var today = new Date();
  var todayStr = today.getFullYear() + '-' + (today.getMonth()+1) + '-' + today.getDate();
  var yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  var yesterdayStr = yesterday.getFullYear() + '-' + (yesterday.getMonth()+1) + '-' + yesterday.getDate();

  yesterdayMinutes = 0;
  todayMinutes = 0;

  supabaseClient.from('study_sessions').select('minutes, created_at').eq('user_id', uid).then(function(res) {
    var rows = res.data || [];
    rows.forEach(function(r) {
      var d = new Date(r.created_at);
      var dStr = d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
      if (dStr === yesterdayStr) yesterdayMinutes += r.minutes;
      if (dStr === todayStr) todayMinutes += r.minutes;
    });

    var opt1 = yesterdayMinutes === 0 ? 30 : yesterdayMinutes + 30;
    var opt2 = yesterdayMinutes === 0 ? 60 : yesterdayMinutes + 60;
    var opt3 = yesterdayMinutes === 0 ? 15 : yesterdayMinutes;

    var btnContainer = document.getElementById('goalButtons');
    btnContainer.innerHTML = '';
    
    var buttonsData = [
      { id: 1, label: opt1 + ' دقیقه', val: opt1 },
      { id: 2, label: opt2 + ' دقیقه', val: opt2 },
      { id: 3, label: opt3 + ' دقیقه', val: opt3 }
    ];

    var savedChoice = localStorage.getItem('cup_choice_' + todayStr);
    if (savedChoice) {
      selectedOption = parseInt(savedChoice);
      currentTarget = buttonsData.find(b => b.id === selectedOption).val;
    } else {
      selectedOption = 1;
      currentTarget = opt1;
    }

    buttonsData.forEach(function(btnData) {
      var btn = document.createElement('button');
      btn.className = 'goal-btn' + (btnData.id === selectedOption ? ' active' : '');
      btn.textContent = btnData.label;
      btn.onclick = function() {
        selectedOption = btnData.id;
        currentTarget = btnData.val;
        localStorage.setItem('cup_choice_' + todayStr, selectedOption);
        window.location.href = 'study.html?goal=' + currentTarget;
      };
      btnContainer.appendChild(btn);
    });

    updateCupVisuals();
  });
}

function updateCupVisuals() {
  var statusEl = document.getElementById('cupStatus');
  var smartTextEl = document.getElementById('smartText');
  var percent = Math.min(Math.round((todayMinutes / currentTarget) * 100), 100);

  var cupLiquid = document.getElementById('cupLiquid');
  if(cupLiquid) cupLiquid.style.height = percent + '%';

  var galaxyLiquid = document.getElementById('galaxyLiquid');
  if(galaxyLiquid) galaxyLiquid.style.height = percent + '%';

  var simpleBar = document.getElementById('simpleBarFill');
  if(simpleBar) simpleBar.style.width = percent + '%';

  document.querySelectorAll('.blossom').forEach(function(b) {
    var val = parseInt(b.getAttribute('data-val'));
    if (percent >= val) {
      b.style.opacity = '1';
      b.style.transform = 'scale(1)';
    } else {
      b.style.opacity = '0';
      b.style.transform = 'scale(0)';
    }
  });
  
  if (percent >= 100) {
    statusEl.textContent = '🎉 آفرین! هدف امروزت پر شد.';
    statusEl.style.color = 'var(--green)';
  } else {
    statusEl.textContent = todayMinutes + ' از ' + currentTarget + ' دقیقه';
    statusEl.style.color = 'var(--text)';
  }

  smartTextEl.style.display = 'block';
  if (yesterdayMinutes === 0) {
    smartTextEl.textContent = 'امروز روز خوبی برای شروع هست! یکی از هدف‌های بالا رو انتخاب کن.';
  } else {
    smartTextEl.textContent = 'دیروز ' + yesterdayMinutes + ' دقیقه مطالعه کردی. برای پیشرفت، یکی از هدف‌های بالا رو انتخاب کن!';
  }
}

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
      if (upcoming.length === 0) { listEl.innerHTML = '<p class="lock-note">هیچ آزمونی پیش رو نداری 😎</p>'; return; }
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

if(document.getElementById('addMyExamBtn')) {
  document.getElementById('addMyExamBtn').addEventListener('click', function() {
    var subject = document.getElementById('myExamSubject').value.trim();
    var examDate = document.getElementById('myExamDate').value;
    if (subject.length < 2 || !examDate) { alert('نام درس و تاریخ رو کامل بزن'); return; }
    supabaseClient.auth.getUser().then(function(res) {
      if (!res.data.user) return;
      supabaseClient.from('exams').insert({ subject: subject, exam_date: examDate, class_name: 'شخصی', is_public: false, user_id: res.data.user.id }).then(function(insRes) {
        if (insRes.error) { alert('خطا: ' + insRes.error.message); return; }
        document.getElementById('myExamSubject').value = '';
        document.getElementById('myExamDate').value = '';
        loadExams();
      });
    });
  });
}

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

var genreModal = document.getElementById('genreModal');
var selectGenreBtn = document.getElementById('selectGenreBtn');
var closeGenreBtn = document.getElementById('closeGenreBtn');
var saveGenreBtn = document.getElementById('saveGenreBtn');
var genreOptions = document.getElementById('genreOptions');

if (selectGenreBtn) {
  selectGenreBtn.addEventListener('click', function() { if(genreModal) genreModal.classList.remove('hidden'); renderGenreOptions(); });
  if(closeGenreBtn) closeGenreBtn.addEventListener('click', function() { if(genreModal) genreModal.classList.add('hidden'); });
  if(saveGenreBtn) saveGenreBtn.addEventListener('click', function() {
    supabaseClient.auth.getUser().then(function(res) {
      if (!res.data.user) return;
      var uid = res.data.user.id;
      supabaseClient.from('user_genres').delete().eq('user_id', uid).then(function() {
        if (selectedGenres.length === 0) { if(genreModal) genreModal.classList.add('hidden'); updateGenreUI(); return; }
        var inserts = selectedGenres.map(function(g) { return { user_id: uid, genre: g }; });
        supabaseClient.from('user_genres').insert(inserts).then(function() { if(genreModal) genreModal.classList.add('hidden'); updateGenreUI(); });
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

if (document.getElementById('logoutBtn')) {
  document.getElementById('logoutBtn').addEventListener('click', function() {
    if (confirm('از حساب کاربری خارج می‌شی؟')) {
      supabaseClient.auth.signOut().then(function() { window.location.href = 'login.html'; });
    }
  });
}
