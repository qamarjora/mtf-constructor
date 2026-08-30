/* ============================================================
   МАШИННО-ТЕХНОЛОГИЧЕСКИЙ ПАРК
   Сравнение двух схем: отдельный парк на каждой ферме
   против единого парка на все фермы проекта.

   Модуль самодостаточный: подключается после doc.js и сам
   добавляет раздел в документ. Другие файлы не трогает.

   Цены и количества правятся ниже в MTF.machinery.
   ============================================================ */

window.MTF = window.MTF || {};

/* Парк техники.
   price   — цена за единицу в тыс. евро
   perFarm — сколько единиц нужно, если у каждой фермы свой парк
   shared  — сколько единиц нужно на все фермы при едином парке
   group   — раздел для группировки в таблице
------------------------------------------------ */
MTF.machinery = [
  { id: 'm_forage',  name: 'Кормоуборочный комбайн 400 л.с.', group: 'Уборка',   price: 420, perFarm: 1, shared: 5 },
  { id: 'm_grain',   name: 'Зерноуборочный комбайн',          group: 'Уборка',   price: 300, perFarm: 1, shared: 5 },
  { id: 'm_mower',   name: 'Косилка-плющилка',                group: 'Уборка',   price: 40,  perFarm: 2, shared: 7 },
  { id: 'm_rake',    name: 'Грабли-ворошилки',                group: 'Уборка',   price: 20,  perFarm: 1, shared: 3 },
  { id: 'm_baler',   name: 'Пресс-подборщик рулонный',        group: 'Уборка',   price: 55,  perFarm: 1, shared: 3 },

  { id: 'm_tract280', name: 'Трактор 280 л.с.',               group: 'Тяга',     price: 160, perFarm: 1, shared: 8 },
  { id: 'm_tract180', name: 'Трактор 180 л.с.',               group: 'Тяга',     price: 110, perFarm: 1, shared: 6 },
  { id: 'm_trailer',  name: 'Прицеп силосный 30 м³',          group: 'Тяга',     price: 35,  perFarm: 3, shared: 15 },
  { id: 'm_hopper',   name: 'Бункер-перегрузчик',             group: 'Тяга',     price: 50,  perFarm: 1, shared: 3 },

  { id: 'm_seed_row', name: 'Сеялка пропашная',               group: 'Обработка', price: 60, perFarm: 1, shared: 3 },
  { id: 'm_seed_gr',  name: 'Сеялка зерновая',                group: 'Обработка', price: 70, perFarm: 1, shared: 3 },
  { id: 'm_disc',     name: 'Дискатор',                       group: 'Обработка', price: 45, perFarm: 1, shared: 5 },
  { id: 'm_spray',    name: 'Опрыскиватель прицепной',        group: 'Обработка', price: 50, perFarm: 1, shared: 3 },
  { id: 'm_spread',   name: 'Разбрасыватель удобрений',       group: 'Обработка', price: 25, perFarm: 1, shared: 3 }
];

/* ---------- Расчёт ---------- */
MTF.calcMachinery = function (p, res, list) {
  /* Список берётся из состояния — его правит карточка на вкладке «Экономика».
     Явный аргумент нужен для расчётов «а если», MTF.machinery — запасной
     вариант, пока состояние ещё не создано. */
  const items = list || (MTF.state && MTF.state.machinery) || MTF.machinery;
  const N = p.project.farmsCount || 1;
  const cows = (res && res.herd && res.herd.meta) ? res.herd.meta.target : 0;
  /* Норматив земли — общий с кормовой моделью (params.feed.landHaPerCow),
     иначе документ называл бы две разные площади угодий. */
  const landPerCow = p.feed.landHaPerCow || 0;
  const landPerFarm = Math.round(cows * landPerCow);
  const rate = MTF.rate(p, 'EUR');

  const rows = items.map(m => {
    const sepQty = m.perFarm * N;
    const sepEur = m.price * sepQty;
    const shEur = m.price * m.shared;
    return {
      id: m.id, name: m.name, group: m.group, price: m.price,
      sepQty: sepQty, sepEur: sepEur,
      shQty: m.shared, shEur: shEur,
      saveEur: sepEur - shEur
    };
  });

  const sum = k => rows.reduce((a, r) => a + r[k], 0);
  const sepEur = sum('sepEur'), shEur = sum('shEur');

  return {
    rows: rows,
    farms: N,
    cowsPerFarm: cows,
    landPerCow: landPerCow,
    landPerFarm: landPerFarm,
    landTotal: landPerFarm * N,
    sepEur: sepEur,
    shEur: shEur,
    saveEur: sepEur - shEur,
    savePct: sepEur > 0 ? (sepEur - shEur) / sepEur * 100 : 0,
    sepPerFarmEur: sepEur / N,
    shPerFarmEur: shEur / N,
    sepKzt: sepEur * rate,
    shKzt: shEur * rate,
    saveKzt: (sepEur - shEur) * rate
  };
};

/* ---------- Раздел документа ---------- */
(function () {
  if (!MTF.docSections) return;

  const section = {
    id: 'machinery',
    title: '14. Машинно-технологический парк',
    enabled: false,
    body: `Кормовая база проекта требует собственной сельскохозяйственной техники для посева, обработки и уборки кормовых культур. Ниже приведено сравнение двух схем организации парка.

**Потребность в земле**

{{machineryLandTable}}

**Схема 1. Отдельный парк на каждой ферме**

Каждая ферма приобретает полный комплект техники и обслуживает собственные угодья самостоятельно.

**Схема 2. Единый парк на все фермы проекта**

Техника находится в общем пользовании и работает на площадках по графику. Агротехнические сроки уборки растягиваются за счёт подбора гибридов разной спелости и смещения сроков сева, что позволяет одной единице техники обслуживать несколько площадок.

{{machineryTable}}

{{machinerySummaryTable}}

{{machineryVerdict}}

Условия применимости схемы: расположение площадок в радиусе, допускающем перегон техники в течение суток, и единый центр планирования полевых работ.`
  };

  // вставляем перед оговоркой, чтобы она осталась последней
  const di = MTF.docSections.findIndex(s => s.id === 'disclaimer');
  if (di >= 0) MTF.docSections.splice(di, 0, section);
  else MTF.docSections.push(section);

  // добавляем раздел в режимы, где он уместен
  if (MTF.docModes) {
    ['bizplan', 'passport', 'investment'].forEach(id => {
      const m = MTF.docModes.find(x => x.id === id);
      if (m && m.sections && m.sections.indexOf('machinery') < 0) {
        const i = m.sections.indexOf('disclaimer');
        if (i >= 0) m.sections.splice(i, 0, 'machinery');
        else m.sections.push('machinery');
      }
    });
  }

  /* Таблицы подмешиваются к docTables без правки doc.js */
  const orig = MTF.docTables;
  MTF.docTables = function (state, res) {
    const t = orig(state, res);
    const p = state.params, f = MTF.fmt;
    const M = MTF.calcMachinery(p, res);

    /* Знак ставится по факту: снижение затрат печатается с минусом,
       рост — с плюсом. Жёсткий минус давал «−-6 010», когда общий парк
       выходил дороже отдельных. */
    const signed = v => (v >= 0 ? '−' : '+') + f.num(Math.abs(v));

    const tbl = (head, rows) =>
      '<table class="dt"><thead><tr>' +
      head.map((h, i) => '<th' + (i > 0 ? ' class="r"' : '') + '>' + h + '</th>').join('') +
      '</tr></thead><tbody>' + rows.map(r => '<tr>' +
      r.map((c, i) => '<td' + (i > 0 ? ' class="r n"' : '') + '>' + c + '</td>').join('') +
      '</tr>').join('') + '</tbody></table>';

    t.machineryLandTable = tbl(['Показатель', '1 ферма', M.farms + ' ферм'], [
      ['Фуражных коров, гол.', f.num(M.cowsPerFarm), f.num(M.cowsPerFarm * M.farms)],
      ['Норматив, га на корову', f.num(M.landPerCow, 1), f.num(M.landPerCow, 1)],
      ['Кормовые угодья, га', f.num(M.landPerFarm), f.num(M.landTotal)]
    ]);

    const groups = [];
    M.rows.forEach(r => { if (groups.indexOf(r.group) < 0) groups.push(r.group); });
    const rows = [];
    groups.forEach(g => {
      M.rows.filter(r => r.group === g).forEach(r => {
        rows.push([r.name, f.num(r.price), f.num(r.sepQty), f.num(r.sepEur),
          f.num(r.shQty), f.num(r.shEur)]);
      });
    });
    rows.push(['<b>Итого</b>', '', '', '<b>' + f.num(M.sepEur) + '</b>',
      '', '<b>' + f.num(M.shEur) + '</b>']);

    /* Парк всегда считается в евро — курс показываем независимо от того,
       какие валюты встречаются в статьях капзатрат. */
    t.machineryTable = MTF.rateNote(p, ['EUR']) + tbl(
      ['Наименование', 'Цена, тыс. €', 'Схема 1, ед.', 'Схема 1, тыс. €',
       'Схема 2, ед.', 'Схема 2, тыс. €'], rows) +
      '\n<p><i>Количества по схеме 2 рассчитаны на проект из 8–10 площадок. ' +
      'При меньшем числе ферм общий парк недозагружен, и преимущество схемы ' +
      'сокращается или исчезает.</i></p>';

    t.machinerySummaryTable = tbl(['Показатель', 'Схема 1', 'Схема 2', 'Разница'], [
      ['Капитальные затраты на парк, тыс. €',
        f.num(M.sepEur), f.num(M.shEur), signed(M.saveEur)],
      ['В пересчёте на одну ферму, тыс. €',
        f.num(M.sepPerFarmEur), f.num(M.shPerFarmEur),
        signed(M.sepPerFarmEur - M.shPerFarmEur)],
      ['Капитальные затраты на парк, тыс. ₸',
        f.num(M.sepKzt), f.num(M.shKzt), signed(M.saveKzt)],
      ['<b>Экономия</b>', '—', '—', '<b>' + f.pct(M.savePct, 0) + '</b>']
    ]);

    /* Вывод под таблицей зависит от того, выигрывает ли общий парк.
       Доля экономии берётся из расчёта, а не фиксируется словом «вдвое»:
       при пяти фермах выигрыш уже около двух процентов. */
    t.machineryVerdict = M.saveEur > 0
      ? 'Единый парк сокращает капитальные затраты проекта на технику на ' +
        f.pct(M.savePct, 0) + '. Экономия достигается прежде всего на уборочной ' +
        'технике и агрегатах для посева, которые задействованы ограниченное ' +
        'число дней в году.'
      : 'При заданном числе ферм (' + f.num(M.farms) + ') единый парк выигрыша ' +
        'не даёт: комплект общей техники обходится дороже, чем отдельные парки ' +
        'на каждой площадке. Схема 1 предпочтительнее. Общий парк начинает ' +
        'окупаться на проекте из 8–10 ферм, под которые и рассчитаны количества ' +
        'по схеме 2.';

    return t;
  };
})();


/* ============================================================
   ПАРК В СОСТОЯНИИ ПРОЕКТА
   Список правится на вкладке «Экономика» и сохраняется вместе
   с проектом. ui.js не трогаем — оборачиваем его функции.
   ============================================================ */
(function () {
  if (!MTF.initState) return;

  MTF.ensureMachinery = function (state) {
    if (!Array.isArray(state.machinery) || !state.machinery.length) {
      state.machinery = JSON.parse(JSON.stringify(MTF.machinery));
    }
    return state.machinery;
  };

  const origInit = MTF.initState;
  MTF.initState = function () {
    const st = origInit();
    st.machinery = JSON.parse(JSON.stringify(MTF.machinery));
    return st;
  };

  /* Проект, сохранённый до появления модуля, парка не содержит —
     подставляем заводской. Открытие .json закрыто в export.js. */
  const origLoad = MTF.load;
  MTF.load = function () {
    const st = origLoad();
    if (st) MTF.ensureMachinery(st);
    return st;
  };
})();


/* ============================================================
   КАРТОЧКА ПАРКА НА ВКЛАДКЕ «ЭКОНОМИКА»
   Добавляется поверх renderEcon и bind без правки ui.js.
   ============================================================ */
(function () {
  if (!MTF.renderEcon) return;

  // названия и группы вводит пользователь — кавычка в значении сломала бы атрибут
  const esc = v => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  MTF.renderMachineryCard = function (res) {
    const P = MTF.state.params, f = MTF.fmt;
    const list = MTF.ensureMachinery(MTF.state);
    const M = MTF.calcMachinery(P, res);
    const N = P.project.farmsCount || 1;

    const groups = [];
    list.forEach(m => { if (groups.indexOf(m.group) < 0) groups.push(m.group); });

    const rows = groups.map(g =>
      '<tr class="sub"><td colspan="8"><b>' + esc(g) + '</b></td></tr>' +
      list.map((m, i) => [m, i]).filter(x => x[0].group === g).map(x => {
        const m = x[0], i = x[1];
        return '<tr>' +
          '<td><input type="text" data-mn="' + i + '" value="' + esc(m.name) +
            '" style="width:100%;text-align:left"></td>' +
          '<td><input type="text" data-mg="' + i + '" value="' + esc(m.group) +
            '" style="width:104px;text-align:left"></td>' +
          '<td><input type="number" data-mp="' + i + '" value="' + m.price + '" step="any" style="width:84px"></td>' +
          '<td><input type="number" data-mf="' + i + '" value="' + m.perFarm + '" step="any" style="width:62px"></td>' +
          '<td><input type="number" data-ms="' + i + '" value="' + m.shared + '" step="any" style="width:62px"></td>' +
          '<td class="n">' + f.num(m.price * m.perFarm * N, 1) + '</td>' +
          '<td class="n">' + f.num(m.price * m.shared, 1) + '</td>' +
          '<td><button class="del" data-mdel="' + i + '">×</button></td></tr>';
      }).join('')).join('');

    /* Тот же вывод, что и в документе: при малом числе ферм общий парк
       проигрывает, и карточка обязана это показывать, а не обещать экономию. */
    const verdict = M.saveEur > 0
      ? '<div class="note ok">Единый парк дешевле на <b>' + f.num(M.saveEur, 1) +
        ' тыс. €</b> — это ' + f.pct(M.savePct, 0) + ' от затрат по схеме 1.</div>'
      : '<div class="note warn">При ' + f.num(N) + ' фермах единый парк дороже на <b>' +
        f.num(Math.abs(M.saveEur), 1) + ' тыс. €</b>. Количества по схеме 2 рассчитаны ' +
        'на 8–10 площадок; при меньшем числе ферм парк недозагружен.</div>';

    return '<div class="card" style="margin-top:14px"><h3>Машинно-технологический парк</h3>' +
      verdict +
      '<div class="tw"><table><thead><tr>' +
      '<th>Наименование</th><th>Группа</th><th>Цена, тыс. €</th>' +
      '<th>Сх. 1, ед.</th><th>Сх. 2, ед.</th>' +
      '<th>Сх. 1, тыс. €</th><th>Сх. 2, тыс. €</th><th></th></tr></thead><tbody>' +
      rows +
      '<tr class="tot"><td>Итого</td><td></td><td></td><td></td><td></td>' +
      '<td class="n">' + f.num(M.sepEur, 1) + '</td>' +
      '<td class="n">' + f.num(M.shEur, 1) + '</td><td></td></tr>' +
      '<tr class="sub"><td>На одну ферму</td><td></td><td></td><td></td><td></td>' +
      '<td class="n">' + f.num(M.sepPerFarmEur, 1) + '</td>' +
      '<td class="n">' + f.num(M.shPerFarmEur, 1) + '</td><td></td></tr>' +
      '<tr class="sub"><td>В тенге, тыс.</td><td></td><td></td><td></td><td></td>' +
      '<td class="n">' + f.num(M.sepKzt) + '</td>' +
      '<td class="n">' + f.num(M.shKzt) + '</td><td></td></tr>' +
      '</tbody></table></div>' +
      '<button class="btn" id="addMach" style="margin-top:10px">Добавить позицию</button>' +
      '<div class="hint">Схема 1 — свой парк у каждой из ' + f.num(N) + ' ферм. ' +
      'Схема 2 — единый парк на весь проект. Кормовые угодья: ' +
      f.num(M.landPerFarm) + ' га на ферму, ' + f.num(M.landTotal) + ' га всего ' +
      '(норматив ' + f.num(M.landPerCow, 1) + ' га на корову с вкладки «Вводные»).</div></div>';
  };

  const origEcon = MTF.renderEcon;
  MTF.renderEcon = function (res) {
    return origEcon(res) + MTF.renderMachineryCard(res);
  };

  const origBind = MTF.bind;
  MTF.bind = function () {
    origBind();
    const list = MTF.ensureMachinery(MTF.state);
    const upd = () => { MTF.save(); MTF.render(); };
    const on = (sel, fn) => document.querySelectorAll(sel).forEach(el =>
      el.onchange = () => { fn(el); upd(); });

    on('[data-mn]', el => list[el.dataset.mn].name = el.value);
    on('[data-mg]', el => list[el.dataset.mg].group = el.value);
    on('[data-mp]', el => list[el.dataset.mp].price = parseFloat(el.value) || 0);
    on('[data-mf]', el => list[el.dataset.mf].perFarm = parseFloat(el.value) || 0);
    on('[data-ms]', el => list[el.dataset.ms].shared = parseFloat(el.value) || 0);

    document.querySelectorAll('[data-mdel]').forEach(el =>
      el.onclick = () => { list.splice(+el.dataset.mdel, 1); upd(); });

    const add = document.getElementById('addMach');
    if (add) add.onclick = () => {
      const n = prompt('Название позиции');
      if (!n) return;
      const g = prompt('Группа (Уборка / Тяга / Обработка)', 'Уборка') || 'Прочее';
      list.push({ id: 'm' + Date.now(), name: n, group: g, price: 0, perFarm: 1, shared: 1 });
      upd();
    };
  };
})();
