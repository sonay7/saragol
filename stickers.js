// ===== سیستم استیکر سراسری (برای استفاده در همه چت‌ها) =====
var myOwnedPacks = [];
var currentChatContext = null; // مثلاً 'book_chat' یا 'mafia_messages'
var currentChatInputId = null; // آیدی باکس تایپ
var currentChatSendBtnId = null; // آیدی دکمه ارسال

// لود کردن پک‌های خریداری شده کاربر
function loadMyStickerPacks() {
  supabaseClient.auth.getUser().then(function(res) {
    if (!res.data.user) return;
    var uid = res.data.user.id;
    
    // گرفتن پک‌های خریداری شده
    supabaseClient.from('user_inventory').select('item_id').eq('user_id', uid).eq('item_type', 'sticker').then(function(invRes) {
      var packIds = (invRes.data || []).map(function(i) { return i.item_id; });
      if (packIds.length === 0) { myOwnedPacks = []; return; }
      
      // گرفتن اطلاعات پک‌ها و استیکرهاشون
      supabaseClient.from('sticker_packs').select('*, stickers(*)').in('id', packIds).then(function(packRes) {
        myOwnedPacks = packRes.data || [];
      });
    });
  });
}

// باز کردن پنجره انتخاب استیکر (از توی هر چتی صدا زده میشه)
window.openStickerPicker = function(chatType, inputId, sendBtnId) {
  currentChatContext = chatType;
  currentChatInputId = inputId;
  currentChatSendBtnId = sendBtnId;

  var modal = document.getElementById('universalStickerModal');
  if (!modal) {
    // اگه مودال وجود نداشت، می‌سازیمش
    var modalHtml = `
      <div id="universalStickerModal" style="position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:9999; display:flex; justify-content:center; align-items:flex-end; padding:20px;">
        <div style="background:var(--bg-card); width:100%; max-width:500px; border-radius:20px 20px 0 0; padding:16px; max-height:60vh; display:flex; flex-direction:column;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h3 style="font-size:1rem; margin:0;">🎨 استیکرهای من</h3>
            <button onclick="document.getElementById('universalStickerModal').style.display='none'" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:var(--text);">×</button>
          </div>
          <div id="stickerPickerContent" style="overflow-y:auto; display:flex; flex-direction:column; gap:12px;">
            <p style="text-align:center; color:var(--text-dim); font-size:0.85rem;">در حال بارگذاری...</p>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  } else {
    modal.style.display = 'flex';
  }

  renderStickerPicker();
};

function renderStickerPicker() {
  var content = document.getElementById('stickerPickerContent');
  content.innerHTML = '';

  if (myOwnedPacks.length === 0) {
    content.innerHTML = '<p style="text-align:center; color:var(--text-dim); font-size:0.85rem;">شما هنوز هیچ پکی نخریدی. برو به فروشگاه و یه پک بخر!</p>';
    return;
  }

  myOwnedPacks.forEach(function(pack) {
    var packDiv = document.createElement('div');
    packDiv.innerHTML = `<h4 style="font-size:0.85rem; margin-bottom:8px; color:var(--text);">${pack.icon} ${pack.name}</h4>`;
    
    var grid = document.createElement('div');
    grid.style.cssText = 'display:flex; flex-wrap:wrap; gap:10px;';
    
    if (pack.stickers && pack.stickers.length > 0) {
      pack.stickers.forEach(function(st) {
        var img = document.createElement('img');
        img.src = st.image_url;
        img.style.cssText = 'width:50px; height:50px; object-fit:contain; cursor:pointer; transition:transform 0.2s;';
        img.onmouseover = function() { this.style.transform = 'scale(1.2)'; };
        img.onmouseout = function() { this.style.transform = 'scale(1)'; };
        img.onclick = function() { sendStickerMessage(st.image_url); };
        grid.appendChild(img);
      });
    } else {
      grid.innerHTML = '<p style="font-size:0.7rem; color:var(--text-dim);">این پک خالیه.</p>';
    }
    
    packDiv.appendChild(grid);
    content.appendChild(packDiv);
  });
}

// ارسال استیکر به چت (با فرمت خاص)
function sendStickerMessage(imageUrl) {
  var input = document.getElementById(currentChatInputId);
  var sendBtn = document.getElementById(currentChatSendBtnId);
  
  if (!input || !sendBtn) return;

  // پیام رو با یه پیشوند خاص توی باکس می‌ذاریم
  input.value = '[STICKER]' + imageUrl;
  
  // دکمه ارسال رو می‌زنیم (دقیقاً مثل اینکه کاربر خودش تایپ کرده)
  sendBtn.click();
  
  // بستن مودال
  document.getElementById('universalStickerModal').style.display = 'none';
}

// تابعی که موقع نمایش پیام‌ها استفاده میشه
function renderStickerInChat(text) {
  if (text && text.startsWith('[STICKER]')) {
    var url = text.replace('[STICKER]', '');
    return `<img src="${url}" style="max-width:100px; max-height:100px; object-fit:contain;">`;
  }
  return null; // یعنی استیکر نیست
}

// لود اولیه (وقتی صفحه باز میشه)
document.addEventListener('DOMContentLoaded', function() {
  loadMyStickerPacks();
});
