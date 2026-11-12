function saveStudySession(subject, minutes, questions) {
  return supabaseClient.auth.getUser().then(function(res) {
    if (!res.data.user) return;
    var userId = res.data.user.id;
    return supabaseClient.from('study_sessions').insert({
      user_id: userId, subject: subject, minutes: minutes, questions: parseInt(questions) || 0
    }).then(function(sessionRes) {
      if (sessionRes.error) return;
      return supabaseClient.from('profiles').select('total_minutes, xp').eq('id', userId).single().then(function(p) {
        var newMinutes = (p.data.total_minutes || 0) + minutes;
        var newXp = (p.data.xp || 0) + minutes * 2;
        return supabaseClient.from('profiles').update({ total_minutes: newMinutes, xp: newXp }).eq('id', userId);
      });
    });
  });
}

var currentUser = null;
var currentLevel = 1;

var chatBox = document.getElementById('chatBox');
var chatInput = document.getElementById('chatInput');
var chatSendBtn = document.getElementById('chatSendBtn');
var shelfLocked = document.getElementById('shelfLocked');
var shelfUnlocked = document.getElementById('shelfUnlocked');
var myShelfList = document.getElementById('myShelfList');
var loanList = document.getElementById('loanList');
var progressList = document.getElementById('progressList');

var bookTabs = document.querySelectorAll('[data-book-tab]');
var bookContents = document.querySelectorAll('.tab-content');
bookTabs.forEach(function(tab) {
  tab.addEventListener('click', function() {
    bookTabs.forEach(function(t) { t.classList.remove('active'); });
    bookContents.forEach(function(c) { c.classList.add('hidden'); c.style.display = 'none'; });
    tab.classList.add('active');
    var target = document.getElementById(tab.getAttribute('data-book-tab'));
    if (target) {
      target.classList.remove('hidden');
      target.style.display = tab.getAttribute('data-book-tab') === 'tab-chat' ? 'flex' : 'block';
    }
  });
});

supabaseClient.auth.getUser().then(function(res) {
  if (!res.data.user) { window.location.href = 'login.html'; return; }
  currentUser = res.data.user;

  supabaseClient.from('profiles').select('total_minutes').eq('id', currentUser.id).single().then(function(p) {
    if (!p.data) return;
    
    var minutes = p.data.total_minutes || 0;
    var hours = minutes / 60;
    var LEVEL_HOURS = [0, 3, 8, 16, 30, 50, 80, 120, 170, 250];
    for (var i = 0; i < LEVEL_HOURS.length; i++) {
      if (hours >= LEVEL_HOURS[i]) currentLevel = i + 1;
    }

    if (currentLevel >= 2) {
      if(shelfLocked) shelfLocked.classList.add('hidden');
      if(shelfUnlocked) shelfUnlocked.classList.remove('hidden');
      loadMyShelf();
    }

    loadChat();
    loadLoans();
    loadProgress();
  });
});

// ===== چت (با پشتیبانی از استیکر) =====
function loadChat() {
  if(!chatBox) return;
  supabaseClient.from('book_chat').select('*, profiles(username)').order('created_at', { ascending: true }).then(function(res) {
    chatBox.innerHTML = '';
    var rows = res.data || [];
    if (rows.length === 0) { chatBox.innerHTML = '<p class="lock-note" style="text-align: center; margin-top: 20px;">هنوز پیامی نیست.</p>'; return; }
    rows.forEach(function(msg) {
      var isMe = msg.user_id === currentUser.id;
      var div = document.createElement('div');
      div.className = 'chat-msg ' + (isMe ? 'me' : 'other');
      var senderName = isMe ? 'شما' : msg.profiles.username;
      
      var stickerHtml = renderStickerInChat(msg.message);
      if (stickerHtml) {
        div.innerHTML = '<span class="sender">' + senderName + '</span>' + stickerHtml;
      } else {
        div.innerHTML = '<span class="sender">' + senderName + '</span>' + msg.message;
      }
      
      chatBox.appendChild(div);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  });
}

if(chatSendBtn) {
  chatSendBtn.addEventListener('click', function() {
    var text = chatInput.value.trim();
    if (text.length < 1) return;
    
    if (text.startsWith('[STICKER]')) {
       chatInput.value = '';
       supabaseClient.from('book_chat').insert({ user_id: currentUser.id, message: text }).then(function(res) {
         if (!res.error) loadChat();
       });
       return;
    }

    supabaseClient.from('banned_words').select('word').then(function(res) {
      var banned = (res.data || []).map(function(w) { return w.word; });
      var cleanedText = text.replace(/[\/\-\.\_\s]/g, '');
      var hasBadWord = false;
      banned.forEach(function(bw) { if (cleanedText.includes(bw)) hasBadWord = true; });
      if (hasBadWord) { alert('پیامت حاوی کلمات نامناسب بود.'); return; }
      
      chatInput.value = '';
      chatSendBtn.disabled = true;
      supabaseClient.from('book_chat').insert({ user_id: currentUser.id, message: text }).then(function(res) {
        chatSendBtn.disabled = false;
        if (!res.error) loadChat();
      });
    });
  });
  chatInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') chatSendBtn.click(); });
}

// ===== ردیاب مطالعه =====
if(document.getElementById('addProgressBtn')) {
  document.getElementById('addProgressBtn').addEventListener('click', function() {
    var title = document.getElementById('newBookTitle').value.trim();
    var total = parseInt(document.getElementById('newBookTotalPages').value);
    var perDay = parseInt(document.getElementById('newBookPagesPerDay').value);

    if (!title || !total || total < 1 || !perDay || perDay < 1) { alert('همه فیلدها رو پر کن'); return; }

    supabaseClient.from('book_progress').insert({
      user_id: currentUser.id, title: title, total_pages: total, pages_per_day: perDay
    }).then(function(res) {
      if (res.error) { alert('خطا: ' + res.error.message); return; }
      document.getElementById('newBookTitle').value = '';
      document.getElementById('newBookTotalPages').value = '';
      document.getElementById('newBookPagesPerDay').value = '';
      loadProgress();
    });
  });
}

function loadProgress() {
  if(!progressList) return;
  supabaseClient.from('book_progress').select('*').eq('user_id', currentUser.id).eq('status', 'reading').order('created_at', { ascending: false }).then(function(res) {
    progressList.innerHTML = '';
    var rows = res.data || [];
    if (rows.length === 0) { progressList.innerHTML = '<p class="lock-note" style="text-align: center;">در حال حاضر کتابی نمی‌خونی.</p>'; return; }

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
        '<div style="display:flex; justify-content:space-between; align-items:center;">' +
          '<strong>' + b.title + '</strong>' +
          '<button class="btn btn-dim btn-sm" onclick="delProgress(' + b.id + ')">حذف</button>' +
        '</div>' +
        '<div class="progress-stats"><span>صفحه ' + b.current_page + ' از ' + b.total_pages + '</span><span>' + percent + '%</span></div>' +
        '<div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ' + percent + '%"></div></div>' +
        '<div class="estim">⏳ با روزی ' + b.pages_per_day + ' صفحه، تا <strong>' + dateStr + '</strong> تمومش می‌کنی ( ' + daysLeft + ' روز مونده )</div>' +
        '<div class="update-form">' +
          '<input type="number" id="pageInput_' + b.id + '" placeholder="الان صفحه چندی؟" min="0" max="' + b.total_pages + '">' +
          '<button class="btn btn-green" onclick="updateProgress(' + b.id + ', ' + b.total_pages + ')">ثبت</button>' +
        '</div>';

      progressList.appendChild(div);
    });
  });
}

window.updateProgress = function(id, totalPages) {
  var val = parseInt(document.getElementById('pageInput_' + id).value);
  if (isNaN(val) || val < 0 || val > totalPages) { alert('عدد صفحه درست نیست'); return; }
  supabaseClient.from('book_progress').update({ current_page: val, updated_at: new Date().toISOString() }).eq('id', id).then(function(res) {
    if (!res.error) loadProgress();
  });
}

window.delProgress = function(id) {
  if(confirm('این کتاب از ردیاب حذف بشه؟')) {
    supabaseClient.from('book_progress').delete().eq('id', id).then(function() { loadProgress(); });
  }
}

// ===== قفسه کتاب =====
if(document.getElementById('addBookBtn')) {
  document.getElementById('addBookBtn').addEventListener('click', function() {
    var title = document.getElementById('bookTitle').value.trim();
    var file = document.getElementById('bookImage').files[0];
    var btn = document.getElementById('addBookBtn');

    if (!title || !file) { alert('اسم و عکس کتاب رو بزن'); return; }
    if (file.size > 2 * 1024 * 1024) { alert('حجم عکس زیاده'); return; }

    btn.disabled = true; btn.textContent = 'در حال ثبت...';
    var safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '');
    var fileName = 'book_' + Date.now() + '_' + safeName;

    supabaseClient.storage.from('videos').upload(fileName, file).then(function(uploadRes) {
      if (uploadRes.error) { alert('خطا'); btn.disabled = false; btn.textContent = 'افزودن به قفسه'; return; }
      var publicUrl = supabaseClient.storage.from('videos').getPublicUrl(fileName).data.publicUrl;

      supabaseClient.from('book_shelf').insert({ user_id: currentUser.id, title: title, image_url: publicUrl }).then(function(insertRes) {
        btn.disabled = false; btn.textContent = 'افزودن به قفسه';
        if (insertRes.error) { alert('خطا'); return; }
        btn.textContent = '✅ اضافه شد!';
        setTimeout(function() {
          document.getElementById('bookTitle').value = '';
          document.getElementById('bookImage').value = '';
          loadMyShelf();
          btn.textContent = 'افزودن به قفسه';
        }, 1000);
      });
    });
  });
}

function loadMyShelf() {
  if(!myShelfList) return;
  supabaseClient.from('book_shelf').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: true }).then(function(res) {
    myShelfList.innerHTML = '';
    var rows = res.data || [];
    if (rows.length === 0) { myShelfList.innerHTML = '<p class="lock-note" style="text-align: center;">قفسه‌ت خالیه.</p>'; return; }
    
    var shelf = document.createElement('div');
    shelf.className = 'bookshelf-container';
    rows.forEach(function(book) {
      var div = document.createElement('div');
      div.className = 'real-book';
      div.innerHTML = '<img src="' + book.image_url + '"><div class="book-title-tooltip">' + book.title + '</div><button class="delete-book-btn" onclick="event.stopPropagation(); deleteBook(' + book.id + ')">×</button>';
      shelf.appendChild(div);
    });
    myShelfList.appendChild(shelf);
  });
}
window.deleteBook = function(id) { if(confirm('حذف بشه؟')) supabaseClient.from('book_shelf').delete().eq('id', id).then(loadMyShelf); }

// ===== امانت =====
if(document.getElementById('addLoanBtn')) {
  document.getElementById('addLoanBtn').addEventListener('click', function() {
    var title = document.getElementById('loanTitle').value.trim();
    if (!title) return;
    supabaseClient.from('book_loan').insert({ owner_id: currentUser.id, title: title, status: 'available' }).then(function(res) {
      if (res.error) { alert('خطا'); return; }
      document.getElementById('loanTitle').value = '';
      loadLoans();
    });
  });
}

function loadLoans() {
  if(!loanList) return;
  supabaseClient.from('book_loan').select('*, profiles(username)').order('created_at', { ascending: false }).then(function(res) {
    loanList.innerHTML = '';
    var rows = res.data || [];
    if (rows.length === 0) { loanList.innerHTML = '<p class="lock-note" style="text-align: center;">هنوز کتابی برای امانت نیست.</p>'; return; }
    rows.forEach(function(loan) {
      var isMine = loan.owner_id === currentUser.id;
      var div = document.createElement('div');
      div.className = 'book-card';
      div.style.flexDirection = 'column'; div.style.alignItems = 'flex-start';
      var statusText = loan.status === 'available' ? '🟢 موجود' : (loan.status === 'requested' ? '🟡 درخواست' : '🔴 امانت داده شده');
      var actionBtn = !isMine && loan.status === 'available' ? '<button class="btn btn-blue btn-sm" onclick="requestLoan(' + loan.id + ')">درخواست امانت</button>' : 
                      (isMine ? '<button class="btn btn-dim btn-sm" onclick="deleteLoan(' + loan.id + ')">حذف</button>' : '');
      div.innerHTML = '<div style="width:100%; display:flex; justify-content:space-between; align-items:center;"><div><strong>' + loan.title + '</strong><p style="font-size:0.75rem; color:var(--text-dim);">صاحب: ' + loan.profiles.username + '</p></div><span style="font-size:0.8rem;">' + statusText + '</span></div>' + actionBtn;
      loanList.appendChild(div);
    });
  });
}
window.requestLoan = function(id) { supabaseClient.from('book_loan').update({ status: 'requested' }).eq('id', id).then(loadLoans); }
window.deleteLoan = function(id) { supabaseClient.from('book_loan').delete().eq('id', id).then(loadLoans); }
