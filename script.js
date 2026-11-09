// ===== ذخیره‌ی جلسه‌ی مطالعه =====
function saveStudySession(subject, minutes, questions) {
  return supabaseClient.auth.getUser().then(function(res) {
    if (!res.data.user) return;
    var userId = res.data.user.id;

    return supabaseClient.from('study_sessions').insert({
      user_id: userId, subject: subject, minutes: minutes, questions: parseInt(questions) || 0
    }).then(function(sessionRes) {
      if (sessionRes.error) return;

      return supabaseClient.from('profiles').select('total_minutes, xp').eq('id', userId).single().then(function(p) {
        var newMinutes = (p.data.total_minutes || 0) + minutes;
        var newXp = (p.data.xp || 0) + minutes * 2;
        return supabaseClient.from('profiles').update({ total_minutes: newMinutes, xp: newXp }).eq('id', userId);
      });
    });
  });
}

// ===== تایمر =====
if (document.getElementById('timer')) {
  var mode = 'pomodoro';
  var totalSeconds = 25 * 60;
  var remaining = totalSeconds;
  
  var timerInterval = null;
  var endTime = null;
  var freeStartTime = null;
  var freeElapsedBase = 0;
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
  var tabPanic = document.getElementById('tabPanic');
  var pomodoroSection = document.getElementById('pomodoroSection');
  var freeSection = document.getElementById('freeSection');
  var panicSection = document.getElementById('panicSection');
  
  var timerBox = document.getElementById('timerBox');
  var finishSection = document.getElementById('finishSection');

  // بررسی وجود هدف در URL (از پروفایل اومده)
  var urlParams = new URLSearchParams(window.location.search);
  var goalParam = urlParams.get('goal');
  if (goalParam) {
    totalSeconds = parseInt(goalParam) * 60;
    remaining = totalSeconds;
    setTimeout(function() { startTimer(); }, 500); // خودکار شروع کن
  }

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
    
    if (mode === 'pomodoro') {
      endTime = Date.now() + (remaining * 1000);
    } else {
      freeStartTime = Date.now();
    }

    timerInterval = setInterval(function() {
      if (mode === 'pomodoro') {
        var now = Date.now();
        remaining = Math.max(0, Math.round((endTime - now) / 1000));
        updateTimer();
        if (remaining <= 0) {
          clearInterval(timerInterval);
          timerInterval = null;
          alert('زمان تموم شد! 🎉');
        }
      } else {
        var now = Date.now();
        elapsedSeconds = freeElapsedBase + Math.floor((now - freeStartTime) / 1000);
        updateTimer();
      }
    }, 1000);
  }

  function pauseTimer() {
    if (mode === 'free' && freeStartTime) {
      freeElapsedBase = elapsedSeconds;
    }
    clearInterval(timerInterval);
    timerInterval = null;
  }

  function resetTimer() {
    pauseTimer();
    if (mode === 'pomodoro') {
      remaining = totalSeconds;
    } else {
      elapsedSeconds = 0;
      freeElapsedBase = 0;
    }
    updateTimer();
  }

  startBtn.addEventListener('click', startTimer);
  pauseBtn.addEventListener('click', pauseTimer);
  resetBtn.addEventListener('click', resetTimer);

  // سوییچ تب‌ها
  function hideAllTabs() {
    pomodoroSection.classList.add('hidden');
    freeSection.classList.add('hidden');
    panicSection.classList.add('hidden');
    timerBox.classList.add('hidden');
    finishSection.classList.add('hidden');
    tabPomodoro.classList.remove('active');
    tabFree.classList.remove('active');
    tabPanic.classList.remove('active');
  }

  tabPomodoro.addEventListener('click', function() {
    mode = 'pomodoro';
    hideAllTabs();
    tabPomodoro.classList.add('active');
    pomodoroSection.classList.remove('hidden');
    timerBox.classList.remove('hidden');
    finishSection.classList.remove('hidden');
    resetTimer();
  });

  tabFree.addEventListener('click', function() {
    mode = 'free';
    hideAllTabs();
    tabFree.classList.add('active');
    freeSection.classList.remove('hidden');
    timerBox.classList.remove('hidden');
    finishSection.classList.remove('hidden');
    resetTimer();
  });

  tabPanic.addEventListener('click', function() {
    mode = 'panic';
    hideAllTabs();
    tabPanic.classList.add('active');
    panicSection.classList.remove('hidden');
    pauseTimer();
    loadPanicNotes();
  });

  // زمان‌های آماده
  document.querySelectorAll('.preset').forEach(function(btn) {
    btn.addEventListener('click', function() {
      totalSeconds = parseInt(btn.getAttribute('data-min')) * 60;
      resetTimer();
    });
  });

  document.getElementById('setCustomBtn').addEventListener('click', function() {
    var min = parseInt(document.getElementById('customMinutes').value);
    if (isNaN(min) || min < 1 || min > 180) { alert('عدد بین ۱ تا ۱۸۰ بزن'); return; }
    totalSeconds = min * 60;
    resetTimer();
  });

  // پایان جلسه
  finishBtn.addEventListener('click', function() {
    pauseTimer();
    var studiedMinutes, subject;

    if (mode === 'pomodoro') {
      studiedMinutes = Math.floor((totalSeconds - remaining) / 60);
      subject = subjectEl.value;
    } else if (mode === 'free') {
      studiedMinutes = Math.floor(elapsedSeconds / 60);
      subject = freeSubjectEl.value;
    } else {
      return;
    }

    var questions = questionsEl.value || '۰';

    if (studiedMinutes < 1) { alert('اول یه‌کم مطالعه کن بعد ثبت کن'); return; }

    resultEl.classList.remove('hidden');
    resultText.textContent = 'درس: ' + subject + ' | ' + toPersian(studiedMinutes) + ' دقیقه مطالعه | ' + toPersian(questions) + ' سؤال حل‌شده';
    resultEl.scrollIntoView({ behavior: 'smooth' });

    saveStudySession(subject, studiedMinutes, questions);

    setTimeout(function() {
      if (mode === 'pomodoro') remaining = totalSeconds;
      else { elapsedSeconds = 0; freeElapsedBase = 0; }
      updateTimer();
    }, 2000);
  });

  updateTimer();
}

// ===== سیستم شب امتحان =====
function loadPanicNotes() {
  var listEl = document.getElementById('panicList');
  if (!listEl) return;

  supabaseClient.from('panic_notes').select('*, profiles(username)').order('created_at', { ascending: false }).then(function(res) {
    listEl.innerHTML = '';
    var rows = res.data || [];
    if (rows.length === 0) {
      listEl.innerHTML = '<p class="lock-note">هنوز کسی نکته‌ای ثبت نکرده.</p>';
      return;
    }

    supabaseClient.auth.getUser().then(function(userRes) {
      var currentUserId = userRes.data.user ? userRes.data.user.id : null;
      rows.forEach(function(note) {
        var div = document.createElement('div');
        div.className = 'panic-note-card';
        var delBtnHtml = note.user_id === currentUserId ? '<button class="del-panic-btn" onclick="delPanicNote(' + note.id + ')">حذف</button>' : '';
        div.innerHTML = delBtnHtml +
          '<span class="panic-subject">' + note.subject + '</span>' +
          '<p class="panic-text">' + note.note + '</p>' +
          '<p style="font-size:0.7rem; color:var(--text-dim); margin-top:8px;">نویسنده: ' + note.profiles.username + '</p>';
        listEl.appendChild(div);
      });
    });
  });
}

if (document.getElementById('addPanicBtn')) {
  document.getElementById('addPanicBtn').addEventListener('click', function() {
    var subject = document.getElementById('panicSubject').value.trim();
    var note = document.getElementById('panicNote').value.trim();
    if (!subject || !note) { alert('درس و نکته رو کامل بنویس'); return; }

    supabaseClient.auth.getUser().then(function(res) {
      if (!res.data.user) return;
      supabaseClient.from('panic_notes').insert({
        user_id: res.data.user.id, subject: subject, note: note
      }).then(function(insRes) {
        if (insRes.error) { alert('خطا: ' + insRes.error.message); return; }
        document.getElementById('panicSubject').value = '';
        document.getElementById('panicNote').value = '';
        loadPanicNotes();
      });
    });
  });
}

window.delPanicNote = function(id) {
  if (confirm('این نکته حذف بشه؟')) {
    supabaseClient.from('panic_notes').delete().eq('id', id).then(function() {
      loadPanicNotes();
    });
  }
};
