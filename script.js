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
  var widgetStatus = document.getElementById('widgetStatus');

  // متغیرهای هدف
  var targetMinutes = 30;
  var todayDoneMinutes = 0;

  // گرفتن هدف از URL
  var urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('goal')) {
    targetMinutes = parseInt(urlParams.get('goal'));
  }

  // گرفتن اطلاعات کاربر برای فنجون
  supabaseClient.auth.getUser().then(function(res) {
    if (!res.data.user) return;
    var uid = res.data.user.id;
    var today = new Date();
    var todayStr = today.getFullYear() + '-' + (today.getMonth()+1) + '-' + today.getDate();

    supabaseClient.from('study_sessions').select('minutes, created_at').eq('user_id', uid).then(function(sRes) {
      var rows = sRes.data || [];
      rows.forEach(function(r) {
        var d = new Date(r.created_at);
        var dStr = d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
        if (dStr === todayStr) todayDoneMinutes += r.minutes;
      });
      updateWidget();
    });
  });

  // تابع آپدیت ویجت
  function updateWidget() {
    var percent = Math.min(Math.round((todayDoneMinutes / targetMinutes) * 100), 100);
    
    var cupLiquid = document.getElementById('cupLiquid');
    if(cupLiquid) cupLiquid.style.height = percent + '%';

    var galaxyLiquid = document.getElementById('galaxyLiquid');
    if(galaxyLiquid) galaxyLiquid.style.height = percent + '%';

    var simpleBar = document.getElementById('simpleBarFill');
    if(simpleBar) simpleBar.style.width = percent + '%';

    document.querySelectorAll('.blossom').forEach(function(b) {
      var val = parseInt(b.getAttribute('data-val'));
      if (percent >= val) { b.style.opacity = '1'; b.style.transform = 'scale(1)'; } 
      else { b.style.opacity = '0'; b.style.transform = 'scale(0)'; }
    });

    var hours = Math.floor(todayDoneMinutes / 60);
    var mins = todayDoneMinutes % 60;
    var text = '';
    if (hours > 0) text += hours + ' ساعت و ';
    text += mins + ' دقیقه (هدف: ' + targetMinutes + ' دقیقه)';
    
    if (percent >= 100) {
      text = '🎉 آفرین! هدف امروزت رو پر کردی.';
      if(widgetStatus) widgetStatus.style.color = 'var(--green)';
    } else {
      if(widgetStatus) widgetStatus.style.color = 'var(--text)';
    }
    if(widgetStatus) widgetStatus.textContent = text;
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
    if (mode === 'free' && freeStartTime) { freeElapsedBase = elapsedSeconds; }
    clearInterval(timerInterval);
    timerInterval = null;
  }

  function resetTimer() {
    pauseTimer();
    if (mode === 'pomodoro') remaining = totalSeconds;
    else { elapsedSeconds = 0; freeElapsedBase = 0; }
    updateTimer();
  }

  if(startBtn) startBtn.addEventListener('click', startTimer);
  if(pauseBtn) pauseBtn.addEventListener('click', pauseTimer);
  if(resetBtn) resetBtn.addEventListener('click', resetTimer);

  function hideAllTabs() {
    if(pomodoroSection) pomodoroSection.classList.add('hidden');
    if(freeSection) freeSection.classList.add('hidden');
    if(panicSection) panicSection.classList.add('hidden');
    if(timerBox) timerBox.classList.add('hidden');
    if(finishSection) finishSection.classList.add('hidden');
    if(tabPomodoro) tabPomodoro.classList.remove('active');
    if(tabFree) tabFree.classList.remove('active');
    if(tabPanic) tabPanic.classList.remove('active');
  }

  if(tabPomodoro) {
    tabPomodoro.addEventListener('click', function() {
      mode = 'pomodoro'; hideAllTabs();
      tabPomodoro.classList.add('active');
      pomodoroSection.classList.remove('hidden');
      timerBox.classList.remove('hidden'); finishSection.classList.remove('hidden');
      resetTimer();
    });
  }

  if(tabFree) {
    tabFree.addEventListener('click', function() {
      mode = 'free'; hideAllTabs();
      tabFree.classList.add('active');
      freeSection.classList.remove('hidden');
      timerBox.classList.remove('hidden'); finishSection.classList.remove('hidden');
      resetTimer();
    });
  }

  if(tabPanic) {
    tabPanic.addEventListener('click', function() {
      mode = 'panic'; hideAllTabs();
      tabPanic.classList.add('active');
      panicSection.classList.remove('hidden');
      pauseTimer();
      loadPanicNotes();
    });
  }

  document.querySelectorAll('.preset').forEach(function(btn) {
    btn.addEventListener('click', function() {
      totalSeconds = parseInt(btn.getAttribute('data-min')) * 60;
      resetTimer();
    });
  });

  if(document.getElementById('setCustomBtn')) {
    document.getElementById('setCustomBtn').addEventListener('click', function() {
      var min = parseInt(document.getElementById('customMinutes').value);
      if (isNaN(min) || min < 1 || min > 180) { alert('عدد بین ۱ تا ۱۸۰ بزن'); return; }
      totalSeconds = min * 60;
      resetTimer();
    });
  }

  if(finishBtn) {
    finishBtn.addEventListener('click', function() {
      pauseTimer();
      var studiedMinutes, subject;
      if (mode === 'pomodoro') {
        studiedMinutes = Math.floor((totalSeconds - remaining) / 60);
        subject = subjectEl.value;
      } else if (mode === 'free') {
        studiedMinutes = Math.floor(elapsedSeconds / 60);
        subject = freeSubjectEl.value;
      } else { return; }
      
      var questions = questionsEl.value || '۰';
      if (studiedMinutes < 1) { alert('اول یه‌کم مطالعه کن بعد ثبت کن'); return; }

      resultEl.classList.remove('hidden');
      resultText.textContent = 'درس: ' + subject + ' | ' + toPersian(studiedMinutes) + ' دقیقه مطالعه | ' + toPersian(questions) + ' سؤال حل‌شده';
      resultEl.scrollIntoView({ behavior: 'smooth' });

      saveStudySession(subject, studiedMinutes, questions);

      todayDoneMinutes += studiedMinutes;
      updateWidget();

      setTimeout(function() {
        if (mode === 'pomodoro') remaining = totalSeconds;
        else { elapsedSeconds = 0; freeElapsedBase = 0; }
        updateTimer();
      }, 2000);
    });
  }

  updateTimer();
}

// ===== ذخیره جلسه مطالعه (با قابلیت بوستر ۱.۵ برابر) =====
function saveStudySession(subject, minutes, questions) {
  return supabaseClient.auth.getUser().then(function(res) {
    if (!res.data.user) return;
    var userId = res.data.user.id;
    
    // ثبت جلسه
    return supabaseClient.from('study_sessions').insert({
      user_id: userId, subject: subject, minutes: minutes, questions: parseInt(questions) || 0
    }).then(function(sessionRes) {
      if (sessionRes.error) return;
      
      // محاسبه XP
      return supabaseClient.from('profiles').select('total_minutes, xp').eq('id', userId).single().then(function(p) {
        var newMinutes = (p.data.total_minutes || 0) + minutes;
        var baseXp = minutes * 2; 
        
        // چک کردن بوستر
        return supabaseClient.from('user_inventory')
          .select('id')
          .eq('user_id', userId)
          .eq('effect_value', 'بوستر XP ⚡')
          .then(function(boosterRes) {
            var finalXp = baseXp;
            
            if (boosterRes.data && boosterRes.data.length > 0) {
              finalXp = Math.floor(baseXp * 1.5);
              supabaseClient.from('user_inventory').delete().eq('id', boosterRes.data[0].id);
            }
            
            var newXp = (p.data.xp || 0) + finalXp;
            return supabaseClient.from('profiles').update({ total_minutes: newMinutes, xp: newXp }).eq('id', userId);
          });
      });
    });
  });
}

// ===== سیستم شب امتحان =====
function loadPanicNotes() {
  var listEl = document.getElementById('panicList');
  var filterSub = document.getElementById('filterSubject') ? document.getElementById('filterSubject').value : '';
  var filterChap = document.getElementById('filterChapter') ? document.getElementById('filterChapter').value : '';
  if (!listEl) return;

  supabaseClient.auth.getUser().then(function(res) {
    if (!res.data.user) return;
    
    supabaseClient.from('profiles').select('class_name').eq('id', res.data.user.id).single().then(function(pRes) {
      var userGrade = pRes.data ? pRes.data.class_name.replace(/[0-9 ]/g, '') : '';
      
      var query = supabaseClient.from('panic_notes').select('*, profiles(username)').order('created_at', { ascending: false });
      
      if (filterSub) query = query.eq('subject', filterSub);
      if (filterChap) query = query.ilike('chapter', '%' + filterChap + '%');

      query.then(function(res) {
        listEl.innerHTML = '';
        var rows = res.data || [];
        
        rows = rows.filter(function(n) {
          return n.grade === 'همه' || n.grade === userGrade || !n.grade;
        });

        if (rows.length === 0) {
          listEl.innerHTML = '<p class="lock-note">نکته‌ای با این فیلترها پیدا نشد.</p>';
          return;
        }

        rows.forEach(function(note) {
          var div = document.createElement('div');
          div.className = 'panic-note-card';
          var delBtnHtml = note.user_id === res.data.user ? '<button class="del-panic-btn" onclick="delPanicNote(' + note.id + ')">حذف</button>' : '';
          div.innerHTML = delBtnHtml +
            '<span class="panic-subject">' + note.subject + ' | ' + (note.chapter || 'عمومی') + '</span>' +
            '<p class="panic-text">' + note.note + '</p>' +
            '<p style="font-size:0.7rem; color:var(--text-dim); margin-top:8px;">نویسنده: ' + (note.profiles ? note.profiles.username : 'ناشناس') + '</p>';
          listEl.appendChild(div);
        });
      });
    });
  });
}

if (document.getElementById('addPanicBtn')) {
  document.getElementById('addPanicBtn').addEventListener('click', function() {
    var subject = document.getElementById('panicSubject').value.trim();
    var chapter = document.getElementById('panicChapter').value.trim() || 'عمومی';
    var note = document.getElementById('panicNote').value.trim();
    if (!subject || !note) { alert('درس و نکته رو کامل بنویس'); return; }

    supabaseClient.auth.getUser().then(function(res) {
      if (!res.data.user) return;
      
      supabaseClient.from('profiles').select('class_name').eq('id', res.data.user.id).single().then(function(pRes) {
        var userGrade = pRes.data ? pRes.data.class_name.replace(/[0-9 ]/g, '') : 'همه';
        
        supabaseClient.from('panic_notes').insert({
          user_id: res.data.user.id, subject: subject, chapter: chapter, note: note, grade: userGrade
        }).then(function(insRes) {
          if (insRes.error) { alert('خطا: ' + insRes.error.message); return; }
          document.getElementById('panicSubject').value = '';
          document.getElementById('panicChapter').value = '';
          document.getElementById('panicNote').value = '';
          loadPanicNotes();
        });
      });
    });
  });
}

window.delPanicNote = function(id) {
  if (confirm('این نکته حذف بشه؟')) {
    supabaseClient.from('panic_notes').delete().eq('id', id).then(function() { loadPanicNotes(); });
  }
};

if (document.getElementById('filterSubject')) {
  document.getElementById('filterSubject').addEventListener('change', loadPanicNotes);
  document.getElementById('filterChapter').addEventListener('input', loadPanicNotes);
}
