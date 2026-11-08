var sendBtn = document.getElementById('sendBtn');
var sendMsg = document.getElementById('sendMsg');

sendBtn.addEventListener('click', function() {
  var text = document.getElementById('messageText').value.trim();
  var fileInput = document.getElementById('fileInput');
  var file = fileInput.files[0];

  if (!text && !file) {
    sendMsg.textContent = 'یه پیام یا فایل بفرست';
    sendMsg.style.color = '#e74c3c';
    return;
  }

  if (file && file.size > 5 * 1024 * 1024) {
    sendMsg.textContent = 'حجم فایل بیشتر از ۵ مگابایته';
    sendMsg.style.color = '#e74c3c';
    return;
  }

  sendMsg.textContent = 'در حال ارسال...';
  sendMsg.style.color = '#8fa3b0';
  sendBtn.disabled = true;

  supabaseClient.auth.getUser().then(function(res) {
    if (!res.data.user) { window.location.href = 'login.html'; return; }
    var userId = res.data.user.id;

    function saveMessage(fileUrl, fileType) {
      supabaseClient.from('admin_inbox').insert({
        user_id: userId,
        message: text || null,
        file_url: fileUrl || null,
        file_type: fileType || null
      }).then(function(insertRes) {
        sendBtn.disabled = false;
        if (insertRes.error) {
          sendMsg.textContent = 'خطا: ' + insertRes.error.message;
          sendMsg.style.color = '#e74c3c';
          return;
        }
        sendMsg.textContent = '✅ پیامت ارسال شد. منتظر تأیید ادمین باش.';
        sendMsg.style.color = '#2ecc71';
        document.getElementById('messageText').value = '';
        fileInput.value = '';
      });
    }

    if (file) {
      var fileName = userId + '_' + Date.now() + '_' + file.name;
      supabaseClient.storage.from('videos').upload(fileName, file).then(function(uploadRes) {
        if (uploadRes.error) {
          sendBtn.disabled = false;
          sendMsg.textContent = 'خطا در آپلود: ' + uploadRes.error.message;
          sendMsg.style.color = '#e74c3c';
          return;
        }
        var publicUrl = supabaseClient.storage.from('videos').getPublicUrl(fileName).data.publicUrl;
        saveMessage(publicUrl, file.type);
      });
    } else {
      saveMessage(null, null);
    }
  });
});