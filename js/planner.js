/* Генератор планов тренировок */
(function () {
  const TIME = { // упражнения статические / на время
    plank: '30–45 сек', side_plank: '20–30 сек', wall_sit: '45–60 сек',
    dead_bug: '10 медленно на сторону', bird_dog: '8–10 на сторону',
    superman: '12–15', bridge: '15', calf: '15–20'
  };

  const PROG = [
    'Неделя 1 · Совершенствуй технику, вес лёгкий',
    'Неделя 2 · Добавь по 1–2 повтору в каждом подходе',
    'Неделя 3 · Добавь вес (+2,5% или один шаг)',
    'Неделя 4 · Разгрузка: минус 30% объёма'
  ];

  const TYPE_LABEL = {
    full: 'Всё тело',
    push: 'Жим · грудь, плечи, трицепс',
    pull: 'Тяга · спина, бицепс',
    legs: 'Ноги · ягодицы',
    upper: 'Верх тела',
    lower: 'Низ + пресс'
  };

  function splitFor(p) {
    const d = p.days, l = p.level;
    if (d <= 2) return ['full', 'full'];
    if (d === 3) return l === 1 ? ['full', 'full', 'full'] : ['push', 'pull', 'legs'];
    if (d === 4) return ['upper', 'lower', 'upper', 'lower'];
    if (d === 5) return ['push', 'pull', 'legs', 'upper', 'lower'];
    return ['push', 'pull', 'legs', 'push', 'pull', 'legs'];
  }

  function targets(type, lvl) {
    const m = {
      full:  lvl >= 2 ? [['chest',1],['back',1],['legs',1],['arms',1],['core',1]]
                      : [['chest',1],['back',1],['legs',1],['core',1]],
      push:  [['chest', lvl >= 2 ? 2 : 1], ['shoulders',1], ['arms',1]],
      pull:  [['back', lvl >= 2 ? 2 : 1], ['arms',1]],
      legs:  [['legs', lvl >= 2 ? 3 : 2], ['core',1]],
      upper: [['chest',1],['back',1],['shoulders',1],['arms',1]],
      lower: [['legs',2],['core',1]]
    };
    return m[type] || m.full;
  }

  function scheme(goal, lvl, t) {
    let s;
    if (goal === 'mass')      s = t === 'c' ? [4,'8–12','90'] : [3,'10–12','60'];
    else if (goal === 'support') s = t === 'c' ? [3,'10–15','60'] : [2,'12–15','45'];
    else                      s = t === 'c' ? [3,'12–15','60'] : [3,'12–20','45'];
    if (lvl === 1) { s[0] = Math.max(2, s[0] - 1); if (t === 'c') s[1] = '8–12'; }
    return s;
  }

  function generate(p) {
    const mode = p.place === 'gym' ? 'gym' : 'home';
    const pool = ExBase.list(mode, p.equip || ['none'], p.issues || [])
      .filter(e => e.lvl <= (p.level || 1));
    const by = {};
    pool.forEach(e => { (by[e.g] = by[e.g] || []).push(e); });

    const days = splitFor(p);
    const out = [];
    days.forEach((type, di) => {
      const used = new Set();
      let offset = di * 2;
      const ex = [];
      targets(type, p.level || 1).forEach(([g, n]) => {
        let cand = (by[g] || []).filter(e => !used.has(e.id));
        for (let j = 0; j < n; j++) {
          if (!cand.length) break;
          const e = cand[(offset + j) % cand.length];
          used.add(e.id);
          const sc = scheme(p.goal, p.level || 1, e.c ? 'c' : 'i');
          ex.push({
            id: e.id, name: e.n, g: g,
            sets: sc[0], reps: TIME[e.id] || sc[1], rest: sc[2], cue: e.cue
          });
        }
      });
      out.push({ i: di, label: 'День ' + (di + 1), focus: TYPE_LABEL[type], ex: ex });
    });

    return {
      createdAt: Date.now(), weeks: 4, prog: PROG,
      meta: { goal: p.goal, place: p.place, days: p.days, level: p.level },
      days: out
    };
  }

  window.Plan = {
    generate,
    get(){ return LS.get('fit.plan', null); },
    save(plan){ LS.set('fit.plan', plan); return plan; },
    clear(){ LS.del('fit.plan'); }
  };
})();
