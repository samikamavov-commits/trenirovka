/* Журнал тренировок: подходы (вес × повторы), оценка, история.
   Плюс таймер отдыха (счёт по Date.now), Wake Lock и звук (Web Audio). */
(function () {
  const RATE_RU = { easy: 'легко', ok: 'нормально', hard: 'тяжело' };

  function miniToast(msg) {
    const t = document.getElementById('toast'); if (!t) return;
    t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(t._to); t._to = setTimeout(() => t.classList.add('hidden'), 2600);
  }

  function all() { try { return LS.get('fit.sessions', {}) || {}; } catch (e) { return {}; } }
  function saveAll(v) { try { LS.set('fit.sessions', v); } catch (e) { miniToast('Хранилище переполнено — сделай копию данных'); } }
  function nsets(s) { try { return Object.keys(s.sets || {}).reduce((n, k) => n + s.sets[k].length, 0); } catch (e) { return 0; } }

  function dayMeta(dayIdx) {
    try {
      const p = window.Plan.get(); const d = p && p.days[dayIdx];
      return d ? { label: d.label, focus: d.focus } : null;
    } catch (e) { return null; }
  }

  /* ---- данные: fit.sessions = { 'дата#день': {date, day, label, focus, rating, saved, sets:{exId:[{w,r}]}} } ---- */
  function addSet(date, dayIdx, exId, w, r) {
    try {
      const a = all(); const key = date + '#' + dayIdx;
      const m = dayMeta(dayIdx);
      if (!a[key]) a[key] = { date: date, day: dayIdx, label: m ? m.label : 'Тренировка', focus: m ? m.focus : '', rating: null, saved: false, sets: {} };
      const s = a[key];
      s.sets[exId] = s.sets[exId] || [];
      s.sets[exId].push({ w: w || 0, r: r });
      saveAll(a);
      wake(true);
      return s;
    } catch (e) { return null; }
  }
  function delSet(key, exId, i) {
    try {
      const a = all(); const s = a[key];
      if (!s || !s.sets || !s.sets[exId] || !s.sets[exId][i]) return null;
      const removed = s.sets[exId].splice(i, 1)[0];
      if (!s.sets[exId].length) delete s.sets[exId];
      if (!nsets(s)) delete a[key];
      saveAll(a);
      return { key: key, exId: exId, index: i, set: removed || { w: 0, r: 0 } };
    } catch (e) { return null; }
  }
  /* отмена удаления: вставить подход обратно на его индекс */
  function undoDelSet(key, exId, i, set) {
    try {
      const a = all();
      if (!a[key]) {
        const m = dayMeta(+(key.split('#')[1] || 0));
        a[key] = { date: key.slice(0, 10), day: +(key.split('#')[1] || 0), label: m ? m.label : 'Тренировка', focus: m ? m.focus : '', rating: null, saved: false, sets: {} };
      }
      const s = a[key];
      s.sets[exId] = s.sets[exId] || [];
      s.sets[exId].splice(Math.min(i, s.sets[exId].length), 0, set);
      saveAll(a);
      return true;
    } catch (e) { return false; }
  }
  function finish(date, rating) {
    try {
      const a = all();
      const keys = Object.keys(a).filter(k => k.indexOf(date + '#') === 0 && !a[k].saved && nsets(a[k]) > 0);
      if (!keys.length) return null;
      const key = keys.sort().pop();
      a[key].saved = true; a[key].rating = rating || null;
      saveAll(a);
      return a[key];
    } catch (e) { return null; }
  }
  function history() {
    try {
      const a = all();
      return Object.keys(a).filter(k => nsets(a[k]) > 0).sort().reverse().map(k => {
        const s = a[k]; const d = s.date || k.slice(0, 10);
        return { date: d.slice(8, 10) + '.' + d.slice(5, 7), label: s.label || 'Тренировка', focus: s.focus || '', rating: s.rating, nsets: nsets(s) };
      });
    } catch (e) { return []; }
  }

  /* ---- подсказки: «в прошлый раз», прогрессия и рекорды (только предложение) ---- */
  function rangeOf(reps) {
    const t = /(\d+)\s*[–\-—]\s*(\d+)/.exec(reps || '');
    if (t) return { min: +t[1], max: +t[2] };
    const s = /(\d+)/.exec(reps || '');
    return s ? { min: +s[1], max: +s[1] } : null;
  }
  function timedReps(reps) { return /сек|на сторону/.test(reps || ''); }
  function setsStr(list) { return list.map(x => (x.w ? x.w + '×' : '') + x.r).join(' · '); }

  /* Рекорды (PR) по упражнению: максимальный вес и максимальный 1RM (Эпли) */
  function epley(w, r) { return w * (1 + r / 30); }
  function record(exId) {
    const out = { w: 0, w1rm: 0, reps: 0, when: '' };
    try {
      const a = all();
      Object.keys(a).sort().reverse().forEach(k => {
        const list = (a[k].sets && a[k].sets[exId]) || [];
        list.forEach(x => {
          if (!out.when) out.when = a[k].date || k.slice(0, 10);
          if (x.w > 0) {
            if (x.w > out.w) out.w = x.w;
            if (x.r >= 2 && x.r <= 12) {
              const v = Math.round(epley(x.w, x.r) * 2) / 2; /* до 0,5 кг */
              if (v > out.w1rm) out.w1rm = v;
            } else if (x.r === 1 && x.w > out.w1rm) {
              out.w1rm = Math.round(x.w * 2) / 2;
            }
          } else if (x.r > out.reps) {
            out.reps = x.r; /* упражнения без веса: рекорд по повторам */
          }
        });
      });
    } catch (e) {}
    return out;
  }
  function prText(exId, reps) {
    const pr = record(exId);
    const timed = timedReps(reps);
    const parts = [];
    if (timed) {
      if (pr.reps) parts.push('рекорд: ' + pr.reps + ' сек');
    } else if (pr.w > 0) {
      parts.push('рекорд: ' + pr.w + ' кг' + (pr.w1rm > 0 ? ' · 1ПМ ~' + pr.w1rm + ' кг' : ''));
    } else if (pr.reps) {
      parts.push('рекорд: ' + pr.reps + ' повт.');
    }
    return parts.join(' ');
  }
  function hint(exId, reps) {
    const out = { last: '', tip: '', pr: '' };
    try {
      const today = window.Nut.todayKey();
      const a = all();
      const keys = Object.keys(a)
        .filter(k => { const d = k.slice(0, 10); return d < today && a[k].sets && a[k].sets[exId] && a[k].sets[exId].length; })
        .sort().reverse();
      if (keys.length) {
        out.last = setsStr(a[keys[0]].sets[exId]);
        if (!timedReps(reps)) {
          const rg = rangeOf(reps);
          const s0 = a[keys[0]].sets[exId];
          const usedW = s0.some(x => x.w > 0);
          if (rg && s0.length && s0.every(x => x.r >= rg.max)) {
            out.tip = 'Все подходы на верхней границе — можно ' + (usedW ? 'добавить вес' : 'усложнить вариант') + '.';
          } else if (rg && usedW && keys.length > 1) {
            const miss = s => s.filter(x => x.r < rg.min).length >= 2;
            if (miss(s0) && miss(a[keys[1]].sets[exId])) out.tip = 'Дважды не добрал минимум — снизь вес на 5–10 %.';
          }
        }
      }
      out.pr = prText(exId, reps);
    } catch (e) {}
    return out;
  }

  /* ---- таймер отдыха: считаем от endAt (Date.now), не от числа секунд ---- */
  const Rest = { endAt: 0, iv: null, def: 90, ac: null, total: 90 };
  function announce(msg) {
    const a = document.getElementById('restAnnounce');
    if (a) { try { a.textContent = msg; } catch (e) {} }
  }
  function fillPct(left) {
    const f = document.getElementById('restFill');
    if (f) {
      const p = Rest.total > 0 ? Math.max(0, Math.min(100, Math.round(left / Rest.total * 100))) : 0;
      f.style.width = p + '%';
    }
  }
  function startRest(sec) {
    const s = Math.max(20, Math.min(600, Math.round(+sec) || Rest.def));
    Rest.endAt = Date.now() + s * 1000;
    Rest.total = s;
    const bar = document.getElementById('restBar'); if (!bar) return;
    bar.classList.remove('hidden', 'low', 'flash');
    document.body.classList.add('rest-on');
    wake(true);
    clearInterval(Rest.iv);
    const tick = () => {
      const leftMs = Rest.endAt - Date.now();
      const left = Math.max(0, Math.ceil(leftMs / 1000));
      const t = document.getElementById('restSec');
      if (t) t.textContent = Math.floor(left / 60) + ':' + ('0' + (left % 60)).slice(-2);
      fillPct(left);
      if (left <= 10 && left > 0) bar.classList.add('low');
      else if (left > 10) bar.classList.remove('low');
      if (left <= 0) {
        stopRest();
        doneSignal();
      }
    };
    tick(); Rest.iv = setInterval(tick, 250);
    announce('Отдых ' + s + ' секунд начался');
  }
  function restShift(sec) {
    if (!Rest.iv) return;
    Rest.endAt += sec * 1000;
    if (Rest.endAt <= Date.now()) stopRest();
  }
  function stopRest() {
    clearInterval(Rest.iv); Rest.iv = null;
    const bar = document.getElementById('restBar');
    if (bar) { bar.classList.add('hidden'); bar.classList.remove('low'); }
    document.body.classList.remove('rest-on');
    fillPct(0);
    const f = document.getElementById('restFill');
    if (f) f.style.width = '100%';
  }
  /* конец отдыха: звук + вибрация (если есть) + визуальный сигнал,
     потому что на iPhone вибрации нет, а в беззвучном режиме может молчать звук */
  function doneSignal() {
    beep(); buzz();
    announce('Отдых закончен');
    const bar = document.getElementById('restBar');
    if (bar) {
      bar.classList.remove('hidden', 'low');
      bar.classList.add('flash');
      document.body.classList.add('rest-on');
      const t = document.getElementById('restSec');
      if (t) t.textContent = 'Готов!';
      const f = document.getElementById('restFill');
      if (f) f.style.width = '100%';
      clearTimeout(bar._flashTo);
      bar._flashTo = setTimeout(() => { bar.classList.add('hidden'); bar.classList.remove('flash'); document.body.classList.remove('rest-on'); }, 3000);
    }
    miniToast('Отдых закончен — следующий подход');
  }

  /* ---- звук и вибрация ---- */
  function beep() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      Rest.ac = Rest.ac || new AC();
      const ac = Rest.ac;
      if (ac.state === 'suspended') { try { ac.resume(); } catch (e) {} }
      [0, 0.22].forEach(dl => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.value = 880;
        o.connect(g); g.connect(ac.destination);
        const t0 = ac.currentTime + dl, dur = 0.16;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.start(t0); o.stop(t0 + dur + 0.02);
      });
    } catch (e) {}
  }
  function buzz() { try { if (navigator.vibrate) navigator.vibrate([220, 120, 220]); } catch (e) {} }

  /* ---- Wake Lock: экран не гаснет во время тренировки ----
     Запрос при старте таймера/подходе; авто-освобождение через 15 минут
     без новых подходов; повтор при возврате в приложение. */
  let WL = null, wantWake = false, wakeTimer = null;
  function wake(on) {
    wantWake = on;
    clearTimeout(wakeTimer);
    if (on) {
      wakeTimer = setTimeout(() => { /* 15 минут без новых подходов */
        wantWake = false;
        try { if (WL) WL.release(); } catch (e) {}
        WL = null;
      }, 15 * 60 * 1000);
    }
    if (!on) {
      try { if (WL) WL.release(); } catch (e) {}
      WL = null;
      return;
    }
    try {
      if ('wakeLock' in navigator && navigator.wakeLock && !WL) {
        navigator.wakeLock.request('screen').then(l => {
          WL = l;
          l.addEventListener('release', () => { WL = null; if (wantWake) wake(true); });
        }).catch(() => {});
      }
    } catch (e) {}
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && wantWake) { WL = null; wake(true); }
  });

  window.Jrn = {
    addSet: addSet, delSet: delSet, undoDelSet: undoDelSet, finish: finish, history: history, hint: hint,
    record: record, prText: prText,
    get(key) { try { return all()[key] || null; } catch (e) { return null; } },
    startRest: startRest, restShift: restShift, restStop: stopRest,
    wake: wake, RATE_RU: RATE_RU
  };
})();
