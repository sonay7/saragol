var currentUserId = null, currentUserRole = 'student';

supabaseClient.auth.getUser().then(function(res) {
  if (!res.data.user) { window.location.href = 'login.html'; return; }
  currentUserId = res.data.user.id;
  
  supabaseClient.from('profiles').select('username, role').eq('id', currentUserId).single().then(function(p) {
    if (p.data) {
      currentUserRole = p.data.role;
      document.querySelector('.user-name').textContent = p.data.username;
      document.querySelector('.avatar').textContent = p.data.username.charAt(0);

      // نمایش دکمه آپلود فقط برای ادمین
      if (currentUserRole === 'admin' || currentUserRole === 'superadmin') {
        document.getElementById('uploadFab').classList.remove('hidden');
      }
    }
  });

  loadExplore();
});

function loadExplore() {
  var feed = document.getElementById('exploreFeed');
  
  supabaseClient.from('admin_inbox')
    .select('id, file_url, file_type, created_at, explore_likes(user_id, profiles(username))')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .then(function(res) {
      if (res.error) { feed.innerHTML = '<p class="lock-note">خطا: ' + res.error.message + '</p>'; return; }
      
      var rows = res.data || [];
      if (rows.length === 0) {
        feed.innerHTML = '<div style="text-align:center; padding: 40px; background: var(--bg-card); border-radius: 16px;"><p style="font-size: 3rem;">🎬</p><p style="color: var(--text-dim);">هنوز چیزی توی اکسپلور نیست.</p></div>';
        return;
      }

      feed.innerHTML = '';
      rows.forEach(function(item) {
        var likes = item.explore_likes || [];
        var likeCount = likes.length;
        var iLiked = likes.some(function(l) { return l.user_id === currentUserId; });
        var isVideo = item.file_type && item.file_type.indexOf('video') === 0;
        
        var mediaHtml = isVideo 
          ? '<video src="' + item.file_url + '" controls preload="metadata" playsinline></video>'
          : '<img src="' + item.file_url + '" loading="lazy">';

        var div = document.createElement('div');
        div.className = 'post-card';
        div.innerHTML = `
          <div class="post-media-wrapper">${mediaHtml}</div>
          <div class="post-footer">
            <button class="like-btn">
              <span class="heart ${iLiked ? 'liked' : ''}">${iLiked ? '❤️' : '🤍'}</span>
              <span style="font-weight: bold;">${likeCount}</span>
            </button>
            <span style="font-size: 0.7rem; color: var(--text-dim);">${new Date(item.created_at).toLocaleDateString('fa-IR')}</span>
          </div>
        `;

        // رویداد لایک کردن
        var btn = div.querySelector('.like-btn');
        btn.addEventListener('click', function() {
          toggleLike(item.id, btn);
        });

        // رویداد نمایش لیست لایک‌ها (کلیک روی عدد)
        var countSpan = btn.querySelector('span:last-child');
        countSpan.style.cursor = 'pointer';
        countSpan.addEventListener('click', function(e) {
          e.stopPropagation(); // جلوگیری از لایک شدن
          showLikers(likes);
        });

        feed.appendChild(div);
      });
    });
}

// ===== نمایش لیست لایک‌کنندگان در مودال =====
function showLikers(likes) {
  var modal = document.getElementById('likesModal');
  var list = document.getElementById('likesList');
  list.innerHTML = '';
  
  if (!likes || likes.length === 0) {
    list.innerHTML = '<p style="text-align: center; color: var(--text-dim);">هیچ کسی لایک نکرده.</p>';
  } else {
    likes.forEach(function(l) {
      var name = (l.profiles && l.profiles.username) ? l.profiles.username : 'ناشناس';
      var div = document.createElement('div');
      div.style.cssText = 'padding: 8px; border-bottom: 1px solid var(--border); font-size: 0.9rem;';
      div.innerHTML = '👤 ' + name;
      list.appendChild(div);
    });
  }
  
  modal.classList.remove('hidden');
}

// ===== لایک و آنلایک =====
function toggleLike(inboxId, btn) {
  var heartEl = btn.querySelector('.heart');
  var countEl = btn.querySelector('span:last-child');
  var isLiked = heartEl.classList.contains('liked');

  if (isLiked) {
    supabaseClient.from('explore_likes').delete().eq('inbox_id', inboxId).eq('user_id', currentUserId).then(function() {
      heartEl.textContent = '🤍';
      heartEl.classList.remove('liked');
      countEl.textContent = Math.max(0, parseInt(countEl.textContent) - 1);
    });
  } else {
    supabaseClient.from('explore_likes').insert({ inbox_id: inboxId, user_id: currentUserId }).then(function(res) {
      if (!res.error) {
        heartEl.textContent = '❤️';
        heartEl.classList.add('liked');
        countEl.textContent = parseInt(countEl.textContent) + 1;
      }
    });
  }
}

// ===== آپلود فایل به اکسپلور (فقط ادمین) =====
window.uploadToExplore = function(input) {
  var file = input.files[0];
  if (!file) return;

  var fileName = 'explore_' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9.]/g, '');
  
  // نمایش یه پیام لودینگ ساده
  alert('در حال آپلود... لطفاً صبر کنید.');

  supabaseClient.storage.from('videos').upload(fileName, file, { contentType: file.type }).then(function(uploadRes) {
    if (uploadRes.error) {
      alert('❌ خطا در آپلود فایل: ' + uploadRes.error.message);
      input.value = ''; // پاک کردن اینپوت
      return;
    }
    
    var publicUrl = supabaseClient.storage.from('videos').getPublicUrl(fileName).data.publicUrl;
    
    supabaseClient.from('admin_inbox').insert({
      user_id: currentUserId,
      file_url: publicUrl,
      file_type: file.type,
      status: 'approved'
    }).then(function(insRes) {
      input.value = ''; // پاک کردن اینپوت
      if (insRes.error) {
        alert('خطا در ثبت پست: ' + insRes.error.message);
        return;
      }
      alert('✅ با موفقیت منتشر شد!');
      loadExplore(); // رفرش صفحه
    });
  });
};
