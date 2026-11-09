/* Сканер штрих-кодов: камера (нативный BarcodeDetector — Android Chrome)
   + ручной ввод цифр (iPhone). Поиск продукта — Open Food Facts API.
   Нужен интернет. Найденное открывается в обычном окне «сколько съел». */
(function () {
  let stream = null, loop = null;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function supported() { return 'BarcodeDetector' in window; }

  function stop() {
    try { if (loop) clearInterval(loop); } catch (e) {}
    loop = null;
    try { if (stream) stream.getTracks().forEach(t => t.stop()); } catch (e) {}
    stream = null;
  }

  function msg(t) { const m = document.getElementById('scanMsg'); if (m) m.textContent = t || ''; }

  function open(meal) {
    const html =
      '<div class="row"><h3>📷 Штрих-код</h3><button class="iconbtn" data-act="modal-close" aria-label="Закрыть">✕</button></div>' +
      '<p class="mut small">Наведи камеру на штрих-код (или введи цифры под ним). Нужен интернет. Найдёшь продукт — выберешь, сколько съел.</p>' +
      '<div id="scanBox" style="position:relative;background:var(--card2);border-radius:12px;overflow:hidden;margin-top:8px;min-height:180px;display:flex;align-items:center;justify-content:center">' +
      (supported()
        ? '<video id="scanVid" autoplay playsinline muted style="width:100%;max-height:230px;object-fit:cover"></video>'
        : '<p class="mut small" style="padding:16px;text-align:center">Сканер камерой на этом устройстве недоступен — введи цифры штрих-кода вручную</p>') +
      '</div>' +
      '<div class="mrow mt" style="margin-top:12px">' +
      '<input type="text" inputmode="numeric" pattern="[0-9]*" id="scanCode" placeholder="Цифры штрих-кода, напр. 4600682600126">' +
      '<button class="btn sm" data-act="scan-find" style="min-width:92px">Найти</button></div>' +
      '<p class="mut small mt" id="scanMsg" style="margin-top:8px"></p>';
    window.AppUI.openModal(html);
    if (supported()) setTimeout(startCam, 120);
    const inp = document.getElementById('scanCode');
    if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); findByInput(); } });
  }

  async function startCam() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      const v = document.getElementById('scanVid');
      if (!v) { stop(); return; }
      v.srcObject = stream;
      const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
      loop = setInterval(async () => {
        try {
          const codes = await det.detect(v);
          if (codes && codes.length && codes[0].rawValue) {
            const inp = document.getElementById('scanCode');
            if (inp && !inp.value) inp.value = codes[0].rawValue;
            lookup(codes[0].rawValue);
          }
        } catch (e) { /* кадр не готов — тишина */ }
      }, 450);
    } catch (e) {
      msg('Нет доступа к камере — введи цифры вручную');
    }
  }

  function findByInput() {
    const inp = document.getElementById('scanCode');
    lookup(inp ? inp.value : '');
  }

  async function lookup(codeRaw) {
    const code = String(codeRaw || '').replace(/\D/g, '');
    if (!code || code.length < 6) { msg('Код слишком короткий — проверь цифры'); return; }
    msg('Ищу продукт ' + code + '…');
    try {
      const res = await fetch('https://world.openfoodfacts.org/api/v2/product/' + code + '.json?fields=product_name,brands,nutriments');
      const j = await res.json();
      if (!j || j.status !== 1 || !j.product) { msg('Продукт не найден в базе — попробуй поиск по названию'); return; }
      const p = j.product, nt = p.nutriments || {};
      const kcal = nt['energy-kcal_100g'];
      if (!kcal || kcal < 0 || kcal > 950) { msg('У продукта нет данных калорийности — ищи по названию'); return; }
      const entry = {
        type: 'off', id: 'off:' + code,
        n: (p.product_name || 'Продукт').slice(0, 70),
        k: Math.round(kcal),
        p: +(nt.proteins_100g || 0).toFixed(1),
        f: +(nt.fat_100g || 0).toFixed(1),
        c: +(nt.carbohydrates_100g || 0).toFixed(1),
        sub: ((p.brands || '').split(',')[0].trim() || 'Open Food Facts').slice(0, 30) + ' · Open Food Facts'
      };
      stop();
      window.AppUI.closeModal();
      window.AppUI.foodPickEntry(entry);
    } catch (e) {
      msg('Нет связи с базой продуктов — проверь интернет');
    }
  }

  window.Scan = { open: open, stop: stop, findByInput: findByInput, lookup: lookup, supported: supported };
})();
