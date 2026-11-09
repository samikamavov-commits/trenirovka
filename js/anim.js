/* Встроенные анимации упражнений (стиль «анатомический вектор»).
   Светлое тело, красная подсветка работающих мышц на теле,
   двухкадровая анимация «старт → финиш». Работает офлайн. */
(function () {

  /* ---- каркасы поз: h голову, sh плечо, hip бедро; arms [{el,hand,s}], legs [{k,foot,s}]; m — пятна мышц ---- */
  const P = {
    pushup: {
      a: { h:[42,30], sh:[52,42], hip:[104,64],
           arms:[{el:null, hand:[52,100]}],
           legs:[{foot:[126,100]}, {foot:[120,102], s:1}],
           m:[{x:60,y:50,rx:5.5,ry:4.5},{x:52,y:72,rx:4,ry:3.4,sec:1},{x:55,y:42,rx:4,ry:3.2,sec:1},{x:79,y:53,rx:4.5,ry:3,sec:1}] },
      b: { h:[42,50], sh:[52,58], hip:[106,70],
           arms:[{el:[46,80], hand:[52,100]}],
           legs:[{foot:[128,100]}, {foot:[122,102], s:1}],
           m:[{x:60,y:63,rx:5.5,ry:4.5},{x:49,y:68,rx:4,ry:3.4,sec:1},{x:55,y:58,rx:4,ry:3.2,sec:1},{x:80,y:64,rx:4.5,ry:3,sec:1}] }
    },
    squat: {
      a: { h:[80,18], sh:[80,28], hip:[80,56],
           arms:[{el:[66,38], hand:[50,44]}],
           legs:[{k:[73,78], foot:[73,100]}, {k:[87,78], foot:[87,100], s:1}],
           m:[{x:73,y:66,rx:4.4,ry:4},{x:87,y:66,rx:4.4,ry:4},{x:86,y:55,rx:5,ry:4},{x:80,y:42,rx:5,ry:3.4,sec:1}] },
      b: { h:[74,40], sh:[74,48], hip:[68,68],
           arms:[{el:null, hand:[42,46]}],
           legs:[{k:[57,80], foot:[57,100]}, {k:[81,79], foot:[84,100], s:1}],
           m:[{x:63,y:74,rx:5,ry:3.6},{x:78,y:74,rx:4.2,ry:3.6},{x:74,y:64,rx:5,ry:4},{x:73,y:58,rx:5,ry:3.4,sec:1}] }
    },
    plank: {
      a: { h:[42,30], sh:[52,42], hip:[102,66],
           arms:[{el:[48,98], hand:[44,100]}],
           legs:[{foot:[126,100]}],
           m:[{x:77,y:52,rx:5,ry:3.4},{x:56,y:42,rx:4,ry:3.2,sec:1},{x:102,y:64,rx:4.4,ry:3.4,sec:1}] },
      b: { h:[42,30], sh:[52,42], hip:[102,70],
           arms:[{el:[48,98], hand:[44,100]}],
           legs:[{foot:[126,100]}],
           m:[{x:77,y:56,rx:5,ry:3.4},{x:56,y:42,rx:4,ry:3.2,sec:1},{x:102,y:68,rx:4.4,ry:3.4,sec:1}] }
    },
    lunge: {
      a: { h:[80,18], sh:[80,28], hip:[80,58],
           arms:[{el:[70,42], hand:[74,56]}],
           legs:[{k:[84,79], foot:[86,100]}, {k:[97,78], foot:[116,99], s:1}],
           m:[{x:82,y:68,rx:4,ry:3.6},{x:92,y:67,rx:3.4,ry:3,sec:1},{x:86,y:56,rx:4.8,ry:3.8},{x:80,y:42,rx:4.5,ry:3.2,sec:1}] },
      b: { h:[75,33], sh:[76,42], hip:[76,64],
           arms:[{el:[62,40], hand:[50,38]}],
           legs:[{k:[80,82], foot:[82,100]}, {k:[86,86], foot:[104,100], s:1}],
           m:[{x:79,y:73,rx:4,ry:3.6},{x:84,y:75,rx:3.4,ry:3,sec:1},{x:82,y:62,rx:4.8,ry:3.8},{x:76,y:52,rx:4.5,ry:3.2,sec:1}] }
    },
    bridge: {
      a: { h:[40,92], sh:[50,96], hip:[86,72],
           arms:[{el:[70,99], hand:[89,99]}],
           legs:[{k:[97,89], foot:[99,100]}],
           m:[{x:87,y:71,rx:5,ry:4},{x:92,y:79,rx:3.4,ry:3,sec:1},{x:70,y:84,rx:4.5,ry:3,sec:1}] },
      b: { h:[40,92], sh:[50,96], hip:[86,92],
           arms:[{el:[70,99], hand:[89,99]}],
           legs:[{k:[94,86], foot:[96,100]}],
           m:[{x:85,y:90,rx:4.8,ry:3.6},{x:91,y:89,rx:3,ry:2.6,sec:1},{x:70,y:93,rx:4.5,ry:3,sec:1}] }
    },
    superman: {
      a: { h:[42,86], sh:[54,90], hip:[100,94],
           arms:[{el:null, hand:[28,82]}],
           legs:[{k:[114,90], foot:[126,86]}],
           m:[{x:76,y:91,rx:6,ry:3.6},{x:102,y:92,rx:4.4,ry:3.4},{x:57,y:88,rx:3.6,ry:2.8,sec:1}] },
      b: { h:[42,80], sh:[54,86], hip:[100,90],
           arms:[{el:null, hand:[30,76]}],
           legs:[{k:[112,84], foot:[124,78]}],
           m:[{x:76,y:87,rx:6,ry:3.6},{x:102,y:88,rx:4.4,ry:3.4},{x:57,y:84,rx:3.6,ry:2.8,sec:1}] }
    },
    birddog: {
      a: { h:[50,48], sh:[56,58], hip:[96,58],
           arms:[{el:[50,78], hand:[47,98]}, {el:[42,54], hand:[28,48]}],
           legs:[{k:[99,79], foot:[104,98]}, {k:[112,56], foot:[126,50]}],
           m:[{x:75,y:58,rx:5,ry:3.2},{x:97,y:56,rx:4,ry:3,sec:1}] },
      b: { h:[50,48], sh:[56,58], hip:[96,58],
           arms:[{el:[50,78], hand:[47,98]}],
           legs:[{k:[99,79], foot:[104,98]}],
           m:[{x:75,y:58,rx:5,ry:3.2},{x:97,y:56,rx:4,ry:3,sec:1}] }
    },
    crunch: {
      a: { h:[46,90], sh:[54,96], hip:[98,96],
           arms:[{el:null, hand:[104,87]}],
           legs:[{k:[106,86], foot:[108,100]}],
           m:[{x:74,y:95,rx:5,ry:3.4}] },
      b: { h:[58,70], sh:[64,78], hip:[98,96],
           arms:[{el:null, hand:[104,88]}],
           legs:[{k:[106,86], foot:[108,100]}],
           m:[{x:80,y:86,rx:5,ry:3.4}] }
    },
    legraise: {
      a: { h:[44,90], sh:[52,96], hip:[92,96],
           arms:[{el:null, hand:[132,98]}],
           legs:[{k:[91,78], foot:[89,58]}],
           m:[{x:70,y:95,rx:5,ry:3.4},{x:91,y:86,rx:3.4,ry:3,sec:1}] },
      b: { h:[44,90], sh:[52,96], hip:[92,96],
           arms:[{el:null, hand:[132,98]}],
           legs:[{foot:[124,92]}, {foot:[126,96], s:1}],
           m:[{x:70,y:95,rx:5,ry:3.4}] }
    },
    curl: {
      a: { h:[80,14], sh:[80,26], hip:[80,56],
           arms:[{el:[71,42], hand:[73,60]}, {el:[89,42], hand:[87,60], s:1}],
           legs:[{k:[74,78], foot:[73,100]}, {k:[86,78], foot:[87,100], s:1}],
           m:[{x:70,y:35,rx:4,ry:3.2},{x:90,y:35,rx:4,ry:3.2},{x:76,y:24,rx:3.4,ry:2.8,sec:1}] },
      b: { h:[80,14], sh:[80,26], hip:[80,56],
           arms:[{el:[71,42], hand:[85,32]}, {el:[89,42], hand:[95,32], s:1}],
           legs:[{k:[74,78], foot:[73,100]}, {k:[86,78], foot:[87,100], s:1}],
           m:[{x:70,y:35,rx:4.2,ry:3.4},{x:90,y:35,rx:4.2,ry:3.4},{x:76,y:24,rx:3.4,ry:2.8,sec:1}] }
    },
    ohp: {
      a: { h:[80,14], sh:[80,26], hip:[80,56],
           arms:[{el:[64,36], hand:[62,52]}, {el:[96,36], hand:[98,52], s:1}],
           legs:[{k:[74,78], foot:[73,100]}, {k:[86,78], foot:[87,100], s:1}],
           m:[{x:74,y:25,rx:4,ry:3},{x:86,y:25,rx:4,ry:3},{x:66,y:38,rx:3.4,ry:2.8},{x:94,y:38,rx:3.4,ry:2.8},{x:80,y:42,rx:4.4,ry:3,sec:1}] },
      b: { h:[80,14], sh:[80,26], hip:[80,56],
           arms:[{el:[86,16], hand:[90,5]}, {el:[74,16], hand:[70,5], s:1}],
           legs:[{k:[74,78], foot:[73,100]}, {k:[86,78], foot:[87,100], s:1}],
           m:[{x:74,y:24,rx:4,ry:3},{x:86,y:24,rx:4,ry:3},{x:87,y:15,rx:3.2,ry:2.8},{x:76,y:15,rx:3.2,ry:2.8},{x:80,y:42,rx:4.4,ry:3,sec:1}] }
    },
    row_bend: {
      a: { h:[47,30], sh:[56,42], hip:[102,60],
           arms:[{el:null, hand:[48,72]}],
           legs:[{k:[100,80], foot:[96,100]}],
           m:[{x:78,y:48,rx:6,ry:3.6,rot:-16},{x:64,y:50,rx:3.4,ry:2.8,sec:1},{x:82,y:57,rx:4,ry:3,sec:1}] },
      b: { h:[50,28], sh:[58,40], hip:[102,60],
           arms:[{el:[70,48], hand:[62,36]}],
           legs:[{k:[100,80], foot:[96,100]}],
           m:[{x:78,y:48,rx:6,ry:3.6,rot:-16},{x:68,y:45,rx:3.4,ry:2.8,sec:1},{x:82,y:56,rx:4,ry:3,sec:1}] }
    },
    pullup: {
      a: { h:[80,30], sh:[80,42], hip:[80,70],
           arms:[{el:null, hand:[58,16]}, {el:null, hand:[102,16], s:1}],
           legs:[{k:[72,82], foot:[74,96]}, {k:[88,82], foot:[90,96], s:1}],
           m:[{x:80,y:52,rx:5.6,ry:4.6},{x:74,y:36,rx:3.4,ry:2.8,sec:1},{x:86,y:36,rx:3.4,ry:2.8,sec:1},{x:80,y:60,rx:4,ry:2.6,sec:1}] },
      b: { h:[80,20], sh:[80,30], hip:[80,62],
           arms:[{el:[66,24], hand:[58,16]}, {el:[94,24], hand:[102,16], s:1}],
           legs:[{k:[71,74], foot:[73,90]}, {k:[89,74], foot:[91,90], s:1}],
           m:[{x:80,y:41,rx:5.8,ry:4.4},{x:64,y:27,rx:3.4,ry:2.8,sec:1},{x:96,y:27,rx:3.4,ry:2.8,sec:1},{x:80,y:52,rx:4,ry:2.6,sec:1}] }
    },
    lateral: {
      a: { h:[80,14], sh:[80,26], hip:[80,56],
           arms:[{el:null, hand:[69,50]}, {el:null, hand:[91,50], s:1}],
           legs:[{k:[74,78], foot:[73,100]}, {k:[86,78], foot:[87,100], s:1}],
           m:[{x:74,y:25,rx:4,ry:3},{x:86,y:25,rx:4,ry:3}] },
      b: { h:[80,14], sh:[80,26], hip:[80,56],
           arms:[{el:[64,28], hand:[52,30]}, {el:[96,28], hand:[108,30], s:1}],
           legs:[{k:[74,78], foot:[73,100]}, {k:[86,78], foot:[87,100], s:1}],
           m:[{x:74,y:25,rx:4.2,ry:3.2},{x:86,y:25,rx:4.2,ry:3.2}] }
    },
    rdl: {
      a: { h:[80,16], sh:[80,26], hip:[80,54],
           arms:[{el:null, hand:[68,50]}, {el:null, hand:[92,50], s:1}],
           legs:[{k:[74,77], foot:[74,100]}, {k:[86,77], foot:[86,100], s:1}],
           m:[{x:74,y:66,rx:3.6,ry:3.4},{x:86,y:66,rx:3.6,ry:3.4},{x:85,y:53,rx:4.6,ry:3.6},{x:80,y:36,rx:4,ry:3,sec:1}] },
      b: { h:[86,34], sh:[84,40], hip:[62,64],
           arms:[{el:null, hand:[72,66]}, {el:null, hand:[78,70], s:1}],
           legs:[{k:[66,82], foot:[66,100]}, {k:[74,82], foot:[74,100], s:1}],
           m:[{x:66,y:72,rx:3.6,ry:3.4},{x:74,y:72,rx:3.6,ry:3.4},{x:68,y:60,rx:4.6,ry:3.6},{x:76,y:50,rx:4,ry:3,sec:1}] }
    },
    wall_sit: {
      a: { h:[70,18], sh:[70,28], hip:[70,58],
           arms:[{el:[62,42], hand:[66,56]}],
           legs:[{k:[92,60], foot:[94,100]}, {k:[92,60], foot:[90,100], s:1}],
           m:[{x:81,y:59,rx:5,ry:3.6},{x:69,y:56,rx:4.2,ry:3.2,sec:1},{x:70,y:44,rx:4.5,ry:3,sec:1}] },
      b: { h:[70,22], sh:[70,32], hip:[70,62],
           arms:[{el:[62,46], hand:[66,60]}],
           legs:[{k:[92,64], foot:[94,100]}, {k:[92,64], foot:[90,100], s:1}],
           m:[{x:81,y:63,rx:5,ry:3.6},{x:69,y:60,rx:4.2,ry:3.2,sec:1},{x:70,y:48,rx:4.5,ry:3,sec:1}] }
    },
    dumbbell: {
      a: { h:[80,14], sh:[80,26], hip:[80,56],
           arms:[{el:null, hand:[64,50]}, {el:null, hand:[96,50], s:1}],
           legs:[{k:[74,78], foot:[73,100]}, {k:[86,78], foot:[87,100], s:1}],
           m:[] },
      b: { h:[80,14], sh:[80,26], hip:[80,56],
           arms:[{el:null, hand:[64,34]}, {el:null, hand:[96,34], s:1}],
           legs:[{k:[74,78], foot:[73,100]}, {k:[86,78], foot:[87,100], s:1}],
           m:[] }
    }
  };

  const MAP = {
    pushup:'pushup', pushup_knee:'pushup', pushup_incline:'pushup', bench_db:'pushup',
    bench_db_incline:'pushup', bench_bb:'pushup', fly_machine:'pushup', band_press:'pushup',
    pike:'pushup', dip_chair:'pushup', plank:'plank', side_plank:'plank',
    squat:'squat', goblet:'squat', bb_squat:'squat', wall_sit:'wall_sit',
    lunge:'lunge', step_up:'lunge', bulgarian:'lunge',
    bridge:'bridge', single_bridge:'bridge',
    superman:'superman', bird_dog:'birddog', dead_bug:'birddog',
    crunch:'crunch', bicycle:'crunch', leg_raise:'legraise', hang_legs:'legraise',
    curl_db:'curl', hammer:'curl', conc_curl:'curl', band_curl:'curl',
    db_press:'ohp', bb_ohp:'ohp',
    db_row:'row_bend', bb_row:'row_bend', band_row:'row_bend', cable_row:'row_bend',
    band_facepull:'row_bend',
    pullup:'pullup', aus_pullup:'pullup', lat_pulldown:'pullup',
    db_lateral:'lateral', db_front:'lateral',
    db_rdl:'rdl', bb_rdl:'rdl', bb_dl:'rdl'
  };

  /* Работающие мышцы: p — основные, s — вспомогательные */
  window.EX_MUSCLES = {
    pushup:{p:['chest','triceps'],s:['shoulders','core']},
    pushup_knee:{p:['chest','triceps'],s:['shoulders','core']},
    pushup_incline:{p:['chest','triceps'],s:['shoulders','core']},
    bench_db:{p:['chest','triceps'],s:['shoulders','core']},
    bench_db_incline:{p:['chest','triceps'],s:['shoulders']},
    bench_bb:{p:['chest','triceps'],s:['shoulders','core']},
    fly_machine:{p:['chest'],s:['shoulders']},
    band_press:{p:['chest','triceps'],s:['shoulders']},
    pike:{p:['shoulders','triceps'],s:['chest']},
    diamond:{p:['triceps','chest'],s:['shoulders']},
    dip_chair:{p:['triceps'],s:['chest','shoulders']},
    skull:{p:['triceps'],s:['shoulders']},
    plank:{p:['core'],s:['shoulders','glutes']},
    side_plank:{p:['core'],s:['shoulders']},
    squat:{p:['quads','glutes'],s:['core','calves']},
    goblet:{p:['quads','glutes'],s:['core']},
    bb_squat:{p:['quads','glutes'],s:['core','hamstrings']},
    wall_sit:{p:['quads'],s:['glutes','core']},
    lunge:{p:['quads','glutes'],s:['core','hamstrings']},
    step_up:{p:['quads','glutes'],s:['core']},
    bulgarian:{p:['quads','glutes'],s:['core','hamstrings']},
    bridge:{p:['glutes'],s:['hamstrings','core']},
    single_bridge:{p:['glutes'],s:['hamstrings','core']},
    superman:{p:['back'],s:['glutes','core']},
    bird_dog:{p:['core','back'],s:['glutes']},
    dead_bug:{p:['core'],s:['back']},
    crunch:{p:['core'],s:[]},
    bicycle:{p:['core'],s:['quads']},
    leg_raise:{p:['core'],s:['quads']},
    hang_legs:{p:['core'],s:['quads']},
    curl_db:{p:['biceps'],s:['shoulders']},
    hammer:{p:['biceps'],s:['shoulders']},
    conc_curl:{p:['biceps'],s:['shoulders']},
    band_curl:{p:['biceps'],s:['shoulders']},
    db_press:{p:['shoulders','triceps'],s:['core']},
    bb_ohp:{p:['shoulders','triceps'],s:['core']},
    db_lateral:{p:['shoulders'],s:['triceps']},
    db_front:{p:['shoulders'],s:['triceps']},
    band_facepull:{p:['shoulders','back'],s:['biceps']},
    db_row:{p:['back','biceps'],s:['shoulders']},
    bb_row:{p:['back','biceps'],s:['shoulders','core']},
    band_row:{p:['back','biceps'],s:['shoulders']},
    cable_row:{p:['back','biceps'],s:['shoulders']},
    lat_pulldown:{p:['back','biceps'],s:['shoulders']},
    pullup:{p:['back','biceps'],s:['core']},
    aus_pullup:{p:['back','biceps'],s:['core']},
    db_rdl:{p:['hamstrings','glutes'],s:['back','core']},
    bb_rdl:{p:['hamstrings','glutes'],s:['back','core']},
    bb_dl:{p:['hamstrings','glutes','back'],s:['core','quads']},
    hyperext:{p:['back','glutes'],s:['hamstrings']},
    band_abduct:{p:['glutes'],s:['core']},
    calf:{p:['calves'],s:[]}
  };

  const MusN = {
    chest:'Грудь', back:'Спина', shoulders:'Плечи', triceps:'Трицепс',
    biceps:'Бицепс', core:'Пресс/кор', quads:'Квадрицепсы',
    hamstrings:'Задняя поверхность бедра', glutes:'Ягодицы', calves:'Икры'
  };

  const BODY = '#eef1f5';       // тело
  const BODY_FAR = '#c7cdd8';   // дальние конечности (глубина)

  function limbStr(pts, color, w) {
    return '<polyline fill="none" stroke="' + color + '" stroke-width="' + w
      + '" stroke-linecap="round" stroke-linejoin="round" points="'
      + pts.map(p => p[0] + ',' + p[1]).join(' ') + '"/>';
  }
  function armStr(f, a, color) {
    return limbStr(a.el ? [f.sh, a.el, a.hand] : [f.sh, a.hand], color || BODY, 5.5);
  }
  function legStr(f, l, color) {
    return limbStr(l.k ? [f.hip, l.k, l.foot] : [f.hip, l.foot], color || BODY, 6);
  }
  function musclesStr(m) {
    return m.map(b => {
      const tr = b.rot ? ' transform="rotate(' + b.rot + ' ' + b.x + ' ' + b.y + ')"' : '';
      return '<ellipse class="' + (b.sec ? 'ms' : 'mp') + '" cx="' + b.x + '" cy="' + b.y
        + '" rx="' + b.rx + '" ry="' + b.ry + '"' + tr + '/>';
    }).join('');
  }
  function frameStr(f) {
    let far = '', near = '';
    (f.arms || []).forEach(a => { const s = armStr(f, a, a.s ? BODY_FAR : BODY); if (a.s) far += s; else near += s; });
    (f.legs || []).forEach(l => { const s = legStr(f, l, l.s ? BODY_FAR : BODY); if (l.s) far += s; else near += s; });
    const torso = '<line x1="' + f.sh[0] + '" y1="' + f.sh[1] + '" x2="' + f.hip[0] + '" y2="' + f.hip[1]
      + '" stroke="' + BODY + '" stroke-width="10" stroke-linecap="round"/>';
    const neck = '<line x1="' + f.sh[0] + '" y1="' + f.sh[1] + '" x2="' + f.h[0] + '" y2="' + f.h[1]
      + '" stroke="' + BODY + '" stroke-width="4" stroke-linecap="round"/>';
    return far + torso + neck + near + musclesStr(f.m || [])
      + '<circle cx="' + f.h[0] + '" cy="' + f.h[1] + '" r="8" fill="' + BODY + '"/>';
  }

  window.Anim = {
    forId(id) {
      if (!window.ExBase.byId(id)) return '';
      const pat = MAP[id] || 'dumbbell';
      const p = P[pat];
      if (!p) return '';
      return '<svg class="ex-anim" viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" aria-label="Анимация упражнения">'
        + '<ellipse cx="80" cy="111" rx="46" ry="3.5" fill="rgba(255,255,255,.05)"/>'
        + '<line x1="16" y1="103" x2="144" y2="103" stroke="rgba(255,255,255,.09)" stroke-width="3" stroke-linecap="round"/>'
        + (pat === 'pullup' ? '<line x1="38" y1="14" x2="122" y2="14" stroke="#8b92a1" stroke-width="4" stroke-linecap="round"/>' : '')
        + '<g class="fa">' + frameStr(p.a) + '</g>'
        + '<g class="fa d2">' + frameStr(p.b) + '</g>'
        + '</svg>';
    },
    legend(id) {
      const mu = window.EX_MUSCLES[id] || { p: [], s: [] };
      let out = '<div class="mleg">';
      if (mu.p.length) out += '<span class="dot dot-p"></span>Основные: ' + mu.p.map(k => MusN[k] || k).join(', ');
      if (mu.s.length) out += (mu.p.length ? '<br>' : '') + '<span class="dot dot-s"></span>Вспомогательные: ' + mu.s.map(k => MusN[k] || k).join(', ');
      return out + '</div>';
    }
  };
})();
