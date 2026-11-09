/* Питание: нормы (BMR/TDEE/БЖУ), дневник калорий, поиск продуктов
   (онлайн Open Food Facts + локальная база), подсказка меню */
(function () {

  function round(n) { return Math.round(n); }
  function todayKey() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* ---------- Нормы ---------- */
  function targets(p) {
    const w = +p.weight, h = +p.height, a = +p.age;
    const bmr = 10 * w + 6.25 * h - 5 * a + (p.sex === 'f' ? -161 : 5);
    const act = ({ 1: 1.4, 2: 1.45, 3: 1.55, 4: 1.6, 5: 1.65, 6: 1.72 })[p.days] || 1.5;
    const tdee = bmr * act;
    let factor = 1, pk = 1.6, fk = 1.0;
    if (p.goal === 'fatloss') { factor = 0.82; pk = 2.0; fk = 0.9; }
    if (p.goal === 'mass')    { factor = 1.12; pk = 1.8; fk = 1.1; }
    const kcal = tdee * factor;
    const prot = pk * w, fat = fk * w;
    const carb = Math.max(50, (kcal - prot * 4 - fat * 9) / 4);
    return { bmr: round(bmr), tdee: round(tdee), kcal: round(kcal),
             p: round(prot), f: round(fat), c: round(carb), water: round(w * 30) };
  }

  /* ---------- Дневник ---------- */
  const DK = 'fit.diary';
  const EMPTY = () => ({ b: [], l: [], d: [], s: [], water: 0 });

  function day(day) { day = day || todayKey(); const all = LS.get(DK, {}); return all[day] || EMPTY(); }
  function saveDay(day, obj) { day = day || todayKey(); const all = LS.get(DK, {}); all[day] = obj; LS.set(DK, all); }

  function entryFromLocal(f, g) {
    const k = g / 100;
    return { id: 'local:' + f.id, n: f.n, g, k: round(f.k * k), p: +(f.p * k).toFixed(1), f: +(f.f * k).toFixed(1), c: +(f.c * k).toFixed(1) };
  }
  function entryFromOff(o, g) {
    const k = g / 100;
    return { id: o.id, n: o.n, g, k: round(o.k * k), p: +(o.p * k).toFixed(1), f: +(o.f * k).toFixed(1), c: +(o.c * k).toFixed(1) };
  }

  function add(dayK, meal, entry) { const d = day(dayK); if (!d[meal]) d[meal] = []; d[meal].push(entry); saveDay(dayK, d); }
  function del(dayK, meal, i) { const d = day(dayK); if (d[meal]) { d[meal].splice(i, 1); saveDay(dayK, d); } }

  function sums(dayK) {
    const d = day(dayK); const s = { k: 0, p: 0, f: 0, c: 0 };
    ['b', 'l', 'd', 's'].forEach(m => (d[m] || []).forEach(e => { s.k += e.k; s.p += +e.p; s.f += +e.f; s.c += +e.c; }));
    s.k = round(s.k); s.p = round(s.p); s.f = round(s.f); s.c = round(s.c);
    s.water = d.water || 0;
    return s;
  }

  function waterAdd(dayK, dGlass) { const d = day(dayK); d.water = Math.max(0, (d.water || 0) + dGlass); saveDay(dayK, d); }

  /* ---------- Поиск продуктов ---------- */
  async function searchFoods(q) {
    const local = Foods.searchLocal(q, 6).map(f => ({ type: 'local', id: 'local:' + f.id, n: f.n, k: f.k, p: f.p, f: f.f, c: f.c, sub: CATN[f.cat] || '' }));
    let online = [];
    if (navigator.onLine && q.trim().length >= 3) {
      try {
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 7000);
        const url = 'https://world.openfoodfacts.org/cgi/search.pl?search_terms=' + encodeURIComponent(q.trim()) +
          '&search_simple=1&action=process&json=1&page_size=20&fields=product_name,brands,nutriments,code';
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(to);
        const j = await res.json();
        (j.products || []).forEach(pr => {
          const nt = pr.nutriments || {};
          const kcal = nt['energy-kcal_100g'];
          if (!kcal || kcal < 0 || kcal > 950) return;
          const br = (pr.brands || '').split(',')[0].trim();
          online.push({
            type: 'off', id: 'off:' + (pr.code || Math.random()),
            n: (pr.product_name || 'Продукт').slice(0, 70),
            k: Math.round(kcal),
            p: +(nt.proteins_100g || 0).toFixed(1),
            f: +(nt.fat_100g || 0).toFixed(1),
            c: +(nt.carbohydrates_100g || 0).toFixed(1),
            sub: br ? br.slice(0, 30) + ' · Open Food Facts' : 'Open Food Facts'
          });
        });
      } catch (e) { /* офлайн — используем локальную базу */ }
      // дедупликация по названию
      const seen = new Set(local.map(x => x.n.toLowerCase()));
      online = online.filter(x => { const k = x.n.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 14);
    }
    return local.concat(online);
  }

  /* ---------- Подсказка меню ---------- */
  function menu(p) {
    const t = targets(p);
    const share = { b: 0.25, l: 0.35, d: 0.28, s: 0.12 };
    const tpl = MEAL_TEMPLATES[p.goal] || MEAL_TEMPLATES.support;
    const out = {};
    ['b', 'l', 'd', 's'].forEach(m => {
      const tp = tpl[m]; let tplK = 0;
      tp.items.forEach(it => { const f = Foods.byId(it.f); if (f) tplK += f.k * it.g / 100; });
      const factor = Math.max(0.5, Math.min(2.5, (t.kcal * share[m]) / Math.max(1, tplK)));
      const items = tp.items.map(it => {
        const f = Foods.byId(it.f); if (!f) return null;
        const g = Math.max(5, Math.round(it.g * factor / 5) * 5);
        return { n: f.n, g, k: round(f.k * g / 100) };
      }).filter(Boolean);
      out[m] = { title: tp.title, items, kcal: items.reduce((s, x) => s + x.k, 0) };
    });
    return out;
  }

  window.Nut = { targets, add, del, day, sums, waterAdd, searchFoods, entryFromLocal, entryFromOff, menu, todayKey };
})();
