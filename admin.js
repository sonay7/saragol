var currentUser = null;
var currentRole = null;

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
      alert('دسترسی نداری');
      window.location.href = 'index.html';
      return;
    }

    document.querySelector('.user-name').textContent = p.data.username;
    document.querySelector('.avatar').textContent = p.data.username.charAt(0);

    loadRequests(); loadUsers(); loadExams(); loadQuotes(); loadInbox();
    loadBookClubUsers(); loadAdminNotices(); loadAdminPacks(); loadAdminWheel();
    loadUserMonitoring(); loadAdminCinema(); loadAdminBadges(); loadAdminQuests();
  });
});

// ... (بقیه توابع admin.js مثل قبل: اعلانات، نشان‌ها، سینما، استیکر، گردونه) ...
// برای جلوگیری از طولانی شدن، فقط بخش پایش کاربران و ماموریت‌ها رو اینجا کامل می‌ذارم.
// فرض کن بقیه کدها همون‌طور که توی پیام‌های قبلی بود سر جاشونه.

// ===== پایش کاربران (دسته‌بندی شده + غیرفعال‌سازی تک‌تک) =====
window.loadUserMonitoring = function() {
  var inactiveList = document.getElementById('inactiveUsersList');
  var wanderingList = document.getElementById('wanderingUsersList');
  if (!inactiveList || !wanderingList) return;
  
  inactiveList.innerHTML = '<p class="lock-note">در حال بارگذاری...</p>';
  wanderingList.innerHTML = '<p class="lock-note">در حال بارگذاری...</p>';
  
  // کاربران غیرفعال
  supabaseClient.from('profiles').select('*').eq('status', 'inactive').then(function(res) {
    inactiveList.innerHTML = '';
    var rows = res.data || [];
    if (rows.length === 0) { inactiveList.innerHTML = '<p class="lock-note">کاربر غیرفعالی وجود ندارد.</p>'; return; }
    rows.forEach(function(u) {
      var daysAgo = u.last_seen ? Math.floor((Date.now() - new Date(u.last_seen).getTime()) / (1000*60*60*24)) : '?';
      var div = document.createElement('div');
      div.className = 'admin-row';
      div.innerHTML = '<div><strong>😴 ' + u.username + '</strong><span class="admin-sub">' + u.class_name + ' - ' + daysAgo + ' روز غیرفعال</span></div><button class="btn btn-green btn-sm" onclick="reactivateUser(\'' + u.id + '\')">فعال‌سازی</button>';
      inactiveList.appendChild(div);
    });
  });
  
  // کاربران غایب (دسته‌بندی بر اساس تعداد روز)
  supabaseClient.from('profiles').select('*').eq('status', 'approved').then(function(res) {
    wanderingList.innerHTML = '';
    var rows = (res.data || []).filter(function(u) {
      if (!u.last_seen) return false;
      var days = Math.floor((Date.now() - new Date(u.last_seen).getTime()) / (1000*60*60*24));
      return days >= 3;
    });

    if (rows.length === 0) { wanderingList.innerHTML = '<p class="lock-note">همه کاربران فعال هستند ✅</p>'; return; }
    
    var groups = {};
    rows.forEach(function(u) {
      var daysAgo = Math.floor((Date.now() - new Date(u.last_seen).getTime()) / (1000*60*60*24));
      if (!groups[daysAgo]) groups[daysAgo] = [];
      groups[daysAgo].push(u);
    });

    var sortedDays = Object.keys(groups).sort(function(a,b){ return b - a; });

    sortedDays.forEach(function(days) {
      var users = groups[days];
      var groupDiv = document.createElement('div');
      groupDiv.style.cssText = 'margin-bottom:16px; border-right:3px solid var(--gold); padding-right:12px;';
      
      var title = document.createElement('h4');
      title.style.cssText = 'font-size:0.85rem; color:var(--gold); margin-bottom:8px;';
      title.textContent = '💤 ' + days + ' روز غیبت (' + users.length + ' نفر)';
      groupDiv.appendChild(title);

      users.forEach(function(u) {
        var div = document.createElement('div');
        div.className = 'admin-row';
        div.innerHTML = '<div><strong>' + u.username + '</strong><span class="admin-sub">' + u.class_name + '</span></div>' +
          '<button class="btn btn-dim btn-sm" style="color:#e74c3c; border-color:#e74c3c;" onclick="deactivateSingleUser(\'' + u.id + '\')">غیرفعال کن</button>';
        groupDiv.appendChild(div);
      });
      
      wanderingList.appendChild(groupDiv);
    });
  });
};

window.deactivateSingleUser = function(id) {
  if (!confirm('این کاربر غیرفعال شود؟')) return;
  supabaseClient.from('profiles').update({ status: 'inactive' }).eq('id', id).then(function() { loadUserMonitoring(); });
};
window.reactivateUser = function(id) {
  if (!confirm('این کاربر دوباره فعال بشه؟')) return;
  supabaseClient.from('profiles').update({ status: 'approved', last_seen: new Date().toISOString() }).eq('id', id).then(function() { loadUserMonitoring(); });
};

// ===== مدیریت ماموریت‌ها =====
window.addQuest = function() {
  var title = document.getElementById('questTitle').value.trim();
  var type = document.getElementById('questType').value;
  var target = parseInt(document.getElementById('questTarget').value) || 0;
  var xp = parseInt(document.getElementById('questXp').value) || 5;

  if (!title || target < 1) { alert('عنوان و هدف رو درست وارد کن'); return; }

  supabaseClient.from('daily_quests').insert({ title: title, type: type, target_value: target, xp_reward: xp }).then(function(res) {
    if (res.error) { alert('خطا: ' + res.error.message); return; }
    document.getElementById('questTitle').value = '';
    document.getElementById('questTarget').value = '';
    document.getElementById('questXp').value = '';
    loadAdminQuests();
  });
};

function loadAdminQuests() {
  var list = document.getElementById('adminQuestsList');
  if (!list) return;
  supabaseClient.from('daily_quests').select('*').order('created_at', { ascending: false }).then(function(res) {
    list.innerHTML = '';
    var rows = res.data || [];
    if (rows.length === 0) { list.innerHTML = '<p class="lock-note">ماموریتی وجود ندارد.</p>'; return; }
    rows.forEach(function(q) {
      var div = document.createElement('div');
      div.className = 'admin-row';
      div.innerHTML = '<div><strong>' + q.title + '</strong><span class="admin-sub">' + q.type + ' - هدف: ' + q.target_value + ' - ' + q.xp_reward + ' XP</span></div>' +
        '<button class="btn btn-dim btn-sm" style="color:#e74c3c;" onclick="delQuest(' + q.id + ')">حذف</button>';
      list.appendChild(div);
    });
  });
}
window.delQuest = function(id) { if (confirm('حذف شود؟')) supabaseClient.from('daily_quests').delete().eq('id', id).then(loadAdminQuests); };

if (document.getElementById('adminQuestsList')) loadAdminQuests();
