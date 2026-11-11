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

// ===== منوی کشویی کتاب‌ها =====
if (document.getElementById('toggleBooksBtn')) {
  var toggleBooksBtn = document.getElementById('toggleBooksBtn');
  var booksContainer = document.getElementById('booksContainer');
  var booksArrow = document.getElementById('booksArrow');

  toggleBooksBtn.addEventListener('click', function() {
    if (booksContainer.classList.contains('hidden')) {
      booksContainer.classList.remove('hidden');
      booksArrow.style.transform = 'rotate(180deg)';
      loadBookClubUsers();
    } else {
      booksContainer.classList.add('hidden');
      booksArrow.style.transform = 'rotate(0deg)';
    }
  });
}

// ===== اعلان جدید (با نمایش خطای دقیق) =====
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
        // ⬇️ حالا پیام دقیق خطا رو نشون می‌ده
        msg.textContent = '❌ ' + res.error.message + ' (کد: ' + (res.error.code || '?') + ')';
        msg.style.color = '#e74c3c';
        console.error('NOTICE ERROR FULL:', res.error);
        return;
      }
      msg.textContent = '✅ ثبت شد'; 
      msg.style.color = '#2ecc71';
      document.getElementById('noticeText').value = '';
    }).catch(function(err) {
      msg.textContent = '❌ خطای شبکه: ' + err.message;
      msg.style.color = '#e74c3c';
      console.error('NOTICE NETWORK ERROR:', err);
    });
  });
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
  supabaseClient.from('profiles').update({ status: status }).eq('id', id).then(function() { loadRequests(); });
}

function loadUsers() {
  var box = document.getElementById('usersList');
  if (!box) return;
  supabaseClient.from('profiles').select('*').order('created_at', { ascending: false }).then(function(res) {
    var rows = res.data || [];
    if (rows.length === 0) { box.innerHTML = '<p class="lock-note">کاربری نیست</p>'; return; }
    box.innerHTML = '';
    rows.forEach(function(u) {
      var canEdit = (currentRole === 'superadmin') || (u.role !== 'superadmin' && u.role !== 'admin');
      var options = '';
      var roles = [{ v: 'student', n: 'دانش‌آموز' }, { v: 'supervisor', n: 'ناظر' }, { v: 'counselor', n: 'مشاور' }, { v: 'admin', n: 'ادمین' }];
      roles.forEach(function(r) {
        if (r.v === 'admin' && currentRole !== 'superadmin') return;
        options += '<option value="' + r.v + '"' + (u.role === r.v ? ' selected' : '') + '>' + r.n + '</option>';
      });
      var statusLabel = u.status === 'approved' ? '✅' : (u.status === 'pending' ? '⏳' : '❌');
      var titleDisplay = (u.role === 'admin' && u.admin_subject) ? ' (' + u.admin_subject + ')' : '';
      
      var html = '<div style="width:100%; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">';
      html += '<div><strong>' + statusLabel + ' ' + u.username + '</strong><span class="admin-sub">' + u.class_name + titleDisplay + '</span></div>';
      
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
    var badge = document.getElementById('inboxBadge');
    if (rows.length > 0) { badge.textContent = rows.length; badge.classList.remove('hidden'); } else { badge.classList.add('hidden'); }

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
