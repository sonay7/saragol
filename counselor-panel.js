var currentUser = null;
var currentRole = null;
var activeStudentId = null;
var activeStudentName = null;

var studentsList = document.getElementById('studentsList');
var chatWithName = document.getElementById('chatWithName');
var chatBox = document.getElementById('chatBox');
var chatInputArea = document.getElementById('chatInputArea');
var msgInput = document.getElementById('msgInput');
var sendBtn = document.getElementById('sendBtn');
var markReadBtn = document.getElementById('markReadBtn');

// ===== چک کردن دسترسی =====
supabaseClient.auth.getUser().then(function(res) {
  if (!res.data.user) { window.location.href = 'login.html'; return; }
  currentUser = res.data.user;

  supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single().then(function(p) {
    if (!p.data) return;
    currentRole = p.data.role;

    if (currentRole !== 'counselor' && currentRole !== 'admin' && currentRole !== 'superadmin') {
      alert('دسترسی نداری');
      window.location.href = 'index.html';
      return;
    }

    document.querySelector('.user-name').textContent = p.data.username;
    document.querySelector('.avatar').textContent = p.data.username.charAt(0);

    loadStudents();
  });
});

// ===== بارگذاری لیست دانش‌آموزان =====
function loadStudents() {
  supabaseClient.from('counselor_messages')
    .select('student_id, message, created_at, is_read, sender_role')
    .order('created_at', { ascending: false })
    .then(function(res) {
      if (res.error) {
        studentsList.innerHTML = '<p class="lock-note" style="color:red; font-size:0.8rem;">خطا: ' + res.error.message + '</p>';
        return;
      }

      var rows = res.data || [];
      if (rows.length === 0) {
        studentsList.innerHTML = '<p class="lock-note" style="text-align: center; font-size:0.85rem;">هنوز کسی پیامی نفرستاده</p>';
        return;
      }

      var studentIds = [];
      var studentData = {};
      rows.forEach(function(r) {
        if (!studentData[r.student_id]) {
          studentData[r.student_id] = { unreadCount: 0, lastMessage: r.message, lastDate: r.created_at };
          studentIds.push(r.student_id);
        }
        if (r.sender_role === 'student' && !r.is_read) {
          studentData[r.student_id].unreadCount++;
        }
      });

      supabaseClient.from('profiles').select('id, username, class_name').in('id', studentIds).then(function(profilesRes) {
        if (profilesRes.error) {
          studentsList.innerHTML = '<p class="lock-note" style="color:red; font-size:0.8rem;">خطا در خواندن اسم‌ها: ' + profilesRes.error.message + '</p>';
          return;
        }

        var profiles = profilesRes.data || [];
        studentsList.innerHTML = '';

        profiles.forEach(function(p) {
          var data = studentData[p.id];
          if (!data) return;

          var div = document.createElement('div');
          div.className = 'student-item' + (p.id === activeStudentId ? ' active' : '');
          div.setAttribute('data-sid', p.id);
          
          var badgeHtml = data.unreadCount > 0 ? '<span class="unread-badge">' + data.unreadCount + ' جدید</span>' : '';
          
          div.innerHTML = 
            '<div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 70%;">' +
              '<strong style="display: block; font-size: 0.9rem;">👤 ' + p.username + '</strong>' +
              '<span style="font-size: 0.75rem; color: var(--text-dim);">' + p.class_name + '</span>' +
              '<p style="font-size: 0.75rem; color: var(--text-dim); margin-top: 4px; overflow: hidden; text-overflow: ellipsis;">' + data.lastMessage + '</p>' +
            '</div>' +
            '<div>' + badgeHtml + '</div>';

          div.addEventListener('click', function() {
            document.querySelectorAll('.student-item').forEach(function(el) { el.classList.remove('active'); });
            div.classList.add('active');
            openChat(p.id, p.username);
          });

          studentsList.appendChild(div);
        });
      });
    });
}

// ===== باز کردن چت =====
function openChat(studentId, studentName) {
  activeStudentId = studentId;
  activeStudentName = studentName;
  
  chatWithName.textContent = 'چت با ' + studentName;
  chatInputArea.style.display = 'flex';
  markReadBtn.classList.remove('hidden');

  loadMessages();
}

// ===== لود پیام‌های یک دانش‌آموز (با قابلیت ویرایش و حذف) =====
function loadMessages() {
  if (!activeStudentId) return;

  supabaseClient.from('counselor_messages')
    .select('*')
    .eq('student_id', activeStudentId)
    .order('created_at', { ascending: true })
    .then(function(res) {
      chatBox.innerHTML = '';
      var rows = res.data || [];

      if (rows.length === 0) {
        chatBox.innerHTML = '<p class="lock-note" style="text-align: center; margin-top: 20px;">هنوز پیامی نیست.</p>';
        return;
      }

      rows.forEach(function(msg) {
        var isStudent = msg.sender_role === 'student';
        
        var div = document.createElement('div');
        div.style.maxWidth = '80%';
        div.style.padding = '10px 14px';
        div.style.borderRadius = '12px';
        div.style.fontSize = '0.9rem';
        div.style.lineHeight = '1.5';
        div.style.marginBottom = '8px';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';

        if (isStudent) {
          div.style.alignSelf = 'flex-start';
          div.style.background = 'var(--bg)';
          div.style.color = 'var(--text)';
          div.style.border = '1px solid var(--border)';
          div.style.borderBottomRightRadius = '4px';
        } else {
          div.style.alignSelf = 'flex-end';
          div.style.background = 'var(--green)';
          div.style.color = '#fff';
          div.style.borderBottomLeftRadius = '4px';
        }

        // متن پیام
        var textSpan = document.createElement('span');
        textSpan.textContent = msg.message;
        div.appendChild(textSpan);

        // دکمه‌های عملیات (ویرایش و حذف)
        var actionDiv = document.createElement('div');
        actionDiv.style.cssText = 'display: flex; gap: 8px; margin-top: 6px; align-self: ' + (isStudent ? 'flex-start' : 'flex-end') + ';';

        // اگر پیام خود مشاوره، دکمه ویرایش داشته باشه
        if (!isStudent) {
          var editBtn = document.createElement('button');
          editBtn.textContent = '✏️ ویرایش';
          editBtn.style.cssText = 'background: #f39c12; color: white; border: none; border-radius: 4px; font-size: 0.65rem; padding: 3px 8px; cursor: pointer; font-family: inherit;';
          editBtn.onclick = function() {
            var newText = prompt('متن جدید پیام:', msg.message);
            if (newText && newText.trim() !== '') {
              supabaseClient.from('counselor_messages').update({ message: newText.trim() }).eq('id', msg.id).then(function(res) {
                if (!res.error) loadMessages();
              });
            }
          };
          actionDiv.appendChild(editBtn);
        }

        // مشاور به هر پیامی (چه خودش، چه دانش‌آموز) اجازه حذف داره
        var delBtn = document.createElement('button');
        delBtn.textContent = '🗑️ حذف';
        delBtn.style.cssText = 'background: #e74c3c; color: white; border: none; border-radius: 4px; font-size: 0.65rem; padding: 3px 8px; cursor: pointer; font-family: inherit;';
        delBtn.onclick = function() {
          if (confirm('این پیام برای همیشه حذف بشه؟')) {
            supabaseClient.from('counselor_messages').delete().eq('id', msg.id).then(function(delRes) {
              if (delRes.error) {
                alert('خطا در حذف: ' + delRes.error.message);
              } else {
                loadMessages(); 
                loadStudents(); 
              }
            });
          }
        };

        actionDiv.appendChild(delBtn);
        div.appendChild(actionDiv);
        chatBox.appendChild(div);
      });

      chatBox.scrollTop = chatBox.scrollHeight;
    });
}

// ===== ارسال پیام از طرف مشاور =====
sendBtn.addEventListener('click', function() {
  var text = msgInput.value.trim();
  if (text.length < 1 || !activeStudentId) return;

  msgInput.value = '';
  sendBtn.disabled = true;

  supabaseClient.from('counselor_messages').insert({
    student_id: activeStudentId,
    counselor_id: currentUser.id,
    sender_role: 'counselor',
    message: text,
    is_read: true 
  }).then(function(res) {
    sendBtn.disabled = false;
    if (res.error) {
      alert('خطا در ارسال: ' + res.error.message);
    } else {
      loadMessages();
      loadStudents();
    }
  });
});

msgInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') sendBtn.click(); });

// ===== دکمه علامت‌گذاری خوانده شده =====
markReadBtn.addEventListener('click', function() {
  if (!activeStudentId) return;
  
  supabaseClient.from('counselor_messages')
    .update({ is_read: true })
    .eq('student_id', activeStudentId)
    .eq('sender_role', 'student')
    .then(function(res) {
      if (res.error) {
        alert('خطا: ' + res.error.message);
      } else {
        loadStudents(); 
        markReadBtn.classList.add('hidden');
      }
    });
});