/* ============================================================
   ИНЖЕНЕРНОЕ ОБЕСПЕЧЕНИЕ
   Расчёт потребности в электрической мощности и воде.

   Электричество считается в три шага:
     установленная мощность → расчётная нагрузка → запрос сетям
   Резервное оборудование входит в установленную, но не в расчётную.

   Вода считается по нормам потребления на группу животных
   плюс технологические нужды.

   Модуль самодостаточный: подключается после ui.js.
   ============================================================ */

window.MTF = window.MTF || {};

/* ---------- Электропотребители ----------
   power   — паспортная мощность одной единицы, кВт
   qty     — количество работающих единиц
   reserve — количество резервных единиц (в расчётную нагрузку не входят)
   zone    — ДМБ | Коровник | Лагуна | Освещение
------------------------------------------------ */
MTF.powerItems = [
  { id: 'e_vac',     name: 'Вакуумный насос DCL400+',              zone: 'ДМБ', power: 15,   qty: 1, reserve: 1 },
  { id: 'e_milkpump', name: 'Молочный насос',                      zone: 'ДМБ', power: 2.2,  qty: 2, reserve: 0 },
  { id: 'e_compr',   name: 'Воздушный компрессор',                 zone: 'ДМБ', power: 11,   qty: 1, reserve: 1 },
  { id: 'e_auto',    name: 'Автоматизация доильного зала',         zone: 'ДМБ', power: 0.16, qty: 60, reserve: 0 },
  { id: 'e_drive',   name: 'Привод платформы',                     zone: 'ДМБ', power: 1.1,  qty: 4, reserve: 0 },
  { id: 'e_wash',    name: 'Автомат промывки',                     zone: 'ДМБ', power: 3,    qty: 1, reserve: 0 },
  { id: 'e_tank',    name: 'Холодильный танк 20 000 л',            zone: 'ДМБ', power: 33,   qty: 2, reserve: 0 },
  { id: 'e_chiller', name: 'Чиллер CWC120',                        zone: 'ДМБ', power: 67,   qty: 1, reserve: 0 },
  { id: 'e_heater',  name: 'Водонагреватель 1000 л',               zone: 'ДМБ', power: 18,   qty: 3, reserve: 0 },
  { id: 'e_fan_dmb', name: 'Вентиляторы зала и накопителя',        zone: 'ДМБ', power: 1.2,  qty: 4, reserve: 0 },

  { id: 'e_scraper', name: 'Скреперная система навозоудаления',    zone: 'Коровник', power: 1.5,  qty: 6,  reserve: 0 },
  { id: 'e_fan5',    name: 'Вентиляторы горизонтальные Ø5 м',      zone: 'Коровник', power: 0.7,  qty: 20, reserve: 0 },
  { id: 'e_drink',   name: 'Групповые поилки с подогревом',        zone: 'Коровник', power: 2,    qty: 40, reserve: 0 },
  { id: 'e_circ',    name: 'Циркуляционный нагреватель поилок',    zone: 'Коровник', power: 6,    qty: 4,  reserve: 0 },
  { id: 'e_brush',   name: 'Автоматические щётки-чесалки',         zone: 'Коровник', power: 0.55, qty: 8,  reserve: 0 },
  { id: 'e_shaft',   name: 'Шахтные вентиляторы',                  zone: 'Коровник', power: 0.92, qty: 29, reserve: 0 },
  { id: 'e_curtain', name: 'Блок привода штор и панелей',          zone: 'Коровник', power: 0.37, qty: 6,  reserve: 0 },
  { id: 'e_light',   name: 'Освещение коровника',                  zone: 'Коровник', power: 20,   qty: 1,  reserve: 0 },

  { id: 'e_sep',     name: 'Сепаратор навоза',                     zone: 'Лагуна', power: 5.5, qty: 1, reserve: 0 },
  { id: 'e_pump37',  name: 'Насос погружной 37 кВт',               zone: 'Лагуна', power: 37,  qty: 1, reserve: 0 },
  { id: 'e_pump22',  name: 'Насос погружной 22 кВт',               zone: 'Лагуна', power: 22,  qty: 1, reserve: 0 },
  { id: 'e_pump55',  name: 'Насос погружной 5,5 кВт',              zone: 'Лагуна', power: 5.5, qty: 1, reserve: 0 },
  { id: 'e_mixer',   name: 'Миксер-измельчитель',                  zone: 'Лагуна', power: 15,  qty: 1, reserve: 0 }
];

/* Коэффициент одновременности и запас при запросе сетям */
MTF.powerParams = {
  simultaneity: 55,   // % — какая доля мощности работает в пик
  reserveMargin: 20,  // % — запас сверх расчётной нагрузки
  hoursPerYear: 3200, // приведённые часы работы для оценки годового расхода
  tariff: 30          // ₸ за кВт·ч
};

/* ---------- Водопотребление ----------
   base: cows | young | fixed
   rate: литров на голову в сутки либо литров в сутки для fixed
------------------------------------------------ */
MTF.waterItems = [
  { id: 'w_cows',   name: 'Поение основного стада',            base: 'cows',  rate: 120 },
  { id: 'w_young',  name: 'Поение молодняка и телят',          base: 'young', rate: 50 },
  { id: 'w_wash',   name: 'Промывка доильного зала (3 дойки)', base: 'fixed', rate: 10500 },
  { id: 'w_tanks',  name: 'Промывка холодильных танков',       base: 'fixed', rate: 600 },
  { id: 'w_clean',  name: 'Смыв накопителя и платформы',       base: 'fixed', rate: 12000 }
];

/* ---------- Расчёт электроснабжения ---------- */
MTF.calcPower = function (p, list) {
  const items = list || (MTF.state && MTF.state.powerItems) || MTF.powerItems;
  const prm = (MTF.state && MTF.state.params && MTF.state.params.powerParams) || MTF.powerParams;

  const rows = items.map(it => {
    const working = it.power * it.qty;
    const total = it.power * (it.qty + (it.reserve || 0));
    return {
      id: it.id, name: it.name, zone: it.zone, power: it.power,
      qty: it.qty, reserve: it.reserve || 0,
      working: working, installed: total
    };
  });

  const zones = [];
  rows.forEach(r => { if (zones.indexOf(r.zone) < 0) zones.push(r.zone); });
  const byZone = zones.map(z => ({
    zone: z,
    installed: rows.filter(r => r.zone === z).reduce((a, r) => a + r.installed, 0),
    working: rows.filter(r => r.zone === z).reduce((a, r) => a + r.working, 0)
  }));

  const installed = rows.reduce((a, r) => a + r.installed, 0);
  const working = rows.reduce((a, r) => a + r.working, 0);
  const calculated = working * prm.simultaneity / 100;
  const requested = calculated * (1 + prm.reserveMargin / 100);

  // стандартные номиналы трансформаторных подстанций, кВА
  const nominals = [100, 160, 250, 400, 630, 1000, 1250, 1600];
  const kva = requested / 0.9;   // при коэффициенте мощности 0,9
  const transformer = nominals.find(n => n >= kva) || nominals[nominals.length - 1];

  const annualKwh = calculated * prm.hoursPerYear;
  const annualCost = annualKwh * prm.tariff / 1000;   // тыс. ₸

  return {
    rows: rows, byZone: byZone,
    installed: installed, working: working,
    reservePower: installed - working,
    calculated: calculated, requested: requested,
    transformer: transformer,
    annualKwh: annualKwh, annualCost: annualCost,
    perCow: 0, prm: prm
  };
};

/* ---------- Расчёт водоснабжения ---------- */
MTF.calcWater = function (p, res, list) {
  const items = list || (MTF.state && MTF.state.waterItems) || MTF.waterItems;
  const last = res && res.herd ? res.herd[res.herd.length - 1] : null;
  const cows = res && res.herd && res.herd.meta ? res.herd.meta.target : 0;
  const young = last ? Math.round(last.heifers + last.calves + last.bulls) : 0;

  const rows = items.map(it => {
    let heads = 0, daily = 0;
    if (it.base === 'cows') { heads = cows; daily = cows * it.rate; }
    else if (it.base === 'young') { heads = young; daily = young * it.rate; }
    else { daily = it.rate; }
    return { id: it.id, name: it.name, base: it.base, rate: it.rate, heads: heads, daily: daily };
  });

  const daily = rows.reduce((a, r) => a + r.daily, 0);
  return {
    rows: rows, cows: cows, young: young,
    dailyL: daily,
    dailyM3: daily / 1000,
    annualM3: daily * 365 / 1000,
    wellFlow: daily / 1000 / 24,          // м³/час при круглосуточной подаче
    wellFlowPeak: daily / 1000 / 12,      // м³/час при подаче за 12 часов
    tankVolume: Math.ceil(daily / 1000 * 0.6 / 10) * 10  // рекомендуемый объём накопителя
  };
};

/* ---------- Раздел документа ---------- */
(function () {
  if (!MTF.docSections) return;

  const section = {
    id: 'utilities',
    title: '16. Инженерное обеспечение',
    enabled: false,
    body: `Расчёт потребности фермы в электрической мощности и воде выполнен по составу технологического оборудования и нормам потребления. Показатели используются для получения технических условий на присоединение к инженерным сетям и для выбора параметров водозабора.

**Электроснабжение**

{{powerZoneTable}}

{{powerTable}}

{{powerSummaryTable}}

Установленная мощность включает резервное оборудование. Расчётная нагрузка определена без резерва с применением коэффициента одновременности: технологические процессы фермы не совпадают по времени — доение, охлаждение молока, вентиляция и подогрев воды работают в разных режимах.

**Водоснабжение**

{{waterTable}}

{{waterSummaryTable}}

Потребление распределяется неравномерно: поение идёт в течение суток, промывка доильного оборудования — три раза в сутки после каждого доения, смыв помещений — один-два раза. Для сглаживания пиков предусматривается накопительная ёмкость.`
  };

  const di = MTF.docSections.findIndex(s => s.id === 'disclaimer');
  if (di >= 0) MTF.docSections.splice(di, 0, section);
  else MTF.docSections.push(section);

  if (MTF.docModes) {
    ['bizplan', 'passport', 'technical'].forEach(id => {
      const m = MTF.docModes.find(x => x.id === id);
      if (m && m.sections && m.sections.indexOf('utilities') < 0) {
        const i = m.sections.indexOf('disclaimer');
        if (i >= 0) m.sections.splice(i, 0, 'utilities');
        else m.sections.push('utilities');
      }
    });
  }

  const orig = MTF.docTables;
  MTF.docTables = function (state, res) {
    const t = orig(state, res);
    const p = state.params, f = MTF.fmt;
    const E = MTF.calcPower(p);
    const W = MTF.calcWater(p, res);

    const tbl = (head, rows) =>
      '<table class="dt"><thead><tr>' +
      head.map((h, i) => '<th' + (i > 0 ? ' class="r"' : '') + '>' + h + '</th>').join('') +
      '</tr></thead><tbody>' + rows.map(r => '<tr>' +
      r.map((c, i) => '<td' + (i > 0 ? ' class="r n"' : '') + '>' + c + '</td>').join('') +
      '</tr>').join('') + '</tbody></table>';

    t.powerZoneTable = tbl(['Зона', 'Установленная, кВт', 'Без резерва, кВт'],
      E.byZone.map(z => [z.zone, f.num(z.installed, 1), f.num(z.working, 1)])
        .concat([['<b>Итого</b>', '<b>' + f.num(E.installed, 1) + '</b>',
          '<b>' + f.num(E.working, 1) + '</b>']]));

    t.powerTable = tbl(['Потребитель', 'Зона', 'кВт', 'Ед.', 'Резерв', 'Итого, кВт'],
      E.rows.map(r => [r.name, r.zone, f.num(r.power, 2), f.num(r.qty),
        r.reserve ? f.num(r.reserve) : '—', f.num(r.installed, 1)]));

    t.powerSummaryTable = tbl(['Показатель', 'Значение'], [
      ['Установленная мощность, кВт', f.num(E.installed, 1)],
      ['В том числе резервное оборудование, кВт', f.num(E.reservePower, 1)],
      ['Мощность без резерва, кВт', f.num(E.working, 1)],
      ['Коэффициент одновременности', f.pct(E.prm.simultaneity, 0)],
      ['<b>Расчётная нагрузка, кВт</b>', '<b>' + f.num(E.calculated, 1) + '</b>'],
      ['Запас при запросе сетям', f.pct(E.prm.reserveMargin, 0)],
      ['<b>Присоединяемая мощность, кВт</b>', '<b>' + f.num(E.requested, 0) + '</b>'],
      ['Рекомендуемая трансформаторная подстанция, кВА', f.num(E.transformer)],
      ['Годовое потребление, тыс. кВт·ч', f.num(E.annualKwh / 1000)],
      ['Годовые затраты при тарифе ' + f.num(E.prm.tariff) + ' ₸/кВт·ч, тыс. ₸', f.num(E.annualCost)]
    ]);

    t.waterTable = tbl(['Потребность', 'Норма', 'Голов', 'л/сут'],
      W.rows.map(r => [r.name,
        r.base === 'fixed' ? '—' : f.num(r.rate) + ' л/гол',
        r.base === 'fixed' ? '—' : f.num(r.heads),
        f.num(r.daily)])
        .concat([['<b>Итого</b>', '', '', '<b>' + f.num(W.dailyL) + '</b>']]));

    t.waterSummaryTable = tbl(['Показатель', 'Значение'], [
      ['Суточное потребление, м³', f.num(W.dailyM3, 1)],
      ['Годовое потребление, м³', f.num(W.annualM3)],
      ['Требуемый дебит скважины при круглосуточной подаче, м³/ч', f.num(W.wellFlow, 1)],
      ['То же при подаче за 12 часов, м³/ч', f.num(W.wellFlowPeak, 1)],
      ['Рекомендуемый объём накопительной ёмкости, м³', f.num(W.tankVolume)]
    ]);

    return t;
  };
})();

/* ---------- Карточка на вкладке «Экономика» ---------- */
(function () {
  if (!MTF.renderEcon) return;

  MTF.ensureUtilities = function (state) {
    if (!Array.isArray(state.powerItems) || !state.powerItems.length) {
      state.powerItems = JSON.parse(JSON.stringify(MTF.powerItems));
    }
    if (!Array.isArray(state.waterItems) || !state.waterItems.length) {
      state.waterItems = JSON.parse(JSON.stringify(MTF.waterItems));
    }
    if (!state.params.powerParams) {
      state.params.powerParams = JSON.parse(JSON.stringify(MTF.powerParams));
    }
    return state;
  };

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');

  MTF.renderUtilitiesCard = function (res) {
    MTF.ensureUtilities(MTF.state);
    const P = MTF.state.params, f = MTF.fmt;
    const E = MTF.calcPower(P), W = MTF.calcWater(P, res);
    const prm = P.powerParams;

    const zones = [];
    MTF.state.powerItems.forEach(i => { if (zones.indexOf(i.zone) < 0) zones.push(i.zone); });

    const powerRows = zones.map(z =>
      '<tr class="sub"><td colspan="6"><b>' + esc(z) + '</b></td></tr>' +
      MTF.state.powerItems.map((it, i) => [it, i]).filter(x => x[0].zone === z).map(x => {
        const it = x[0], i = x[1];
        const r = E.rows[i];
        return '<tr>' +
          '<td><input type="text" data-pwn="' + i + '" value="' + esc(it.name) +
            '" style="width:100%;text-align:left;font-family:var(--sans)"></td>' +
          '<td><input type="text" data-pwz="' + i + '" value="' + esc(it.zone) +
            '" style="width:90px;text-align:left;font-family:var(--sans)"></td>' +
          '<td><input type="number" data-pwp="' + i + '" value="' + it.power +
            '" step="any" style="width:72px"></td>' +
          '<td><input type="number" data-pwq="' + i + '" value="' + it.qty +
            '" step="any" style="width:58px"></td>' +
          '<td><input type="number" data-pwr="' + i + '" value="' + (it.reserve || 0) +
            '" step="any" style="width:58px"></td>' +
          '<td class="n">' + f.num(r.installed, 1) + '</td>' +
          '<td><button class="del" data-pwdel="' + i + '">×</button></td></tr>';
      }).join('')).join('');

    const waterRows = MTF.state.waterItems.map((it, i) => {
      const r = W.rows[i];
      return '<tr>' +
        '<td><input type="text" data-wtn="' + i + '" value="' + esc(it.name) +
          '" style="width:100%;text-align:left;font-family:var(--sans)"></td>' +
        '<td><select data-wtb="' + i + '">' +
          [['cows', 'На корову'], ['young', 'На молодняк'], ['fixed', 'Сумма в сутки']].map(b =>
          '<option value="' + b[0] + '"' + (b[0] === it.base ? ' selected' : '') + '>' +
          b[1] + '</option>').join('') + '</select></td>' +
        '<td><input type="number" data-wtr="' + i + '" value="' + it.rate +
          '" step="any" style="width:88px"></td>' +
        '<td class="n">' + (r.heads ? f.num(r.heads) : '—') + '</td>' +
        '<td class="n">' + f.num(r.daily) + '</td>' +
        '<td><button class="del" data-wtdel="' + i + '">×</button></td></tr>';
    }).join('');

    return '<div class="card" style="margin-top:14px"><h3>Инженерное обеспечение</h3>' +

      '<div class="kpis" style="margin-bottom:16px">' +
      '<div class="kpi"><div class="lbl">Установленная мощность</div><div class="val">' +
        f.num(E.installed, 0) + '</div><div class="sub">кВт</div></div>' +
      '<div class="kpi"><div class="lbl">Расчётная нагрузка</div><div class="val">' +
        f.num(E.calculated, 0) + '</div><div class="sub">кВт</div></div>' +
      '<div class="kpi good"><div class="lbl">Запросить у сетей</div><div class="val">' +
        f.num(E.requested, 0) + '</div><div class="sub">кВт · ТП ' + f.num(E.transformer) + ' кВА</div></div>' +
      '<div class="kpi"><div class="lbl">Вода в сутки</div><div class="val">' +
        f.num(W.dailyM3, 0) + '</div><div class="sub">м³ · дебит ' + f.num(W.wellFlowPeak, 1) + ' м³/ч</div></div>' +
      '</div>' +

      '<h4>Электропотребители</h4>' +
      '<div class="tw"><table><thead><tr><th>Потребитель</th><th>Зона</th><th>кВт</th>' +
      '<th>Ед.</th><th>Резерв</th><th>Итого, кВт</th><th></th></tr></thead><tbody>' + powerRows +
      '<tr class="tot"><td>Установленная мощность</td><td></td><td></td><td></td><td></td>' +
      '<td class="n">' + f.num(E.installed, 1) + '</td><td></td></tr>' +
      '<tr class="sub"><td>Без резервного оборудования</td><td></td><td></td><td></td><td></td>' +
      '<td class="n">' + f.num(E.working, 1) + '</td><td></td></tr>' +
      '</tbody></table></div>' +
      '<button class="btn" id="addPower" style="margin-top:10px">Добавить потребитель</button>' +

      '<h4>Параметры расчёта</h4>' +
      '<div class="f"><label>Коэффициент одновременности</label>' +
      '<input type="number" data-pwm="simultaneity" value="' + prm.simultaneity + '" step="any">' +
      '<span class="u">%</span></div>' +
      '<div class="f"><label>Запас при запросе сетям</label>' +
      '<input type="number" data-pwm="reserveMargin" value="' + prm.reserveMargin + '" step="any">' +
      '<span class="u">%</span></div>' +
      '<div class="f"><label>Часов работы в год</label>' +
      '<input type="number" data-pwm="hoursPerYear" value="' + prm.hoursPerYear + '" step="any">' +
      '<span class="u">ч</span></div>' +
      '<div class="f"><label>Тариф</label>' +
      '<input type="number" data-pwm="tariff" value="' + prm.tariff + '" step="any">' +
      '<span class="u">₸/кВт·ч</span></div>' +
      '<div class="hint">Годовое потребление ' + f.num(E.annualKwh / 1000) +
      ' тыс. кВт·ч, затраты ' + f.num(E.annualCost) + ' тыс. ₸ в год. ' +
      'Чтобы завести их в модель, добавьте статью на вкладке прочих операционных расходов.</div>' +

      '<h4>Водопотребление</h4>' +
      '<div class="tw"><table><thead><tr><th>Потребность</th><th>База</th><th>Норма</th>' +
      '<th>Голов</th><th>л/сут</th><th></th></tr></thead><tbody>' + waterRows +
      '<tr class="tot"><td>Итого в сутки</td><td></td><td></td><td></td>' +
      '<td class="n">' + f.num(W.dailyL) + '</td><td></td></tr>' +
      '</tbody></table></div>' +
      '<button class="btn" id="addWater" style="margin-top:10px">Добавить потребность</button>' +
      '<div class="hint">' + f.num(W.dailyM3, 1) + ' м³ в сутки, ' + f.num(W.annualM3) +
      ' м³ в год. Требуемый дебит скважины: ' + f.num(W.wellFlow, 1) +
      ' м³/ч при круглосуточной подаче или ' + f.num(W.wellFlowPeak, 1) +
      ' м³/ч при подаче за 12 часов. Рекомендуемый накопитель ' + f.num(W.tankVolume) + ' м³.</div>' +
      '</div>';
  };

  const origEcon = MTF.renderEcon;
  MTF.renderEcon = function (res) {
    return origEcon(res) + MTF.renderUtilitiesCard(res);
  };

  const origBind = MTF.bind;
  MTF.bind = function () {
    origBind();
    const S = MTF.state, upd = () => { MTF.save(); MTF.render(); };
    MTF.ensureUtilities(S);
    const on = (sel, fn) => document.querySelectorAll(sel).forEach(el =>
      el.onchange = () => { fn(el); upd(); });

    on('[data-pwn]', el => S.powerItems[el.dataset.pwn].name = el.value);
    on('[data-pwz]', el => S.powerItems[el.dataset.pwz].zone = el.value);
    on('[data-pwp]', el => S.powerItems[el.dataset.pwp].power = parseFloat(el.value) || 0);
    on('[data-pwq]', el => S.powerItems[el.dataset.pwq].qty = parseFloat(el.value) || 0);
    on('[data-pwr]', el => S.powerItems[el.dataset.pwr].reserve = parseFloat(el.value) || 0);
    on('[data-pwm]', el => S.params.powerParams[el.dataset.pwm] = parseFloat(el.value) || 0);
    on('[data-wtn]', el => S.waterItems[el.dataset.wtn].name = el.value);
    on('[data-wtb]', el => S.waterItems[el.dataset.wtb].base = el.value);
    on('[data-wtr]', el => S.waterItems[el.dataset.wtr].rate = parseFloat(el.value) || 0);

    document.querySelectorAll('[data-pwdel]').forEach(el =>
      el.onclick = () => { S.powerItems.splice(+el.dataset.pwdel, 1); upd(); });
    document.querySelectorAll('[data-wtdel]').forEach(el =>
      el.onclick = () => { S.waterItems.splice(+el.dataset.wtdel, 1); upd(); });

    const a1 = document.getElementById('addPower');
    if (a1) a1.onclick = () => {
      const n = prompt('Название потребителя');
      if (!n) return;
      const z = prompt('Зона (ДМБ / Коровник / Лагуна)', 'Коровник') || 'Прочее';
      S.powerItems.push({ id: 'pw' + Date.now(), name: n, zone: z, power: 0, qty: 1, reserve: 0 });
      upd();
    };
    const a2 = document.getElementById('addWater');
    if (a2) a2.onclick = () => {
      const n = prompt('Название потребности');
      if (n) { S.waterItems.push({ id: 'wt' + Date.now(), name: n, base: 'fixed', rate: 0 }); upd(); }
    };
  };
})();

/* ---------- Сохранение вместе с проектом ---------- */
(function () {
  if (!MTF.initState) return;

  const origInit = MTF.initState;
  MTF.initState = function () {
    const st = origInit();
    st.powerItems = JSON.parse(JSON.stringify(MTF.powerItems));
    st.waterItems = JSON.parse(JSON.stringify(MTF.waterItems));
    st.params.powerParams = JSON.parse(JSON.stringify(MTF.powerParams));
    return st;
  };

  const origLoad = MTF.load;
  MTF.load = function () {
    const st = origLoad();
    if (st) MTF.ensureUtilities(st);
    return st;
  };
})();
