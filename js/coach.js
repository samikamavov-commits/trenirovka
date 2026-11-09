/* Мини-ИИ «Тренер»: rule-based ответы на вопросы
   + поиск по базе знаний + ответы на основе данных пользователя. Работает офлайн. */
(function () {
  const HK = 'fit.chat';

  function norm(s) { return (s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim(); }

  function fmtNumbers(t, s) {
    return 'Твои нормы на день:\n• Калории: ' + t.kcal + ' ккал\n• Белки: ' + t.p + ' г\n• Жиры: ' + t.f + ' г\n• Углеводы: ' + t.c + ' г\n• Вода: ~' + (t.water / 1000).toFixed(1).replace('.', ',') + ' л\n\n' +
      'Это из твоего анкетирования: цель — ' + LBL.goals[s.goal] + ', уровень — ' + LBL.levels[s.level] + '.';
  }

  function fmtMacros(t) {
    return 'Твои БЖУ на день:\n• Белок — ' + t.p + ' г (строитель мышц)\n• Жиры — ' + t.f + ' г\n• Углеводы — ' + t.c + ' г\n\nБелок — главный строительный материал, по 25–40 г за приём пищи. Вноси еду на вкладке «Питание» и следи за балансом.';
  }

  function fmtToday() {
    const plan = Plan.get();
    if (!plan) return 'План ещё не собран. Открой вкладку «Тренировки» и нажми «Собрать план».';
    const done = LS.get('fit.done', {})[Nut.todayKey()] || [];
    const idx = done.length % plan.days.length;
    const d = plan.days[idx];
    return 'Сегодня по плану: ' + d.label + ' — ' + d.focus + ' (' + d.ex.length + ' упражнений).\n' +
      d.ex.map(e => e.name + ': ' + e.sets + '×' + e.reps).join('\n') +
      '\n\nПолное описание — во вкладке «Тренировки».';
  }

  function fmtPlanAll() {
    const plan = Plan.get();
    if (!plan) return 'План ещё не собран.';
    return 'Твой план на неделю (' + plan.days.length + ' тренировок):\n' +
      plan.days.map(d => d.label + ' — ' + d.focus).join('\n') +
      '\n\nПрогрессия на 4 недели:\n' + plan.prog.join('\n');
  }

  function noProfile() {
    return 'Сначала заполни анкету (кнопка ⚙️ вверху) — тогда я смогу считать нормы под тебя: калории, БЖУ, план тренировок.';
  }

  function kbArticle(id) {
    const a = Kb.byId(id);
    return a ? '📖 ' + a.title + '\n\n' + a.body : '';
  }

  function kbSearch(q) {
    const words = q.split(' ').filter(w => w.length >= 4);
    let best = null, bestScore = 0;
    Kb.list.forEach(a => {
      let sc = 0;
      const hay = (a.title + ' ' + (a.tags || []).join(' ') + ' ' + a.body).toLowerCase();
      words.forEach(w => { if (hay.includes(w)) sc++; });
      if (sc > bestScore) { bestScore = sc; best = a; }
    });
    return bestScore >= 2 ? best : null;
  }

  function answer(textRaw) {
    const q = norm(textRaw);
    if (!q) return 'Напиши вопрос: о калориях, технике, питании или болевых ощущениях.';
    const has = (...ws) => ws.some(w => q.includes(w));
    const prof = Prof.get();

    // динамические ответы по данным
    if (has('калор', 'ккал', 'сколько мне есть', 'норма еды', 'сколько должен есть', 'сколько надо есть', 'питания норм')) {
      return prof ? fmtNumbers(Nut.targets(prof), prof) : noProfile();
    }
    if (has('бжу', 'белок', 'протеин', 'макро', 'макросы')) {
      if (has('сколько')) return prof ? (has('белок', 'протеин') ? fmtMacros(Nut.targets(prof)) : fmtNumbers(Nut.targets(prof), prof)) : noProfile();
      if (q.includes('белок') || q.includes('протеин')) return kbArticle('nutrition_protein') || fmtMacros(Nut.targets({ weight: 70 }));
      return kbArticle('nutrition_macro');
    }
    if (has('план') && has('сегодня', 'сейчас')) return prof ? fmtToday() : noProfile();
    if (has('мой план', 'план на неделю', 'показать план')) return prof ? fmtPlanAll() : noProfile();
    if (has('взвешивать', 'взвешивайся', 'когда взвеш')) {
      return 'Взвешивайся утром, после туалета, до еды, 3–4 раза в неделю и смотри среднее за неделю — дневные колебания (±1–2 кг) это вода, а не жир. Рост силы и объём талии скажут больше, чем каждодневное число.';
    }

    // боли
    if (has('болит', 'боле', 'боль', 'тянет', 'прищемил')) {
      let id = null;
      if (has('спин', 'поясн', 'спина')) id = 'health_back';
      else if (has('колен')) id = 'health_knee';
      else if (has('плеч', 'дельта')) id = 'health_shoulder';
      if (id) return kbArticle(id);
      return 'Где болит — спина, колени или плечо? Спроси конкретно, например: «болит колено после приседаний».';
    }

    // типовые темы
    if (has('плато', 'вес встал', 'вес не растёт', 'не худею', 'стагн', 'не прогрессир')) return kbArticle('basics_plateau');
    if (has('сон', 'спать', 'бессонн', 'недосып')) return kbArticle('health_sleep');
    if (has('вод', 'пить', 'жажд', 'гидрат', 'сколько литр')) {
      const t = prof ? Nut.targets(prof) : null;
      return (t ? 'Твоя норма воды — ~' + t.water + ' мл в день. ' : '') + kbArticle('health_water');
    }
    if (has('растяж', 'мобил', 'стретч', 'гибк')) return kbArticle('health_stretch');
    if (has('креатин', 'спортпит', 'добавк', 'витамин')) return kbArticle('nutrition_creatine');
    if (has('до тренировк', 'перед тренировк', 'после тренировк', 'еда перед', 'есть перед')) return kbArticle('nutrition_prepost');
    if (has('дефицит', 'похуд', 'жир', 'сжига', 'похудет', 'стройн', 'худеть')) return kbArticle('basics_deficit');
    if (has('масса', 'массу', 'набра', 'поправ', 'массив', 'объем мыш'))
      { if (has('сколько') && has('белок', 'калор', 'ккал', 'есть')) return kbArticle('basics_surplus'); return kbArticle('basics_surplus'); }
    if (has('прогресс', 'тяжесть', 'повтор', 'сложнее', 'как расти')) return kbArticle('train_progress');
    if (has('отдых между', 'пауза между', 'сколько ждать', 'сколько отдых')) return kbArticle('train_rest');
    if (has('сколько раз', 'как часто', 'частота', 'расписан', 'график трениров')) return kbArticle('train_frequency');
    if (has('разминк', 'разогре')) return kbArticle('train_warmup');
    if (has('кардио', 'бегать', 'бег', 'ходьба', 'шаги', 'дорожка')) return kbArticle('train_cardio');
    if (has('присед') && has('техник', 'как правильно', 'глубина', 'колени')) return kbArticle('train_squat_tech');
    if (has('отжима') && has('техник', 'как правильно')) return kbArticle('train_pushup_tech');
    if (has('подтяг', 'турник')) return kbArticle('train_pullup_prog');
    if (has('дома', 'домашн', 'без зала', 'без инвентаря', 'гантели', 'резинк', 'инвентарь')) return kbArticle('train_home');
    if (has('мотива', 'бросить', 'лень', 'не хочется', 'привык', 'дисциплин')) return kbArticle('basics_habit');
    if (has('привет', 'здравств', 'добрый', 'день?', 'вечер', 'ghb', 'hi', 'hello', 'ку ')) {
      return 'Привет! Я твой офлайн-тренер 🤖 Могу ответить на вопросы о тренировках, питании, технике и восстановлении. Попробуй спросить: «Сколько мне калорий?», «Как прогрессировать?», «Болит спина после тяги».';
    }
    if (has('спасибо', 'благодар', 'thx')) return 'Всегда пожалуйста! 💪 Держи ритм — и результат придёт.';

    // поиск по базе знаний
    const art = kbSearch(q);
    if (art) return '📖 ' + art.title + '\n\n' + art.body;

    // ничего не нашли
    return 'Хм, вопрос не из моей базы — я работаю офлайн по правилам тренера и встроенной базе знаний 📚\n\nМогу помочь с:\n• калории, БЖУ, вода\n• прогрессия, отдых, частота\n• техника приседаний/отжиманий/подтягиваний\n• боли (спина, колени, плечи)\n• сон, разминка, кардио, растяжка\n\nИли загляни в раздел «Знания».';
  }

  function dailyTip() {
    const prof = Prof.get();
    if (!prof) return 'Начни с анкеты — кнопка ⚙️ наверху. Три минуты, и я соберу тебе план тренировок и нормы питания.';
    const plan = Plan.get();
    const t = Nut.targets(prof);
    const s = Nut.sums(Nut.todayKey());
    const done = LS.get('fit.done', {})[Nut.todayKey()] || [];
    const parts = [];

    if (!plan) parts.push('План тренировок ещё не собран — зайди во вкладку «Тренировки».');
    else if (done.length) parts.push('Тренировка сегодня уже закрыта ✅ Красавчик, день отработан.');
    else { const d = plan.days[done.length % plan.days.length]; parts.push('Сегодня по плану: ' + d.label + ' — ' + d.focus + '.'); }

    if (!s.k) parts.push('Дневник питания пока пуст: внеси завтрак на вкладке «Питание».');
    else if (s.k > t.kcal + 250) parts.push('Сегодня перебор калорий (' + s.k + ' из ' + t.kcal + ' ккал). Если время позволяет — добавь 20–30 мин ходьбы.');
    else if (s.k < t.kcal - 400) parts.push('Съедено ' + s.k + ' из ' + t.kcal + ' ккал. Последняя крупная порция — вечерний приём с белком.');

    const w = (s.water || 0) * 250;
    if (w < t.water * 0.5) parts.push('Воды маловато (' + w + ' мл из ~' + t.water + ') — бутылка рядом.');

    if (!parts.length) parts.push('Всё идёт по плану — так держать! 💪');
    return parts.join(' ');
  }

  window.Coach = {
    hist: () => LS.get(HK, []),
    push(role, text) { const h = LS.get(HK, []); h.push({ r: role, t: text, ts: Date.now() }); if (h.length > 60) h.splice(0, h.length - 60); LS.set(HK, h); },
    clear(){ LS.del(HK); },
    answer,
    dailyTip
  };
})();
