var currentUserId = null;
var chatBox = document.getElementById('chatBox');
var msgInput = document.getElementById('msgInput');
var sendBtn = document.getElementById('sendBtn');

supabaseClient.auth.getUser().then(function(res) {
  if (!res.data.user) { window.location.href = 'login.html'; return; }
  currentUserId = res.data.user.id;
  loadMessages();
});

function loadMessages() {
  supabaseClient.from('counselor_messages')
    .select('*')
    .eq('student_id', currentUserId)
    .order('created_at', { ascending: true })
    .then(function(res) {
      chatBox.innerHTML = '';
      var rows = res.data || [];

      if (rows.length === 0) {
        chatBox.innerHTML = '<p class="lock-note" style="text-align: center; margin-top: 20px;">هنوز پیامی نیست. اولین پیام رو تو بفرست!</p>';
        return;
      }

      rows.forEach(function(msg) {
        var isMe = msg.sender_role === 'student';
        
        var div = document.createElement('div');
        div.style.maxWidth = '80%';
        div.style.padding = '10px 14px';
        div.style.borderRadius = '12px';
        div.style.fontSize = '0.9rem';
        div.style.lineHeight = '1.5';
        div.style.marginBottom = '8px';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';

        if (isMe) {
          div.style.alignSelf = 'flex-start';
          div.style.background = 'var(--green)';
          div.style.color = '#0f1720';
          div.style.borderBottomRightRadius = '4px';
        } else {
          div.style.alignSelf = 'flex-end';
          div.style.background = 'var(--bg)';
          div.style.color = 'var(--text)';
          div.style.border = '1px solid var(--border)';
          div.style.borderBottomLeftRadius = '4px';
        }

        var textSpan = document.createElement('span');
        textSpan.textContent = msg.message;
        div.appendChild(textSpan);

        // دکمه‌های ویرایش و حذف فقط برای پیام‌های خودم
        if (isMe) {
          var actionDiv = document.createElement('div');
          actionDiv.style.cssText = 'display: flex; gap: 8px; margin-top: 6px; align-self: flex-start;';

          var editBtn = document.createElement('button');
          editBtn.textContent = '✏️ ویرایش';
          editBtn.style.cssText = 'background: #f39c12; color: white; border: none; border-radius: 4px; font-size: 0.65rem; padding: 3px 8px; cursor: pointer; font-family: inherit;';
          editBtn.onclick = function() {
            var newText = prompt('متن جدید پیامت رو بنویس:', msg.message);
            if (newText && newText.trim() !== '') {
              supabaseClient.from('counselor_messages').update({ message: newText.trim() }).eq('id', msg.id).then(function(res) {
                if (!res.error) loadMessages();
              });
            }
          };

          var delBtn = document.createElement('button');
          delBtn.textContent = '🗑️ حذف';
          delBtn.style.cssText = 'background: #e74c3c; color: white; border: none; border-radius: 4px; font-size: 0.65rem; padding: 3px 8px; cursor: pointer; font-family: inherit;';
          delBtn.onclick = function() {
            if (confirm('پیامت حذف بشه؟')) {
              supabaseClient.from('counselor_messages').delete().eq('id', msg.id).then(function(res) {
                if (!res.error) loadMessages();
              });
            }
          };

          actionDiv.appendChild(editBtn);
          actionDiv.appendChild(delBtn);
          div.appendChild(actionDiv);
        }

        chatBox.appendChild(div);
      });
      chatBox.scrollTop = chatBox.scrollHeight;
    });
}

sendBtn.addEventListener('click', function() {
  var text = msgInput.value.trim();
  if (text.length < 1) return;

  msgInput.value = '';
  sendBtn.disabled = true;

  supabaseClient.from('counselor_messages').insert({
    student_id: currentUserId,
    sender_role: 'student',
    message: text
  }).then(function(res) {
    sendBtn.disabled = false;
    if (res.error) {
      alert('خطا در ارسال: ' + res.error.message);
    } else {
      loadMessages();
    }
  });
});

msgInput.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') sendBtn.click();
});