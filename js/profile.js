/* Профиль пользователя + общие хелперы хранения, миграции, экспорт/импорт */
window.LS = {
  get(k, d) {
    try {
      const raw = localStorage.getItem(k);
      if (raw == null) return d;
      try { return JSON.parse(raw); } catch (pe) {
        /* повреждённый JSON: сохраняем оригинал, отдаём дефолт */
        try { localStorage.setItem(k + '.corrupt', raw); } catch (e2) {}
        return d;
      }
    } catch (e) { return d; }
  },
  set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); }
    catch (e) {
      /* переполнение (QuotaExceededError) — сообщаем, данные не записаны */
      try {
        const t = document.getElementById('toast');
        if (t) { t.textContent = 'Хранилище переполнено — сделай копию данных (Профиль → Экспорт)'; t.classList.remove('hidden'); clearTimeout(t._to); t._to = setTimeout(() => t.classList.add('hidden'), 3500); }
      } catch (e2) {}
    }
  },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};

window.Prof = {
  DEF: { sex:'m', age:25, height:175, weight:70, goal:'fatloss', level:1, days:3, place:'home', equip:['none'], issues:[] },
  get(){ return LS.get('fit.profile', null); },
  set(p){ LS.set('fit.profile', p); }
};

window.LBL = {
  goals: { fatloss:'Похудение', mass:'Набор массы', support:'Поддержка формы' },
  levels: { 1:'Новичок', 2:'Средний', 3:'Опытный' },
  places: { gym:'Зал', home:'Дома' },
  meals: { b:'Завтрак', l:'Обед', d:'Ужин', s:'Перекус' },
  equip: { dumbbells:'Гантели', bands:'Резиновые жгуты', pullup:'Турник' },
  issues: { back:'Спина', knee:'Колени', shoulder:'Плечи' }
};

/* ---------- Тема: тёмная / светлая / как в системе ----------
 * Ключ tr_theme: 'dark' | 'light' | 'system'. Тёмная — по умолчанию.
 * Шапка (.appbar) остаётся тёмной и в светлой теме — под белый текст
 * статус-бара iPhone (apple-mobile-web-app-status-bar-style=black-translucent). */
window.Theme = (function () {
  const K = 'tr_theme';
  const mq = (window.matchMedia) ? window.matchMedia('(prefers-color-scheme: light)') : null;
  function get() { try { return LS.get(K, 'dark'); } catch (e) { return 'dark'; } }
  function apply() {
    try {
      const m = get();
      let light = false;
      if (m === 'light') light = true;
      else if (m === 'system') light = !!(mq && mq.matches);
      if (light) document.documentElement.setAttribute('data-theme', 'light');
      else document.documentElement.removeAttribute('data-theme');
      const mc = document.querySelector('meta[name="theme-color"]');
      if (mc) mc.setAttribute('content', light ? '#f6f7f9' : '#0f1115');
    } catch (e) {}
  }
  function set(mode) { try { LS.set(K, mode); } catch (e) {} apply(); }
  if (mq && mq.addEventListener) {
    try { mq.addEventListener('change', () => { if (get() === 'system') apply(); }); } catch (e) {}
  }
  return { get: get, set: set, apply: apply };
})();

/* Схема хранилища: версия + миграции (старые данные сохраняются) */
window.SCHEMA_V = 2;
window.Migrate = {
  /* шаг с индексом v переводит данные с версии v на v+1 */
  steps: [
    function (d) { // v1 → v2: введён журнал тренировок, подчистка форм старых ключей
      if (!d.sessions || typeof d.sessions !== 'object' || Array.isArray(d.sessions)) d.sessions = {};
      if (d.done && typeof d.done === 'object' && !Array.isArray(d.done)) {
        Object.keys(d.done).forEach(k => { if (!Array.isArray(d.done[k])) d.done[k] = []; });
      }
      if (d.diary && typeof d.diary === 'object' && !Array.isArray(d.diary)) {
        Object.keys(d.diary).forEach(k => {
          const v = d.diary[k];
          if (!v || typeof v !== 'object' || Array.isArray(v)) d.diary[k] = { b:[], l:[], d:[], s:[], water: 0 };
        });
      }
      return d;
    }
  ],
  run() {
    try {
      const KEYS = ['profile', 'plan', 'done', 'diary', 'chat', 'sessions'];
      const meta = LS.get('fit.meta', null);
      if (!meta) { LS.set('fit.meta', { schemaVersion: SCHEMA_V, createdAt: Date.now() }); return; } // первый запуск
      const d = { meta: meta };
      KEYS.forEach(k => { d[k] = LS.get('fit.' + k, null); });
      let v = (meta && meta.schemaVersion) || 1;
      while (v < SCHEMA_V && typeof Migrate.steps[v - 1] === 'function') { Migrate.steps[v - 1](d); v++; }
      KEYS.forEach(k => { if (d[k] != null) LS.set('fit.' + k, d[k]); });
      LS.set('fit.meta', Object.assign({}, meta, { schemaVersion: v }));
    } catch (e) {}
  }
};

/* ---------- Резервная копия: экспорт / импорт ----------
 * Белый список ключей (по аудиту 1(и)); секреты (fit.ai с API-ключом) не экспортируются.
 * Формат файла: { app:'trenirovka', version:1, exportedAt: ISO, data: { ключ: строка-JSON } } */
window.Backup = (function () {
  const APP = 'trenirovka';
  const WHITELIST = ['fit.meta', 'fit.profile', 'fit.plan', 'fit.done', 'fit.diary', 'fit.sessions', 'fit.chat'];
  const MAX_IMPORT = 5 * 1024 * 1024;

  function toastMsg(msg, ms) {
    try {
      const t = document.getElementById('toast');
      if (t) { t.textContent = msg; t.classList.remove('hidden'); clearTimeout(t._to); t._to = setTimeout(() => t.classList.add('hidden'), ms || 2600); }
    } catch (e) {}
  }

  function snapshot() {
    const data = {};
    WHITELIST.forEach(k => {
      const v = LS.get(k, null);
      if (v != null) data[k] = JSON.stringify(v); /* значения — строки */
    });
    return data;
  }

  function exportData() {
    try {
      const payload = { app: APP, version: 1, exportedAt: new Date().toISOString(), data: snapshot() };
      const text = JSON.stringify(payload, null, 1);
      const stamp = new Date().toISOString().slice(0, 10);
      const fname = 'trenirovka-backup-' + stamp + '.json';
      let done = false;
      try {
        const blob = new Blob([text], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = fname;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        done = true;
      } catch (e) { done = false; }
      /* запасной вариант (iOS): системное меню «Поделиться файлом» */
      if (!done || !navigator.onLine === false && false) { /* не используется */ }
      if (!done) {
        try {
          const file = new File([text], fname, { type: 'application/json' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({ files: [file], title: 'Резервная копия' });
            done = true;
          }
        } catch (e2) {}
      }
      toastMsg(done ? 'Копия сохранена 📥' : 'Не удалось сохранить файл — попробуй ещё раз');
    } catch (e) { toastMsg('Ошибка экспорта'); }
  }

  /* возвращает {ok, msg} — без записи; подтверждение делает confirmImport */
  function inspect(file) {
    return new Promise((resolve) => {
      if (file.size > MAX_IMPORT) { resolve({ ok: false, msg: 'Файл больше 5 МБ — это не копия приложения' }); return; }
      const fr = new FileReader();
      fr.onerror = () => resolve({ ok: false, msg: 'Не удалось прочитать файл' });
      fr.onload = () => {
        try {
          const j = JSON.parse(String(fr.result));
          if (!j || typeof j !== 'object' || j.app !== APP) { resolve({ ok: false, msg: 'Это не файл копии приложения' }); return; }
          if (j.version !== 1) { resolve({ ok: false, msg: 'Неподдерживаемая версия копии (' + j.version + ')' }); return; }
          if (!j.data || typeof j.data !== 'object' || Array.isArray(j.data)) { resolve({ ok: false, msg: 'В файле нет данных' }); return; }
          const keys = Object.keys(j.data);
          const bad = keys.filter(k => WHITELIST.indexOf(k) < 0);
          if (bad.length) { resolve({ ok: false, msg: 'Лишние ключи в файле: ' + bad.slice(0, 3).join(', ') }); return; }
          const badVal = keys.filter(k => typeof j.data[k] !== 'string');
          if (badVal.length) { resolve({ ok: false, msg: 'Повреждённые значения у: ' + badVal.slice(0, 3).join(', ') }); return; }
          const parsed = {};
          for (let i = 0; i < keys.length; i++) {
            try { parsed[keys[i]] = JSON.parse(j.data[keys[i]]); }
            catch (pe) { resolve({ ok: false, msg: 'Повреждён ключ ' + keys[i] }); return; }
          }
          resolve({ ok: true, exportedAt: j.exportedAt || '', count: keys.length, data: parsed });
        } catch (e) { resolve({ ok: false, msg: 'Файл не является корректным JSON' }); }
      };
      fr.readAsText(file);
    });
  }

  function confirmImport(insp) {
    /* резервная копия текущих данных перед перезаписью */
    try { LS.set('tr_backup', snapshot()); } catch (e) {}
    Object.keys(insp.data).forEach(k => LS.set(k, insp.data[k]));
    try { if (window.Migrate) Migrate.run(); } catch (e) {}
  }

  return { exportData, inspect, confirmImport, WHITELIST };
})();
