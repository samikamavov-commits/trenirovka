/* Роутер и рендер интерфейса */
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const TITLES = { today: 'Сегодня', workouts: 'Тренировки', food: 'Питание', kb: 'Знания', coach: 'Тренер' };
  const MODES = [['fatloss', '🔥 Сброс жира'], ['mass', '💪 Набор массы'], ['support', '⚖️ Поддержка']];
  let cur = 'today';
  let kbState = { cat: 'Все', q: '', inv: 'none' };
  let FS = { meal: null, q: '', picked: null, grams: 100, results: [], loading: false };
  let pending = false;
  let finishOpen = false;

  /* ---------- helpers ---------- */
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(t._to); t._to = setTimeout(() => t.classList.add('hidden'), 2400);
  }
  /* тост с кнопкой «Отменить» (кликабельный, живёт 5 секунд) */
  function undoToast(msg, onUndo, ms) {
    let bar = $('undoBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'undoBar';
      bar.className = 'undo hidden';
      bar.innerHTML = '<span class="undo-msg"></span><button type="button">Отменить</button>';
      document.body.appendChild(bar);
      bar.querySelector('button').addEventListener('click', () => {
        const fn = bar._fn; hideUndo();
        if (fn) { try { fn(); } catch (e) {} }
      });
    }
    bar._fn = onUndo || null;
    bar.querySelector('.undo-msg').textContent = msg;
    bar.classList.remove('hidden');
    clearTimeout(bar._to);
    bar._to = setTimeout(hideUndo, ms || 5000);
  }
  function hideUndo() {
    const bar = $('undoBar');
    if (bar) { bar.classList.add('hidden'); bar._fn = null; }
  }
  /* ---------- окна: фокус, Esc, Tab не выходит за окно (inert) ---------- */
  let lastFocus = null;
  function setInert(on) {
    ['.appbar', '#main', '.tabbar', '#restBar'].forEach(sel => {
      const el = document.querySelector(sel);
      if (el) { if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert'); }
    });
  }
  function openModal(html) {
    lastFocus = document.activeElement;
    $('modalCard').innerHTML = html;
    $('modal').classList.remove('hidden');
    setInert(true);
    const f = $('modalCard').querySelector('input,select,button,textarea');
    if (f) { try { f.focus(); } catch (e) {} }
  }
  function closeModal() {
    $('modal').classList.add('hidden');
    $('modalCard').innerHTML = '';
    setInert(false);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
    lastFocus = null;
  }
  function escTab(t) { return esc(t).replace(/\n/g, '<br>'); }
  function pct(curv, tgt) { return Math.max(2, Math.min(100, Math.round(curv / Math.max(1, tgt) * 100))); }
  function greet() {
    const h = new Date().getHours();
    if (h < 11) return 'Доброе утро!';
    if (h < 17) return 'Добрый день!';
    if (h < 23) return 'Добрый вечер!';
    return 'Ночной качался? 😄';
  }
  function mrow(label, curv, tgt, unit, cls) {
    return '<div class="mrow"><span class="lbl">' + label + '</span><div class="bar ' + (cls || '') + '"><div style="width:' + pct(curv, tgt) + '%"></div></div><span class="val">' + Math.round(curv) + ' / ' + Math.round(tgt) + ' ' + unit + '</span></div>';
  }
  function doneList() { return LS.get('fit.done', {})[Nut.todayKey()] || []; }
  function nextIdx() { const plan = Plan.get(); return plan ? doneList().length % plan.days.length : -1; }

  /* ---------- график объёма за 7 дней (чистый SVG) ---------- */
  function volume7() {
    const out = [];
    try {
      const a = LS.get('fit.sessions', {}) || {};
      const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i); /* локальная дата */
        const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        let vol = 0;
        Object.keys(a).forEach(k => {
          if (k.slice(0, 10) !== key) return;
          const sets = a[k].sets || {};
          Object.keys(sets).forEach(ex => (sets[ex] || []).forEach(x => { if (x.w > 0) vol += x.w * x.r; }));
        });
        out.push({ key: key, vol: Math.round(vol), lbl: WD[d.getDay()], today: i === 0 });
      }
    } catch (e) {}
    return out;
  }
  function chart7Svg() {
    try {
      const data = volume7();
      const max = Math.max(1, ...data.map(x => x.vol));
      const W = 324, H = 96, bw = 32, gap = (W - 7 * bw) / 6;
      const desc = data.map(x => x.lbl + ' ' + (x.vol ? x.vol + ' кг' : 'нет тренировки')).join(', ');
      const parts = ['<svg class="chart7" viewBox="0 0 ' + W + ' ' + (H + 14) + '" role="img" aria-label="График объёма тренировок за 7 дней: ' + esc(desc) + '" preserveAspectRatio="xMidYMid meet">'];
      parts.push('<line class="axis" x1="0" y1="' + (H + 0.5) + '" x2="' + W + '" y2="' + (H + 0.5) + '"/>');
      data.forEach((x, i) => {
        const h = x.vol ? Math.max(4, Math.round(x.vol / max * (H - 14))) : 2;
        const px = Math.round(i * (bw + gap));
        const py = H - h;
        parts.push('<rect class="bar7' + (x.today ? ' today' : '') + '" x="' + px + '" y="' + py + '" width="' + bw + '" height="' + h + '" rx="5"></rect>');
        parts.push('<text x="' + (px + bw / 2) + '" y="' + (py - 4) + '" text-anchor="middle">' + (x.vol ? (x.vol >= 1000 ? (x.vol / 1000).toFixed(1) + 'т' : x.vol) : '—') + '</text>');
        parts.push('<text x="' + (px + bw / 2) + '" y="' + (H + 11) + '" text-anchor="middle">' + x.lbl + '</text>');
      });
      parts.push('</svg>');
      return parts.join('');
    } catch (e) { return ''; }
  }
  function chart7Card() {
    return '<div class="card"><div class="row"><h3>Объём за 7 дней</h3><span class="pct">кг · вес × повторы</span></div>' +
      chart7Svg().replace('<svg ', '<svg aria-label="График объёма тренировок за 7 дней" ') +
      '</div>';
  }

  /* ---------- Сегодня ---------- */
  function renderToday() {
    const p = Prof.get();
    if (!p) {
      $('tab-today').innerHTML =
        '<div class="card" style="margin-top:26px;text-align:center;padding:34px 22px">' +
        '<div style="font-size:52px">💪</div><h3>Добро пожаловать</h3>' +
        '<p class="mut">Заполни короткую анкету — и получишь персональный план тренировок, нормы калорий и тренера-советника.</p>' +
        '<button class="btn wide" style="margin-top:14px" data-act="open-profile">Заполнить анкету</button></div>' +
        '<p class="disc" style="text-align:center">Все данные хранятся только на этом устройстве.</p>';
      return;
    }
    const t = Nut.targets(p);
    const s = Nut.sums(Nut.todayKey());
    const plan = Plan.get();
    const done = doneList();
    const ni = nextIdx();
    const d = plan ? plan.days[ni] : null;
    const waterMl = (s.water || 0) * 250;

    let workoutCard;
    if (!plan || !d) {
      workoutCard = '<div class="card"><h3>Тренировка сегодня</h3><p class="mut">План ещё не собран.</p>' +
        '<button class="btn wide mt" data-act="regen-plan">Собрать план тренировок</button></div>';
    } else {
      const isDone = done.includes(ni);
      workoutCard = '<div class="card"><div class="row"><h3>Тренировка сегодня</h3><span class="done-label">' + (isDone ? '✔ выполнено' : '') + '</span></div>' +
        '<p><b>' + esc(d.label) + '</b> — ' + esc(d.focus) + '</p>' +
        '<p class="mut small">' + d.ex.length + ' упражнений · примерно 45–60 мин</p>' +
        '<div class="wrap mt"><button class="btn" style="flex:1" data-act="tab:workouts">Открыть тренировку</button>' +
        '<button class="btn ghost" data-act="toggle-done" data-idx="' + ni + '">' + (isDone ? 'Отметки снять' : 'Выполнено ✔') + '</button></div></div>';
    }

    $('tab-today').innerHTML =
      '<div class="card greet"><h2>' + greet() + '</h2><p class="mut">' + LBL.levels[p.level] + ' · ' + p.days + ' дн/нед · ' + LBL.places[p.place] + '</p>' +
      '<div class="wrap mt" style="margin-top:10px">' + MODES.map(m => '<span class="chip' + (p.goal === m[0] ? ' act' : '') + '" data-act="mode-set" data-v="' + m[0] + '" role="button">' + m[1] + '</span>').join('') + '</div></div>' +
      '<div class="card"><div class="row"><h3>Калории за день</h3><span class="pct">норма ' + t.kcal + ' ккал</span></div>' +
      '<div class="knum">' + s.k + '<span class="unit">/ ' + t.kcal + ' ккал</span></div>' +
      '<div class="bar"><div style="width:' + pct(s.k, t.kcal) + '%"></div></div>' +
      mrow('Белки', s.p, t.p, 'г', 'g') + mrow('Жиры', s.f, t.f, 'г', 'b') + mrow('Углеводы', s.c, t.c, 'г', '') +
      '<div class="row mt" style="margin-top:12px"><span class="mut">💧 Вода: ' + waterMl + ' / ' + t.water + ' мл</span>' +
      '<span class="wrap"><button class="btn sm ghost" data-act="water-minus">−</button><button class="btn sm ghost" data-act="water-plus">+ 250 мл</button></span></div></div>' +
      workoutCard +
      (plan ? chart7Card() : '') +
      '<div class="card"><h3>💡 Совет тренера</h3><p class="small">' + escTab(Coach.dailyTip()) + '</p>' +
      '<button class="btn sm ghost mt" data-act="tab:coach">Спросить тренера</button></div>' +
      '';
  }

  /* ---------- Тренировки ---------- */
  function isTimedReps(reps) { return /сек|на сторону/.test(reps || ''); }
  function logChips(exId, reps, dayIdx) {
    const timed = isTimedReps(reps);
    const key = Nut.todayKey() + '#' + dayIdx;
    const s = Jrn.get(key);
    const list = (s && s.sets && s.sets[exId]) || [];
    return list.map((x, i) => '<button class="setchip" data-act="log-del" data-key="' + key + '" data-ex="' + exId + '" data-i="' + i + '">' +
      (timed ? x.r + ' сек' : (x.w ? x.w + '×' : '') + x.r) + ' ✕</button>').join('');
  }
  function updateLogSet(exId, reps, dayIdx) {
    const box = $('logsets-' + exId);
    if (box) box.innerHTML = logChips(exId, reps, dayIdx);
    updateFinishZone(dayIdx);
  }
  function finishZoneHtml(dayIdx) {
    const s = Jrn.get(Nut.todayKey() + '#' + dayIdx);
    if (s && s.saved) return '<p class="small mut">✔ Сессия сохранена' + (s.rating ? ' · ' + Jrn.RATE_RU[s.rating] : '') + '</p>';
    if (finishOpen) return '<div class="wrap" style="align-items:center"><span class="small">Как прошла тренировка?</span>' +
      ['easy', 'ok', 'hard'].map(r => '<button class="btn sm" data-act="finish-rate" data-r="' + r + '">' + Jrn.RATE_RU[r] + '</button>').join('') + '</div>';
    if (s && Object.keys(s.sets).some(k => s.sets[k].length)) return '<button class="btn wide" data-act="finish-open">Завершить тренировку</button>';
    return '';
  }
  function updateFinishZone(dayIdx) {
    const z = $('finishZone');
    if (z) z.innerHTML = finishZoneHtml(dayIdx);
  }
  function logRow(e, dayIdx) {
    const timed = isTimedReps(e.reps);
    return '<div class="sets" id="logsets-' + e.id + '" data-reps="' + esc(e.reps) + '">' + logChips(e.id, e.reps, dayIdx) + '</div>' +
      '<div class="log">' + (timed ? '' : '<input type="text" inputmode="decimal" id="logw-' + e.id + '" placeholder="кг">') +
      '<input type="text" inputmode="numeric" pattern="[0-9]*" id="logr-' + e.id + '" placeholder="' + (timed ? 'сек' : 'повт') + '">' +
      '<button class="btn" data-act="log-add" data-ex="' + e.id + '" data-day="' + dayIdx + '" data-reps="' + esc(e.reps) + '" data-rest="' + e.rest + '" aria-label="Записать подход">＋</button></div>';
  }
  function exPic(e) {
    try {
      const v = window.EXIMG && EXIMG.vid(e.id);
      if (v) return '<video class="ex-img ex-vid" src="' + v + '" preload="none" data-vid="' + v + '" loop muted playsinline></video>';
      const g = window.EXIMG && EXIMG.gif(e.id);
      if (g) return '<img class="ex-img" src="' + g + '" alt="Техника: ' + esc(e.name || e.n) + '">';
      const src = window.EXIMG && EXIMG.url(e.id);
      if (src) return '<img class="ex-img" src="' + src + '" alt="Техника: ' + esc(e.name || e.n) + '">';
    } catch (err) { /* нет ни гифки, ни фото — покажем SVG */ }
    return Anim.forId(e.id) + Anim.legend(e.id);
  }
  /* видео загружается и играет только когда карточка упражнения раскрыта */
  function hydrateVideos(root) {
    try {
      (root || document).querySelectorAll('video.ex-vid[data-vid]').forEach(v => {
        if (v.src) return;
        v.setAttribute('src', v.getAttribute('data-vid'));
        v.removeAttribute('data-vid');
        const p = v.play();
        if (p && p.catch) p.catch(() => { try { v.load(); } catch (e) {} }); /* если автоплей запрещён — показываем первый кадр */
      });
    } catch (e) {}
  }
  function exRow(e, canLog, dayIdx) {
    let j = '';
    if (canLog) {
      const h = Jrn.hint(e.id, e.reps);
      j = (h.last ? '<p class="small mut prev">⌛ В прошлый раз: ' + esc(h.last) + '</p>' : '') +
        (h.tip ? '<p class="small jtip">💡 ' + esc(h.tip) + '</p>' : '') +
        (h.pr ? '<p class="small mut prev">🏆 ' + esc(h.pr) + '</p>' : '') +
        logRow(e, dayIdx);
    }
    return '<details class="ex"><summary><span class="nm">' + esc(e.name) + '</span><span class="meta right">' + e.sets + ' × ' + esc(e.reps) + '</span></summary>' +
      '<div class="mt"><p class="small mut">Отдых: ' + e.rest + ' сек</p>' +
      exPic(e) +
      '<p class="cue">' + esc(e.cue) + '</p>' + j + '</div></details>';
  }
  function dayCard(d, done, ni) {
    const isDone = done.includes(d.i);
    const canLog = d.i === ni;
    return '<details class="day"' + (d.i === ni ? ' open' : '') + '><summary><span class="row" style="flex:1"><b>' + esc(d.label) + '</b><span class="mut small">' + esc(d.focus) + '</span></span><span class="mut small">' + d.ex.length + ' упр.</span></summary>' +
      '<div class="ex-list">' + d.ex.map(e => exRow(e, canLog, d.i)).join('') + '</div>' +
      (canLog ? '<div class="mt" id="finishZone">' + finishZoneHtml(d.i) + '</div>' : '') +
      '<button class="btn sm ' + (isDone ? 'ghost' : '') + ' mt" data-act="toggle-done" data-idx="' + d.i + '">' + (isDone ? '✔ Выполнено — снять отметку' : 'Отметить выполненным') + '</button>' +
      '</details>';
  }
  function renderWorkouts() {
    const p = Prof.get();
    const el = $('tab-workouts');
    if (!p) { el.innerHTML = '<div class="card" style="text-align:center;padding:30px 20px"><p class="mut">Сначала заполни анкету ⚙️ — план собирается под неё.</p></div>'; return; }
    const plan = Plan.get();
    if (!plan) {
      el.innerHTML = '<div class="card" style="text-align:center;padding:30px 20px"><div style="font-size:44px">🗓</div><h3>План не собран</h3>' +
        '<p class="mut">Соберу недельную программу под твой профиль: цель, уровень, инвентарь.</p>' +
        '<button class="btn wide mt" data-act="regen-plan">Собрать план тренировок</button></div>';
      return;
    }
    const done = doneList();
    const ni = nextIdx();
    const hist = Jrn.history();
    const histCard = '<details class="card"><summary style="cursor:pointer">📈 <b>Журнал тренировок</b>' +
      (hist.length ? '<span class="mut small"> · сессий: ' + hist.length + '</span>' : '') + '</summary>' +
      (hist.length ?
        '<ul class="small hlist">' + hist.map(h => '<li><b>' + h.date + '</b> · ' + esc(h.label) + (h.focus ? ' (' + esc(h.focus) + ')' : '') + ' · ' + h.nsets + ' подходов' + (h.rating ? ' · ' + Jrn.RATE_RU[h.rating] : '') + '</li>').join('') + '</ul>'
        : '<p class="mut small" style="margin-top:8px">Пусто. Открой день и записывай подходы (вес × повторы) в упражнениях — здесь появится история.</p>') +
      '</details>';
    el.innerHTML =
      '<div class="row" style="margin:4px 2px"><p class="small mut">' + LBL.places[p.place] + ' · ' + LBL.goals[p.goal] + ' · ' + LBL.levels[p.level] + '</p>' +
      '<button class="btn sm ghost" data-act="regen-plan">↻ Пересобрать</button></div>' +
      histCard +
      '<details class="card"><summary style="cursor:pointer">🗓 <b>Прогрессия на 4 недели</b></summary>' +
      '<ul class="small mut" style="margin:10px 0 0;padding-left:18px">' + plan.prog.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></details>' +
      plan.days.map(d => dayCard(d, done, ni)).join('') +
      '<p class="disc">План — стартовая точка: не бойся заменять упражнения на комфортные варианты, отмечай выполненные дни.</p>';
  }

  /* ---------- Питание ---------- */
  function renderFood() {
    const p = Prof.get();
    const el = $('tab-food');
    if (!p) { el.innerHTML = '<div class="card" style="text-align:center;padding:30px 20px"><p class="mut">Сначала заполни анкету ⚙️ — нормы и дневник зависят от неё.</p></div>'; return; }
    const t = Nut.targets(p);
    const s = Nut.sums(Nut.todayKey());
    const menu = Nut.menu(p);

    const meals = ['b', 'l', 'd', 's'].map(m => {
      const list = (Nut.day(Nut.todayKey())[m] || []);
      const rows = list.map((e, i) =>
        '<div class="entry"><div><div class="nm">' + esc(e.n) + ' <span class="mut">' + e.g + ' г</span></div>' +
        '<div class="sub mut">Б ' + e.p + ' · Ж ' + e.f + ' · У ' + e.c + '</div></div>' +
        '<div class="row" style="gap:10px"><b>' + e.k + ' ккал</b><button data-act="entry-del" data-meal="' + m + '" data-i="' + i + '">✕</button></div></div>');
      return '<div class="meal"><div class="row"><h4>' + LBL.meals[m] + ' · ' + (list.length ? list.reduce((a, e) => a + e.k, 0) : 0) + ' ккал</h4>' +
        '<button class="btn sm" data-act="food-add" data-meal="' + m + '">＋ Добавить</button></div>' +
        (rows.join('') || '<p class="mut small">Пока ничего не добавлено.</p>') + '</div>';
    }).join('');

    const menuItems = ['b', 'l', 'd', 's'].map(m =>
      '<h4>' + LBL.meals[m] + ' · ~' + menu[m].kcal + ' ккал</h4><p class="small mut">' + esc(menu[m].title) + '</p>' +
      '<ul class="small" style="margin:4px 0 10px;padding-left:18px">' + menu[m].items.map(it => '<li>' + esc(it.n) + ' — ' + it.g + ' г (' + it.k + ' ккал)</li>').join('') + '</ul>').join('');

    el.innerHTML =
      '<div class="card"><div class="row"><h3>Съедено сегодня</h3><span class="pct">' + s.k + ' / ' + t.kcal + ' ккал</span></div>' +
      '<div class="bar"><div style="width:' + pct(s.k, t.kcal) + '%"></div></div>' +
      mrow('Белки', s.p, t.p, 'г', 'g') + mrow('Жиры', s.f, t.f, 'г', 'b') + mrow('Углеводы', s.c, t.c, 'г', '') +
      '</div>' +
      meals +
      '<details class="card"><summary style="cursor:pointer">🍽 <b>Подсказка меню на день</b> <span class="mut small">под цель</span></summary>' +
      menuItems + '<p class="disc">Меню — ориентир из шаблонов: замену продуктов делай схожими по белку/калориям.</p></details>' +
      '<p class="disc">Поиск продуктов: локальная база + онлайн Open Food Facts (миллионы товаров — лучше уточнять бренд).</p>';
  }

  /* окно поиска/добавления еды */
  function foodOpen(meal) {
    FS = { meal, q: '', picked: null, grams: 100, results: [], loading: false };
    openModal('<div class="row"><h3>' + LBL.meals[meal] + ' · что съел?</h3><button class="iconbtn" data-act="modal-close">✕</button></div>' +
      '<input type="search" id="foodSearch" placeholder="Продукт или бренд…" autocomplete="off">' +
      '<p class="mut mt" style="font-size:12px">Название — например: творог, курица, гречка. Онлайн — Open Food Facts.</p>' +
      '<div id="foodList"></div>');
    const inp = $('foodSearch'); inp.focus();
  }
  function renderFoodList() {
    const box = $('foodList'); if (!box) return;
    const q = FS.q;
    if (!q || q.trim().length < 2) { box.innerHTML = ''; return; }
    if (FS.loading) { box.innerHTML = '<p class="mut mt">Ищу «' + esc(q) + '»…</p><div class="dots"><span></span><span></span><span></span></div>'; return; }
    if (!FS.results.length) {
      box.innerHTML = '<p class="mut mt">Ничего не нашли. ' + (navigator.onLine ? 'Попробуй другое название или бренд.' : 'Нет сети — локальная база из ' + Foods.list.length + ' продуктов.') + '</p>';
      return;
    }
    box.innerHTML = FS.results.map((x, i) =>
      '<div class="res"><div class="k" data-act="food-pick" data-i="' + i + '">' + esc(x.n) + '<div class="sub">' + esc(x.sub || '') + ' · Б ' + x.p + ' Ж ' + x.f + ' У ' + x.c + '</div></div><b>' + x.k + '</b></div>').join('') +
      '<p class="mut small" style="font-size:11px">Клик по продукту → указать граммы</p>';
  }
  function foodPick(i) {
    FS.picked = FS.results[i]; FS.grams = 100;
    foodAmount();
  }
  function foodAmount() {
    const x = FS.picked;
    const kcal = Math.round(x.k * FS.grams / 100);
    openModal('<button class="btn sm ghost" data-act="food-back">← назад</button>' +
      '<h3 class="mt">' + esc(x.n) + '</h3>' +
      '<p class="mut small">' + esc(x.sub || '') + ' · на 100 г: ' + x.k + ' ккал, Б ' + x.p + ' · Ж ' + x.f + ' · У ' + x.c + '</p>' +
      '<div class="wrap mt" id="gramChips">' + [50, 100, 150, 200, 250].map(g => '<span class="chip' + (g === FS.grams ? ' act' : '') + '" data-act="food-grams" data-g="' + g + '">' + g + ' г</span>').join('') + '</div>' +
      '<div class="mrow mt" style="margin-top:14px"><input type="number" id="foodGrams" value="' + FS.grams + '" min="5" max="3000" step="5"><span class="val">г</span></div>' +
      '<div class="row mt"><span class="mut">Итого: <b id="kcalPrev">' + kcal + '</b> ккал</span></div>' +
      '<button class="btn wide mt" data-act="food-add-entry">Добавить в «' + LBL.meals[FS.meal] + '»</button>');
  }
  function foodUpdatePrev() {
    const inp = $('foodGrams'); if (!inp) return;
    FS.grams = Math.max(5, Math.min(3000, +inp.value || 0));
    Array.from($('gramChips').children).forEach(ch => ch.classList.toggle('act', +ch.dataset.g === FS.grams));
    $('kcalPrev').textContent = Math.round(FS.picked.k * FS.grams / 100);
  }
  function foodAddEntry() {
    const x = FS.picked;
    const per = x.k / 100;
    Nut.add(Nut.todayKey(), FS.meal, {
      id: x.id, n: x.n, g: FS.grams,
      k: Math.round(x.k * FS.grams / 100),
      p: +(x.p * FS.grams / 100).toFixed(1),
      f: +(x.f * FS.grams / 100).toFixed(1),
      c: +(x.c * FS.grams / 100).toFixed(1)
    });
    closeModal();
    toast('+' + Math.round(per * FS.grams) + ' ккал · ' + LBL.meals[FS.meal]);
    renderFood(); if (cur !== 'food') render(cur);
  }

  /* ---------- Знания ---------- */
  const INV_CHIPS = [['none', 'Без инвентаря'], ['dumbbells', 'Гантели'], ['bands', 'Резинки'], ['pullup', 'Турник']];
  function homeCatalog() {
    const inv = kbState.inv;
    let list;
    if (inv === 'none') list = ExBase.list('home', ['none'], []).filter(e => e.eq.length === 0);
    else list = ExBase.list('home', [inv], []).filter(e => e.eq.length === 1 && e.eq[0] === inv);
    list = list.sort((a, b) => a.lvl - b.lvl || a.n.localeCompare(b.n, 'ru'));
    const title = INV_CHIPS.find(x => x[0] === inv)[1];
    return '<div class="card"><h3>🏠 Каталог: дома</h3><p class="mut small">Самые рабочие упражнения ' + title.toLowerCase() + '. Нажми на упражнение — покажу технику и мышцы.</p>' +
      '<div class="wrap" style="margin:8px 0 12px">' + INV_CHIPS.map(x => '<span class="chip' + (kbState.inv === x[0] ? ' act' : '') + '" data-act="kb-inv" data-v="' + x[0] + '">' + x[1] + '</span>').join('') + '</div>' +
      list.map(e => '<details class="ex" style="border-top:1px solid var(--line);padding:10px 0">' +
        '<summary style="list-style:none;cursor:pointer;display:flex;justify-content:space-between;gap:8px"><span class="nm">' + esc(e.n) + '</span><span class="mut small">' + LBL.levels[e.lvl] + '</span></summary>' +
        '<div class="mt">' + exPic(e) + '<p class="cue">' + esc(e.cue) + '</p></div></details>').join('') +
      '</div>';
  }
  function renderKB() {
    const arts = Kb.search(kbState.q).filter(a => kbState.cat === 'Все' || a.cat === kbState.cat);
    $('tab-kb').innerHTML = homeCatalog() +
      '<div class="card"><h3>📚 База знаний</h3>' +
      '<input type="search" id="kbSearch" placeholder="Поиск в статьях…" value="' + esc(kbState.q) + '" style="margin-top:8px">' +
      '<div class="wrap" style="margin:10px 0 4px">' + Kb.cats.map(c => '<span class="chip' + (kbState.cat === c ? ' act' : '') + '" data-act="kb-cat" data-c="' + c + '">' + c + '</span>').join('') + '</div>' +
      '<div id="kbArt">' + artList(arts) + '</div></div>';
  }
  function artList(arts) {
    return (arts.map(a => '<details class="ex" style="border-top:1px solid var(--line);padding:10px 0">' +
      '<summary style="list-style:none;cursor:pointer;display:flex;align-items:center;gap:8px"><span class="cat">' + a.cat + '</span><span class="nm">' + esc(a.title) + '</span></summary>' +
      '<div class="mt"><p class="small" style="white-space:pre-line">' + esc(a.body) + '</p></div></details>').join('') || '<p class="mut">Ничего не нашлось по запросу.</p>');
  }

  /* ---------- Тренер ---------- */
  const QUICK = ['Сколько мне калорий?', 'Мои БЖУ', 'План на сегодня', 'Как прогрессировать?', 'Болит спина', 'Что есть до тренировки?'];
  function renderCoach() {
    const h = Coach.hist();
    const aiOn = AI.on();
    const ai = AI.cfg() || {};
    const msgs = h.map(m => '<div class="msg ' + (m.r === 'u' ? 'u' : 'c') + '">' + escTab(m.t) + '</div>').join('') +
      (pending ? '<div class="msg c">печатает<span class="dots"><span></span><span></span><span></span></span></div>' : '');
    $('tab-coach').innerHTML =
      '<div class="card"><h3>💡 Совет на сегодня</h3><p class="small">' + escTab(Coach.dailyTip()) + '</p></div>' +
      '<details class="card"><summary style="cursor:pointer">⚙️ <b>ИИ-тренер</b>' +
      (aiOn ? '<span class="mut small"> · вкл ' + esc(ai.model || '') + '</span>' : '<span class="mut small"> · офлайн-режим</span>') + '</summary>' +
      '<div style="margin-top:8px">' +
      '<p class="small mut">Отвечает настоящий ИИ через OpenRouter (есть бесплатные модели). Ключ хранится только на твоём устройстве; без ключа/интернета тренер остаётся в офлайн-режиме по базе знаний.</p>' +
      '<input type="password" id="aiKey" placeholder="API-ключ (sk-or-v1-…)" value="' + esc(ai.key || '') + '" style="margin-top:8px">' +
      '<input type="text" id="aiModel" placeholder="Модель, напр. deepseek/deepseek-chat-v3-0324:free" value="' + esc(ai.model || '') + '" style="margin-top:6px">' +
      '<div class="wrap mt" style="align-items:center">' +
      '<button class="btn sm" data-act="ai-save">Сохранить</button>' +
      '<span class="chip' + (ai.web ? ' act' : '') + '" data-act="ai-web" role="button">🌐 Интернет-поиск</span>' +
      '<a href="https://openrouter.ai/keys" target="_blank" rel="noopener" style="margin-left:6px">получить ключ ↗</a>' +
      '</div></div></details>' +
      '<div class="card"><div class="row"><h3>🤖 Чат с тренером</h3>' +
      (h.length ? '<button class="btn sm ghost" data-act="chat-clear">Очистить</button>' : '') + '</div>' +
      '<p class="mut small mt" style="margin-top:6px">' + (aiOn ? 'Подключён ИИ (' + esc(ai.model || '') + ') — с уклоном в тренировки, учитывает твой профиль и план.' : 'Автономный тренер: правила + встроенная база знаний + твои данные.') + '</p>' +
      '<div class="chat" id="chatWin" role="log" aria-live="polite" aria-label="Чат с тренером">' + msgs + '</div>' +
      '<div class="wrap">' + QUICK.map(q => '<span class="chip" data-act="chat-quick" data-q="' + esc(q) + '">' + esc(q) + '</span>').join('') + '</div>' +
      '<form id="chatForm" class="chat-in"><input type="text" id="chatInput" placeholder="Твой вопрос…" autocomplete="off"><button class="btn" type="submit">➤</button></form>' +
      '</div>';
    const w = $('chatWin'); if (w) w.scrollTop = w.scrollHeight;
  }
  function sendChat(q) {
    q = (q || '').trim(); if (!q) return;
    if (AI.on() && !LS.get('tr_ai_consent', false)) { aiConsent(q); return; }
    doSend(q);
  }
  let aiPendingQ = null;
  function aiConsent(q) {
    aiPendingQ = q;
    const p = Prof.get();
    openModal('<h3>Что уйдёт ИИ-тренеру</h3>' +
      '<p class="small mut">Для ответа данные отправляются в облачный ИИ через OpenRouter (сторонний сервис):' +
      '<br>• твой вопрос и до 10 последних сообщений чата;' +
      '<br>• профиль: ' + (p ? 'пол, возраст, вес, рост, цель, уровень, инвентарь' : 'пока пуст (анкета не заполнена)') + ';' +
      '<br>• план тренировок и последние сессии журнала.' +
      '<br><br>API-ключ хранится только на этом устройстве и используется лишь для запроса.</p>' +
      '<button class="btn wide mt" data-act="ai-consent-yes">Согласен, отправить</button>' +
      '<button class="btn ghost wide mt" data-act="ai-consent-no">Отмена</button>');
  }
  function doSend(q) {
    Coach.push('u', q); pending = true; renderCoach();
    if (AI.on()) {
      AI.ask(q, Coach.hist().slice(0, -1)).then(r => {
        pending = false;
        if (r && r.text) Coach.push('c', r.text);
        else Coach.push('c', '⚠️ ИИ недоступен' + (r && r.error ? ' — ' + r.error : '') + (navigator.onLine === false ? ' · нет сети' : '') + '.\n\nПроверь в настройках тренера: ключ (без пробелов) и точное имя модели. Пока отвечаю по офлайн-базе:\n\n' + Coach.answer(q));
        renderCoach();
      });
    } else {
      setTimeout(() => {
        const a = Coach.answer(q);
        Coach.push('c', a); pending = false; renderCoach();
      }, 420);
    }
  }

  /* ---------- Профиль ---------- */
  function renderProfile() {
    const p = Prof.get() || Prof.DEF;
    const chk = (grp, v, lbl) => '<label><input type="checkbox" data-chk="' + grp + '" value="' + v + '"' + (p[grp === 'equip' ? 'equip' : 'issues'].includes(v) ? ' checked' : '') + '> ' + lbl + '</label>';
    $('profileOverlay').innerHTML =
      '<div class="overlay-card"><div class="row"><h3>Твой профиль</h3>' +
      (Prof.get() ? '<button class="iconbtn" data-act="close-profile">✕</button>' : '') + '</div>' +
      '<div class="field"><label>Пол</label><select id="fSex"><option value="m"' + (p.sex === 'm' ? ' selected' : '') + '>Мужчина</option><option value="f"' + (p.sex === 'f' ? ' selected' : '') + '>Женщина</option></select></div>' +
      '<div class="grid2"><div class="field"><label>Возраст</label><input type="number" id="fAge" value="' + p.age + '" min="10" max="90"></div>' +
      '<div class="field"><label>Рост, см</label><input type="number" id="fHeight" value="' + p.height + '" min="120" max="230"></div></div>' +
      '<div class="field"><label>Вес, кг</label><input type="number" id="fWeight" value="' + p.weight + '" min="30" max="300" step="0.5"></div>' +
      '<div class="field"><label>Цель</label><select id="fGoal">' +
      Object.keys(LBL.goals).map(k => '<option value="' + k + '"' + (p.goal === k ? ' selected' : '') + '>' + LBL.goals[k] + '</option>').join('') + '</select></div>' +
      '<div class="grid2"><div class="field"><label>Уровень</label><select id="fLevel">' +
      Object.keys(LBL.levels).map(k => '<option value="' + k + '"' + (String(p.level) === k ? ' selected' : '') + '>' + LBL.levels[k] + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>Тренировок в неделю</label><select id="fDays">' +
      [2, 3, 4, 5, 6].map(k => '<option ' + (+p.days === k ? 'selected' : '') + '>' + k + '</option>').join('') + '</select></div></div>' +
      '<div class="field"><label>Где тренируешься</label><select id="fPlace"><option value="home"' + (p.place === 'home' ? ' selected' : '') + '>Дома</option><option value="gym"' + (p.place === 'gym' ? ' selected' : '') + '>В зале</option></select></div>' +
      '<div class="field"><label>Инвентарь дома (для зала не важно)</label><div class="checks">' + chk('equip', 'dumbbells', 'Гантели') + chk('equip', 'bands', 'Резинки') + chk('equip', 'pullup', 'Турник') + '</div></div>' +
      '<div class="field"><label>Незалеченные боли (план обойдёт такие упражнения)</label><div class="checks">' + chk('issues', 'back', 'Спина') + chk('issues', 'knee', 'Колени') + chk('issues', 'shoulder', 'Плечи') + '</div></div>' +
      '<button class="btn wide" data-act="save-profile">' + (Prof.get() ? 'Сохранить и пересчитать' : 'Начать') + '</button>' +
      (Prof.get() ? '<button class="btn ghost wide mt" data-act="close-profile">Просто закрыть</button>' : '') +
      (Prof.get() ? '<div class="row mt" style="gap:8px"><button class="btn sm ghost" style="flex:1" data-act="backup-export">📥 Копия данных</button>' +
        '<button class="btn sm ghost" style="flex:1" data-act="backup-import-click">📤 Восстановить</button></div>' +
        '<input type="file" id="backupFile" accept="application/json,.json" class="sr-only" aria-label="Файл копии данных">' : '') +
      '<div class="field mt"><label>Тема</label><div class="wrap">' +
      [['dark', '🌙 Тёмная'], ['light', '☀️ Светлая'], ['system', '💻 Как в системе']].map(x =>
        '<span class="chip' + (window.Theme && Theme.get() === x[0] ? ' act' : '') + '" data-act="theme-set" data-v="' + x[0] + '" role="button">' + x[1] + '</span>').join('') +
      '</div></div>' +
      '<p class="disc">Данные хранятся только на этом устройстве.</p></div>';
    $('profileOverlay').classList.remove('hidden');
    $('profileOverlay').scrollTop = 0;
    lastFocus = document.activeElement;
    setInert(true);
    const f = $('profileOverlay').querySelector('input,select,button');
    if (f) { try { f.focus(); } catch (e) {} }
  }
  function closeProfile() {
    $('profileOverlay').classList.add('hidden');
    setInert(false);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
    lastFocus = null;
    render(cur);
  }

  function saveProfile() {
    const old = Prof.get();
    const p = {
      sex: $('fSex').value, age: +$('fAge').value, height: +$('fHeight').value, weight: +$('fWeight').value,
      goal: $('fGoal').value, level: +$('fLevel').value, days: +$('fDays').value, place: $('fPlace').value,
      equip: Array.from(document.querySelectorAll('[data-chk="equip"]:checked')).map(i => i.value),
      issues: Array.from(document.querySelectorAll('[data-chk="issues"]:checked')).map(i => i.value)
    };
    if (p.age < 10 || p.age > 90 || p.height < 120 || p.height > 230 || p.weight < 30 || p.weight > 300) { toast('Проверь возраст, рост и вес'); return; }
    if (!p.equip.length) p.equip = ['none'];
    const sig = j => JSON.stringify([j.goal, j.level, j.days, j.place, [...j.equip].sort().join(), [...j.issues].sort().join()]);
    Prof.set(p);
    if (!old || sig(old) !== sig(p) || !Plan.get()) {
      Plan.save(Plan.generate(p));
      toast(old ? 'Профиль сохранён, план пересобран' : 'Готово! План собран 💪');
    } else toast('Профиль сохранён');
    closeProfile();
  }

  /* ---------- маршрутизация ---------- */
  const R = { today: renderToday, workouts: renderWorkouts, food: renderFood, kb: renderKB, coach: renderCoach };
  function render(tab) { R[tab](); }
  function go(tab) {
    cur = tab;
    $('appbarTitle').textContent = TITLES[tab];
    TITLES && Object.keys(TITLES).forEach(t => $('tab-' + t).classList.toggle('hidden', t !== tab));
    $('tab-' + tab).classList.remove('enter'); void $('tab-' + tab).offsetWidth; $('tab-' + tab).classList.add('enter');
    Array.from($('tabbar').children).forEach(b => {
      const on = b.dataset.act === 'tab:' + tab;
      b.classList.toggle('act', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    render(tab);
    hydrateVideos($('tab-' + tab));
    window.scrollTo({ top: 0 });
  }

  /* ---------- события ---------- */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!$('modal').classList.contains('hidden') && e.target.id === 'modal') { closeModal(); return; }
    if (!el) return;
    const act = el.dataset.act;
    switch (act) {
      case 'open-profile': renderProfile(); break;
      case 'close-profile': closeProfile(); break;
      case 'save-profile': saveProfile(); break;
      case 'regen-plan': regen(); break;
      case 'toggle-done': {
        const idx = +el.dataset.idx; const day = Nut.todayKey();
        const all = LS.get('fit.done', {}); const arr = all[day] || [];
        const at = arr.indexOf(idx);
        if (at >= 0) { arr.splice(at, 1); toast('Отметка снята'); } else { arr.push(idx); toast('Тренировка выполнена ✔'); }
        all[day] = arr; LS.set('fit.done', all);
        render(cur); break;
      }
      case 'food-add': foodOpen(el.dataset.meal); break;
      case 'food-pick': foodPick(+el.dataset.i); break;
      case 'food-back': foodOpen(FS.meal); break;
      case 'food-grams': FS.grams = +el.dataset.g; $('foodGrams').value = FS.grams; foodUpdatePrev(); break;
      case 'food-add-entry': foodAddEntry(); break;
      case 'entry-del': {
        const meal = el.dataset.meal, i = +el.dataset.i;
        const d = Nut.day(Nut.todayKey());
        const entry = (d[meal] || [])[i];
        Nut.del(Nut.todayKey(), meal, i);
        renderFood();
        if (entry) undoToast('Удалено: ' + entry.n, () => {
          Nut.add(Nut.todayKey(), meal, entry);
          if (cur === 'food') renderFood(); else render(cur);
        });
        break;
      }
      case 'water-plus': Nut.waterAdd(Nut.todayKey(), 1); render(cur); break;
      case 'water-minus': Nut.waterAdd(Nut.todayKey(), -1); render(cur); break;
      case 'kb-cat': kbState.cat = el.dataset.c; renderKB(); break;
      case 'kb-inv': kbState.inv = el.dataset.v; renderKB(); break;
      case 'kb-open': openArticle(el.dataset.id); break;
      case 'chat-quick': sendChat(el.dataset.q); break;
      case 'chat-clear': Coach.clear(); pending = false; renderCoach(); break;
      case 'ai-save': {
        const k = ($('aiKey') || {}).value || '';
        const m = ($('aiModel') || {}).value || '';
        const c = AI.cfg() || {};
        AI.save({ key: k.trim(), model: m.trim(), base: c.base, web: !!c.web });
        toast(k.trim() && m.trim() ? 'ИИ-тренер включён 🤖' : 'Ключ/модель не заполнены — офлайн-режим');
        render(cur);
        break;
      }
      case 'ai-web': {
        const c = AI.cfg() || {};
        c.web = !c.web;
        AI.save(c);
        toast(c.web ? 'Интернет-поиск включён 🌐' : 'Интернет-поиск выключен');
        render(cur);
        break;
      }
      case 'ai-consent-yes': {
        LS.set('tr_ai_consent', true);
        closeModal();
        const q = aiPendingQ; aiPendingQ = null;
        if (q) doSend(q);
        break;
      }
      case 'ai-consent-no': closeModal(); aiPendingQ = null; break;
      case 'backup-export': try { Backup.exportData(); } catch (e) { toast('Ошибка экспорта'); } break;
      case 'backup-import-click': { const f = $('backupFile'); if (f) f.click(); break; }
      case 'theme-set': {
        const v = el.dataset.v;
        if (window.Theme && (v === 'dark' || v === 'light' || v === 'system')) {
          Theme.set(v);
          toast('Тема: ' + (v === 'dark' ? 'тёмная 🌙' : v === 'light' ? 'светлая ☀️' : 'как в системе 💻'));
          renderProfile();
        }
        break;
      }
      case 'modal-close': closeModal(); break;
      case 'log-add': {
        const exId = el.dataset.ex, reps = el.dataset.reps, dayIdx = +el.dataset.day;
        const timed = isTimedReps(reps);
        const wEl = $('logw-' + exId), rEl = $('logr-' + exId);
        const wRaw = parseFloat(((wEl && wEl.value) || '0').replace(',', '.')) || 0;
        const w = timed ? 0 : Math.round(Math.max(0, Math.min(500, wRaw)) * 10) / 10;
        const r = Math.round(parseFloat(((rEl && rEl.value) || '0').replace(',', '.')) || 0);
        if (r < 1) { toast('Укажи повторы — например, 10'); break; }
        Jrn.addSet(Nut.todayKey(), dayIdx, exId, w, r);
        updateLogSet(exId, reps, dayIdx);
        Jrn.startRest(parseInt(el.dataset.rest, 10));
        break;
      }
      case 'log-del': {
        const exId = el.dataset.ex, dayIdx = +(el.dataset.key.split('#')[1] || 0);
        const reps = el.closest('.sets') ? el.closest('.sets').dataset.reps : '';
        const info = Jrn.delSet(el.dataset.key, exId, +el.dataset.i);
        updateLogSet(exId, reps, dayIdx);
        if (info) undoToast('Подход удалён', () => {
          Jrn.undoDelSet(info.key, info.exId, info.index, info.set);
          updateLogSet(info.exId, reps, dayIdx);
        });
        break;
      }
      case 'finish-open': finishOpen = true; renderWorkouts(); break;
      case 'finish-rate': {
        const s = Jrn.finish(Nut.todayKey(), el.dataset.r);
        finishOpen = false;
        Jrn.restStop(); Jrn.wake(false);
        if (s) {
          const allD = LS.get('fit.done', {}); const arr = allD[Nut.todayKey()] || [];
          if (!arr.includes(s.day)) { arr.push(s.day); allD[Nut.todayKey()] = arr; LS.set('fit.done', allD); }
          toast('Сессия сохранена 💪 ' + (Jrn.RATE_RU[el.dataset.r] || ''));
        }
        render(cur); break;
      }
      case 'rest-plus': Jrn.restShift(15); break;
      case 'rest-minus': Jrn.restShift(-15); break;
      case 'rest-skip': Jrn.restStop(); break;
      case 'mode-set': {
        const v = el.dataset.v, pp = Prof.get();
        if (!pp || !v || v === pp.goal) break;
        pp.goal = v; Prof.set(pp);
        finishOpen = false;
        if (Plan.get()) Plan.save(Plan.generate(pp));
        toast('Режим: ' + LBL.goals[v] + ' — нормы и план обновлены 🎯');
        render(cur); break;
      }
      default:
        if (act.startsWith('tab:')) go(act.slice(4));
    }
  });
  function regen() {
    const p = Prof.get();
    if (!p) { renderProfile(); return; }
    Plan.save(Plan.generate(p));
    finishOpen = false;
    toast(cur === 'workouts' ? 'План пересобран ↻' : 'План собран 💪');
    if (cur !== 'workouts') go('workouts'); else render('workouts');
  }
  function openArticle(id) {
    const a = Kb.byId(id); if (!a) return;
    openModal('<div class="row"><h3>' + esc(a.title) + '</h3><button class="iconbtn" data-act="modal-close">✕</button></div>' +
      '<p class="mut small">' + a.cat + '</p><p style="white-space:pre-line" class="mt">' + esc(a.body) + '</p>');
  }
  document.addEventListener('submit', (e) => {
    if (e.target.id === 'chatForm') {
      e.preventDefault();
      const inp = $('chatInput'); sendChat(inp.value); inp.value = '';
    }
  });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'backupFile') {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try {
        Backup.inspect(file).then(insp => {
          if (!insp.ok) { toast(insp.msg); return; }
          const when = insp.exportedAt ? String(insp.exportedAt).slice(0, 10) : 'дата неизвестна';
          if (confirm('Копия от ' + when + ', ключей: ' + insp.count + '.\nТекущие данные будут сохранены в резерв (tr_backup) и перезаписаны.\nВосстановить?')) {
            Backup.confirmImport(insp);
            toast('Данные восстановлены ↻');
            setTimeout(() => location.reload(), 600);
          }
        });
      } catch (err) { toast('Ошибка импорта'); }
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    try {
      if (!$('modal').classList.contains('hidden')) { closeModal(); return; }
      if (!$('profileOverlay').classList.contains('hidden')) closeProfile();
    } catch (err) {}
  });
  /* видео грузится только при раскрытии карточки упражнения */
  document.addEventListener('toggle', (e) => {
    try { if (e.target.tagName === 'DETAILS' && e.target.open) hydrateVideos(e.target); } catch (err) {}
  }, true);
  document.addEventListener('input', (e) => {
    if (e.target.id === 'foodSearch') {
      const v = e.target.value; FS.q = v;
      if (v.trim().length < 2) { FS.results = []; FS.loading = false; renderFoodList(); return; }
      FS.results = []; FS.loading = v.trim().length >= 3 && navigator.onLine;
      renderFoodList();
      const q = v;
      clearTimeout(e.target._to);
      e.target._to = setTimeout(() => {
        Nut.searchFoods(q).then(list => {
          if (FS.q !== q) return;
          FS.results = list; FS.loading = false; renderFoodList();
        });
      }, 340);
    }
    if (e.target.id === 'foodGrams') foodUpdatePrev();
    if (e.target.id === 'kbSearch') {
      kbState.q = e.target.value;
      const arts = Kb.search(kbState.q).filter(a => kbState.cat === 'Все' || a.cat === kbState.cat);
      const box = $('kbArt'); if (box) box.innerHTML = artList(arts);
    }
  });

  /* ---------- init ---------- */
  function init() {
    if (window.Migrate) Migrate.run();
    try { if (window.Theme) Theme.apply(); } catch (e) {}
    /* просим постоянное хранилище (iOS может чистить localStorage в неактивных PWA) */
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) {}
    go('today');
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
      try {
        navigator.serviceWorker.register('sw.js').then(reg => {
          reg.addEventListener('updatefound', () => {
            const nw = reg.installing;
            if (!nw) return;
            nw.addEventListener('statechange', () => {
              /* новая версия установилась в фоне — предлагаем обновиться */
              if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                undoToast('Доступно обновление', () => location.reload(), 8000);
              }
            });
          });
        }).catch(() => {});
      } catch (e) {}
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
