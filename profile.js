// ===== توابع سطح =====
var LEVEL_HOURS = [0, 5, 15, 35, 65, 105, 155, 215, 285, 360];

function getLevel(minutes) {
  var hours = minutes / 60;
  var lvl = 1;
  for (var i = 0; i < LEVEL_HOURS.length; i++) {
    if (hours >= LEVEL_HOURS[i]) lvl = i + 1;
  }
  return lvl;
}

function getNextLevelHours(level) {
  if (level >= LEVEL_HOURS.length) return null;
  return LEVEL_HOURS[level];
}

function getTitle(level, theme) {
  var titles = ['تازه‌کار', 'کوشا', 'پیشرفت‌کن', 'حرفه‌ای', 'استاد', 'نخبه', 'افسانه', 'قهرمان', 'اسطوره', 'گاد'];
  return titles[level - 1] || 'تازه‌کار';
}

// ===== متغیرها =====
var myChartInstance = null;
var currentChartRange = 'this_week';
var currentStreak = 0;
var totalQuestions = 0;
var hasMorningStudy = false;
var allSessionsData = [];

// ===== شروع =====
supabaseClient.auth.getUser().then(function(res) {
  if (!res.data.user) { window.location.href = 'login.html'; return; }
  var uid = res.data.user.id;

  supabaseClient.from('profiles').select('*').eq('id', uid).single().then(function(p) {
    if (p.error || !p.data) return;
    var profile = p.data;

    // آواتار و اسم
    var nameEl = document.querySelector('.profile-name'); if(nameEl) nameEl.textContent = profile.username;
    var classEl = document.querySelector('.profile-class'); if(classEl) classEl.textContent = profile.class_name;
    var pAvatarEl = document.querySelector('.profile-avatar'); if(pAvatarEl) pAvatarEl.textContent = profile.username.charAt(0);
    var uNameEl = document.querySelector('.user-name'); if(uNameEl) uNameEl.textContent = profile.username;
    var avatarEl = document.querySelector('.avatar'); if(avatarEl) avatarEl.textContent = profile.username.charAt(0);

    // MBTI
    if (profile.mbti_type) {
      var mbtiBox = document.getElementById('mbtiBox');
      var mbtiIcon = document.getElementById('mbtiIcon');
      var mbtiName = document.getElementById('mbtiName');
      
      var personalities = {
        "INTJ": { name: "معمار", icon: "🏛️" }, "INTP": { name: "متفکر", icon: "🔬" },
        "ENTJ": { name: "فرمانده", icon: "⚔️" }, "ENTP": { name: "مبتکر", icon: "💡" },
        "INFJ": { name: "مشاور", icon: "📜" }, "INFP": { name: "رویاپرداز", icon: "🌙" },
        "ENFJ": { name: "الهام‌بخش", icon: "📣" }, "ENFP": { name: "قهرمان", icon: "🎉" },
        "ISTJ": { name: "بازرس", icon: "🛡️" }, "ISFJ": { name: "محافظ", icon: "🍀" },
        "ESTJ": { name: "مجری", icon: "👑" }, "ESFJ": { name: "حامی", icon: "🤝" },
        "ISTP": { name: "صنعتگر", icon: "🔧" }, "ISFP": { name: "هنرمند", icon: "🎨" },
        "ESTP": { name: "ماجراجو", icon: "🎯" }, "ESFP": { name: "سرگرم‌کننده", icon: "🎤" }
      };
      
      if (personalities[profile.mbti_type]) {
        mbtiBox.style.display = 'inline-block';
        mbtiIcon.textContent = personalities[profile.mbti_type].icon;
        mbtiName.textContent = personalities[profile.mbti_type].name;
      }
    }

    // کد دعوت
    var inviteInput = document.getElementById('myInviteCode');
    if (inviteInput && profile.invite_code) inviteInput.value = profile.invite_code;

    if (profile.birthday) {
      var bdayInput = document.getElementById('userBirthday');
      if (bdayInput) bdayInput.value = profile.birthday;
    }

    document.getElementById('statMinutes').textContent = profile.total_minutes || 0;
    document.getElementById('statXp').textContent = profile.xp || 0;

    // سطح
    var minutes = profile.total_minutes || 0;
    var level = getLevel(minutes);
    document.getElementById('levelBox').textContent = 'سطح ' + level + ' • ' + getTitle(level);

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

    renderLevelPath(level);
    loadGoalButtons(uid);
    loadSessions(uid);
    loadExams();
    loadChartData(uid);
  });
});

function renderLevelPath(currentLevel) {
  var list = document.getElementById('levelPathList'); if (!list) return;
  list.innerHTML = '';
  for (var i = 0; i < LEVEL_HOURS.length; i++) {
    var div = document.createElement('div');
    div.className = 'level-path-item' + ((i + 1) === currentLevel ? ' current' : '');
    div.innerHTML = '<span>سطح ' + (i + 1) + '</span><span>' + LEVEL_HOURS[i] + ' ساعت</span>';
    list.appendChild(div);
  }
}

function loadSessions(uid) {
  supabaseClient.from('study_sessions').select('questions, minutes, created_at, subject').eq('user_id', uid).then(function(s) {
    var rows = s.data || [];
    allSessionsData = rows;
    totalQuestions = 0;
    hasMorningStudy = false;

    rows.forEach(function(r) {
      totalQuestions += r.questions || 0;
      var h = new Date(r.created_at).getHours();
      if (h >= 4 && h < 8) hasMorningStudy = true;
    });

    document.getElementById('statQuestions').textContent = totalQuestions;

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

    document.querySelector('.streak-number').textContent = currentStreak;
    var unlockedCount = renderBadges();
    loadSpecialBadges(uid).then(function(spCount) {
      document.getElementById('statAchievements').textContent = unlockedCount + spCount;
    });
  });
}

function renderBadges() {
  var list = document.getElementById('badgesList'); if (!list) return 0;
  var badgesData = [
    { name: '۱۰۰ دقیقه', unlocked: (getTotalMinutes() >= 100) },
    { name: '۵۰۰ دقیقه', unlocked: (getTotalMinutes() >= 500) },
    { name: '۷ روز پیاپی', unlocked: (currentStreak >= 7) },
    { name: '۳۰ روز پیاپی', unlocked: (currentStreak >= 30) },
    { name: '۱۰۰ سؤال', unlocked: (totalQuestions >= 100) },
    { name: 'مطالعه صبحگاهی', unlocked: hasMorningStudy }
  ];
  list.innerHTML = '';
  var count = 0;
  badgesData.forEach(function(b) {
    var span = document.createElement('span');
    span.className = 'badge' + (b.unlocked ? '' : ' locked');
    span.textContent = b.unlocked ? b.name : '؟؟؟';
    list.appendChild(span);
    if (b.unlocked) count++;
  });
  return count;
}

function getTotalMinutes() {
  var total = 0; allSessionsData.forEach(function(r) { total += r.minutes || 0; }); return total;
}

function loadSpecialBadges(uid) {
  return new Promise(function(resolve) {
    supabaseClient.from('user_badges').select('*').eq('user_id', uid).then(function(badgeRes) {
      var list = document.getElementById('specialBadgesList'); if (!list) { resolve(0); return; }
      var badges = badgeRes.data || [];
      list.innerHTML = '';
      if (badges.length === 0) { list.innerHTML = '<p style="font-size: 0.8rem; color: var(--text-dim);">هنوز نشان ویژه‌ای نداری.</p>'; resolve(0); return; }
      badges.forEach(function(b) {
        var span = document.createElement('span');
        span.className = 'special-badge';
        span.textContent = (b.badge_icon || '🏅') + ' ' + b.badge_name;
        list.appendChild(span);
      });
      resolve(badges.length);
    });
  });
}

function loadGoalButtons(uid) {
  var today = new Date();
  var todayStr = today.getFullYear() + '-' + (today.getMonth()+1) + '-' + today.getDate();
  var yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  var yesterdayStr = yesterday.getFullYear() + '-' + (yesterday.getMonth()+1) + '-' + yesterday.getDate();

  var yMin = 0, tMin = 0;
  supabaseClient.from('study_sessions').select('minutes, created_at').eq('user_id', uid).then(function(res) {
    var rows = res.data || [];
    rows.forEach(function(r) {
      var d = new Date(r.created_at);
      var dStr = d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
      if (dStr === yesterdayStr) yMin += r.minutes;
      if (dStr === todayStr) tMin += r.minutes;
    });

    var opt1 = yMin === 0 ? 30 : yMin + 30;
    var opt2 = yMin === 0 ? 60 : yMin + 60;
    var opt3 = yMin === 0 ? 15 : yMin;

    var btnContainer = document.getElementById('goalButtons'); btnContainer.innerHTML = '';
    [{ id: 1, v: opt1 }, { id: 2, v: opt2 }, { id: 3, v: opt3 }].forEach(function(d) {
      var btn = document.createElement('button');
      btn.className = 'goal-btn';
      btn.textContent = d.v + ' دقیقه';
      btn.onclick = function() { window.location.href = 'study.html?goal=' + d.v; };
      btnContainer.appendChild(btn);
    });

    document.getElementById('cupStatus').textContent = 'امروز: ' + tMin + ' دقیقه';
  });
}

window.changeChartRange = function(range, btn) {
  currentChartRange = range;
  document.querySelectorAll('.chart-btn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  supabaseClient.auth.getUser().then(function(res) { if (res.data.user) loadChartData(res.data.user.id); });
};

function loadChartData(uid) {
  var canvas = document.getElementById('weeklyChart'); if (!canvas) return;
  if (myChartInstance) myChartInstance.destroy();

  var labels = [], dateKeys = [];
  var today = new Date();

  if (currentChartRange === 'this_week' || currentChartRange === 'last_week') {
    var dayNames = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
    var day = today.getDay(); var diff = (day + 1) % 7;
    var start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - diff);
    if (currentChartRange === 'last_week') start.setDate(start.getDate() - 7);
    for (var i = 0; i < 7; i++) {
      var d = new Date(start); d.setDate(start.getDate() + i);
      labels.push(dayNames[i]); dateKeys.push(d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate());
    }
  } else {
    var daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    for (var i = 1; i <= daysInMonth; i++) {
      var d = new Date(today.getFullYear(), today.getMonth(), i);
      labels.push(i); dateKeys.push(d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate());
    }
  }

  supabaseClient.from('study_sessions').select('subject, minutes, questions, created_at').eq('user_id', uid).then(function(res) {
    var rows = res.data || [];
    var dataByDate = {}; var subjectData = {};

    rows.forEach(function(r) {
      var d = new Date(r.created_at);
      var key = d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
      if (!dataByDate[key]) dataByDate[key] = 0;
      dataByDate[key] += r.minutes;

      if (dateKeys.indexOf(key) !== -1) {
        var subj = r.subject || 'عمومی';
        if (!subjectData[subj]) subjectData[subj] = { minutes: 0, questions: 0 };
        subjectData[subj].minutes += r.minutes; subjectData[subj].questions += (r.questions || 0);
      }
    });

    var chartData = dateKeys.map(function(key) { return dataByDate[key] || 0; });
    var ctx = canvas.getContext('2d');
    var gradient = ctx.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, '#2ecc71'); gradient.addColorStop(1, '#3498db');

    myChartInstance = new Chart(ctx, {
      type: 'bar',
      data: { labels: labels, datasets: [{ label: 'دقیقه', data: chartData, backgroundColor: gradient, borderRadius: 6 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' } }, x: { grid: { display: false }, ticks: { color: '#888' } } }
      }
    });

    var sbBox = document.getElementById('subjectBreakdown'); sbBox.innerHTML = '';
    var subjects = Object.keys(subjectData);
    if (subjects.length === 0) { sbBox.innerHTML = '<p class="lock-note">در این بازه مطالعه‌ای ثبت نکردی.</p>'; return; }
    subjects.forEach(function(subj) {
      var data = subjectData[subj];
      var div = document.createElement('div'); div.className = 'subject-row';
      div.innerHTML = '<div style="font-weight:bold;">📖 ' + subj + '</div><div style="display:flex; gap:16px;">' + '<span>⏱ ' + data.minutes + ' دقیقه</span><span>✍️ ' + data.questions + ' تست</span></div>';
      sbBox.appendChild(div);
    });
  });
}

function loadExams() {
  var listEl = document.getElementById('examCountdownList'); if (!listEl) return;
  supabaseClient.auth.getUser().then(function(res) {
    if (!res.data.user) return;
    var uid = res.data.user.id;
    supabaseClient.from('profiles').select('class_name').eq('id', uid).single().then(function(pRes) {
      var userClassName = pRes.data ? pRes.data.class_name : '';
      supabaseClient.from('exams').select('*').or('is_public.eq.true,user_id.eq.' + uid).order('exam_date', { ascending: true }).then(function(examRes) {
        var rows = examRes.data || []; var today = new Date(); today.setHours(0, 0, 0, 0);
        var upcoming = rows.filter(function(e) {
          if (new Date(e.exam_date) < today) return false;
          if (e.is_public && e.class_name !== 'همه' && userClassName.indexOf(e.class_name) === -1) return false;
          return true;
        });
        if (upcoming.length === 0) { listEl.innerHTML = '<p class="lock-note">هیچ آزمونی پیش رو نداری 😎</p>'; return; }
        listEl.innerHTML = '';
        upcoming.forEach(function(exam) {
          var examDate = new Date(exam.exam_date); examDate.setHours(0, 0, 0, 0);
          var diffDays = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
          var div = document.createElement('div'); div.className = 'subject-row';
          var label = exam.is_public ? '🏫 مدرسه' : '📝 شخصی';
          var countdown = diffDays === 0 ? 'امروز!' : (diffDays === 1 ? 'فردا' : diffDays + ' روز');
          div.innerHTML = '<div><strong>' + exam.subject + '</strong> <span style="font-size:0.7rem; color:var(--text-dim);">' + label + '</span></div>' + '<span style="color:' + (diffDays <= 3 ? '#e74c3c' : 'var(--green)') + ';font-weight:700;">⏳ ' + countdown + '</span>';
          listEl.appendChild(div);
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
      supabaseClient.from('exams').insert({ subject: subject, exam_date: examDate, class_name: 'شخصی', is_public: false, user_id: res.data.user.id }).then(function() {
        document.getElementById('myExamSubject').value = ''; document.getElementById('myExamDate').value = ''; loadExams();
      });
    });
  });
}

window.saveBirthday = function() {
  var bday = document.getElementById('userBirthday').value;
  var msg = document.getElementById('birthdayMsg');
  if (!bday) { msg.textContent = 'تاریخ رو انتخاب کن'; msg.style.color = '#e74c3c'; return; }
  supabaseClient.auth.getUser().then(function(res) {
    if (!res.data.user) return;
    supabaseClient.from('profiles').update({ birthday: bday }).eq('id', res.data.user.id).then(function(upd) {
      if (upd.error) { msg.textContent = 'خطا'; msg.style.color = '#e74c3c'; return; }
      msg.textContent = '✅ ثبت شد!'; msg.style.color = 'var(--green)';
    });
  });
};

window.copyInviteLink = function() {
  var code = document.getElementById('myInviteCode').value;
  if (!code) { alert('کد هنوز ساخته نشده'); return; }
  var link = 'https://sonay7.github.io/saragol/signup.html?ref=' + code;
  navigator.clipboard.writeText(link).then(function() { alert('✅ کپی شد!'); }).catch(function() { prompt('لینک:', link); });
};

if (document.getElementById('logoutBtn')) {
  document.getElementById('logoutBtn').addEventListener('click', function() {
    if (confirm('خارج می‌شی؟')) { supabaseClient.auth.signOut().then(function() { window.location.href = 'login.html'; }); }
  });
}
