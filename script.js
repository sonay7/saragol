// ===== ذخیره‌ی جلسه‌ی مطالعه =====
function saveStudySession(subject, minutes, questions) {
  return supabaseClient.auth.getUser().then(function(res) {
    if (!res.data.user) return;
    var userId = res.data.user.id;

    return supabaseClient.from('study_sessions').insert({
      user_id: userId,
      subject: subject,
      minutes: minutes,
      questions: parseInt(questions) || 0
    }).then(function(sessionRes) {
      if (sessionRes.error) return;

      return supabaseClient.from('profiles').select('total_minutes, xp').eq('id', userId).single().then(function(p) {
        var newMinutes = (p.data.total_minutes || 0) + minutes;
        var newXp = (p.data.xp || 0) + minutes * 2;
        return supabaseClient.from('profiles').update({
          total_minutes: newMinutes,
          xp: newXp
        }).eq('id', userId);
      });
    });
  });
}

// ===== تایمر =====
if (document.getElementById('timer')) {
  var mode = 'pomodoro'; // pomodoro یا free
  var totalSeconds = 25 * 60;
  var remaining = totalSeconds;
  var timerInterval = null;
  var elapsedSeconds = 0;

  var timerEl = document.getElementById('timer');
  var startBtn = document.getElementById('startBtn');
  var pauseBtn = document.getElementById('pauseBtn');
  var resetBtn = document.getElementById('resetBtn');
  var finishBtn = document.getElementById('finishBtn');
  var resultEl = document.getElementById('result');
  var resultText = document.getElementById('resultText');
  var subjectEl = document.getElementById('subject');
  var freeSubjectEl = document.getElementById('freeSubject');
  var questionsEl = document.getElementById('questions');

  var tabPomodoro = document.getElementById('tabPomodoro');
  var tabFree = document.getElementById('tabFree');
  var pomodoroSection = document.getElementById('pomodoroSection');
  var freeSection = document.getElementById('freeSection');

  function toPersian(num) {
    return String(num).replace(/\d/g, function(d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; });
  }

  function formatTime(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return toPersian(m) + ':' + toPersian(String(s).padStart(2, '0'));
  }

  function updateTimer() {
    if (mode === 'pomodoro') {
      timerEl.textContent = formatTime(remaining);
    } else {
      timerEl.textContent = formatTime(elapsedSeconds);
    }
  }

  function startTimer() {
    if (timerInterval) return;
    timerInterval = setInterval(function() {
      if (mode === 'pomodoro') {
        if (remaining > 0) {
          remaining--;
          updateTimer();
        } else {
          clearInterval(timerInterval);
          timerInterval = null;
          alert('زمان تموم شد! 🎉');
        }
      } else {
        elapsedSeconds++;
        updateTimer();
      }
    }, 1000);
  }

  function pauseTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  function resetTimer() {
    pauseTimer();
    if (mode === 'pomodoro') {
      remaining = totalSeconds;
    } else {
      elapsedSeconds = 0;
    }
    updateTimer();
  }

  startBtn.addEventListener('click', startTimer);
  pauseBtn.addEventListener('click', pauseTimer);
  resetBtn.addEventListener('click', resetTimer);

  // ===== تب‌ها =====
  tabPomodoro.addEventListener('click', function() {
    mode = 'pomodoro';
    tabPomodoro.classList.add('active');
    tabFree.classList.remove('active');
    pomodoroSection.classList.remove('hidden');
    freeSection.classList.add('hidden');
    pauseTimer();
    resetTimer();
  });

  tabFree.addEventListener('click', function() {
    mode = 'free';
    tabFree.classList.add('active');
    tabPomodoro.classList.remove('active');
    freeSection.classList.remove('hidden');
    pomodoroSection.classList.add('hidden');
    pauseTimer();
    resetTimer();
  });

  // ===== زمان‌های آماده پومودورو =====
  document.querySelectorAll('.preset').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var min = parseInt(btn.getAttribute('data-min'));
      totalSeconds = min * 60;
      resetTimer();
    });
  });

  // ===== زمان دلخواه =====
  document.getElementById('setCustomBtn').addEventListener('click', function() {
    var min = parseInt(document.getElementById('customMinutes').value);
    if (isNaN(min) || min < 1 || min > 180) {
      alert('یه عدد بین ۱ تا ۱۸۰ بزن');
      return;
    }
    totalSeconds = min * 60;
    resetTimer();
  });

  // ===== پایان جلسه =====
  finishBtn.addEventListener('click', function() {
    pauseTimer();
    var studiedMinutes, subject;

    if (mode === 'pomodoro') {
      studiedMinutes = Math.floor((totalSeconds - remaining) / 60);
      subject = subjectEl.value;
    } else {
      studiedMinutes = Math.floor(elapsedSeconds / 60);
      subject = freeSubjectEl.value;
    }

    var questions = questionsEl.value || '۰';

    if (studiedMinutes < 1) {
      alert('اول یه‌کم مطالعه کن بعد ثبت کن');
      return;
    }

    resultEl.classList.remove('hidden');
    resultText.textContent = 'درس: ' + subject + ' | ' + toPersian(studiedMinutes) + ' دقیقه مطالعه | ' + toPersian(questions) + ' سؤال حل‌شده';
    resultEl.scrollIntoView({ behavior: 'smooth' });

    saveStudySession(subject, studiedMinutes, questions);

    // ریست کردن بعد از ثبت
    setTimeout(function() {
      if (mode === 'pomodoro') {
        remaining = totalSeconds;
      } else {
        elapsedSeconds = 0;
      }
      updateTimer();
    }, 2000);
  });

  updateTimer();
}