/* Service worker: офлайн-кэш приложения */
const CACHE = 'fit-cache-v8';
/* Фото упражнений: img/ex/<id>.jpg (free-exercise-db, public domain).
 * Список поддерживается вручную — добавь файл сюда, если добавляешь картинку. */
const EX_IMG = [
  'aus_pullup', 'band_abduct', 'band_facepull', 'bb_dl', 'bb_ohp', 'bb_rdl',
  'bb_row', 'bb_squat', 'bench_bb', 'bench_db', 'bench_db_incline', 'bicycle',
  'bridge', 'bulgarian', 'cable_row', 'calf', 'conc_curl', 'crunch',
  'curl_db', 'db_fly', 'db_front', 'db_lateral', 'db_press', 'db_rdl',
  'db_row', 'dead_bug', 'diamond', 'dip_chair', 'fly_machine', 'goblet',
  'hammer', 'hang_legs', 'hyperext', 'lat_pulldown', 'leg_raise', 'lunge',
  'plank', 'pullup', 'pushup', 'pushup_incline', 'side_plank',
  'single_bridge', 'skull', 'squat', 'step_up', 'superman'
];
/* Анимации-видео: img/ex/v/<id>.mp4 (gymvisual превью, личное использование) */
const EX_VID = [
  'band_row', 'bb_ohp', 'bb_row', 'bb_squat', 'cable_row', 'db_press',
  'fly_machine', 'goblet', 'hammer', 'hang_legs', 'lat_pulldown', 'pike'
];
/* Анимации-гифки: img/ex/g/<id>.gif (gymvisual превью, личное использование) */
const EX_GIF = [
  'aus_pullup', 'band_abduct', 'band_curl', 'band_facepull', 'band_press',
  'bb_dl', 'bb_rdl', 'bench_bb', 'bench_db', 'bicycle', 'bird_dog',
  'bulgarian', 'calf', 'conc_curl', 'crunch', 'curl_db', 'db_fly',
  'db_front', 'db_lateral', 'db_rdl', 'dead_bug', 'diamond', 'dip_chair',
  'hyperext', 'leg_raise', 'lunge', 'pike', 'plank', 'pullup', 'pushup',
  'pushup_incline', 'pushup_knee', 'side_plank', 'single_bridge', 'skull',
  'step_up', 'superman', 'wall_sit'
];
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/data-exercises.js',
  './js/data-foods.js',
  './js/knowledge.js',
  './js/profile.js',
  './js/planner.js',
  './js/nutrition.js',
  './js/coach.js',
  './js/app.js',
  './js/journal.js',
  './js/ai.js',
  './js/eximg.js',
  './icone/icon-180.png',
  './icone/icon-192.png',
  './icone/icon-512.png',
  './icone/icon-512-maskable.png'
].concat(
  EX_IMG.map(id => './img/ex/' + id + '.jpg'),
  EX_GIF.map(id => './img/ex/g/' + id + '.gif'),
  EX_VID.map(id => './img/ex/v/' + id + '.mp4')
);

self.addEventListener('install', (e) => {
  /* кэшируем по одному: один сбойный файл не должен рушить установку SW */
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(ASSETS.map(url =>
        c.add(url).catch(() => {})
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        if (res && res.ok && new URL(e.request.url).origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => {
        /* оффлайн: страницы — на index.html, медиа — прозрачный placeholder */
        const url = e.request.url;
        if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(url)) {
          return caches.match('./icone/icon-192.png').then((p) => p || new Response('', { status: 504 }));
        }
        if (/\.(mp4)$/i.test(url)) return new Response('', { status: 504 });
        return caches.match('./index.html');
      });
    })
  );
});
