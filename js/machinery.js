/* ============================================================
   МАШИННО-ТЕХНОЛОГИЧЕСКИЙ ПАРК
   Сравнение двух схем: отдельный парк на каждой ферме
   против единого парка на все фермы проекта.

   Модуль самодостаточный: подключается после doc.js и сам
   добавляет раздел в документ. Другие файлы не трогает.

   Цены и количества правятся ниже в MTF.machinery.
   ============================================================ */

window.MTF = window.MTF || {};

/* Площадь кормовых угодий на одну корову, га.
   Укрупнённый норматив: 1,5 на богаре средней урожайности. */
MTF.landPerCow = 1.5;

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
MTF.calcMachinery = function (p, res) {
  const N = p.project.farmsCount || 1;
  const cows = (res && res.herd && res.herd.meta) ? res.herd.meta.target : 0;
  const landPerFarm = Math.round(cows * MTF.landPerCow);
  const rate = MTF.rate(p, 'EUR');

  const rows = MTF.machinery.map(m => {
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
    title: '12. Машинно-технологический парк',
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

Единый парк сокращает капитальные затраты проекта на технику примерно вдвое. Экономия достигается прежде всего на уборочной технике и агрегатах для посева, которые задействованы ограниченное число дней в году.

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

    const tbl = (head, rows) =>
      '<table class="dt"><thead><tr>' +
      head.map((h, i) => '<th' + (i > 0 ? ' class="r"' : '') + '>' + h + '</th>').join('') +
      '</tr></thead><tbody>' + rows.map(r => '<tr>' +
      r.map((c, i) => '<td' + (i > 0 ? ' class="r n"' : '') + '>' + c + '</td>').join('') +
      '</tr>').join('') + '</tbody></table>';

    t.machineryLandTable = tbl(['Показатель', '1 ферма', M.farms + ' ферм'], [
      ['Фуражных коров, гол.', f.num(M.cowsPerFarm), f.num(M.cowsPerFarm * M.farms)],
      ['Норматив, га на корову', f.num(MTF.landPerCow, 1), f.num(MTF.landPerCow, 1)],
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

    t.machineryTable = tbl(
      ['Наименование', 'Цена, тыс. €', 'Схема 1, ед.', 'Схема 1, тыс. €',
       'Схема 2, ед.', 'Схема 2, тыс. €'], rows);

    t.machinerySummaryTable = tbl(['Показатель', 'Схема 1', 'Схема 2', 'Разница'], [
      ['Капитальные затраты на парк, тыс. €',
        f.num(M.sepEur), f.num(M.shEur), '−' + f.num(M.saveEur)],
      ['В пересчёте на одну ферму, тыс. €',
        f.num(M.sepPerFarmEur), f.num(M.shPerFarmEur),
        '−' + f.num(M.sepPerFarmEur - M.shPerFarmEur)],
      ['Капитальные затраты на парк, тыс. ₸',
        f.num(M.sepKzt), f.num(M.shKzt), '−' + f.num(M.saveKzt)],
      ['<b>Экономия</b>', '—', '—', '<b>' + f.pct(M.savePct, 0) + '</b>']
    ]);

    return t;
  };
})();
