/* Фото-иллюстрации упражнений.
 * Источник: free-exercise-db (github.com/yuhonas/free-exercise-db),
 * public domain (Unlicense) — можно использовать без указания авторства.
 * Файлы лежат в img/ex/<id>.jpg; id совпадает с id упражнения.
 * Если картинки нет — вкладка упражнение покажет SVG-анимацию (anim.js). */
(function () {
  var HAVE = {
    aus_pullup: 1, band_abduct: 1, band_facepull: 1, bb_dl: 1, bb_ohp: 1,
    bb_rdl: 1, bb_row: 1, bb_squat: 1, bench_bb: 1, bench_db: 1,
    bench_db_incline: 1, bicycle: 1, bridge: 1, bulgarian: 1, cable_row: 1,
    calf: 1, conc_curl: 1, crunch: 1, curl_db: 1, db_fly: 1, db_front: 1,
    db_lateral: 1, db_press: 1, db_rdl: 1, db_row: 1, dead_bug: 1,
    diamond: 1, dip_chair: 1, fly_machine: 1, goblet: 1, hammer: 1,
    hang_legs: 1, hyperext: 1, lat_pulldown: 1, leg_raise: 1, lunge: 1,
    plank: 1, pullup: 1, pushup: 1, pushup_incline: 1, side_plank: 1,
    single_bridge: 1, skull: 1, squat: 1, step_up: 1, superman: 1
  };
  /* Анимации-видео (mp4, зациклены). Файлы в img/ex/v/<id>.mp4.
   * Пользовательский пак «Basic Grey style» — добавь id сюда + файл. */
  var VIDS = {
    band_row: 1, bb_ohp: 1, bb_row: 1, bb_squat: 1, cable_row: 1,
    db_press: 1, fly_machine: 1, goblet: 1, hammer: 1, hang_legs: 1,
    lat_pulldown: 1, pike: 1
  };
  /* Анимации-GIF (gymvisual, превью с открытых страниц каталога — для личного использования).
   * Файлы в img/ex/g/<id>.gif. */
  var GIFS = {
    aus_pullup: 1, band_abduct: 1, band_curl: 1, band_facepull: 1,
    band_press: 1, bb_dl: 1, bb_rdl: 1, bench_bb: 1, bench_db: 1,
    bicycle: 1, bird_dog: 1, bulgarian: 1, calf: 1, conc_curl: 1,
    crunch: 1, curl_db: 1, db_fly: 1, db_front: 1, db_lateral: 1,
    db_rdl: 1, dead_bug: 1, diamond: 1, dip_chair: 1, hyperext: 1,
    leg_raise: 1, lunge: 1, pike: 1, plank: 1, pullup: 1, pushup: 1,
    pushup_incline: 1, pushup_knee: 1, side_plank: 1, single_bridge: 1,
    skull: 1, step_up: 1, superman: 1, wall_sit: 1
  };
  try {
    window.EXIMG = {
      url: function (id) { return HAVE[id] ? 'img/ex/' + id + '.jpg' : null; },
      vid: function (id) { return VIDS[id] ? 'img/ex/v/' + id + '.mp4' : null; },
      gif: function (id) { return GIFS[id] ? 'img/ex/g/' + id + '.gif' : null; }
    };
  } catch (e) { /* ничего: останется SVG */ }
})();
