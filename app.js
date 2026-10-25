/* Mi Entrenamiento: registro personal de gimnasio, tatami, comida y peso.
   Todo se guarda en localStorage de este navegador; nada sale del dispositivo. */
(function () {
  'use strict';

  var KEY = 'mi-entrenamiento-v1';
  var TAB_KEY = 'mi-entrenamiento-tab';
  var DAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  var MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var MEALS = ['Desayuno', 'Almuerzo', 'Once', 'Cena', 'Colación'];
  var DEFAULT_EXERCISES = ['Sentadilla', 'Peso muerto', 'Press banca', 'Press militar', 'Dominadas',
    'Remo con barra', 'Fondos', 'Hip thrust', 'Zancadas', 'Flexiones', 'Kettlebell swing', 'Abdominales'];

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  // ---------- Datos ----------

  function emptyData() {
    return { version: 1, goals: { kcal: 2500, protein: 150 }, gym: [], mat: [], food: [], weight: [] };
  }

  function normalize(d) {
    var base = emptyData();
    if (!d || typeof d !== 'object') return base;
    ['gym', 'mat', 'food', 'weight'].forEach(function (k) { if (Array.isArray(d[k])) base[k] = d[k]; });
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
    data.gym.push({
      id: uid(), created: Date.now(),
      date: field(gymForm, 'date').value || today(),
      exercises: exercises,
      notes: field(gymForm, 'notes').value.trim()
    });
    save();
    resetGymForm();
    renderAll();
    toast('Entrenamiento guardado 💪');
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
        '</div>';
    }).join('') : empty('Aún no hay entrenamientos.');
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
      removeById(data.gym, del.dataset.delGym);
      save();
      renderAll();
    }
  });

  // ---------- Tatami (jiu-jitsu y lucha) ----------

  var matForm = $('#mat-form');
  var matText = ['type', 'techniques', 'good', 'review', 'injuries'];

  function resetMatForm() {
    var type = field(matForm, 'type').value;
    matForm.reset();
    field(matForm, 'date').value = today();
    if (type) field(matForm, 'type').value = type; // recuerda el último tipo
    $('#mat-effort-out').textContent = field(matForm, 'effort').value;
  }

  field(matForm, 'effort').addEventListener('input', function (e) { $('#mat-effort-out').textContent = e.target.value; });

  matForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var entry = {
      id: uid(), created: Date.now(),
      date: field(matForm, 'date').value || today(),
      minutes: num(field(matForm, 'minutes').value),
      rolls: num(field(matForm, 'rolls').value),
      effort: num(field(matForm, 'effort').value)
    };
    matText.forEach(function (k) { entry[k] = field(matForm, k).value.trim(); });
    data.mat.push(entry);
    save();
    resetMatForm();
    renderAll();
    toast('Clase guardada 🥋');
  });

  function renderMat() {
    var month = today().slice(0, 7);
    var monthList = data.mat.filter(function (m) { return m.date.slice(0, 7) === month; });
    var sum = function (list, k) { return list.reduce(function (a, m) { return a + (m[k] || 0); }, 0); };
    $('#mat-stats').innerHTML =
      stat('Clases este mes', monthList.length, fmtNum(sum(monthList, 'minutes') / 60, 1) + ' h') +
      stat('Combates este mes', sum(monthList, 'rolls'), 'rolls') +
      stat('Total histórico', data.mat.length, fmtNum(sum(data.mat, 'minutes') / 60, 1) + ' h en el tatami');

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
        '<div class="entry-head"><span class="entry-title"><span class="badge">' + esc(m.type) + '</span>' + fmtDate(m.date) + '</span>' +
        '<button type="button" class="icon-btn" data-del-mat="' + m.id + '" aria-label="Borrar clase">🗑</button></div>' +
        '<p class="muted small">' + (m.minutes || 0) + ' min · ' + (m.rolls || 0) + ' rolls · cansancio ' + (m.effort || '–') + '/10</p>' +
        parts.join('') + '</div>';
    }).join('') : empty(q ? 'No hay clases que coincidan con la búsqueda.' : 'Aún no hay clases registradas.');
  }

  $('#mat-search').addEventListener('input', renderMat);

  $('#mat-history').addEventListener('click', function (e) {
    var del = e.target.closest('[data-del-mat]');
    if (del && confirm('¿Borrar esta clase?')) {
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
          fmtNum(f.kcal || 0) + ' kcal · ' + fmtNum(f.protein || 0, 1) + ' g proteína</div></div>' +
          '<button type="button" class="icon-btn" data-del-food="' + f.id + '" aria-label="Borrar alimento">🗑</button></div>';
      }).join('') + '</div>';
    }).join('') + '</div>' : empty('No hay comidas registradas este día.');
  }

  $('#food-quick').addEventListener('click', function (e) {
    var chip = e.target.closest('[data-quick]');
    if (!chip) return;
    var f = $('#food-quick').quick[+chip.dataset.quick].item;
    field(foodForm, 'food').value = f.name;
    field(foodForm, 'kcal').value = f.kcal || '';
    field(foodForm, 'protein').value = f.protein || '';
  });

  $('#food-day').addEventListener('change', function (e) { if (e.target.value) { foodDay = e.target.value; renderFood(); } });
  $('#food-prev').addEventListener('click', function () { foodDay = addDays(foodDay, -1); renderFood(); });
  $('#food-next').addEventListener('click', function () { foodDay = addDays(foodDay, 1); renderFood(); });

  foodForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = field(foodForm, 'food').value.trim();
    if (!name) return;
    data.food.push({
      id: uid(), created: Date.now(), date: foodDay,
      meal: field(foodForm, 'meal').value,
      name: name,
      kcal: num(field(foodForm, 'kcal').value),
      protein: num(field(foodForm, 'protein').value)
    });
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

  function weightsAsc() { return data.weight.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }); }

  weightForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var date = field(weightForm, 'date').value || today();
    var kg = num(field(weightForm, 'kg').value);
    if (kg <= 0) return;
    var existing = data.weight.find(function (w) { return w.date === date; });
    if (existing) existing.kg = kg; // un registro por día
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
        (diffTxt ? ' · ' + diffTxt : '') + '</div></div>' +
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

  function renderSummary() {
    var t = today();
    var start = weekStart(t);
    var end = addDays(start, 6);
    var inWeek = function (x) { return x.date >= start && x.date <= end; };
    var gym = data.gym.filter(inWeek);
    var mat = data.mat.filter(inWeek);
    var food = data.food.filter(inWeek);

    var strip = '';
    for (var i = 0; i < 7; i++) {
      var d = addDays(start, i);
      var has = function (list) { return list.some(function (x) { return x.date === d; }); };
      strip += '<div class="day' + (d === t ? ' today' : '') + '"><div class="muted">' + DAYS[parseIso(d).getDay()] + '</div>' +
        '<div class="n">' + parseIso(d).getDate() + '</div><div class="dots">' +
        (has(gym) ? '<i class="dot gym" title="Gimnasio"></i>' : '') +
        (has(mat) ? '<i class="dot mat" title="Tatami"></i>' : '') +
        (has(food) ? '<i class="dot food" title="Comida"></i>' : '') + '</div></div>';
    }
    $('#week-strip').innerHTML = strip;

    var matMin = mat.reduce(function (a, m) { return a + (m.minutes || 0); }, 0);
    var matRolls = mat.reduce(function (a, m) { return a + (m.rolls || 0); }, 0);
    var foodDays = {};
    food.forEach(function (f) {
      var fd = foodDays[f.date] || (foodDays[f.date] = { kcal: 0, protein: 0 });
      fd.kcal += f.kcal || 0;
      fd.protein += f.protein || 0;
    });
    var nDays = Object.keys(foodDays).length;
    var avg = function (k) { return nDays ? Object.keys(foodDays).reduce(function (a, d) { return a + foodDays[d][k]; }, 0) / nDays : 0; };

    var ws = weightsAsc();
    var last = ws[ws.length - 1];
    var weightCard;
    if (last) {
      var ref = ws.filter(function (w) { return w.date <= addDays(last.date, -7); }).pop();
      var diff = ref ? last.kg - ref.kg : null;
      weightCard = stat('Peso actual', fmtNum(last.kg, 1) + ' kg',
        diff == null ? fmtDate(last.date) : (diff > 0 ? '+' : '') + fmtNum(diff, 1) + ' kg vs. hace una semana');
    } else {
      weightCard = stat('Peso actual', '—', 'sin registros');
    }

    $('#summary-cards').innerHTML =
      stat('Gimnasio', gym.length, gym.length === 1 ? 'sesión' : 'sesiones') +
      stat('Tatami', mat.length, (mat.length === 1 ? 'clase' : 'clases') + ' · ' + fmtNum(matMin / 60, 1) + ' h · ' + matRolls + ' rolls') +
      stat('Calorías / día', nDays ? fmtNum(avg('kcal')) : '—', nDays ? 'promedio de ' + nDays + (nDays === 1 ? ' día' : ' días') + ' · meta ' + fmtNum(data.goals.kcal) : 'sin comidas esta semana') +
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

  $('#export-btn').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mi-entrenamiento-respaldo-' + today() + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast('Respaldo descargado');
  });

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
      var msg = 'El respaldo tiene ' + next.gym.length + ' entrenamientos, ' + next.mat.length + ' clases, ' +
        next.food.length + ' comidas y ' + next.weight.length + ' pesos.\n\nReemplazará los datos actuales de este dispositivo. ¿Continuar?';
      if (!confirm(msg)) return;
      data = next;
      save();
      fillGoals();
      renderAll();
      toast('Respaldo restaurado');
    };
    reader.readAsText(file);
  });

  $('#wipe-btn').addEventListener('click', function () {
    if (!confirm('¿Borrar TODOS tus registros de este dispositivo?')) return;
    if (!confirm('Última confirmación: esto no se puede deshacer. ¿Borrar todo?')) return;
    data = emptyData();
    save();
    fillGoals();
    renderAll();
    toast('Datos borrados');
  });

  // ---------- Inicio ----------

  $('#today-label').textContent = fmtDate(today());
  resetGymForm();
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

  // Funciona sin internet cuando se abre desde una dirección web (no con doble clic).
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
