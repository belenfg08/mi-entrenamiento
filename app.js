/* Mi Entrenamiento: registro personal de gimnasio, tatami, comida y peso.
   Todo se guarda en localStorage de este navegador; nada sale del dispositivo. */
(function () {
  'use strict';

  var KEY = 'mi-entrenamiento-v1';
  var TAB_KEY = 'mi-entrenamiento-tab';
  var DAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  var MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var MEALS = ['Desayuno', 'Almuerzo', 'Once', 'Cena', 'Colación'];
  // Faixas de adulto de BJJ. La negra lleva la barra roja y hasta 6 grados.
  var BELTS = [
    { id: 'blanca', name: 'Blanca', pt: 'branca', color: '#f4f4f5', bar: '#18181b', max: 4 },
    { id: 'azul', name: 'Azul', pt: '', color: '#1d4ed8', bar: '#18181b', max: 4 },
    { id: 'morada', name: 'Morada', pt: 'roxa', color: '#7e22ce', bar: '#18181b', max: 4 },
    { id: 'marron', name: 'Marrón', pt: 'marrom', color: '#7c2d12', bar: '#18181b', max: 4 },
    { id: 'negra', name: 'Negra', pt: 'preta', color: '#18181b', bar: '#dc2626', max: 6 }
  ];
  // Tipos fijos del tatami; cualquier otro texto es un deporte escrito a mano (trekking, trotar…).
  var MAT_TYPES = ['BJJ con gi', 'NoGi', 'Lucha', 'Open mat'];
  var BJJ_TYPES = ['BJJ con gi', 'NoGi', 'Open mat'];
  function isSport(type) { return MAT_TYPES.indexOf(type) < 0; }
  var DEFAULT_EXERCISES = ['Sentadilla', 'Peso muerto', 'Press banca', 'Press militar', 'Dominadas',
    'Remo con barra', 'Fondos', 'Hip thrust', 'Zancadas', 'Flexiones', 'Kettlebell swing', 'Abdominales'];

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  // ---------- Datos ----------

  function emptyData() {
    return { version: 1, goals: { kcal: 2500, protein: 150 }, gym: [], mat: [], food: [], weight: [], graduations: [] };
  }

  function normalize(d) {
    var base = emptyData();
    if (!d || typeof d !== 'object') return base;
    ['gym', 'mat', 'food', 'weight', 'graduations'].forEach(function (k) { if (Array.isArray(d[k])) base[k] = d[k]; });
    base.mat.forEach(function (m) { if (m.type === 'BJJ sin gi') m.type = 'NoGi'; }); // nombre anterior
    if (d.goals) {
      if (num(d.goals.kcal) > 0) base.goals.kcal = num(d.goals.kcal);
      if (num(d.goals.protein) > 0) base.goals.protein = num(d.goals.protein);
    }
    return base;
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) { /* sin almacenamiento: se trabaja en memoria */ }
    return emptyData();
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (e) { toast('No se pudo guardar en este navegador. Descarga un respaldo.'); }
  }

  var data = load();

  // ---------- Utilidades ----------

  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : 0; }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return iso(new Date()); }
  function parseIso(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(s, n) { var d = parseIso(s); d.setDate(d.getDate() + n); return iso(d); }
  function fmtDate(s) { var d = parseIso(s); return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; }
  function fmtDateLong(s) { var d = parseIso(s); return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function weekStart(s) { var d = parseIso(s); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return iso(d); }
  function fmtNum(n, dec) { return Number(n).toLocaleString('es-CL', { maximumFractionDigits: dec == null ? 0 : dec }); }
  function plain(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function byDateDesc(a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (b.created || 0) - (a.created || 0); }
  function field(form, name) { return form.elements.namedItem(name); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function multiline(s) { return esc(s).replace(/\n/g, '<br>'); }
  function empty(msg) { return '<p class="empty">' + msg + '</p>'; }
  function removeById(list, id) { var i = list.findIndex(function (x) { return x.id === id; }); if (i >= 0) list.splice(i, 1); }

  var toastTimer;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  // ---------- Fotos ----------
  // Se guardan en IndexedDB (localStorage es muy chico para imágenes).
  // Cada entrada guarda solo los ids en entry.photos.

  var MAX_PHOTOS = 4;
  var photoUrls = {}; // id -> URL temporal para mostrarla
  var dbPromise = null;

  function photoDb() {
    if (!dbPromise) {
      dbPromise = new Promise(function (resolve, reject) {
        if (!window.indexedDB) { reject(new Error('Este navegador no permite guardar fotos.')); return; }
        var req = indexedDB.open('mi-entrenamiento-fotos', 2);
        req.onupgradeneeded = function () {
          if (!req.result.objectStoreNames.contains('photos')) req.result.createObjectStore('photos');
        };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
    }
    return dbPromise;
  }

  function photoTx(mode, fn) {
    return photoDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction('photos', mode);
        var req = fn(tx.objectStore('photos'));
        tx.oncomplete = function () { resolve(req ? req.result : undefined); };
        tx.onerror = tx.onabort = function () { reject(tx.error); };
      });
    });
  }

  function putPhoto(id, blob) { return photoTx('readwrite', function (s) { return s.put(blob, id); }); }
  function getPhoto(id) { return photoTx('readonly', function (s) { return s.get(id); }); }
  function clearPhotos() { return photoTx('readwrite', function (s) { return s.clear(); }); }
  function deletePhotos(ids) {
    if (!ids || !ids.length) return Promise.resolve();
    ids.forEach(function (id) { if (photoUrls[id]) { URL.revokeObjectURL(photoUrls[id]); delete photoUrls[id]; } });
    return photoTx('readwrite', function (s) { ids.forEach(function (id) { s.delete(id); }); }).catch(function () {});
  }

  // Achica la foto a 1280 px como máximo para no llenar el teléfono.
  function compressImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var k = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * k);
        c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { if (b) resolve(b); else reject(new Error('No se pudo convertir la foto.')); }, 'image/jpeg', 0.8);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Archivo de imagen no válido.')); };
      img.src = url;
    });
  }

  // Selector de fotos de un formulario: guarda las fotos elegidas hasta que se guarda la entrada.
  function photoPicker(root) {
    var items = [];
    var pending = Promise.resolve(); // fotos que todavía se están achicando
    var input = $('input[type=file]', root);
    var thumbs = $('.thumbs', root);
    var addBtn = $('label', root);

    function draw() {
      thumbs.innerHTML = items.map(function (it, i) {
        return '<span class="thumb"><img src="' + it.url + '" alt="Foto ' + (i + 1) + '">' +
          '<button type="button" class="thumb-x" data-i="' + i + '" aria-label="Quitar foto ' + (i + 1) + '">✕</button></span>';
      }).join('');
      addBtn.hidden = items.length >= MAX_PHOTOS;
    }

    function release() { items.forEach(function (it) { URL.revokeObjectURL(it.url); }); items = []; draw(); }

    input.addEventListener('change', function () {
      var files = Array.prototype.slice.call(input.files);
      input.value = '';
      if (files.length > MAX_PHOTOS - items.length) toast('Máximo ' + MAX_PHOTOS + ' fotos por entrenamiento.');
      files = files.slice(0, MAX_PHOTOS - items.length);
      var job = Promise.all(files.map(function (f) { return compressImage(f).catch(function () { return null; }); }))
        .then(function (blobs) {
          if (blobs.indexOf(null) >= 0) toast('Una de las fotos no se pudo leer.');
          blobs.forEach(function (b) { if (b && items.length < MAX_PHOTOS) items.push({ blob: b, url: URL.createObjectURL(b) }); });
          draw();
        });
      pending = pending.then(function () { return job; });
    });

    thumbs.addEventListener('click', function (e) {
      var x = e.target.closest('.thumb-x');
      if (!x) return;
      URL.revokeObjectURL(items.splice(+x.dataset.i, 1)[0].url);
      draw();
    });

    return {
      // Espera a que terminen de procesarse las fotos y las entrega (vaciando el selector).
      take: function () {
        return pending.then(function () { var blobs = items.map(function (it) { return it.blob; }); release(); return blobs; });
      },
      clear: release
    };
  }

  // Guarda las fotos y devuelve sus ids (lista vacía si no se pudo).
  function storePhotos(blobs) {
    if (!blobs.length) return Promise.resolve([]);
    var ids = blobs.map(function () { return 'p' + uid(); });
    return Promise.all(blobs.map(function (b, i) { return putPhoto(ids[i], b); }))
      .then(function () { return ids; })
      .catch(function () { toast('No se pudieron guardar las fotos en este dispositivo.'); return []; });
  }

  function photoStrip(ids) {
    if (!ids || !ids.length) return '';
    return '<div class="photo-strip">' + ids.map(function (id) {
      return '<button type="button" class="photo-thumb" data-view-photo="' + id + '" aria-label="Ver foto"><img data-photo="' + id + '" alt="Foto de entrenamiento"></button>';
    }).join('') + '</div>';
  }

  function photoUrl(id) {
    if (photoUrls[id]) return Promise.resolve(photoUrls[id]);
    return getPhoto(id).then(function (blob) {
      if (!blob) return null;
      photoUrls[id] = photoUrls[id] || URL.createObjectURL(blob);
      return photoUrls[id];
    });
  }

  function hydratePhotos(root) {
    $$('img[data-photo]', root).forEach(function (img) {
      photoUrl(img.dataset.photo).then(function (url) {
        if (url) img.src = url;
        else img.closest('.photo-thumb').remove();
      }).catch(function () {});
    });
  }

  var viewer = $('#photo-viewer');
  function closeViewer() { viewer.hidden = true; $('img', viewer).removeAttribute('src'); }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-view-photo]');
    if (!t) return;
    photoUrl(t.dataset.viewPhoto).then(function (url) {
      if (!url) return;
      $('img', viewer).src = url;
      viewer.hidden = false;
    });
  });
  viewer.addEventListener('click', closeViewer);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !viewer.hidden) closeViewer(); });

  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
      r.readAsDataURL(blob);
    });
  }

  function allPhotoIds(d) {
    return d.gym.concat(d.mat).reduce(function (a, x) { return a.concat(x.photos || []); }, []);
  }

  // ---------- Pestañas ----------

  function showTab(name) {
    if (!$('#tab-' + name)) name = 'resumen';
    $$('.tab').forEach(function (s) { s.hidden = s.id !== 'tab-' + name; });
    $$('.tabbar button').forEach(function (b) { b.setAttribute('aria-current', b.dataset.tab === name ? 'page' : 'false'); });
    try { localStorage.setItem(TAB_KEY, name); } catch (e) { /* opcional */ }
    window.scrollTo(0, 0);
  }

  $$('.tabbar button').forEach(function (b) {
    b.addEventListener('click', function () { showTab(b.dataset.tab); });
  });

  function renderAll() {
    renderBelt();
    renderSummary();
    renderGym();
    renderMat();
    renderFood();
    renderWeight();
  }

  // ---------- Gimnasio ----------

  var exTpl = $('#tpl-exercise');
  var setTpl = $('#tpl-set');
  var gymForm = $('#gym-form');
  var gymExercises = $('#gym-exercises');
  var gymPhotos = photoPicker($('#gym-photos'));

  function renumber(exEl) {
    $$('.sets .set-row', exEl).forEach(function (r, i) { $('.set-n', r).textContent = i + 1; });
  }

  function addSetRow(exEl, reps, kg) {
    var sets = $('.sets', exEl);
    var last = sets.lastElementChild;
    var row = setTpl.content.firstElementChild.cloneNode(true);
    $('.set-reps', row).value = reps != null ? reps : (last ? $('.set-reps', last).value : '');
    $('.set-kg', row).value = kg != null ? kg : (last ? $('.set-kg', last).value : '');
    sets.appendChild(row);
    renumber(exEl);
  }

  function addExercise(name, sets) {
    var ex = exTpl.content.firstElementChild.cloneNode(true);
    gymExercises.appendChild(ex);
    $('.ex-name', ex).value = name || '';
    if (sets && sets.length) sets.forEach(function (s) { addSetRow(ex, s.reps, s.kg); });
    else addSetRow(ex);
    return ex;
  }

  function resetGymForm() {
    gymForm.reset();
    field(gymForm, 'date').value = today();
    gymExercises.innerHTML = '';
    addExercise();
  }

  $('#add-exercise').addEventListener('click', function () { $('.ex-name', addExercise()).focus(); });

  gymExercises.addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    var ex = btn.closest('.exercise');
    if (btn.classList.contains('ex-remove')) {
      ex.remove();
      if (!gymExercises.children.length) addExercise();
    } else if (btn.classList.contains('ex-add-set')) {
      addSetRow(ex);
    } else if (btn.classList.contains('set-remove')) {
      if ($$('.sets .set-row', ex).length > 1) { btn.closest('.set-row').remove(); renumber(ex); }
    }
  });

  gymForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var exercises = $$('.exercise', gymForm).map(function (ex) {
      return {
        name: $('.ex-name', ex).value.trim(),
        sets: $$('.sets .set-row', ex).map(function (r) {
          return { reps: num($('.set-reps', r).value), kg: num($('.set-kg', r).value) };
        }).filter(function (s) { return s.reps > 0; })
      };
    }).filter(function (ex) { return ex.name && ex.sets.length; });

    if (!exercises.length) { toast('Agrega al menos un ejercicio con repeticiones.'); return; }
    var entry = {
      id: uid(), created: Date.now(),
      date: field(gymForm, 'date').value || today(),
      exercises: exercises,
      notes: field(gymForm, 'notes').value.trim()
    };
    var btn = gymForm.querySelector('[type=submit]');
    if (btn.disabled) return;
    btn.disabled = true;
    gymPhotos.take().then(storePhotos).then(function (ids) {
      btn.disabled = false;
      if (ids.length) entry.photos = ids;
      data.gym.push(entry);
      save();
      resetGymForm();
      renderAll();
      toast('Entrenamiento guardado 💪');
    });
  });

  function formatSets(sets) {
    var groups = [];
    sets.forEach(function (s) {
      var g = groups[groups.length - 1];
      if (g && g.reps === s.reps && g.kg === s.kg) g.n++;
      else groups.push({ n: 1, reps: s.reps, kg: s.kg });
    });
    return groups.map(function (g) {
      var t = (g.n > 1 ? g.n + '×' : '') + g.reps + (g.n > 1 ? '' : ' reps');
      return g.kg > 0 ? t + ' · ' + fmtNum(g.kg, 1) + ' kg' : t;
    }).join(', ');
  }

  function gymRecords() {
    var rec = {};
    data.gym.forEach(function (w) {
      w.exercises.forEach(function (ex) {
        var key = plain(ex.name);
        var r = rec[key] || (rec[key] = { name: ex.name, best: 0, bestReps: 0, maxReps: 0, e1rm: 0, last: '', count: 0 });
        r.count++;
        if (w.date >= r.last) { r.last = w.date; r.name = ex.name; }
        ex.sets.forEach(function (s) {
          if (s.kg > r.best || (s.kg === r.best && s.reps > r.bestReps)) { r.best = s.kg; r.bestReps = s.reps; }
          if (s.reps > r.maxReps) r.maxReps = s.reps;
          var e1 = s.kg * (1 + s.reps / 30); // fórmula de Epley
          if (e1 > r.e1rm) r.e1rm = e1;
        });
      });
    });
    return Object.keys(rec).map(function (k) { return rec[k]; })
      .sort(function (a, b) { return a.last < b.last ? 1 : a.last > b.last ? -1 : 0; });
  }

  function renderGym() {
    var names = {};
    DEFAULT_EXERCISES.forEach(function (n) { names[plain(n)] = n; });
    data.gym.forEach(function (w) { w.exercises.forEach(function (ex) { names[plain(ex.name)] = ex.name; }); });
    $('#exercise-names').innerHTML = Object.keys(names).sort().map(function (k) {
      return '<option value="' + esc(names[k]) + '">';
    }).join('');

    var recs = gymRecords();
    $('#gym-records').innerHTML = recs.length
      ? '<div class="card"><table><thead><tr><th>Ejercicio</th><th class="num">Mejor</th><th class="num">1RM est.</th><th class="num">Veces</th></tr></thead><tbody>' +
        recs.map(function (r) {
          var best = r.best > 0 ? fmtNum(r.best, 1) + ' kg × ' + r.bestReps : r.maxReps + ' reps';
          var e1 = r.best > 0 ? fmtNum(r.e1rm, 1) + ' kg' : '—';
          return '<tr><td>' + esc(r.name) + '</td><td class="num">' + best + '</td><td class="num">' + e1 + '</td><td class="num">' + r.count + '</td></tr>';
        }).join('') +
        '</tbody></table><p class="muted small">1RM est.: el peso máximo que podrías levantar 1 vez, calculado con la fórmula de Epley. Es una estimación.</p></div>'
      : empty('Tus récords aparecerán aquí cuando guardes un entrenamiento.');

    var list = data.gym.slice().sort(byDateDesc);
    $('#gym-history').innerHTML = list.length ? list.map(function (w) {
      return '<div class="card entry">' +
        '<div class="entry-head"><span class="entry-title">' + fmtDate(w.date) + '</span>' +
        '<span class="entry-actions"><button type="button" class="btn small" data-repeat="' + w.id + '">Repetir</button>' +
        '<button type="button" class="icon-btn" data-del-gym="' + w.id + '" aria-label="Borrar entrenamiento">🗑</button></span></div>' +
        w.exercises.map(function (ex) { return '<p class="ex-line"><b>' + esc(ex.name) + ':</b> ' + formatSets(ex.sets) + '</p>'; }).join('') +
        (w.notes ? '<p class="muted">' + multiline(w.notes) + '</p>' : '') +
        photoStrip(w.photos) +
        '</div>';
    }).join('') : empty('Aún no hay entrenamientos.');
    hydratePhotos($('#gym-history'));
  }

  $('#gym-history').addEventListener('click', function (e) {
    var rep = e.target.closest('[data-repeat]');
    var del = e.target.closest('[data-del-gym]');
    if (rep) {
      var w = data.gym.find(function (x) { return x.id === rep.dataset.repeat; });
      if (!w) return;
      resetGymForm();
      gymExercises.innerHTML = '';
      w.exercises.forEach(function (ex) { addExercise(ex.name, ex.sets); });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast('Rutina cargada: ajusta y guarda.');
    } else if (del && confirm('¿Borrar este entrenamiento?')) {
      var gw = data.gym.find(function (x) { return x.id === del.dataset.delGym; });
      if (gw) deletePhotos(gw.photos);
      removeById(data.gym, del.dataset.delGym);
      save();
      renderAll();
    }
  });

  // ---------- Faixas (graduaciones de BJJ) ----------

  var beltForm = $('#belt-form');
  var editingGradId = null; // graduación que se está corrigiendo, o null si es nueva

  function beltInfo(id) { return BELTS.find(function (b) { return b.id === id; }) || BELTS[0]; }
  function beltName(id) { var b = beltInfo(id); return b.name + (b.pt ? ' (' + b.pt + ')' : ''); }
  function stripesLabel(n) { return n === 0 ? 'sin grados' : n === 1 ? '1 grado' : n + ' grados'; }
  function beltLabel(g) { return 'Faixa ' + beltName(g.belt).toLowerCase() + ' · ' + stripesLabel(g.stripes); }

  function beltSvg(id, stripes) {
    var b = beltInfo(id);
    var edge = id === 'blanca' || id === 'negra' ? ' stroke="#71717a" stroke-width="1.5"' : '';
    var s = '';
    for (var i = 0; i < stripes; i++) s += '<rect x="' + (212 + i * 11) + '" y="9" width="6" height="30" fill="#ffffff"/>';
    return '<svg viewBox="0 0 300 48" role="img" aria-label="Faixa ' + b.name.toLowerCase() + ' con ' + stripesLabel(stripes) + '">' +
      '<rect x="1" y="8" width="298" height="32" rx="5" fill="' + b.color + '"' + edge + '/>' +
      '<line x1="6" x2="294" y1="16" y2="16" stroke="#000" stroke-opacity=".12"/>' +
      '<line x1="6" x2="294" y1="32" y2="32" stroke="#000" stroke-opacity=".12"/>' +
      '<rect x="202" y="8" width="84" height="32" fill="' + b.bar + '"/>' + s + '</svg>';
  }

  function currentGraduation() { return data.graduations.slice().sort(byDateDesc)[0]; }

  function fillStripes(selected) {
    var max = beltInfo(field(beltForm, 'belt').value).max;
    var sel = field(beltForm, 'stripes');
    var html = '';
    for (var i = 0; i <= max; i++) html += '<option value="' + i + '">' + stripesLabel(i) + '</option>';
    sel.innerHTML = html;
    sel.value = String(Math.min(selected || 0, max));
    $('#belt-preview').innerHTML = beltSvg(field(beltForm, 'belt').value, +sel.value);
  }

  // Propone la siguiente graduación: un grado más o la faixa siguiente.
  function resetBeltForm() {
    editingGradId = null;
    $('#belt-submit').textContent = 'Guardar graduación';
    $('#belt-cancel').hidden = true;
    var cur = currentGraduation();
    var belt = 'blanca', stripes = 0;
    if (cur) {
      var idx = BELTS.indexOf(beltInfo(cur.belt));
      if (cur.stripes < BELTS[idx].max) { belt = cur.belt; stripes = cur.stripes + 1; }
      else if (idx < BELTS.length - 1) { belt = BELTS[idx + 1].id; }
      else { belt = cur.belt; stripes = cur.stripes; }
    }
    field(beltForm, 'date').value = today();
    field(beltForm, 'belt').value = belt;
    fillStripes(stripes);
  }

  field(beltForm, 'belt').addEventListener('change', function () { fillStripes(+field(beltForm, 'stripes').value); });
  field(beltForm, 'stripes').addEventListener('change', function () { fillStripes(+field(beltForm, 'stripes').value); });

  function editGraduation(id) {
    var g = data.graduations.find(function (x) { return x.id === id; });
    if (!g) return;
    editingGradId = id;
    field(beltForm, 'date').value = g.date;
    field(beltForm, 'belt').value = g.belt;
    fillStripes(g.stripes);
    $('#belt-submit').textContent = 'Guardar cambios';
    $('#belt-cancel').hidden = false;
    $('#belt-details').open = true;
    $('#belt-details').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  $('#belt-cancel').addEventListener('click', function () { resetBeltForm(); $('#belt-details').open = false; });

  beltForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var values = {
      date: field(beltForm, 'date').value || today(),
      belt: field(beltForm, 'belt').value,
      stripes: num(field(beltForm, 'stripes').value)
    };
    var editing = editingGradId && data.graduations.find(function (x) { return x.id === editingGradId; });
    if (editing) Object.assign(editing, values);
    else data.graduations.push(Object.assign({ id: uid(), created: Date.now() }, values));
    save();
    $('#belt-details').open = false;
    renderAll();
    resetBeltForm();
    toast(editing ? 'Faixa actualizada 🥋' : '¡Felicitaciones por tu graduación! 🥋');
  });

  function bjjSince(date) {
    return data.mat.filter(function (m) { return m.date >= date && BJJ_TYPES.indexOf(m.type) >= 0; });
  }

  function renderBelt() {
    var cur = currentGraduation();
    if (cur) {
      var since = bjjSince(cur.date);
      var hours = since.reduce(function (a, m) { return a + (m.minutes || 0); }, 0) / 60;
      $('#belt-current').innerHTML = beltSvg(cur.belt, cur.stripes) +
        '<p class="belt-name">' + beltLabel(cur) + '</p>' +
        '<p class="muted small">Desde el ' + fmtDateLong(cur.date) + ' · ' + since.length + (since.length === 1 ? ' clase' : ' clases') +
        ' de BJJ y ' + fmtNum(hours, 1) + ' h desde entonces</p>' +
        '<button type="button" class="btn small" style="margin-top:8px" data-edit-grad="' + cur.id + '">✏️ Corregir faixa o grados</button>';
      $('#summary-belt').innerHTML = '<div class="card belt-mini">' + beltSvg(cur.belt, cur.stripes) +
        '<div><div class="belt-name">' + beltLabel(cur) + '</div><div class="muted small">' + since.length +
        (since.length === 1 ? ' clase' : ' clases') + ' de BJJ desde tu última graduación</div></div></div>';
    } else {
      $('#belt-current').innerHTML = beltSvg('blanca', 0) +
        '<p class="muted">Registra tu faixa actual con «Registrar graduación».</p>';
      $('#summary-belt').innerHTML = '';
    }

    var list = data.graduations.slice().sort(byDateDesc);
    $('#belt-history').innerHTML = list.length > 0 ? '<h3 class="muted small" style="margin:16px 0 4px">Historial de graduaciones</h3>' +
      list.map(function (g) {
        return '<div class="grad-item">' + beltSvg(g.belt, g.stripes) +
          '<div class="grow"><div>' + beltName(g.belt) + ' · ' + stripesLabel(g.stripes) + '</div><div class="muted small">' + fmtDateLong(g.date) + '</div></div>' +
          '<span class="entry-actions"><button type="button" class="icon-btn" data-edit-grad="' + g.id + '" aria-label="Editar graduación">✏️</button>' +
          '<button type="button" class="icon-btn" data-del-grad="' + g.id + '" aria-label="Borrar graduación">🗑</button></span></div>';
      }).join('') : '';
  }

  $('#belt-current').addEventListener('click', function (e) {
    var edit = e.target.closest('[data-edit-grad]');
    if (edit) editGraduation(edit.dataset.editGrad);
  });

  $('#belt-history').addEventListener('click', function (e) {
    var edit = e.target.closest('[data-edit-grad]');
    if (edit) { editGraduation(edit.dataset.editGrad); return; }
    var del = e.target.closest('[data-del-grad]');
    if (del && confirm('¿Borrar esta graduación?')) {
      removeById(data.graduations, del.dataset.delGrad);
      save();
      renderAll();
      resetBeltForm();
    }
  });

  // ---------- Tatami (jiu-jitsu y lucha) ----------

  var matForm = $('#mat-form');
  var matText = ['type', 'techniques', 'good', 'review', 'injuries'];
  var matPhotos = photoPicker($('#mat-photos'));

  var editingMatId = null; // clase que se está corrigiendo, o null si es nueva
  var keptPhotos = [];     // al editar: fotos ya guardadas, con marca de quitar

  // Muestra el campo "¿Qué deporte?" y oculta los combates cuando no es del tatami.
  function syncMatType() {
    var other = field(matForm, 'type').value === '__otro';
    $('#mat-other-field').hidden = !other;
    $('#mat-rolls-field').hidden = other;
    $('#mat-form button[type=submit]').textContent = editingMatId ? 'Guardar cambios' : other ? 'Guardar deporte' : 'Guardar clase';
  }

  function setMatType(type) {
    if (isSport(type)) {
      field(matForm, 'type').value = '__otro';
      field(matForm, 'other').value = type;
    } else {
      field(matForm, 'type').value = type;
      field(matForm, 'other').value = '';
    }
    syncMatType();
  }

  function formMatType() {
    if (field(matForm, 'type').value !== '__otro') return field(matForm, 'type').value;
    var t = field(matForm, 'other').value.trim();
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
  }

  function renderKeptPhotos() {
    $('#mat-existing-photos .thumbs').innerHTML = keptPhotos.map(function (p, i) {
      return '<span class="thumb' + (p.remove ? ' removed' : '') + '"><img data-photo="' + p.id + '" alt="Foto guardada ' + (i + 1) + '">' +
        '<button type="button" class="thumb-x" data-keep="' + i + '" aria-label="' + (p.remove ? 'Conservar' : 'Quitar') + ' foto ' + (i + 1) + '">' + (p.remove ? '↺' : '✕') + '</button></span>';
    }).join('');
    hydratePhotos($('#mat-existing-photos'));
  }

  $('#mat-existing-photos').addEventListener('click', function (e) {
    var b = e.target.closest('[data-keep]');
    if (!b) return;
    var p = keptPhotos[+b.dataset.keep];
    p.remove = !p.remove;
    renderKeptPhotos();
  });

  function resetMatForm() {
    var type = editingMatId ? 'BJJ con gi' : formMatType(); // recuerda el último tipo de una clase nueva
    editingMatId = null;
    keptPhotos = [];
    renderKeptPhotos();
    matPhotos.clear();
    matForm.reset();
    field(matForm, 'date').value = today();
    setMatType(type || 'BJJ con gi');
    $('#mat-form-title').textContent = 'Nueva clase o deporte';
    $('#mat-cancel').hidden = true;
    $('#mat-effort-out').textContent = field(matForm, 'effort').value;
  }

  function editMat(id) {
    var m = data.mat.find(function (x) { return x.id === id; });
    if (!m) return;
    showTab('mat');
    editingMatId = id;
    field(matForm, 'date').value = m.date;
    field(matForm, 'minutes').value = m.minutes || 0;
    field(matForm, 'rolls').value = m.rolls || 0;
    field(matForm, 'effort').value = m.effort || 6;
    $('#mat-effort-out').textContent = field(matForm, 'effort').value;
    ['techniques', 'good', 'review', 'injuries'].forEach(function (k) { field(matForm, k).value = m[k] || ''; });
    setMatType(m.type);
    keptPhotos = (m.photos || []).map(function (pid) { return { id: pid, remove: false }; });
    renderKeptPhotos();
    matPhotos.clear();
    $('#mat-form-title').textContent = 'Editar ' + m.type + ' · ' + fmtDate(m.date);
    $('#mat-cancel').hidden = false;
    $('#mat-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  field(matForm, 'type').addEventListener('change', function () {
    syncMatType();
    if (field(matForm, 'type').value === '__otro') field(matForm, 'other').focus();
  });
  field(matForm, 'effort').addEventListener('input', function (e) { $('#mat-effort-out').textContent = e.target.value; });
  $('#mat-cancel').addEventListener('click', function () { resetMatForm(); });

  matForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var type = formMatType();
    if (!type) { toast('Escribe qué deporte hiciste.'); field(matForm, 'other').focus(); return; }
    var values = {
      type: type,
      date: field(matForm, 'date').value || today(),
      minutes: num(field(matForm, 'minutes').value),
      rolls: isSport(type) ? 0 : num(field(matForm, 'rolls').value),
      effort: num(field(matForm, 'effort').value)
    };
    ['techniques', 'good', 'review', 'injuries'].forEach(function (k) { values[k] = field(matForm, k).value.trim(); });
    var editing = editingMatId && data.mat.find(function (x) { return x.id === editingMatId; });
    var kept = keptPhotos.filter(function (p) { return !p.remove; }).map(function (p) { return p.id; });
    var removed = keptPhotos.filter(function (p) { return p.remove; }).map(function (p) { return p.id; });
    var btn = matForm.querySelector('[type=submit]');
    if (btn.disabled) return;
    btn.disabled = true;
    matPhotos.take().then(function (blobs) {
      // Máximo 4 fotos en total entre las que quedan y las nuevas.
      var room = Math.max(0, MAX_PHOTOS - kept.length);
      if (blobs.length > room) toast('Máximo ' + MAX_PHOTOS + ' fotos: se guardaron las primeras.');
      return storePhotos(blobs.slice(0, room));
    }).then(function (ids) {
      btn.disabled = false;
      var photos = kept.concat(ids);
      if (editing) {
        Object.assign(editing, values);
        if (photos.length) editing.photos = photos; else delete editing.photos;
        deletePhotos(removed);
      } else {
        var entry = Object.assign({ id: uid(), created: Date.now() }, values);
        if (photos.length) entry.photos = photos;
        data.mat.push(entry);
      }
      save();
      resetMatForm();
      renderAll();
      toast(editing ? 'Cambios guardados ✏️' : isSport(type) ? 'Deporte guardado 🏃' : 'Clase guardada 🥋');
    });
  });

  function renderMat() {
    var month = today().slice(0, 7);
    var monthList = data.mat.filter(function (m) { return m.date.slice(0, 7) === month; });
    var monthMat = monthList.filter(function (m) { return !isSport(m.type); });
    var monthSport = monthList.filter(function (m) { return isSport(m.type); });
    var allMat = data.mat.filter(function (m) { return !isSport(m.type); });
    var sum = function (list, k) { return list.reduce(function (a, m) { return a + (m[k] || 0); }, 0); };
    $('#mat-stats').innerHTML =
      stat('Clases este mes', monthMat.length, fmtNum(sum(monthMat, 'minutes') / 60, 1) + ' h') +
      stat('Combates este mes', sum(monthMat, 'rolls'), 'rolls') +
      stat('Otros deportes este mes', monthSport.length, fmtNum(sum(monthSport, 'minutes') / 60, 1) + ' h') +
      stat('Total histórico', allMat.length, fmtNum(sum(allMat, 'minutes') / 60, 1) + ' h en el tatami');

    var q = plain($('#mat-search').value.trim());
    var list = data.mat.slice().sort(byDateDesc).filter(function (m) {
      return !q || matText.some(function (k) { return plain(m[k]).indexOf(q) >= 0; });
    });
    $('#mat-history').innerHTML = list.length ? list.map(function (m) {
      var parts = [];
      if (m.techniques) parts.push('<p><span class="label">Técnicas:</span> ' + multiline(m.techniques) + '</p>');
      if (m.good) parts.push('<p><span class="label">Bien:</span> ' + multiline(m.good) + '</p>');
      if (m.review) parts.push('<p><span class="label">Repasar:</span> ' + multiline(m.review) + '</p>');
      if (m.injuries) parts.push('<p><span class="label">Molestias:</span> ' + esc(m.injuries) + '</p>');
      return '<div class="card entry">' +
        '<div class="entry-head"><span class="entry-title"><span class="badge' + (isSport(m.type) ? ' sport' : '') + '">' + esc(m.type) + '</span>' + fmtDate(m.date) + '</span>' +
        '<span class="entry-actions"><button type="button" class="icon-btn" data-edit-mat="' + m.id + '" aria-label="Editar">✏️</button>' +
        '<button type="button" class="icon-btn" data-del-mat="' + m.id + '" aria-label="Borrar">🗑</button></span></div>' +
        '<p class="muted small">' + (m.minutes || 0) + ' min' + (isSport(m.type) ? '' : ' · ' + (m.rolls || 0) + ' rolls') + ' · cansancio ' + (m.effort || '–') + '/10</p>' +
        parts.join('') + photoStrip(m.photos) + '</div>';
    }).join('') : empty(q ? 'No hay registros que coincidan con la búsqueda.' : 'Aún no hay clases ni deportes registrados.');
    hydratePhotos($('#mat-history'));

    // Deportes escritos antes, para elegirlos rápido.
    var sports = {};
    data.mat.forEach(function (m) { if (isSport(m.type)) sports[plain(m.type)] = m.type; });
    $('#sport-names').innerHTML = Object.keys(sports).sort().map(function (k) { return '<option value="' + esc(sports[k]) + '">'; }).join('');
  }

  $('#mat-search').addEventListener('input', renderMat);

  $('#mat-history').addEventListener('click', function (e) {
    var edit = e.target.closest('[data-edit-mat]');
    if (edit) { editMat(edit.dataset.editMat); return; }
    var del = e.target.closest('[data-del-mat]');
    if (del && confirm('¿Borrar este registro?')) {
      if (del.dataset.delMat === editingMatId) resetMatForm();
      var mc = data.mat.find(function (x) { return x.id === del.dataset.delMat; });
      if (mc) deletePhotos(mc.photos);
      removeById(data.mat, del.dataset.delMat);
      save();
      renderAll();
    }
  });

  // ---------- Alimentación ----------

  var foodForm = $('#food-form');
  var foodDay = today();

  function mealForNow() {
    var h = new Date().getHours();
    return h < 11 ? 'Desayuno' : h < 16 ? 'Almuerzo' : h < 20 ? 'Once' : 'Cena';
  }

  // Al agregar varias cosas seguidas se mantiene el mismo momento del día.
  function resetFoodForm(keepMeal) {
    var meal = keepMeal ? field(foodForm, 'meal').value : mealForNow();
    foodForm.reset();
    field(foodForm, 'meal').value = meal;
    clearFoodPick();
  }

  function bar(label, value, goal, unit) {
    var pct = goal > 0 ? Math.min(100, Math.round(value / goal * 100)) : 0;
    return '<div class="progress"><div class="progress-top"><span>' + label + '</span><span><b>' + fmtNum(value) + '</b> / ' + fmtNum(goal) + ' ' + unit + '</span></div>' +
      '<div class="bar' + (value > goal ? ' over' : '') + '"><i style="width:' + pct + '%"></i></div></div>';
  }

  function renderFood() {
    $('#food-day').value = foodDay;
    var items = data.food.filter(function (f) { return f.date === foodDay; });
    var kcal = items.reduce(function (a, f) { return a + (f.kcal || 0); }, 0);
    var prot = items.reduce(function (a, f) { return a + (f.protein || 0); }, 0);
    $('#food-totals').innerHTML = '<h2>' + (foodDay === today() ? 'Hoy' : fmtDate(foodDay)) + '</h2>' +
      bar('Calorías', kcal, data.goals.kcal, 'kcal') + bar('Proteína', prot, data.goals.protein, 'g');

    // Accesos rápidos: los alimentos que más repites
    var freq = {};
    data.food.slice().sort(byDateDesc).forEach(function (f) {
      var k = plain(f.name);
      if (!freq[k]) freq[k] = { item: f, n: 0 };
      freq[k].n++;
    });
    var top = Object.keys(freq).map(function (k) { return freq[k]; })
      .sort(function (a, b) { return b.n - a.n; }).slice(0, 8);
    $('#food-quick').innerHTML = top.length
      ? '<p class="muted small" style="width:100%;margin:0">Toca uno para rellenar:</p>' + top.map(function (t, i) {
        return '<button type="button" class="chip" data-quick="' + i + '">' + esc(t.item.name) + '</button>';
      }).join('')
      : '';
    $('#food-quick').quick = top;

    $('#food-list').innerHTML = items.length ? '<div class="card">' + MEALS.map(function (meal) {
      var group = items.filter(function (f) { return f.meal === meal; });
      if (!group.length) return '';
      return '<div class="meal-group"><h3>' + meal + '</h3>' + group.map(function (f) {
        return '<div class="food-item"><div><div>' + esc(f.name) + '</div><div class="meta">' +
          (f.grams ? fmtNum(f.grams) + ' g · ' : '') + fmtNum(f.kcal || 0) + ' kcal · ' + fmtNum(f.protein || 0, 1) + ' g proteína</div></div>' +
          '<button type="button" class="icon-btn" data-del-food="' + f.id + '" aria-label="Borrar alimento">🗑</button></div>';
      }).join('') + '</div>';
    }).join('') + '</div>' : empty('No hay comidas registradas este día.');
  }

  $('#food-quick').addEventListener('click', function (e) {
    var chip = e.target.closest('[data-quick]');
    if (!chip) return;
    var f = $('#food-quick').quick[+chip.dataset.quick].item;
    if (f.per100) {
      pickFood({ nombre: f.name, kcal: f.per100.kcal, prot: f.per100.prot, porcion: f.grams, fuente: f.fuente || '' });
      return;
    }
    clearFoodPick();
    field(foodForm, 'food').value = f.name;
    field(foodForm, 'kcal').value = f.kcal || '';
    field(foodForm, 'protein').value = f.protein || '';
  });

  // ---------- Buscar alimentos: lista común, Open Food Facts y código de barras ----------
  // A Open Food Facts solo se envía el texto buscado o el número del código; nunca tus registros.
  // La búsqueda por nombre (search.openfoodfacts.org) no acepta llamadas desde páginas web,
  // así que solo funciona en el APK. La consulta por código de barras funciona en ambos.

  var OFF_FIELDS = 'code,product_name,product_name_es,brands,nutriments,serving_quantity';
  var foodPick = null; // alimento elegido, con kcal y proteína por 100 g
  var foodResults = [];

  function offItem(p) {
    var n = p.nutriments || {};
    var kcal = num(n['energy-kcal_100g']);
    if (!kcal && n.energy_100g) kcal = num(n.energy_100g) / 4.184; // viene en kJ
    var name = String(p.product_name_es || p.product_name || '').trim();
    if (!name || !kcal) return null;
    var brand = String(Array.isArray(p.brands) ? p.brands[0] || '' : p.brands || '').split(',')[0].trim();
    return { nombre: name + (brand ? ' (' + brand + ')' : ''), kcal: kcal, prot: num(n.proteins_100g), porcion: num(p.serving_quantity) || 100, fuente: 'Open Food Facts' };
  }

  function localMatches(q) {
    var words = plain(q).split(/\s+/).filter(Boolean);
    return (window.ALIMENTOS || []).filter(function (a) {
      var t = plain(a.nombre);
      return words.every(function (w) { return t.indexOf(w) >= 0; });
    }).slice(0, 6).map(function (a) { return Object.assign({ fuente: 'Tabla aproximada' }, a); });
  }

  function offSearch(q) {
    var base = 'https://search.openfoodfacts.org/search?page_size=10&langs=es&fields=' + OFF_FIELDS + '&q=';
    function get(query) {
      return fetch(base + encodeURIComponent(query))
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (j) { return (j.hits || []).map(offItem).filter(Boolean); });
    }
    // Primero productos que se venden en Chile; si hay pocos, se completa con el resto del mundo.
    return get(q + ' countries_tags:"en:chile"').then(function (cl) {
      if (cl.length >= 3) return cl;
      return get(q).then(function (all) {
        var seen = {};
        return cl.concat(all).filter(function (x) { if (seen[x.nombre]) return false; seen[x.nombre] = true; return true; }).slice(0, 10);
      });
    });
  }

  function showResults(list, note) {
    foodResults = list;
    $('#food-results').innerHTML = list.map(function (a, i) {
      return '<button type="button" class="result" data-res="' + i + '"><div>' + esc(a.nombre) + '</div><div class="meta">' +
        fmtNum(a.kcal) + ' kcal · ' + fmtNum(a.prot, 1) + ' g proteína por 100 g · ' + esc(a.fuente) + '</div></button>';
    }).join('') + (note ? '<p class="results-note">' + esc(note) + '</p>' : '');
  }

  function runFoodSearch() {
    var q = $('#food-q').value.trim();
    if (q.length < 2) { showResults([], ''); return; }
    var local = localMatches(q);
    if (!isNative) {
      showResults(local, (local.length ? 'Lista de alimentos comunes (valores aproximados). ' : 'No está en la lista de alimentos comunes. ') +
        'La búsqueda en Open Food Facts funciona en la app Android; aquí puedes escanear el código de barras 📷 o escribir los valores a mano.');
      return;
    }
    showResults(local, 'Buscando en Open Food Facts…');
    offSearch(q).then(function (off) {
      if ($('#food-q').value.trim() !== q) return; // ya se buscó otra cosa
      showResults(local.concat(off), off.length ? 'Open Food Facts lo completa la comunidad: compara con la etiqueta.' : 'Open Food Facts no encontró ese alimento.');
    }).catch(function () {
      if ($('#food-q').value.trim() === q) showResults(local, 'No se pudo conectar con Open Food Facts. ¿Hay internet?');
    });
  }

  function applyGrams() {
    if (!foodPick || foodPick.manual) return;
    var g = num(field(foodForm, 'grams').value);
    field(foodForm, 'kcal').value = Math.round(foodPick.kcal * g / 100);
    field(foodForm, 'protein').value = Math.round(foodPick.prot * g / 10) / 10;
  }

  function pickFood(item) {
    foodPick = item;
    field(foodForm, 'food').value = item.nombre;
    field(foodForm, 'grams').value = item.porcion || 100;
    $('#food-per100').hidden = false;
    $('#food-per100-text').textContent = 'Por 100 g: ' + fmtNum(item.kcal) + ' kcal · ' + fmtNum(item.prot, 1) + ' g proteína' + (item.fuente ? ' · ' + item.fuente : '');
    applyGrams();
    $('#food-q').value = '';
    showResults([], '');
    field(foodForm, 'grams').focus();
  }

  function clearFoodPick() {
    foodPick = null;
    $('#food-per100').hidden = true;
  }

  $('#food-q-btn').addEventListener('click', runFoodSearch);
  $('#food-q').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); runFoodSearch(); } });
  $('#food-q').addEventListener('input', function () {
    // La lista común se filtra al escribir; Open Food Facts solo con 🔍 o Enter, para no saturarlo.
    var q = $('#food-q').value.trim();
    if (q.length >= 2) showResults(localMatches(q), isNative ? 'Toca 🔍 para buscar también en Open Food Facts.' : '');
    else showResults([], '');
  });
  $('#food-results').addEventListener('click', function (e) {
    var b = e.target.closest('[data-res]');
    if (b) pickFood(foodResults[+b.dataset.res]);
  });
  field(foodForm, 'grams').addEventListener('input', applyGrams);
  // Si cambia a mano las calorías o la proteína, deja de recalcular por gramos.
  ['kcal', 'protein'].forEach(function (n) {
    field(foodForm, n).addEventListener('input', function () { if (foodPick) foodPick.manual = true; });
  });

  // Escáner: usa BarcodeDetector si el navegador lo trae; si no, la librería ZXing (vendor/).
  var scanner = $('#scanner');
  var scanVideo = $('#scanner-video');
  var scanStream = null, scanTimer = null, zxingReader = null, scanBusy = false, lastCode = '';

  function scannerStatus(t) { $('#scanner-status').textContent = t; }

  function loadZxing() {
    if (window.ZXing) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'vendor/zxing-0.21.3.min.js';
      s.onload = resolve;
      s.onerror = function () { reject(new Error('No se pudo cargar el lector de códigos.')); };
      document.head.appendChild(s);
    });
  }

  function onCode(code) {
    if (scanBusy || code === lastCode) return;
    scanBusy = true;
    lastCode = code;
    lookupBarcode(code);
  }

  function lookupBarcode(code) {
    code = String(code).replace(/\D/g, '');
    if (code.length < 6) { scannerStatus('Ese número no parece un código de barras.'); scanBusy = false; return; }
    scannerStatus('Buscando el código ' + code + '…');
    fetch('https://world.openfoodfacts.org/api/v2/product/' + code + '.json?fields=' + OFF_FIELDS)
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var item = j.status === 1 && j.product ? offItem(j.product) : null;
        if (!item) {
          scannerStatus('El código ' + code + ' no está en Open Food Facts o no trae calorías. Prueba otro o escribe los valores a mano.');
          scanBusy = false;
          return;
        }
        closeScanner();
        pickFood(item);
        toast('Encontrado: ' + item.nombre);
      })
      .catch(function () { scannerStatus('No se pudo conectar con Open Food Facts. ¿Hay internet?'); scanBusy = false; });
  }

  function openScanner() {
    scanner.hidden = false;
    scanBusy = false;
    lastCode = '';
    $('#scanner-code').value = '';
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      scannerStatus('Aquí no se puede usar la cámara. Escribe el número que aparece bajo las barras.');
      return;
    }
    scannerStatus('Abriendo la cámara…');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then(function (stream) {
        if (scanner.hidden) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
        scanStream = stream;
        if ('BarcodeDetector' in window) {
          scanVideo.srcObject = stream;
          return scanVideo.play().then(function () {
            var det = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
            scannerStatus('Apunta la cámara al código de barras del envase.');
            scanTimer = setInterval(function () {
              if (scanBusy || scanVideo.readyState < 2) return;
              det.detect(scanVideo).then(function (codes) { if (codes.length) onCode(codes[0].rawValue); }).catch(function () {});
            }, 300);
          });
        }
        return loadZxing().then(function () {
          var Z = window.ZXing;
          var hints = new Map();
          hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E]);
          zxingReader = new Z.BrowserMultiFormatReader(hints, 300);
          scannerStatus('Apunta la cámara al código de barras del envase.');
          zxingReader.decodeFromStream(stream, scanVideo, function (result) { if (result) onCode(result.getText()); });
        });
      })
      .catch(function (err) {
        var denied = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
        scannerStatus((denied ? 'No hay permiso para usar la cámara.' : 'No se pudo abrir la cámara.') + ' Escribe el número que aparece bajo las barras.');
      });
  }

  function closeScanner() {
    scanner.hidden = true;
    clearInterval(scanTimer);
    scanTimer = null;
    if (zxingReader) { try { zxingReader.reset(); } catch (e) { /* ya detenido */ } zxingReader = null; }
    if (scanStream) { scanStream.getTracks().forEach(function (t) { t.stop(); }); scanStream = null; }
    scanVideo.srcObject = null;
  }

  $('#food-scan').addEventListener('click', openScanner);
  $('#scanner-close').addEventListener('click', closeScanner);
  $('#scanner-go').addEventListener('click', function () { scanBusy = true; lookupBarcode($('#scanner-code').value); });
  $('#scanner-code').addEventListener('keydown', function (e) { if (e.key === 'Enter') { scanBusy = true; lookupBarcode($('#scanner-code').value); } });

  $('#food-day').addEventListener('change', function (e) { if (e.target.value) { foodDay = e.target.value; renderFood(); } });
  $('#food-prev').addEventListener('click', function () { foodDay = addDays(foodDay, -1); renderFood(); });
  $('#food-next').addEventListener('click', function () { foodDay = addDays(foodDay, 1); renderFood(); });

  foodForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = field(foodForm, 'food').value.trim();
    if (!name) return;
    var entry = {
      id: uid(), created: Date.now(), date: foodDay,
      meal: field(foodForm, 'meal').value,
      name: name,
      kcal: num(field(foodForm, 'kcal').value),
      protein: num(field(foodForm, 'protein').value)
    };
    // Si vino de la búsqueda, guarda los gramos y los valores por 100 g para reusarlo como frecuente.
    if (foodPick && !foodPick.manual && num(field(foodForm, 'grams').value) > 0) {
      entry.grams = num(field(foodForm, 'grams').value);
      entry.per100 = { kcal: Math.round(foodPick.kcal), prot: Math.round(foodPick.prot * 10) / 10 };
      entry.fuente = foodPick.fuente;
    }
    data.food.push(entry);
    save();
    resetFoodForm(true);
    renderAll();
    toast('Comida agregada 🍽️');
  });

  $('#food-list').addEventListener('click', function (e) {
    var del = e.target.closest('[data-del-food]');
    if (del) {
      removeById(data.food, del.dataset.delFood);
      save();
      renderAll();
    }
  });

  // ---------- Peso ----------

  var weightForm = $('#weight-form');

  // ---------- Health Connect (solo en la app Android) ----------
  // En el APK (Capacitor), lee el peso que EufyLife deja en Health Connect.
  // Se llama al plugin nativo "Health" (@capgo/capacitor-health) sin empaquetador, con nativePromise.

  var cap = window.Capacitor;
  var isNative = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  var HC_KEY = 'mi-entrenamiento-hc';
  var hcBusy = false;

  function health(method, options) { return cap.nativePromise('Health', method, options || {}); }
  function hcEnabled() { try { return localStorage.getItem(HC_KEY) === '1'; } catch (e) { return false; } }
  function setHcEnabled() { try { localStorage.setItem(HC_KEY, '1'); } catch (e) { /* opcional */ } }

  // Un registro por día con el último pesaje. Si ese día hay un peso anotado a mano,
  // gana el más reciente: la báscula si te pesaste después de anotarlo, o el tuyo si lo anotaste después.
  function importWeights(samples) {
    var byDay = {};
    samples.forEach(function (s) {
      if (!(s.value > 0)) return;
      var d = iso(new Date(s.startDate));
      if (!byDay[d] || Date.parse(s.startDate) > Date.parse(byDay[d].startDate)) byDay[d] = s;
    });
    var changed = 0;
    Object.keys(byDay).forEach(function (d) {
      var s = byDay[d];
      var kg = Math.round(s.value * 10) / 10;
      var at = Date.parse(s.startDate);
      var w = data.weight.find(function (x) { return x.date === d; });
      if (!w) {
        data.weight.push({ id: uid(), created: at, date: d, kg: kg, source: 'hc' });
        changed++;
      } else if (w.source === 'hc' ? w.kg !== kg : at > (w.created || 0)) {
        w.kg = kg;
        w.source = 'hc';
        w.created = at;
        changed++;
      }
    });
    return changed;
  }

  function latestSample(samples) {
    return samples.reduce(function (best, s) {
      return s.value > 0 && (!best || Date.parse(s.startDate) > Date.parse(best.startDate)) ? s : best;
    }, null);
  }

  function hcStatus(text) { $('#hc-status').textContent = text; }

  function syncHealth(interactive) {
    if (!isNative || hcBusy) return Promise.resolve();
    hcBusy = true;
    var scopes = { read: ['weight'] };
    return health('isAvailable').then(function (a) {
      if (!a.available) throw new Error('Health Connect no está disponible en este teléfono' + (a.reason ? ' (' + a.reason + ')' : '') + '.');
      return health(interactive ? 'requestAuthorization' : 'checkAuthorization', scopes);
    }).then(function (st) {
      if (!st.readAuthorized || st.readAuthorized.indexOf('weight') < 0) throw new Error('Falta el permiso para leer el peso en Health Connect.');
      var start = new Date();
      start.setDate(start.getDate() - 30); // Health Connect entrega hasta 30 días hacia atrás
      return health('readSamples', { dataType: 'weight', startDate: start.toISOString(), endDate: new Date().toISOString(), limit: 1000 });
    }).then(function (res) {
      var samples = res.samples || [];
      var n = importWeights(samples);
      setHcEnabled();
      $('#hc-sync').textContent = 'Sincronizar ahora';
      var now = new Date();
      var last = latestSample(samples);
      var lastTxt = '';
      if (last) {
        var t = new Date(last.startDate);
        lastTxt = ' · último en Health Connect: ' + fmtNum(Math.round(last.value * 10) / 10, 1) + ' kg, ' +
          (iso(t) === today() ? 'hoy' : fmtDate(iso(t))) + ' ' + pad(t.getHours()) + ':' + pad(t.getMinutes());
      }
      hcStatus('✅ Conectado · revisado a las ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) +
        ' · ' + samples.length + (samples.length === 1 ? ' pesaje' : ' pesajes') + ' en 30 días' + lastTxt);
      if (n) { save(); renderAll(); }
      if (n) toast(n === 1 ? 'Peso nuevo desde la báscula ⚖️' : n + ' pesos nuevos desde la báscula ⚖️');
      else if (interactive) toast('Todo al día: no hay pesos nuevos');
    }).catch(function (err) {
      hcStatus('⚠️ ' + ((err && err.message) || 'No se pudo leer Health Connect.'));
      if (interactive) toast((err && err.message) || 'No se pudo leer Health Connect.');
    }).then(function () { hcBusy = false; });
  }

  if (isNative) {
    $('#hc-card').hidden = false;
    hcStatus(hcEnabled() ? 'Revisando…' : 'Toca el botón para dar permiso de leer tu peso.');
    if (hcEnabled()) $('#hc-sync').textContent = 'Sincronizar ahora';
    $('#hc-sync').addEventListener('click', function () { syncHealth(true); });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && hcEnabled()) syncHealth(false);
    });
  }

  function weightsAsc() { return data.weight.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }); }

  weightForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var date = field(weightForm, 'date').value || today();
    var kg = num(field(weightForm, 'kg').value);
    if (kg <= 0) return;
    var existing = data.weight.find(function (w) { return w.date === date; });
    if (existing) { existing.kg = kg; existing.created = Date.now(); delete existing.source; } // un registro por día; ahora es manual
    else data.weight.push({ id: uid(), created: Date.now(), date: date, kg: kg });
    save();
    weightForm.reset();
    field(weightForm, 'date').value = today();
    renderAll();
    toast('Peso guardado ⚖️');
  });

  function renderWeight() {
    var list = weightsAsc();
    var chart = $('#weight-chart');
    var pts = list.slice(-60);
    if (pts.length < 2) {
      chart.innerHTML = '<h2>Evolución</h2>' + empty('Registra tu peso al menos 2 días para ver el gráfico.');
    } else {
      var W = 320, H = 170, L = 34, R = 10, T = 12, B = 26;
      var ys = pts.map(function (p) { return p.kg; });
      var min = Math.min.apply(null, ys), max = Math.max.apply(null, ys);
      if (max - min < 1) { min -= 0.5; max += 0.5; }
      var x = function (i) { return L + (W - L - R) * i / (pts.length - 1); };
      var y = function (v) { return T + (H - T - B) * (max - v) / (max - min); };
      var line = pts.map(function (p, i) { return x(i).toFixed(1) + ',' + y(p.kg).toFixed(1); }).join(' ');
      chart.innerHTML = '<h2>Evolución</h2><div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Gráfico de peso">' +
        '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(max) + '" y2="' + y(max) + '"/>' +
        '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(min) + '" y2="' + y(min) + '"/>' +
        '<text x="' + (L - 4) + '" y="' + (y(max) + 4) + '" text-anchor="end">' + fmtNum(max, 1) + '</text>' +
        '<text x="' + (L - 4) + '" y="' + (y(min) + 4) + '" text-anchor="end">' + fmtNum(min, 1) + '</text>' +
        '<polyline class="line" points="' + line + '"/>' +
        pts.map(function (p, i) { return '<circle class="pt" r="3" cx="' + x(i).toFixed(1) + '" cy="' + y(p.kg).toFixed(1) + '"><title>' + fmtDate(p.date) + ': ' + fmtNum(p.kg, 1) + ' kg</title></circle>'; }).join('') +
        '<text x="' + L + '" y="' + (H - 6) + '">' + fmtDate(pts[0].date) + '</text>' +
        '<text x="' + (W - R) + '" y="' + (H - 6) + '" text-anchor="end">' + fmtDate(pts[pts.length - 1].date) + '</text>' +
        '</svg></div>';
    }

    var desc = list.slice().reverse();
    $('#weight-history').innerHTML = desc.length ? '<div class="card">' + desc.map(function (w, i) {
      var prev = desc[i + 1];
      var diff = prev ? w.kg - prev.kg : 0;
      var diffTxt = prev ? (diff > 0 ? '+' : '') + fmtNum(diff, 1) + ' kg' : '';
      return '<div class="food-item"><div><div><b>' + fmtNum(w.kg, 1) + ' kg</b></div><div class="meta">' + fmtDate(w.date) +
        (diffTxt ? ' · ' + diffTxt : '') + (w.source === 'hc' ? ' · báscula' : '') + '</div></div>' +
        '<button type="button" class="icon-btn" data-del-weight="' + w.id + '" aria-label="Borrar registro de peso">🗑</button></div>';
    }).join('') + '</div>' : empty('Aún no hay registros de peso.');
  }

  $('#weight-history').addEventListener('click', function (e) {
    var del = e.target.closest('[data-del-weight]');
    if (del && confirm('¿Borrar este registro de peso?')) {
      removeById(data.weight, del.dataset.delWeight);
      save();
      renderAll();
    }
  });

  // ---------- Resumen ----------

  function stat(k, v, s) {
    return '<div class="stat"><div class="k">' + k + '</div><div class="v">' + v + '</div>' + (s ? '<div class="s">' + s + '</div>' : '') + '</div>';
  }

  // Semana que se está mirando en el Resumen (lunes) y día elegido para ver el detalle.
  var summaryWeek = weekStart(today());
  var selectedDay = today();

  function weekTitle(start) {
    var cur = weekStart(today());
    if (start === cur) return 'Esta semana';
    if (start === addDays(cur, -7)) return 'Semana pasada';
    var a = parseIso(start), b = parseIso(addDays(start, 6));
    return a.getDate() + (a.getMonth() !== b.getMonth() ? ' ' + MONTHS[a.getMonth()] : '') + ' – ' + b.getDate() + ' ' + MONTHS[b.getMonth()] +
      (b.getFullYear() !== parseIso(today()).getFullYear() ? ' ' + b.getFullYear() : '');
  }

  function renderDayDetail(d) {
    var gym = data.gym.filter(function (x) { return x.date === d; });
    var mat = data.mat.filter(function (x) { return x.date === d; });
    var food = data.food.filter(function (x) { return x.date === d; });
    var w = data.weight.find(function (x) { return x.date === d; });
    var items = [];
    gym.forEach(function (g) {
      var sets = g.exercises.reduce(function (a, ex) { return a + ex.sets.length; }, 0);
      items.push('<div class="detail-item"><div><div>🏋️ Gimnasio</div><div class="meta">' +
        esc(g.exercises.map(function (ex) { return ex.name; }).join(', ')) + ' · ' + sets + (sets === 1 ? ' serie' : ' series') + '</div></div></div>');
    });
    mat.forEach(function (m) {
      items.push('<div class="detail-item"><div><div><span class="badge' + (isSport(m.type) ? ' sport' : '') + '">' + esc(m.type) + '</span></div><div class="meta">' +
        (m.minutes || 0) + ' min' + (isSport(m.type) ? '' : ' · ' + (m.rolls || 0) + ' rolls') + ' · cansancio ' + (m.effort || '–') + '/10' +
        (m.techniques ? ' · ' + esc(m.techniques) : '') + '</div></div>' +
        '<button type="button" class="icon-btn" data-edit-mat="' + m.id + '" aria-label="Editar">✏️</button></div>');
    });
    if (food.length) {
      var kcal = food.reduce(function (a, f) { return a + (f.kcal || 0); }, 0);
      var prot = food.reduce(function (a, f) { return a + (f.protein || 0); }, 0);
      items.push('<div class="detail-item"><div><div>🍽️ Comida</div><div class="meta">' + fmtNum(kcal) + ' kcal · ' + fmtNum(prot, 1) + ' g proteína · ' +
        food.length + (food.length === 1 ? ' alimento' : ' alimentos') + '</div></div>' +
        '<button type="button" class="btn small" data-food-day="' + d + '">Ver</button></div>');
    }
    if (w) items.push('<div class="detail-item"><div><div>⚖️ Peso</div><div class="meta">' + fmtNum(w.kg, 1) + ' kg' + (w.source === 'hc' ? ' · báscula' : '') + '</div></div></div>');
    $('#day-detail').innerHTML = '<h3>' + (d === today() ? 'Hoy, ' : '') + fmtDate(d) + '</h3>' +
      (items.length ? items.join('') : '<p class="muted small">Sin registros este día.</p>');
  }

  $('#week-prev').addEventListener('click', function () { summaryWeek = addDays(summaryWeek, -7); renderSummary(); });
  $('#week-next').addEventListener('click', function () {
    if (summaryWeek < weekStart(today())) { summaryWeek = addDays(summaryWeek, 7); renderSummary(); }
  });
  $('#week-strip').addEventListener('click', function (e) {
    var b = e.target.closest('[data-day]');
    if (b) { selectedDay = b.dataset.day; renderSummary(); }
  });
  $('#day-detail').addEventListener('click', function (e) {
    var edit = e.target.closest('[data-edit-mat]');
    if (edit) { editMat(edit.dataset.editMat); return; }
    var fd = e.target.closest('[data-food-day]');
    if (fd) { foodDay = fd.dataset.foodDay; renderFood(); showTab('food'); }
  });

  function renderSummary() {
    var t = today();
    var start = summaryWeek;
    var end = addDays(start, 6);
    var thisWeek = start === weekStart(t);
    $('#week-title').textContent = weekTitle(start);
    $('#week-next').disabled = thisWeek;
    if (selectedDay < start || selectedDay > end) selectedDay = thisWeek ? t : end;

    var inWeek = function (x) { return x.date >= start && x.date <= end; };
    var gym = data.gym.filter(inWeek);
    var mat = data.mat.filter(function (x) { return inWeek(x) && !isSport(x.type); });
    var sports = data.mat.filter(function (x) { return inWeek(x) && isSport(x.type); });
    var food = data.food.filter(inWeek);

    var strip = '';
    for (var i = 0; i < 7; i++) {
      var d = addDays(start, i);
      var has = function (list) { return list.some(function (x) { return x.date === d; }); };
      strip += '<button type="button" class="day' + (d === t ? ' today' : '') + (d === selectedDay ? ' selected' : '') + '" data-day="' + d + '"' +
        (d > t ? ' disabled' : '') + ' aria-label="' + fmtDate(d) + '"><div class="muted">' + DAYS[parseIso(d).getDay()] + '</div>' +
        '<div class="n">' + parseIso(d).getDate() + '</div><div class="dots">' +
        (has(gym) ? '<i class="dot gym" title="Gimnasio"></i>' : '') +
        (has(mat) ? '<i class="dot mat" title="Tatami"></i>' : '') +
        (has(sports) ? '<i class="dot sport" title="Otro deporte"></i>' : '') +
        (has(food) ? '<i class="dot food" title="Comida"></i>' : '') + '</div></button>';
    }
    $('#week-strip').innerHTML = strip;
    renderDayDetail(selectedDay);

    var matMin = mat.reduce(function (a, m) { return a + (m.minutes || 0); }, 0);
    var matRolls = mat.reduce(function (a, m) { return a + (m.rolls || 0); }, 0);
    var sportMin = sports.reduce(function (a, m) { return a + (m.minutes || 0); }, 0);
    var foodDays = {};
    food.forEach(function (f) {
      var fd = foodDays[f.date] || (foodDays[f.date] = { kcal: 0, protein: 0 });
      fd.kcal += f.kcal || 0;
      fd.protein += f.protein || 0;
    });
    var nDays = Object.keys(foodDays).length;
    var avg = function (k) { return nDays ? Object.keys(foodDays).reduce(function (a, d) { return a + foodDays[d][k]; }, 0) / nDays : 0; };

    // Peso al final de la semana que se está mirando.
    var ws = weightsAsc().filter(function (w) { return w.date <= end; });
    var last = ws[ws.length - 1];
    var weightCard;
    var weightLabel = thisWeek ? 'Peso actual' : 'Peso de esa semana';
    if (last) {
      var ref = ws.filter(function (w) { return w.date <= addDays(last.date, -7); }).pop();
      var diff = ref ? last.kg - ref.kg : null;
      weightCard = stat(weightLabel, fmtNum(last.kg, 1) + ' kg',
        diff == null ? fmtDate(last.date) : (diff > 0 ? '+' : '') + fmtNum(diff, 1) + ' kg vs. 7 días antes');
    } else {
      weightCard = stat(weightLabel, '—', 'sin registros');
    }

    $('#summary-cards').innerHTML =
      stat('Gimnasio', gym.length, gym.length === 1 ? 'sesión' : 'sesiones') +
      stat('Tatami', mat.length, (mat.length === 1 ? 'clase' : 'clases') + ' · ' + fmtNum(matMin / 60, 1) + ' h · ' + matRolls + ' rolls') +
      (sports.length ? stat('Otros deportes', sports.length, fmtNum(sportMin / 60, 1) + ' h · ' +
        esc(sports.map(function (m) { return m.type; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(', '))) : '') +
      stat('Calorías / día', nDays ? fmtNum(avg('kcal')) : '—', nDays ? 'promedio de ' + nDays + (nDays === 1 ? ' día' : ' días') + ' · meta ' + fmtNum(data.goals.kcal) : 'sin comidas esa semana') +
      stat('Proteína / día', nDays ? fmtNum(avg('protein')) + ' g' : '—', nDays ? 'meta ' + fmtNum(data.goals.protein) + ' g' : '') +
      weightCard;

    var reviews = data.mat.slice().sort(byDateDesc).filter(function (m) { return m.review; }).slice(0, 3);
    $('#summary-review').innerHTML = reviews.length ? reviews.map(function (m) {
      return '<div class="card"><div class="muted small"><span class="badge">' + esc(m.type) + '</span>' + fmtDate(m.date) + '</div><p>' + multiline(m.review) + '</p></div>';
    }).join('') : empty('Lo que anotes en «Me falló / repasar» aparecerá aquí.');
  }

  // ---------- Ajustes ----------

  var goalsForm = $('#goals-form');

  function fillGoals() {
    field(goalsForm, 'kcal').value = data.goals.kcal;
    field(goalsForm, 'protein').value = data.goals.protein;
  }

  goalsForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var kcal = num(field(goalsForm, 'kcal').value);
    var protein = num(field(goalsForm, 'protein').value);
    if (kcal > 0) data.goals.kcal = kcal;
    if (protein > 0) data.goals.protein = protein;
    save();
    renderAll();
    toast('Metas guardadas');
  });

  // El respaldo lleva las fotos dentro, como texto (data URL), en "photos": { id: dataUrl }.
  $('#export-btn').addEventListener('click', function () {
    var ids = allPhotoIds(data);
    if (ids.length) toast('Preparando respaldo con ' + ids.length + (ids.length === 1 ? ' foto…' : ' fotos…'));
    Promise.all(ids.map(function (id) {
      return getPhoto(id).then(function (b) { return b ? blobToDataUrl(b) : null; }).catch(function () { return null; });
    })).then(function (urls) {
      var photos = {};
      ids.forEach(function (id, i) { if (urls[i]) photos[id] = urls[i]; });
      var json = JSON.stringify(Object.assign({}, data, { photos: photos }));
      var name = 'mi-entrenamiento-respaldo-' + today() + '.json';
      if (isNative) { shareBackupNative(name, json); return; }
      var blob = new Blob([json], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      toast('Respaldo descargado');
    });
  });

  // En el APK no se puede descargar: se guarda en la caché de la app y se abre el menú Compartir
  // (Drive, Archivos, WhatsApp…). Usa los plugins oficiales Filesystem y Share.
  function shareBackupNative(name, json) {
    cap.nativePromise('Filesystem', 'writeFile', { path: name, data: json, directory: 'CACHE', encoding: 'utf8' })
      .then(function (r) {
        return cap.nativePromise('Share', 'share', { title: 'Respaldo de Mi Entrenamiento', files: [r.uri], dialogTitle: 'Guardar respaldo en…' });
      })
      .then(function () { toast('Respaldo listo'); })
      .catch(function (err) {
        if (!/cancel/i.test((err && err.message) || '')) toast('No se pudo compartir el respaldo.');
      });
  }

  function restorePhotos(photos) {
    var ids = Object.keys(photos || {});
    return clearPhotos().catch(function () {}).then(function () {
      return Promise.all(ids.map(function (id) {
        return fetch(photos[id]).then(function (r) { return r.blob(); })
          .then(function (b) { return putPhoto(id, b); })
          .catch(function () { return null; });
      }));
    });
  }

  $('#import-file').addEventListener('change', function (e) {
    var file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var parsed;
      try { parsed = JSON.parse(reader.result); } catch (err) { toast('El archivo no es un respaldo válido.'); return; }
      if (!parsed || !Array.isArray(parsed.gym) || !Array.isArray(parsed.mat)) { toast('El archivo no es un respaldo de Mi Entrenamiento.'); return; }
      var next = normalize(parsed);
      var nPhotos = Object.keys(parsed.photos || {}).length;
      var msg = 'El respaldo tiene ' + next.gym.length + ' entrenamientos, ' + next.mat.length + ' clases, ' +
        next.food.length + ' comidas, ' + next.weight.length + ' pesos y ' + nPhotos + ' fotos.\n\nReemplazará los datos actuales de este dispositivo. ¿Continuar?';
      if (!confirm(msg)) return;
      Object.keys(photoUrls).forEach(function (id) { URL.revokeObjectURL(photoUrls[id]); delete photoUrls[id]; });
      restorePhotos(parsed.photos).then(function () {
        data = next;
        save();
        fillGoals();
        renderAll();
        resetBeltForm();
        toast('Respaldo restaurado');
      });
    };
    reader.readAsText(file);
  });

  $('#wipe-btn').addEventListener('click', function () {
    if (!confirm('¿Borrar TODOS tus registros de este dispositivo?')) return;
    if (!confirm('Última confirmación: esto no se puede deshacer. ¿Borrar todo?')) return;
    data = emptyData();
    save();
    Object.keys(photoUrls).forEach(function (id) { URL.revokeObjectURL(photoUrls[id]); delete photoUrls[id]; });
    clearPhotos().catch(function () {});
    gymPhotos.clear();
    matPhotos.clear();
    fillGoals();
    renderAll();
    resetBeltForm();
    toast('Datos borrados');
  });

  // ---------- Inicio ----------

  $('#today-label').textContent = fmtDate(today());
  resetGymForm();
  resetBeltForm();
  resetMatForm();
  resetFoodForm();
  field(weightForm, 'date').value = today();
  fillGoals();
  renderAll();

  var savedTab = 'resumen';
  try { savedTab = localStorage.getItem(TAB_KEY) || 'resumen'; } catch (e) { /* opcional */ }
  showTab(savedTab);

  // Pide al navegador que no borre los datos si falta espacio.
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});

  // En el APK: trae los pesos nuevos de Health Connect al abrir.
  if (isNative && hcEnabled()) syncHealth(false);

  // Funciona sin internet cuando se abre desde una dirección web (no con doble clic).
  // En el APK los archivos ya vienen dentro, así que no hace falta.
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !isNative) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
