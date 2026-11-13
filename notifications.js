// ===== سیستم اعلان‌ها (زنگوله) =====
document.addEventListener('DOMContentLoaded', function() {
  supabaseClient.auth.getUser().then(function(res) {
    if (!res.data.user) return;
    var myUid = res.data.user.id;

    // ۱. ساخت و اضافه کردن آیکون زنگوله به هدر
    var userArea = document.querySelector('.user-area');
    if (!userArea) return;

    var bellContainer = document.createElement('div');
    bellContainer.style.cssText = 'position: relative; cursor: pointer; margin-left: 12px; font-size: 1.3rem; display: flex; align-items: center;';
    bellContainer.innerHTML = `🔔<span id="notifBadge" style="display:none; position:absolute; top:-4px; right:-6px; background:#e74c3c; color:#fff; font-size:0.6rem; font-weight:bold; padding:2px 6px; border-radius:50%;"></span>`;
    
    // اضافه کردن قبل از آواتار
    var avatar = userArea.querySelector('.avatar');
    if (avatar) {
      userArea.insertBefore(bellContainer, avatar);
    } else {
      userArea.appendChild(bellContainer);
    }

    // ۲. ساخت مودال اعلان‌ها
    var modalHTML = `
      <div id="notifModal" style="position:fixed; inset:0; background:rgba(0,0,0,0.8); display:none; justify-content:center; align-items:center; z-index:9999; padding:20px;">
        <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:16px; padding:20px; width:100%; max-width:400px; max-height:80vh; display:flex; flex-direction:column;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h3 style="margin:0; font-size:1.1rem;">🔔 اعلان‌های شما</h3>
            <button id="closeNotifBtn" style="background:none; border:none; font-size:1.5rem; color:var(--text); cursor:pointer;">&times;</button>
          </div>
          <div id="notifList" style="overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:8px;">
            <p style="text-align:center; color:var(--text-dim);">در حال بارگذاری...</p>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    var badge = document.getElementById('notifBadge');
    var modal = document.getElementById('notifModal');
    var list = document.getElementById('notifList');
    var closeBtn = document.getElementById('closeNotifBtn');

    // ۳. لود کردن تعداد اعلان‌های خوانده نشده
    function loadBadge() {
      supabaseClient.from('notifications').select('id', { count: 'exact' }).eq('user_id', myUid).eq('is_read', false).then(function(res) {
        var count = res.count || 0;
        if (count > 0) {
          badge.style.display = 'block';
          badge.textContent = count;
        } else {
          badge.style.display = 'none';
        }
      });
    }

    // ۴. نمایش لیست اعلان‌ها در مودال
    function openNotifications() {
      modal.style.display = 'flex';
      list.innerHTML = '<p style="text-align:center; color:var(--text-dim);">در حال بارگذاری...</p>';
      
      supabaseClient.from('notifications').select('*').eq('user_id', myUid).order('created_at', { ascending: false }).then(function(res) {
        list.innerHTML = '';
        var notifs = res.data || [];
        
        if (notifs.length === 0) {
          list.innerHTML = '<p style="text-align:center; color:var(--text-dim);">هیچ اعلانی ندارید.</p>';
          return;
        }

        notifs.forEach(function(n) {
          var div = document.createElement('div');
          div.style.cssText = 'background:' + (n.is_read ? 'var(--bg)' : 'rgba(46,204,113,0.1)') + '; border:1px solid ' + (n.is_read ? 'var(--border)' : 'var(--green)') + '; border-radius:10px; padding:12px; cursor:pointer;';
          div.innerHTML = `
            <div style="font-weight:bold; font-size:0.9rem; margin-bottom:4px; color:${n.is_read ? 'var(--text)' : 'var(--green)'};">${n.title}</div>
            <div style="font-size:0.8rem; color:var(--text-dim); line-height:1.5;">${n.body}</div>
            <div style="font-size:0.65rem; color:var(--text-dim); margin-top:8px; text-align:left;">${new Date(n.created_at).toLocaleString('fa-IR')}</div>
          `;
          
          // اگر لینک داشت، با کلیک برو
          div.onclick = function() {
            if (n.link) window.location.href = n.link;
          };

          list.appendChild(div);
        });

        // مارک کردن همه به عنوان خوانده شده
        supabaseClient.from('notifications').update({ is_read: true }).eq('user_id', myUid).eq('is_read', false).then(function() {
          badge.style.display = 'none';
        });
      });
    }

    // ۵. رویدادها
    bellContainer.onclick = openNotifications;
    closeBtn.onclick = function() { modal.style.display = 'none'; };

    // شروع
    loadBadge();
    
    // هر ۳۰ ثانیه چک کن ببین اعلان جدید اومده یا نه
    setInterval(loadBadge, 30000);
  });
});
