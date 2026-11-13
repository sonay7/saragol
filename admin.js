var currentUser = null;
var currentRole = null;

function toShamsi(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr);
  return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
}

// ===== چک کردن دسترسی و شروع =====
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

    loadRequests();
    loadUsers();
    loadExams();
    loadQuotes();
    loadInbox();
    loadBookClubUsers();
    loadAdminNotices();
    loadAdminPacks();
    loadAdminWheel();
  });
});

// ===== تب‌های اصلی =====
var adminTabs = document.querySelectorAll('[data-admin-tab]');
var adminContents = document.querySelectorAll('.admin-tab-content');
adminTabs.forEach(function(tab) {
  tab.addEventListener('click', function() {
    adminTabs.forEach(function(t) { t.classList.remove('active'); });
    adminContents.forEach(function(c) { c.classList.add('hidden'); });
    tab.classList.add('active');
    var target = document.getElementById(tab.getAttribute('data-admin-tab'));
    if (target) target.classList.remove('hidden');
  });
});

// ===== منوی کشویی کتاب‌ها (رفع باگ null) =====
if (document.getElementById('toggleBooksBtn')) {
  var toggleBooksBtn = document.getElementById('toggleBooksBtn');
  var booksContainer = document.getElementById('booksContainer');

  toggleBooksBtn.addEventListener('click', function() {
    if (booksContainer.classList.contains('hidden')) {
      booksContainer.classList.remove('hidden');
      loadBookClubUsers();
    } else {
      booksContainer.classList.add('hidden');
    }
  });
}

// ===== اعلان جدید =====
if (document.getElementById('addNoticeBtn')) {
  document.getElementById('addNoticeBtn').addEventListener('click', function() {
    var text = document.getElementById('noticeText').value.trim();
    var type = document.getElementById('noticeType').value;
    var msg = document.getElementById('noticeMsg');

    if (text.length < 3) { 
      msg.textContent = 'متن کوتاهه'; 
      msg.style.color = '#e74c3c'; 
      return; 
    }

    msg.textContent = '⏳ در حال ثبت...'; 
    msg.style.color = 'var(--text-dim)';

    supabaseClient.from('notices').insert({ text: text, type: type }).then(function(res) {
      if (res.error) { 
        msg.textContent = '❌ ' + res.error.message;
        msg.style.color = '#e74c3c';
        return;
      }
      msg.textContent = '✅ ثبت شد'; 
      msg.style.color = '#2ecc71';
      document.getElementById('noticeText').value = '';
      loadAdminNotices();
    });
  });
}

function loadAdminNotices() {
  var list = document.getElementById('adminNoticesList');
  if (!list) return;
  
  supabaseClient.from('notices').select('*').order('created_at', { ascending: false }).then(function(res) {
    list.innerHTML = '';
    var rows = res.data || [];
    if (rows.length === 0) { list.innerHTML = '<p class="lock-note">هیچ اعلانی ثبت نشده است.</p>'; return; }
    
    rows.forEach(function(n) {
      var div = document.createElement('div');
      div.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:12px; background:var(--bg-card); border:1px solid var(--border); border-radius:10px; margin-bottom:8px;';
      var typeStr = (n.type || '').toLowerCase();
      var typeLabel = typeStr.includes('فوری') ? 'فوری' : (typeStr.includes('مهم') ? 'مهم' : 'عادی');
      
      div.innerHTML = '<div style="flex:1;"><strong>' + n.text + '</strong><br><span style="font-size:0.75rem; color:var(--text-dim);">نوع: ' + typeLabel + '</span></div>' +
        '<button class="btn btn-dim btn-sm" onclick="delAdminNotice(' + n.id + ')" style="color:#e74c3c; border-color:#e74c3c;">حذف</button>';
      list.appendChild(div);
    });
  });
}

window.delAdminNotice = function(id) {
  if (confirm('این اعلان حذف شود؟')) {
    supabaseClient.from('notices').delete().eq('id', id).then(function(res) {
      if (!res.error) loadAdminNotices();
    });
  }
}

// ===== درخواست‌ها و کاربران =====
function loadRequests() {
  var box = document.getElementById('requestsList');
  if (!box) return;
  supabaseClient.from('profiles').select('*').eq('status', 'pending').then(function(res) {
    var rows = res.data || [];
    if (rows.length === 0) { box.innerHTML = '<p class="lock-note">درخواستی نیست ✅</p>'; return; }
    box.innerHTML = '';
    rows.forEach(function(u) {
      var div = document.createElement('div');
      div.className = 'admin-row';
      div.innerHTML = '<div><strong>' + u.username + '</strong><span class="admin-sub">' + u.class_name + '</span></div>' +
        '<div class="admin-actions"><button class="btn btn-green btn-sm" onclick="setUserStatus(\'' + u.id + '\', \'approved\')">تأیید</button><button class="btn btn-dim btn-sm" onclick="setUserStatus(\'' + u.id + '\', \'rejected\')">رد</button></div>';
      box.appendChild(div);
    });
  });
}

window.setUserStatus = function(id, status) {
  supabaseClient.from('profiles').update({ status: status }).eq('id', id).then(function() { loadRequests(); loadUsers(); });
}

function loadUsers() {
  var box = document.getElementById('usersList');
  if (!box) return;
  
  supabaseClient.from('profiles').select('*').eq('status', 'approved').order('created_at', { ascending: false }).then(function(res) {
    var rows = res.data || [];
    if (rows.length === 0) { box.innerHTML = '<p class="lock-note">کاربر تایید شده‌ای وجود ندارد.</p>'; return; }
    box.innerHTML = '';
    rows.forEach(function(u) {
      var canEdit = (currentRole === 'superadmin') || (u.role !== 'superadmin' && u.role !== 'admin');
      var options = '';
      var roles = [{ v: 'student', n: 'دانش‌آموز' }, { v: 'supervisor', n: 'ناظر' }, { v: 'counselor', n: 'مشاور' }, { v: 'admin', n: 'ادمین' }];
      roles.forEach(function(r) {
        if (r.v === 'admin' && currentRole !== 'superadmin') return;
        options += '<option value="' + r.v + '"' + (u.role === r.v ? ' selected' : '') + '>' + r.n + '</option>';
      });
      
      var titleDisplay = (u.role === 'admin' && u.admin_subject) ? ' (' + u.admin_subject + ')' : '';
      
      var html = '<div style="width:100%; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">';
      html += '<div><strong>✅ ' + u.username + '</strong><span class="admin-sub">' + u.class_name + titleDisplay + '</span></div>';
      
      if (canEdit && u.id !== currentUser.id) {
        html += '<select class="select role-select" data-uid="' + u.id + '" style="padding:6px;font-size:0.75rem;">' + options + '</select>';
      } else {
        html += '<span class="admin-sub">' + u.role + '</span>';
      }
      html += '</div>';

      var div = document.createElement('div');
      div.className = 'admin-row';
      div.innerHTML = html;
      box.appendChild(div);
    });

    box.querySelectorAll('.role-select').forEach(function(sel) {
      sel.addEventListener('change', function() {
        supabaseClient.from('profiles').update({ role: sel.value }).eq('id', sel.getAttribute('data-uid')).then(function() { loadUsers(); });
      });
    });
  });
}

// ===== آزمون‌ها =====
function loadExams() {
  var list = document.getElementById('examsList');
  if (!list) return;
  supabaseClient.from('exams').select('*').eq('is_public', true).order('exam_date', { ascending: true }).then(function(res) {
    list.innerHTML = '';
    (res.data || []).forEach(function(exam) {
      var div = document.createElement('div');
      div.className = 'admin-row';
      div.innerHTML = '<div><strong>' + exam.subject + '</strong><span class="admin-sub">' + toShamsi(exam.exam_date) + '</span></div>' +
        '<button class="btn btn-dim btn-sm" onclick="delExam(' + exam.id + ')">حذف</button>';
      list.appendChild(div);
    });
  });
}
window.delExam = function(id) { supabaseClient.from('exams').delete().eq('id', id).then(loadExams); }

if (document.getElementById('addExamBtn')) {
  document.getElementById('addExamBtn').addEventListener('click', function() {
    var subject = document.getElementById('examSubject').value.trim();
    var examDate = document.getElementById('examDate').value;
    var className = document.getElementById('examClass').value;
    if (!subject || !examDate) return alert('نام و تاریخ رو بزن');
    supabaseClient.from('exams').insert({ subject: subject, exam_date: examDate, class_name: className, is_public: true, created_by: currentUser.id }).then(loadExams);
  });
}

// ===== جمله‌ها =====
function loadQuotes() {
  var list = document.getElementById('quotesList');
  if (!list) return;
  supabaseClient.from('quotes').select('*').order('created_at', { ascending: false }).then(function(res) {
    list.innerHTML = '';
    (res.data || []).forEach(function(q) {
      var div = document.createElement('div');
      div.className = 'admin-row';
      div.innerHTML = '<div>' + q.text + '</div><button class="btn btn-dim btn-sm" onclick="delQuote(' + q.id + ')">حذف</button>';
      list.appendChild(div);
    });
  });
}
window.delQuote = function(id) { supabaseClient.from('quotes').delete().eq('id', id).then(loadQuotes); }

if (document.getElementById('addQuoteBtn')) {
  document.getElementById('addQuoteBtn').addEventListener('click', function() {
    var text = document.getElementById('quoteText').value.trim();
    if (text.length < 5) return;
    supabaseClient.from('quotes').insert({ text: text }).then(loadQuotes);
    document.getElementById('quoteText').value = '';
  });
}

// ===== انتشار مستقیم =====
if (document.getElementById('directUploadBtn')) {
  document.getElementById('directUploadBtn').addEventListener('click', function() {
    var file = document.getElementById('directFile').files[0];
    if (!file) return;
    var btn = document.getElementById('directUploadBtn');
    btn.disabled = true; btn.textContent = 'در حال آپلود...';
    var fileName = 'direct_' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9.]/g, '');
    supabaseClient.storage.from('videos').upload(fileName, file, { contentType: file.type || 'video/mp4' }).then(function(uploadRes) {
      if (uploadRes.error) { alert(uploadRes.error.message); btn.disabled = false; btn.textContent = 'آپلود و انتشار'; return; }
      var publicUrl = supabaseClient.storage.from('videos').getPublicUrl(fileName).data.publicUrl;
      supabaseClient.from('admin_inbox').insert({ user_id: currentUser.id, file_url: publicUrl, file_type: file.type || 'video/mp4', status: 'approved' }).then(function() {
        btn.disabled = false; btn.textContent = 'آپلود و انتشار';
        document.getElementById('directMsg').textContent = '✅ منتشر شد';
      });
    });
  });
}

// ===== صندوق ورودی =====
function loadInbox() {
  if (!document.getElementById('list-private')) return;
  var inboxTabs = document.querySelectorAll('[data-tab^="inbox-"]');
  var inboxContents = document.querySelectorAll('#inbox-private, #inbox-explore, #inbox-reports');
  inboxTabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      inboxTabs.forEach(function(t) { t.classList.remove('active'); });
      inboxContents.forEach(function(c) { c.classList.add('hidden'); });
      tab.classList.add('active');
      document.getElementById(tab.getAttribute('data-tab')).classList.remove('hidden');
    });
  });

  supabaseClient.from('admin_inbox').select('*, profiles(username, class_name)').eq('status', 'pending').order('created_at', { ascending: false }).then(function(res) {
    var pList = document.getElementById('list-private'), eList = document.getElementById('list-explore'), rList = document.getElementById('list-reports');
    pList.innerHTML = eList.innerHTML = rList.innerHTML = '';
    var rows = res.data || [];
    
    rows.forEach(function(item) {
      var div = document.createElement('div');
      div.className = 'admin-row';
      div.innerHTML = '<strong>' + item.profiles.username + '</strong>' + (item.message ? '<p>' + item.message + '</p>' : '') + 
        (item.file_url ? '<img src="' + item.file_url + '" style="width:100px;">' : '') +
        '<button class="btn btn-dim btn-sm" onclick="delInbox(' + item.id + ')">حذف/رد</button>' +
        (item.file_url && !item.message ? '<button class="btn btn-green btn-sm" onclick="approveInbox(' + item.id + ')">تأیید</button>' : '');
      
      if (item.file_url && item.message) rList.appendChild(div);
      else if (item.file_url) eList.appendChild(div);
      else pList.appendChild(div);
    });
    
    if (pList.innerHTML === '') pList.innerHTML = '<p class="lock-note">پیامی نیست ✅</p>';
    if (eList.innerHTML === '') eList.innerHTML = '<p class="lock-note">ارسالی نیست ✅</p>';
    if (rList.innerHTML === '') rList.innerHTML = '<p class="lock-note">گزارشی نیست ✅</p>';
  });
}
window.delInbox = function(id) { supabaseClient.from('admin_inbox').delete().eq('id', id).then(loadInbox); }
window.approveInbox = function(id) { supabaseClient.from('admin_inbox').update({ status: 'approved' }).eq('id', id).then(loadInbox); }

// ===== اعضای انجمن کتاب‌خوانی =====
function loadBookClubUsers() {
  var listBox = document.getElementById('bookClubUsersList');
  if (!listBox) return;

  Promise.all([
    supabaseClient.from('book_shelf').select('*, profiles(username, class_name)').order('created_at', { ascending: false }),
    supabaseClient.from('book_loan').select('*, profiles(username, class_name)').order('created_at', { ascending: false })
  ]).then(function(results) {
    var shelves = results[0].data || [];
    var loans = results[1].data || [];

    var users = {};
    shelves.forEach(function(b) {
      if (!users[b.user_id]) users[b.user_id] = { id: b.user_id, username: b.profiles.username, class_name: b.profiles.class_name, books: [], loans: [], newCount: 0 };
      users[b.user_id].books.push(b);
      if (new Date(b.created_at) > new Date(Date.now() - 24*60*60*1000)) users[b.user_id].newCount++;
    });
    loans.forEach(function(l) {
      if (!users[l.owner_id]) users[l.owner_id] = { id: l.owner_id, username: l.profiles.username, class_name: l.profiles.class_name, books: [], loans: [], newCount: 0 };
      users[l.owner_id].loans.push(l);
    });

    var userList = Object.values(users);
    if (userList.length === 0) { listBox.innerHTML = '<p class="lock-note">هنوز کسی کتابی اضافه نکرده ✅</p>'; return; }

    listBox.innerHTML = '';
    userList.forEach(function(u) {
      var acc = document.createElement('div');
      acc.className = 'user-accordion';

      var badgeHtml = u.newCount > 0 ? '<span class="badge">' + u.newCount + ' جدید</span>' : '';

      var header = document.createElement('div');
      header.className = 'user-accordion-header';
      header.innerHTML = '<div><strong>' + badgeHtml + u.username + '</strong> <span class="admin-sub">(' + u.class_name + ')</span></div><span style="font-size:0.8rem;">▼</span>';
      
      var content = document.createElement('div');
      content.className = 'user-accordion-content';

      var booksHtml = '<h4 style="margin-bottom:8px; font-size:0.85rem;">📚 قفسه کتاب:</h4>';
      if (u.books.length === 0) booksHtml += '<p class="admin-sub">خالیه</p>';
      u.books.forEach(function(b) {
        booksHtml += '<div class="mini-book-item"><img src="' + b.image_url + '"><div style="flex:1;"><strong style="font-size:0.85rem;">' + b.title + '</strong></div><button class="btn btn-dim btn-sm" onclick="delAdminBook(' + b.id + ')">حذف</button></div>';
      });

      var loansHtml = '<h4 style="margin: 16px 0 8px; font-size:0.85rem;">🤝 امانت‌ها:</h4>';
      if (u.loans.length === 0) loansHtml += '<p class="admin-sub">خالیه</p>';
      u.loans.forEach(function(l) {
        var statusText = l.status === 'available' ? '🟢 موجود' : (l.status === 'requested' ? '🟡 درخواست' : '🔴 امانت داده شده');
        loansHtml += '<div class="mini-book-item"><div style="flex:1;"><strong style="font-size:0.85rem;">' + l.title + '</strong><br><span class="admin-sub">' + statusText + '</span></div><button class="btn btn-dim btn-sm" onclick="delAdminLoan(' + l.id + ')">حذف</button></div>';
      });

      content.innerHTML = booksHtml + loansHtml;

      header.addEventListener('click', function() {
        acc.classList.toggle('active');
      });

      acc.appendChild(header);
      acc.appendChild(content);
      listBox.appendChild(acc);
    });
  });
}

window.delAdminBook = function(id) {
  if(confirm('این کتاب حذف بشه؟')) supabaseClient.from('book_shelf').delete().eq('id', id).then(loadBookClubUsers);
}
window.delAdminLoan = function(id) {
  if(confirm('این امانت حذف بشه؟')) supabaseClient.from('book_loan').delete().eq('id', id).then(loadBookClubUsers);
}

// ===== اهدای نشان ویژه =====
window.giveBadge = function() {
  var username = document.getElementById('badgeUsername').value.trim();
  var badgeName = document.getElementById('badgeName').value;
  var badgeIcon = badgeName === 'اولین ستاره' ? '🌟' : '🏅';
  
  if (!username) { alert('نام کاربری رو وارد کن'); return; }

  supabaseClient.from('profiles').select('id, username').ilike('username', '%' + username + '%').then(function(userRes) {
    if (userRes.error) { alert('خطا در جستجو'); return; }
    if (!userRes.data || userRes.data.length === 0) { alert('کاربر پیدا نشد!'); return; }
    
    var user = userRes.data[0];
    if (!confirm('نشان «' + badgeName + '» رو به ' + user.username + ' می‌دی؟')) return;

    supabaseClient.from('user_badges').insert({
      user_id: user.id, badge_name: badgeName, badge_icon: badgeIcon
    }).then(function(res) {
      if (res.error) { alert('خطا: ' + res.error.message); return; }
      alert('🌟 نشان با موفقیت به ' + user.username + ' اهدا شد!');
      document.getElementById('badgeUsername').value = '';
    });
  });
};

// ===== سینما =====
window.addCinemaVideo = function() {
  var title = document.getElementById('cinemaTitle').value.trim();
  var desc = document.getElementById('cinemaDesc').value.trim();
  var url = document.getElementById('cinemaUrl').value.trim();
  var price = parseInt(document.getElementById('cinemaPrice').value);
  var msg = document.getElementById('cinemaMsg');

  if (!title || !url || !price || price < 1) {
    msg.textContent = 'عنوان، لینک و قیمت الزامی هستند.'; msg.style.color = '#e74c3c'; return;
  }

  msg.textContent = 'در حال ذخیره...'; msg.style.color = 'var(--text-dim)';

  supabaseClient.from('cinema_videos').insert({
    title: title, description: desc, video_url: url, price: price
  }).then(function(res) {
    if (res.error) { msg.textContent = 'خطا: ' + res.error.message; msg.style.color = '#e74c3c'; return; }
    msg.textContent = '✅ فیلم اضافه شد!'; msg.style.color = 'var(--green)';
    document.getElementById('cinemaTitle').value = '';
    document.getElementById('cinemaDesc').value = '';
    document.getElementById('cinemaUrl').value = '';
    document.getElementById('cinemaPrice').value = '';
  });
};

// ===== استیکرها =====
window.createStickerPack = function() {
  var name = document.getElementById('newPackName').value.trim();
  var price = parseInt(document.getElementById('newPackPrice').value);
  var icon = document.getElementById('newPackIcon').value.trim() || '📦';

  if (!name || !price || price < 1) { alert('اسم و قیمت رو درست وارد کن'); return; }

  supabaseClient.from('sticker_packs').insert({
    name: name, price: price, icon: icon
  }).then(function(res) {
    if (res.error) { alert('خطا: ' + res.error.message); return; }
    document.getElementById('newPackName').value = '';
    document.getElementById('newPackPrice').value = '';
    document.getElementById('newPackIcon').value = '';
    loadAdminPacks();
  });
};

function loadAdminPacks() {
  var list = document.getElementById('adminPacksList');
  if (!list) return;

  supabaseClient.from('sticker_packs').select('*, stickers(id, image_url)').order('created_at', { ascending: false }).then(function(res) {
    list.innerHTML = '';
    if (!res.data || res.data.length === 0) {
      list.innerHTML = '<p class="lock-note">هنوز پکی ساخته نشده.</p>';
      return;
    }

    res.data.forEach(function(pack) {
      var stickerCount = pack.stickers ? pack.stickers.length : 0;
      var div = document.createElement('div');
      div.style.cssText = 'background:var(--bg); padding:12px; border-radius:10px; border:1px solid var(--border); margin-bottom:8px;';
      
      var header = document.createElement('div');
      header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;';
      header.innerHTML = `
        <div><strong>${pack.icon} ${pack.name}</strong> <span style="font-size:0.75rem; color:var(--text-dim);">(${pack.price} XP - ${stickerCount} استیکر)</span></div>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-blue btn-sm" onclick="uploadSticker('${pack.id}')">➕ استیکر</button>
          <button class="btn btn-dim btn-sm" style="color:#e74c3c; border-color:#e74c3c;" onclick="deleteStickerPack('${pack.id}')">حذف پک</button>
        </div>
      `;

      var stickersGrid = document.createElement('div');
      stickersGrid.style.cssText = 'display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;';
      
      if (pack.stickers && pack.stickers.length > 0) {
        pack.stickers.forEach(function(st) {
          var imgWrap = document.createElement('div');
          imgWrap.style.cssText = 'position:relative; width:50px; height:50px;';
          imgWrap.innerHTML = `
            <img src="${st.image_url}" style="width:100%; height:100%; object-fit:contain; background:#fff; border-radius:8px; border:1px solid var(--border);">
            <button onclick="deleteSticker('${st.id}')" style="position:absolute; top:-5px; right:-5px; background:#e74c3c; color:#fff; border:none; border-radius:50%; width:18px; height:18px; font-size:10px; cursor:pointer;">×</button>
          `;
          stickersGrid.appendChild(imgWrap);
        });
      } else {
        stickersGrid.innerHTML = '<p style="font-size:0.7rem; color:var(--text-dim);">خالیه</p>';
      }

      div.appendChild(header);
      div.appendChild(stickersGrid);
      list.appendChild(div);
    });
  });
}

window.uploadSticker = function(packId) {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var fileName = 'sticker_' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9.]/g, '');
    supabaseClient.storage.from('videos').upload(fileName, file).then(function(uploadRes) {
      if (uploadRes.error) { alert('خطا در آپلود: ' + uploadRes.error.message); return; }
      var publicUrl = supabaseClient.storage.from('videos').getPublicUrl(fileName).data.publicUrl;
      supabaseClient.from('stickers').insert({
        pack_id: packId, image_url: publicUrl
      }).then(function(insertRes) {
        if (insertRes.error) { alert('خطا: ' + insertRes.error.message); return; }
        loadAdminPacks();
      });
    });
  };
  input.click();
};

window.deleteStickerPack = function(id) {
  if (!confirm('این پک و همه استیکرهاش حذف بشن؟')) return;
  supabaseClient.from('sticker_packs').delete().eq('id', id).then(function(res) {
    if (!res.error) loadAdminPacks();
  });
};

window.deleteSticker = function(stickerId) {
  if (!confirm('این استیکر حذف بشه؟')) return;
  supabaseClient.from('stickers').delete().eq('id', stickerId).then(function(res) {
    if (!res.error) loadAdminPacks();
  });
};

// ===== گردونه =====
window.addWheelSlice = function() {
  var label = document.getElementById('wheelLabel').value.trim();
  var color = document.getElementById('wheelColor').value;
  var type = document.getElementById('wheelType').value;
  var val = parseInt(document.getElementById('wheelValue').value) || 0;

  if (!label) { alert('متن رو بنویس'); return; }

  supabaseClient.from('wheel_config').insert({
    label: label, color: color, prize_type: type, prize_value: val
  }).then(function(res) {
    if (res.error) { alert('خطا: ' + res.error.message); return; }
    document.getElementById('wheelLabel').value = '';
    loadAdminWheel();
  });
};

function loadAdminWheel() {
  var list = document.getElementById('wheelSlicesList');
  if (!list) return;

  supabaseClient.from('wheel_config').select('*').order('created_at', { ascending: true }).then(function(res) {
    list.innerHTML = '';
    if (!res.data || res.data.length === 0) {
      list.innerHTML = '<p class="lock-note">گردونه خالیه.</p>';
      return;
    }
    res.data.forEach(function(s) {
      var div = document.createElement('div');
      div.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:var(--bg); padding:10px; border-radius:8px; margin-bottom:8px; border:1px solid var(--border);';
      div.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:20px; height:20px; border-radius:50%; background:${s.color};"></div>
          <strong>${s.label}</strong> <span style="font-size:0.7rem; color:var(--text-dim);">(${s.prize_type})</span>
        </div>
        <button class="btn btn-dim btn-sm" style="color:#e74c3c;" onclick="delWheelSlice('${s.id}')">حذف</button>
      `;
      list.appendChild(div);
    });
  });
}

window.delWheelSlice = function(id) {
  if (!confirm('حذف بشه؟')) return;
  supabaseClient.from('wheel_config').delete().eq('id', id).then(function() { loadAdminWheel(); });
};
