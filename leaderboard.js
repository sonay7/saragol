// ===== تب‌ها =====
var tabs = document.querySelectorAll('.tab');
var tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(function(tab) {
  tab.addEventListener('click', function() {
    tabs.forEach(function(t) { t.classList.remove('active'); });
    tabContents.forEach(function(c) { c.classList.add('hidden'); });
    tab.classList.add('active');
    var target = document.getElementById(tab.dataset.tab);
    if (target) target.classList.remove('hidden');
  });
});

// ===== لیگ فردی =====
function loadIndividual() {
  supabaseClient.rpc('get_weekly_leaderboard').then(function(res) {
    var box = document.getElementById('individualList');
    if (res.error) {
      box.innerHTML = '<p class="lock-note">خطا در بارگذاری</p>';
      return;
    }
    var rows = res.data || [];

    if (rows.length === 0) {
      box.innerHTML = '<p class="lock-note">هنوز کسی این هفته مطالعه نکرده</p>';
      return;
    }

    box.innerHTML = '';
    rows.slice(0, 20).forEach(function(u, i) {
      var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.';
      var div = document.createElement('div');
      div.className = 'league-row';
      if (i === 0) div.style.borderColor = 'var(--green)';
      div.innerHTML =
        '<span>' + medal + ' ' + u.username + ' <span style="color:var(--text-dim);font-size:0.75rem;">(' + u.class_name + ')</span></span>' +
        '<span>' + u.weekly_minutes + ' دقیقه</span>';
      box.appendChild(div);
    });
  });
}

// ===== لیگ کلاسی =====
function loadClass() {
  supabaseClient.rpc('get_weekly_leaderboard').then(function(res) {
    var box = document.getElementById('classList');
    if (res.error) {
      box.innerHTML = '<p class="lock-note">خطا در بارگذاری</p>';
      return;
    }
    var rows = res.data || [];

    // جمع کردن امتیاز هر کلاس
    var classes = {};
    rows.forEach(function(u) {
      if (!u.class_name) return;
      if (!classes[u.class_name]) classes[u.class_name] = 0;
      classes[u.class_name] += parseInt(u.weekly_minutes);
    });

    var sorted = Object.keys(classes).sort(function(a, b) {
      return classes[b] - classes[a];
    });

    if (sorted.length === 0) {
      box.innerHTML = '<p class="lock-note">هنوز داده‌ای نیست</p>';
      return;
    }

    box.innerHTML = '';
    sorted.forEach(function(name, i) {
      var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.';
      var div = document.createElement('div');
      div.className = 'league-row';
      if (i === 0) div.style.borderColor = 'var(--green)';
      div.innerHTML =
        '<span>' + medal + ' ' + name + '</span>' +
        '<span>' + classes[name] + ' دقیقه</span>';
      box.appendChild(div);
    });
  });
}

// ===== شروع =====
loadIndividual();
loadClass();