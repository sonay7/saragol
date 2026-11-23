var currentUserId = null;

supabaseClient.auth.getUser().then(function(res) {
  if (!res.data.user) { window.location.href = 'login.html'; return; }
  currentUserId = res.data.user.id;
  
  supabaseClient.from('profiles').select('username, role').eq('id', currentUserId).single().then(function(p) {
    if (p.data) {
      document.querySelector('.user-name').textContent = p.data.username;
      document.querySelector('.avatar').textContent = p.data.username.charAt(0);
      if (p.data.role === 'admin' || p.data.role === 'superadmin') {
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
      if (rows.length === 0) { feed.innerHTML = '<p class="lock-note">هنوز پستی نیست.</p>'; return; }

      feed.innerHTML = '';
      rows.forEach(function(item) {
        var likes = item.explore_likes || [];
        var likeCount = likes.length;
        var iLiked = likes.some(function(l) { return l.user_id === currentUserId; });

        var div = document.createElement('div');
        div.className = 'post-card';

        var isVideo = item.file_type && item.file_type.indexOf('video') === 0;
        var mediaHtml = isVideo 
          ? '<video src="' + item.file_url + '" controls preload="metadata" playsinline></video>'
          : '<img src="' + item.file_url + '" loading="lazy">';

        var heartClass = iLiked ? 'liked' : '';
        var heartIcon = iLiked ? '❤️' : '🤍';

        // دکمه دیدن لایک‌ها
        var likesBtn = likeCount > 0 ? `<button class="view-likes-btn" onclick='showLikes(${JSON.stringify(likes)})'>👀 مشاهده</button>` : '';

        div.innerHTML = mediaHtml + 
          `<div class="post-footer">
            <button class="like-btn" data-id="${item.id}">
              <span class="heart ${heartClass}">${heartIcon}</span>
              <span>${likeCount}</span>
            </button>
            ${likesBtn}
            <span style="font-size: 0.7rem; color: var(--text-dim);">${new Date(item.created_at).toLocaleDateString('fa-IR')}</span>
          </div>`;

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

window.showLikes = function(likes) {
  var list = document.getElementById('likesList');
  list.innerHTML = '';
  if (!likes || likes.length === 0) { list.innerHTML = '<p class="lock-note">هیچ کسی لایک نکرده.</p>'; return; }
  likes.forEach(function(l) {
    var un = l.profiles ? l.profiles.username : 'ناشناس';
    var div = document.createElement('div');
    div.className = 'user-like-row';
    div.innerHTML = `<div class="user-like-avatar">${un.charAt(0)}</div><strong>${un}</strong>`;
    list.appendChild(div);
  });
  document.getElementById('likesModal').classList.remove('hidden');
};

function toggleLike(inboxId, btn) {
  var heartEl = btn.querySelector('.heart');
  var countEl = btn.querySelector('span:last-child');
  var isLiked = heartEl.classList.contains('liked');

  if (isLiked) {
    supabaseClient.from('explore_likes').delete().eq('inbox_id', inboxId).eq('user_id', currentUserId).then(function() {
      heartEl.textContent = '🤍'; heartEl.classList.remove('liked');
      countEl.textContent = Math.max(0, parseInt(countEl.textContent) - 1);
    });
  } else {
    supabaseClient.from('explore_likes').insert({ inbox_id: inboxId, user_id: currentUserId }).then(function(res) {
      if (!res.error) {
        heartEl.textContent = '❤️'; heartEl.classList.add('liked');
        countEl.textContent = parseInt(countEl.textContent) + 1;
      }
    });
  }
}

// ===== آپلود =====
window.openUploadModal = function() { document.getElementById('uploadModal').classList.remove('hidden'); };

window.uploadPost = function() {
  var file = document.getElementById('uploadFile').files[0];
  var btn = document.getElementById('uploadBtn');
  var msg = document.getElementById('uploadMsg');
  if (!file) { msg.textContent = 'یه فایل انتخاب کن'; msg.style.color = '#e74c3c'; return; }
  
  btn.disabled = true; btn.textContent = 'در حال آپلود...';
  var fn = 'direct_' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9.]/g, '');
  
  supabaseClient.storage.from('videos').upload(fn, file, { contentType: file.type || 'video/mp4' }).then(function(u) {
    if (u.error) { msg.textContent = 'خطا: ' + u.error.message; btn.disabled = false; btn.textContent = 'آپلود و انتشار'; return; }
    var url = supabaseClient.storage.from('videos').getPublicUrl(fn).data.publicUrl;
    supabaseClient.from('admin_inbox').insert({ user_id: currentUserId, file_url: url, file_type: file.type || 'video/mp4', status: 'approved' }).then(function() {
      msg.textContent = '✅ منتشر شد'; msg.style.color = 'var(--green)';
      setTimeout(() => location.reload(), 1000);
    });
  });
};
