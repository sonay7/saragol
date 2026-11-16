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
var totalSpecialBadges = 0;
var currentChartRange = 'this_week';
var myChartInstance = null;

window.changeChartRange = function(range, btn) {
  currentChartRange = range;
  var buttons = btn.parentElement.querySelectorAll('button');
  buttons.forEach(function(b){ b.className = 'btn btn-dim btn-sm'; });
  btn.className = 'btn btn-green btn-sm';

  supabaseClient.auth.getUser().then(function(res){
    if(res.data.user) loadChartData(res.data.user.id);
  });
};

// ===== لود اولیه پروفایل =====
supabaseClient.auth.getUser().then(function(res) {
  if (!res.data.user) { window.location.href = 'login.html'; return; }
  var uid = res.data.user.id;

  supabaseClient.from('profiles').select('*').eq('id', uid).single().then(function(p) {
    if (p.error || !p.data) return;
    var profile = p.data;
    userClassName = profile.class_name;
    var titleTheme = profile.level_theme || 'پیش فرض';

    var nameEl = document.querySelector('.profile-name'); if(nameEl) nameEl.textContent = profile.username;
    var classEl = document.querySelector('.profile-class'); if(classEl) classEl.textContent = profile.class_name;
    var pAvatarEl = document.querySelector('.profile-avatar'); if(pAvatarEl) pAvatarEl.textContent = profile.username.charAt(0);
    var uNameEl = document.querySelector('.user-name'); if(uNameEl) uNameEl.textContent = profile.username;
    var avatarEl = document.querySelector('.avatar'); if(avatarEl) avatarEl.textContent = profile.username.charAt(0);

    var inviteInput = document.getElementById('myInviteCode');
    if (inviteInput && profile.invite_code) inviteInput.value = profile.invite_code;

    if (profile.birthday) {
      var bdayInput = document.getElementById('userBirthday');
      if (bdayInput) bdayInput.value = profile.birthday;
    }

    var stats = document.querySelectorAll('.stat-value');
    if(stats[0]) stats[0].textContent = profile.total_minutes || 0;
    if(stats[1]) stats[1].textContent = profile.xp || 0;

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
      if(stats[2]) stats[2].textContent = totalQuestions;

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
      
      var streakNumberEl = document.querySelector('.streak-number');
      if(streakNumberEl) streakNumberEl.textContent = currentStreak;

      var unlockedStandardCount = renderBadges(profile.total_minutes || 0);
      
      loadSpecialBadges(uid).then(function(specialCount) {
        totalSpecialBadges = specialCount;
        var totalAchievements = unlockedStandardCount + totalSpecialBadges;
        var statAch = document.getElementById('statAchievements');
        if (statAch) statAch.textContent = totalAchievements;
      });
    });

    loadExams();
    loadGenres(uid);
    loadChartData(uid); // شروع با هفته جاری
  });
});

// ===== نمودار (هفته / ماه) =====
function loadChartData(uid) {
  var canvas = document.getElementById('weeklyChart');
  if (!canvas) return;
  if(myChartInstance) { myChartInstance.destroy(); }

  var labels = [];
  var dateKeys = []; 
  var today = new Date();

  if (currentChartRange === 'this_week' || currentChartRange === 'last_week') {
    var dayNames = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
    var day = today.getDay(); 
    var diff = (day + 1) % 7; 
    var start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - diff);
    
    if (currentChartRange === 'last_week') { start.setDate(start.getDate() - 7); }

    for (var i = 0; i < 7; i++) {
      var d = new Date(start);
      d.setDate(start.getDate() + i);
      labels.push(dayNames[i]);
      dateKeys.push(d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate());
    }
  } else if (currentChartRange === 'this_month') {
    var startMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    var endMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    var daysInMonth = endMonth.getDate();
    
    for (var i = 1; i <= daysInMonth; i++) {
      var d = new Date(today.getFullYear(), today.getMonth(), i);
      labels.push(i);
      dateKeys.push(d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate());
    }
  }

  supabaseClient.from('study_sessions').select('subject, minutes, questions, created_at').eq('user_id', uid).then(function(res) {
    var rows = res.data || [];
    var dataByDate = {};
    var subjectData = {};

    rows.forEach(function(r) {
      var d = new Date(r.created_at);
      var key = d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
      if (!dataByDate[key]) dataByDate[key] = 0;
      dataByDate[key] += r.minutes;

      if (dateKeys.includes(key)) {
        var subj = r.subject || 'عمومی';
        if (!subjectData[subj]) subjectData[subj] = { minutes: 0, questions: 0 };
        subjectData[subj].minutes += r.minutes;
        subjectData[subj].questions += (r.questions || 0);
      }
    });

    var chartData = dateKeys.map(function(key) { return dataByDate[key] || 0; });
    var ctx = canvas.getContext('2d');
    var gradient = ctx.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, '#2ecc71');
    gradient.addColorStop(1, '#3498db');

    myChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{ label: 'دقیقه مطالعه', data: chartData, backgroundColor: gradient, borderRadius: 6, borderSkipped: false }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888', stepSize: 30 } },
          x: { grid: { display: false }, ticks: { color: '#888', font: { family: 'Vazirmatn, sans-serif' } } }
        }
      }
    });

    var sbBox = document.getElementById('subjectBreakdown');
    sbBox.innerHTML = '';
    var subjects = Object.keys(subjectData);
    if (subjects.length === 0) {
      sbBox.innerHTML = '<p class="lock-note">در این بازه مطالعه‌ای ثبت نکردی.</p>';
      return;
    }

    subjects.forEach(function(subj) {
      var data = subjectData[subj];
      var div = document.createElement('div');
      div.className = 'subject-row';
      div.innerHTML = `
        <div style="font-weight:bold; font-size:0.9rem;">📖 ${subj}</div>
        <div style="display:flex; gap:16px; font-size:0.8rem;">
          <span>⏱ ${data.minutes} دقیقه</span>
          <span>✍️ ${data.questions} تست</span>
        </div>
      `;
      sbBox.appendChild(div);
    });
  });
}

// ... (بقیه توابع profile.js مثل قبل: کپی لینک، ذخیره تولد، نشان‌ها، سطح و...) ...
