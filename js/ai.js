/* ИИ-тренер поверх внешнего LLM (OpenAI-совместимый API).
 * По умолчанию — OpenRouter: есть бесплатные модели, ключ хранится
 * только в localStorage твоего устройства. Своего сервера у приложения нет —
 * запросы идут прямо из браузера. Без ключа/интернета «Тренер» продолжает
 * работать по правилам и встроенной базе (coach.js). */
(function () {
  const HK = 'fit.ai';

  function cfg() { try { return LS.get(HK, null); } catch (e) { return null; } }
  function save(c) { try { LS.set(HK, c); } catch (e) { /* квота — ладно */ } }
  function on() { const c = cfg(); return !!(c && c.key && c.model); }
  function base() { const c = cfg(); return (c && c.base) || 'https://openrouter.ai/api/v1'; }

  /* Системный промпт: профиль, план, последние сессии, сегодняшние суммы */
  function systemPrompt() {
    let me = 'Ты — дружелюбный личный фитнес-тренер. Отвечай на русском языке.';
    try {
      const p = Prof.get();
      if (p) {
        me += '\n\nПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ:';
        me += '\n• Пол: ' + (p.sex === 'f' ? 'женский' : 'мужской') +
          (p.age ? ', ' + p.age + ' лет' : '') + (p.w ? ', вес ' + p.w + ' кг' : '') + (p.h ? ', рост ' + p.h + ' см' : '');
        me += '\n• Цель: ' + LBL.goals[p.goal] + '; уровень: ' + LBL.levels[p.level] + '; ' + p.days + ' дн/нед; место: ' + LBL.places[p.place];
        if (p.equip && p.equip.length) me += '; инвентарь: ' + p.equip.join(', ');
        const t = Nut.targets(p);
        me += '\n• Дневные нормы: ' + t.kcal + ' ккал, Б/Ж/У = ' + t.p + '/' + t.f + '/' + t.c + ' г, вода ~' + t.water + ' мл';
        const plan = Plan.get();
        if (plan) {
          const done = LS.get('fit.done', {})[Nut.todayKey()] || [];
          const d = plan.days[done.length % plan.days.length];
          me += '\n• План: ' + plan.days.map(x => x.label + ' — ' + x.focus).join(', ');
          me += '\n• Сегодня: ' + d.label + ' (' + d.focus + ')' + (done.length ? ' — уже выполнено' : '');
        }
        const hist = Jrn.history().slice(0, 5);
        if (hist.length) me += '\n• Последние сессии: ' + hist.map(x => x.date + ' — ' + x.label + ', ' + x.nsets + ' подходов').join('; ');
      }
    } catch (e) { /* профиль недоступен — отвечаем базово */ }
    me += '\n\nПРАВИЛА:';
    me += ' отвечай кратко (до ~150 слов), простым языком, без воды.';
    me += ' Упражнения предлагай только из доступного пользователю инвентаря.';
    me += ' Про боль — советуй остановиться, снизить нагрузку и технику, без пугания.';
    me += ' Не придумывай числа из данных пользователя, если их нет в контексте.';
    const c = cfg();
    if (c && c.web) me += '\nГде уместно — используй актуальную информацию из интернета.';
    return me;
  }

  /* Запрос к API. Возвращает строку или null (что-то не так — показываем офлайн-ответ) */
  async function ask(userText, history) {
    const c = cfg();
    if (!on()) return null;
    const msgs = [{ role: 'system', content: systemPrompt() }]
      .concat((history || []).slice(-10).map(m => ({ role: m.r === 'u' ? 'user' : 'assistant', content: m.t })))
      .concat([{ role: 'user', content: userText }]);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    try {
      const res = await fetch(base() + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + c.key
        },
        body: JSON.stringify({ model: c.model, messages: msgs, max_tokens: 600, temperature: 0.7 }),
        signal: ctrl.signal
      });
      if (!res.ok) {
        const err = await res.text().catch(() => '');
        throw new Error('HTTP ' + res.status + (err ? ' ' + err.slice(0, 160) : ''));
      }
      const js = await res.json();
      const txt = js && js.choices && js.choices[0] && js.choices[0].message && js.choices[0].message.content;
      return txt && txt.trim() ? txt.trim() : null;
    } catch (e) {
      return null;
    } finally { clearTimeout(timer); }
  }

  window.AI = { cfg, save, on, ask, systemPrompt, HK };
})();
