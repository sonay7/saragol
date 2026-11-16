// ===== تبدیل سایت به اپلیکیشن (PWA) =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(registration => {
        console.log('Service Worker registered!');
      })
      .catch(error => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

// اضافه کردن لینک Manifest به صفحه
var link = document.createElement('link');
link.rel = 'manifest';
link.href = 'manifest.json';
document.head.appendChild(link);

// اضافه کردن متاتگ رنگ تم
var metaTheme = document.createElement('meta');
metaTheme.name = 'theme-color';
metaTheme.content = '#2ecc71';
document.head.appendChild(metaTheme);
