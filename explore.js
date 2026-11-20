var currentUserId = null;

// شروع
supabaseClient.auth.getUser().then(function(res) {
  if (!res.data.user) { window.location.href = 'login.html'; return; }
  currentUserId = res.data.user.id;
  
  // گرفتن اطلاعات کاربر
  supabaseClient.from('profiles').select('username, role').eq('id', currentUserId).single().then(function(p) {
    if (p.data) {
      document.querySelector('.user-name').textContent = p.data.username;
      document.querySelector('.avatar').textContent = p.data.username.charAt(0);

      // اگه ادمین بود، تاریخچه رو نشون بده
      if (p.data.role === 'admin' || p.data.role === 'superadmin') {
        document.getElementById('adminLikesSection').style.display = 'block';
        loadAdminLikes();
      }
    }
  });

  loadExplore();
});

// ===== لود کردن پست‌های اکسپلور =====
function loadExplore() {
  var feed = document.getElementById('exploreFeed');
  
  supabaseClient.from('admin_inbox')
    .select('id, file_url, file_type, created_at, explore_likes(user_id)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .then(function(res) {
      if (res.error) {
        feed.innerHTML = '<p class="lock-note">خطا در بارگذاری: ' + res.error.message + '</p>';
        return;
      }
      
      var rows = res.data || [];
      if (rows.length === 0) {
        feed.innerHTML = '<div style="text-align:center; padding: 40px 20px; background: var(--bg-card); border-radius: 16px; border: 1px dashed var(--border);"><p style="font-size: 3rem; margin-bottom: 10px;">🎬</p><p style="color: var(--text-dim);">هنوز چیزی توی اکسپلور نیست. اولین نفر باش!</p></div>';
        return;
      }

      feed.innerHTML = '';
      rows.forEach(function(item) {
        var likes = item.explore_likes || [];
        var likeCount = likes.length;
        var iLiked = likes.some(function(l) { return l.user_id === currentUserId; });

        var div = document.createElement('div');
        div.className = 'post-card';

        var isVideo = item.file_type && item.file_type.indexOf('video') === 0;
        
        // مدیا
        var mediaHtml = '';
        if (isVideo) {
          mediaHtml = '<video src="' + item.file_url + '" controls preload="metadata" playsinline crossorigin="anonymous"></video>';
        } else {
          mediaHtml = '<img src="' + item.file_url + '" loading="lazy" alt="پست اکسپلور">';
        }

        // دکمه لایک
        var heartClass = iLiked ? 'liked' : '';
        var heartIcon = iLiked ? '❤️' : '🤍';

        div.innerHTML = `
          <div class="post-media-wrapper">
            ${mediaHtml}
          </div>
          <div class="post-footer">
            <button class="like-btn" data-id="${item.id}">
              <span class="heart ${heartClass}">${heartIcon}</span>
              <span style="font-weight: bold;">${likeCount}</span>
            </button>
            <span style="font-size: 0.7rem; color: var(--text-dim);">${new Date(item.created_at).toLocaleDateString('fa-IR')}</span>
          </div>
        `;

        feed.appendChild(div);
      });

      // اضافه کردن رویداد کلیک به دکمه‌های لایک
      document.querySelectorAll('.like-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var inboxId = btn.getAttribute('data-id');
          toggleLike(inboxId, btn);
        });
      });
    });
}

// ===== لایک / آنلایک =====
function toggleLike(inboxId, btn) {
  var heartEl = btn.querySelector('.heart');
  var countEl = btn.querySelector('span:last-child');
  var isLiked = heartEl.classList.contains('liked');

  if (isLiked) {
    // آنلایک
    supabaseClient.from('explore_likes').delete().eq('inbox_id', inboxId).eq('user_id', currentUserId).then(function() {
      heartEl.textContent = '🤍';
      heartEl.classList.remove('liked');
      countEl.textContent = Math.max(0, parseInt(countEl.textContent) - 1);
    });
  } else {
    // لایک
    supabaseClient.from('explore_likes').insert({ inbox_id: inboxId, user_id: currentUserId }).then(function(res) {
      if (!res.error) {
        heartEl.textContent = '❤️';
        heartEl.classList.add('liked');
        countEl.textContent = parseInt(countEl.textContent) + 1;
      }
    });
  }
}

// ===== تاریخچه لایک‌ها (ویژه ادمین) =====
function loadAdminLikes() {
  var list = document.getElementById('adminLikesList');
  
  supabaseClient.from('explore_likes')
    .select('*, profiles(username), admin_inbox(file_url, file_type)')
    .order('created_at', { ascending: false })
    .then(function(res) {
      list.innerHTML = '';
      var rows = res.data || [];
      if (rows.length === 0) { list.innerHTML = '<p class="lock-note">هنوز کسی لایک نکرده.</p>'; return; }
      
      rows.forEach(function(l) {
        var un = l.profiles ? l.profiles.username : 'ناشناس';
        var postType = l.admin_inbox && l.admin_inbox.file_type && l.admin_inbox.file_type.indexOf('video') === 0 ? '🎬 ویدیو' : '🖼️ عکس';
        var url = l.admin_inbox ? l.admin_inbox.file_url : '#';
        var dt = new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(l.created_at));
        
        var div = document.createElement('div');
        div.className = 'history-row';
        div.innerHTML = `<div><strong>${un}</strong> - ${postType}<br><span style="color: var(--text-dim); font-size: 0.7rem;">${dt}</span></div>` +
          (url !== '#' ? `<a href="${url}" target="_blank">مشاهده</a>` : '');
        list.appendChild(div);
      });
    });
}
