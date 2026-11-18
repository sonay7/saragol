// ===== فقط صدای جشن (بدون صدای کلیک و تایمر) =====
var celebrationAudio = new Audio('audio/celebration.mp3');
celebrationAudio.volume = 0.5; // صدای ملایم

window.playCelebrationSound = function() {
  celebrationAudio.currentTime = 0;
  celebrationAudio.play().catch(function(e) {
    console.log('صدا نیاز به تعامل کاربر دارد', e);
  });
};
