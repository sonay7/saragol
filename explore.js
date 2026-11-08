var currentUserId = null;

supabaseClient.auth.getUser().then(function(res) {
  if (!res.data.user) { window.location.href = 'login.html'; return; }
  currentUserId = res.data.user.id;
  loadExplore();
});

function loadExplore() {
  var feed = document.getElementById('exploreFeed');
  
  supabaseClient.from('admin_inbox')
    .select('id, file_url, file_type, created_at, explore_likes(user_id)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .then(function(res) {
      if (res.error) {
        feed.innerHTML = '<p class="lock-note">خطا در بارگذاری</p>';
        return;
      }
      
      var rows = res.data || [];
      if (rows.length === 0) {
        feed.innerHTML = '<p class="lock-note">هنوز چیزی توی اکسپلور نیست 😎</p>';
        return;
      }

      feed.innerHTML = '';
      rows.forEach(function(item) {
        var likes = item.explore_likes || [];
        var likeCount = likes.length;
        var iLiked = likes.some(function(l) { return l.user_id === currentUserId; });

        var div = document.createElement('div');
        div.className = 'result';
        div.style.padding = '0';
        div.style.overflow = 'hidden';
        div.style.marginBottom = '20px';
        div.style.border = '1px solid var(--border)';

        var mediaHtml = '';
        
        // ===== بهینه‌سازی لودینگ =====
        if (item.file_type && item.file_type.indexOf('video') === 0) {
          // ویدیو: preload="none" یعنی تا کاربر Play نزنه، دانلود نمی‌شه
          mediaHtml = '<video src="' + item.file_url + '" controls preload="none" playsinline style="width:100%; max-height: 500px; background: #000; display: block;"></video>';
        } else {
          // عکس: loading="lazy" یعنی فقط وقتی اومد توی دید، دانلود می‌شه
          mediaHtml = '<img src="' + item.file_url + '" loading="lazy" style="width:100%; max-height: 500px; object-fit: contain; background: #000; display: block;">';
        }

        var heartStyle = iLiked ? 'color: #e74c3c;' : 'color: var(--text-dim);';

        div.innerHTML = mediaHtml + 
          '<div style="padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; background: var(--bg-card);">' +
            '<button class="like-btn" data-id="' + item.id + '" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; gap: 6px; font-family: inherit;">' +
              '<span class="heart" style="' + heartStyle + '">' + (iLiked ? '❤️' : '🤍') + '</span>' +
              '<span style="color: var(--text-dim); font-size: 0.9rem;">' + likeCount + '</span>' +
            '</button>' +
          '</div>';

        feed.appendChild(div);
      });

      document.querySelectorAll('.like-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var inboxId = btn.getAttribute('data-id');
          toggleLike(inboxId, btn);
        });
      });
    });
}

function toggleLike(inboxId, btn) {
  var heartEl = btn.querySelector('.heart');
  var countEl = btn.querySelector('span:last-child');
  var isLiked = heartEl.textContent === '❤️';

  if (isLiked) {
    supabaseClient.from('explore_likes')
      .delete()
      .eq('inbox_id', inboxId)
      .eq('user_id', currentUserId)
      .then(function() {
        heartEl.textContent = '🤍';
        heartEl.style.color = 'var(--text-dim)';
        countEl.textContent = Math.max(0, parseInt(countEl.textContent) - 1);
      });
  } else {
    supabaseClient.from('explore_likes')
      .insert({ inbox_id: inboxId, user_id: currentUserId })
      .then(function(res) {
        if (!res.error) {
          heartEl.textContent = '❤️';
          heartEl.style.color = '#e74c3c';
          countEl.textContent = parseInt(countEl.textContent) + 1;
        }
      });
  }
}