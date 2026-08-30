/* ============================================================
   ПОДГОТОВИТЕЛЬНЫЙ ЭТАП
   Расходы до получения финансирования и содержание проектной
   команды. Эти деньги вносятся участниками из собственных
   средств до старта кредитования.

   Модуль самодостаточный: подключается после ui.js и сам
   добавляет раздел в документ и карточки в интерфейс.
   Другие файлы не трогает.
   ============================================================ */

window.MTF = window.MTF || {};

/* ---------- Расходы подготовительного этапа ----------
   Суммы в тенге на весь проект, не на одну ферму.
   perFarm: true — статья считается на каждую ферму отдельно
------------------------------------------------ */
MTF.prepCosts = [
  { id: 'pc_land',    name: 'Покупка земельного участка',        sum: 5375000,  perFarm: false },
  { id: 'pc_legal',   name: 'Юридический консалтинг',            sum: 1000000,  perFarm: false },
  { id: 'pc_concept', name: 'Разработка концепции проекта',      sum: 6500000,  perFarm: false },
  { id: 'pc_landreg', name: 'Оформление земельного участка',     sum: 3000000,  perFarm: false },
  { id: 'pc_design',  name: 'Договор на проектирование',         sum: 46062000, perFarm: false },
  { id: 'pc_split',   name: 'Разделение участков',               sum: 12000000, perFarm: false },
  { id: 'pc_topo',    name: 'Топосъёмка',                        sum: 800000,   perFarm: false },
  { id: 'pc_tax',     name: 'Налоговый консалтинг',              sum: 800000,   perFarm: false },
  { id: 'pc_exp',     name: 'Вневедомственная экспертиза',       sum: 20000000, perFarm: false },
  { id: 'pc_geo',     name: 'Геология',                          sum: 15000000, perFarm: false },
  { id: 'pc_well',    name: 'Бурение скважины и паспорт',        sum: 10000000, perFarm: false },
  { id: 'pc_other',   name: 'Прочие затраты',                    sum: 37000000, perFarm: false }
];

/* ---------- Проектная команда ----------
   salary — оклад на руки в тенге в месяц
   months — сколько месяцев содержится
   fixed  — статья не является должностью (командировки, техника)
------------------------------------------------ */
MTF.prepTeam = [
  { id: 'pt_head',    name: 'Руководитель проекта',                salary: 900000,  months: 12 },
  { id: 'pt_pm',      name: 'Проектный менеджер',                  salary: 1200000, months: 12 },
  { id: 'pt_farm',    name: 'Менеджер по фермам',                  salary: 800000,  months: 12 },
  { id: 'pt_build',   name: 'Консультант по строительству',        salary: 800000,  months: 12 },
  { id: 'pt_lawyer',  name: 'Юрист',                               salary: 600000,  months: 12 },
  { id: 'pt_admin',   name: 'Делопроизводитель, администратор',    salary: 500000,  months: 12 },
  { id: 'pt_trip',    name: 'Командировочные расходы',             salary: 500000,  months: 12, fixed: true },
  { id: 'pt_office',  name: 'Административные расходы',            salary: 500000,  months: 6,  fixed: true },
  { id: 'pt_cloth',   name: 'Спецодежда',                          salary: 150000,  months: 4,  fixed: true }
];

/* Начисления на оклад: брутто к сумме на руки */
MTF.prepPayrollRate = 35;
/* Резерв на команду проекта */
MTF.prepReserve = 10;

/* Структура участия в подготовительных расходах */
MTF.prepShare = {
  operator: 30,       // доля оператора / управляющей компании, %
  investors: 70,      // доля инвесторов, %
  investorsCount: 0   // количество инвесторов; 0 = считать автоматически
};

/* ---------- Расчёт ---------- */
MTF.calcPrep = function (p, costs, team) {
  const N = p.project.farmsCount || 1;
  const cList = costs || (MTF.state && MTF.state.prepCosts) || MTF.prepCosts;
  const tList = team || (MTF.state && MTF.state.prepTeam) || MTF.prepTeam;
  const share = (MTF.state && MTF.state.params && MTF.state.params.prepShare) || MTF.prepShare;

  const costRows = cList.map(c => {
    const total = c.perFarm ? c.sum * N : c.sum;
    return { id: c.id, name: c.name, perFarm: c.perFarm, unit: c.sum, total: total };
  });
  const costTotal = costRows.reduce((a, r) => a + r.total, 0);

  const teamRows = tList.map(t => {
    const gross = t.fixed ? t.salary : t.salary * (1 + MTF.prepPayrollRate / 100);
    return {
      id: t.id, name: t.name, fixed: !!t.fixed,
      salary: t.salary, gross: gross, months: t.months,
      total: gross * t.months
    };
  });
  const teamBase = teamRows.reduce((a, r) => a + r.total, 0);
  const teamReserve = teamBase * MTF.prepReserve / 100;
  const teamTotal = teamBase + teamReserve;

  const grand = costTotal + teamTotal;
  const opShare = share.operator / 100;
  const invShare = share.investors / 100;
  // Количество инвесторов: задано вручную либо фермы минус ферма Оператора
  const investors = share.investorsCount > 0
    ? share.investorsCount
    : Math.max(1, N - 1);
  const autoCount = !(share.investorsCount > 0);

  return {
    costRows: costRows, costTotal: costTotal,
    teamRows: teamRows, teamBase: teamBase,
    teamReserve: teamReserve, teamTotal: teamTotal,
    grand: grand,
    farms: N, investorsCount: investors, autoCount: autoCount,
    operatorSum: grand * opShare,
    investorsSum: grand * invShare,
    perInvestor: grand * invShare / investors,
    perFarm: grand / N
  };
};

/* ---------- Раздел документа ---------- */
(function () {
  if (!MTF.docSections) return;

  const section = {
    id: 'prep',
    title: '15. Подготовительный этап',
    enabled: false,
    body: `Расходы подготовительного этапа несутся участниками проекта из собственных средств до получения проектного финансирования. На этой стадии оформляются земельные участки, разрабатывается проектно-сметная документация, проводятся изыскания и экспертиза, формируется проектная команда.

**Расходы до получения финансирования**

{{prepCostTable}}

**Проектная команда**

{{prepTeamTable}}

**Распределение между участниками**

{{prepShareTable}}

Указанные расходы не входят в стоимость строительства фермы и не финансируются за счёт заёмных средств. Суммы приведены на проект в целом и подлежат уточнению по мере заключения договоров.`
  };

  const di = MTF.docSections.findIndex(s => s.id === 'disclaimer');
  if (di >= 0) MTF.docSections.splice(di, 0, section);
  else MTF.docSections.push(section);

  if (MTF.docModes) {
    ['bizplan', 'passport', 'investment', 'estimate'].forEach(id => {
      const m = MTF.docModes.find(x => x.id === id);
      if (m && m.sections && m.sections.indexOf('prep') < 0) {
        const i = m.sections.indexOf('disclaimer');
        if (i >= 0) m.sections.splice(i, 0, 'prep');
        else m.sections.push('prep');
      }
    });
  }

  const orig = MTF.docTables;
  MTF.docTables = function (state, res) {
    const t = orig(state, res);
    const p = state.params, f = MTF.fmt;
    const P = MTF.calcPrep(p);

    const tbl = (head, rows) =>
      '<table class="dt"><thead><tr>' +
      head.map((h, i) => '<th' + (i > 0 ? ' class="r"' : '') + '>' + h + '</th>').join('') +
      '</tr></thead><tbody>' + rows.map(r => '<tr>' +
      r.map((c, i) => '<td' + (i > 0 ? ' class="r n"' : '') + '>' + c + '</td>').join('') +
      '</tr>').join('') + '</tbody></table>';

    t.prepCostTable = tbl(['Статья', 'Сумма, ₸'],
      P.costRows.map(r => [r.name, f.num(r.total)])
        .concat([['<b>Итого</b>', '<b>' + f.num(P.costTotal) + '</b>']]));

    t.prepTeamTable = tbl(['Позиция', 'В месяц, ₸', 'Месяцев', 'Итого, ₸'],
      P.teamRows.map(r => [r.name, f.num(r.gross), f.num(r.months), f.num(r.total)])
        .concat([
          ['Резерв ' + MTF.prepReserve + '%', '', '', f.num(P.teamReserve)],
          ['<b>Итого</b>', '', '', '<b>' + f.num(P.teamTotal) + '</b>']
        ]));

    const sh = (p.prepShare || MTF.prepShare);
    t.prepShareTable = tbl(['Показатель', 'Значение'], [
      ['Расходы до финансирования, ₸', f.num(P.costTotal)],
      ['Проектная команда, ₸', f.num(P.teamTotal)],
      ['<b>Всего подготовительный этап, ₸</b>', '<b>' + f.num(P.grand) + '</b>'],
      ['Доля Оператора (' + f.num(sh.operator) + '%), ₸', f.num(P.operatorSum)],
      ['Доля инвесторов (' + f.num(sh.investors) + '%), ₸', f.num(P.investorsSum)],
      ['Количество инвесторов', f.num(P.investorsCount)],
      ['<b>На одного инвестора, ₸</b>', '<b>' + f.num(P.perInvestor) + '</b>'],
      ['В расчёте на одну ферму, ₸', f.num(P.perFarm)]
    ]);

    return t;
  };
})();

/* ---------- Карточки на вкладке «Экономика» ---------- */
(function () {
  if (!MTF.renderEcon) return;

  MTF.ensurePrep = function (state) {
    if (!Array.isArray(state.prepCosts) || !state.prepCosts.length) {
      state.prepCosts = JSON.parse(JSON.stringify(MTF.prepCosts));
    }
    if (!Array.isArray(state.prepTeam) || !state.prepTeam.length) {
      state.prepTeam = JSON.parse(JSON.stringify(MTF.prepTeam));
    }
    if (!state.params.prepShare) {
      state.params.prepShare = JSON.parse(JSON.stringify(MTF.prepShare));
    }
    if (state.params.prepShare.investorsCount === undefined) {
      state.params.prepShare.investorsCount = 0;
    }
    return state;
  };

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');

  MTF.renderPrepCard = function (res) {
    MTF.ensurePrep(MTF.state);
    const P = MTF.state.params, f = MTF.fmt;
    const costs = MTF.state.prepCosts, team = MTF.state.prepTeam;
    const C = MTF.calcPrep(P);
    const sh = P.prepShare;

    const costRows = costs.map((c, i) =>
      '<tr><td><input type="text" data-pcn="' + i + '" value="' + esc(c.name) +
        '" style="width:100%;text-align:left;font-family:var(--sans)"></td>' +
      '<td><input type="number" data-pcs="' + i + '" value="' + c.sum +
        '" step="any" style="width:124px"></td>' +
      '<td class="n">' + f.num(C.costRows[i].total) + '</td>' +
      '<td><button class="del" data-pcdel="' + i + '">×</button></td></tr>').join('');

    const teamRows = team.map((t, i) =>
      '<tr><td><input type="text" data-ptn="' + i + '" value="' + esc(t.name) +
        '" style="width:100%;text-align:left;font-family:var(--sans)"></td>' +
      '<td><input type="number" data-pts="' + i + '" value="' + t.salary +
        '" step="any" style="width:110px"></td>' +
      '<td><input type="number" data-ptm="' + i + '" value="' + t.months +
        '" step="any" style="width:58px"></td>' +
      '<td class="n">' + f.num(C.teamRows[i].gross) + '</td>' +
      '<td class="n">' + f.num(C.teamRows[i].total) + '</td>' +
      '<td><button class="del" data-ptdel="' + i + '">×</button></td></tr>').join('');

    return '<div class="card" style="margin-top:14px"><h3>Подготовительный этап</h3>' +
      '<div class="note ok">Всего <b>' + f.num(C.grand) + ' ₸</b> на проект. ' +
      'На одного инвестора <b>' + f.num(C.perInvestor) + ' ₸</b>.</div>' +

      '<h4>Расходы до получения финансирования</h4>' +
      '<div class="tw"><table><thead><tr><th>Статья</th><th>Сумма, ₸</th>' +
      '<th>Итого, ₸</th><th></th></tr></thead><tbody>' + costRows +
      '<tr class="tot"><td>Итого</td><td></td><td class="n">' + f.num(C.costTotal) +
      '</td><td></td></tr></tbody></table></div>' +
      '<button class="btn" id="addPrepCost" style="margin-top:10px">Добавить статью</button>' +

      '<h4>Проектная команда</h4>' +
      '<div class="tw"><table><thead><tr><th>Позиция</th><th>На руки, ₸/мес</th>' +
      '<th>Мес.</th><th>Брутто, ₸</th><th>Итого, ₸</th><th></th></tr></thead><tbody>' + teamRows +
      '<tr class="sub"><td>Резерв ' + MTF.prepReserve + '%</td><td></td><td></td><td></td>' +
      '<td class="n">' + f.num(C.teamReserve) + '</td><td></td></tr>' +
      '<tr class="tot"><td>Итого</td><td></td><td></td><td></td>' +
      '<td class="n">' + f.num(C.teamTotal) + '</td><td></td></tr>' +
      '</tbody></table></div>' +
      '<button class="btn" id="addPrepTeam" style="margin-top:10px">Добавить позицию</button>' +

      '<h4>Распределение между участниками</h4>' +
      '<div class="f"><label>Доля Оператора</label>' +
      '<input type="number" data-psh="operator" value="' + sh.operator + '" step="any">' +
      '<span class="u">%</span></div>' +
      '<div class="f"><label>Доля инвесторов</label>' +
      '<input type="number" data-psh="investors" value="' + sh.investors + '" step="any">' +
      '<span class="u">%</span></div>' +
      '<div class="f"><label>Количество инвесторов</label>' +
      '<input type="number" data-psh="investorsCount" value="' +
        (sh.investorsCount || 0) + '" step="1">' +
      '<span class="u">чел</span></div>' +
      '<div class="tw"><table><tbody>' +
      '<tr><td>Доля Оператора</td><td class="n">' + f.num(C.operatorSum) + ' ₸</td></tr>' +
      '<tr><td>Доля инвесторов</td><td class="n">' + f.num(C.investorsSum) + ' ₸</td></tr>' +
      '<tr><td>Инвесторов в проекте' + (C.autoCount ? ' (автоматически)' : '') +
      '</td><td class="n">' + f.num(C.investorsCount) + '</td></tr>' +
      '<tr class="tot"><td>На одного инвестора</td><td class="n">' + f.num(C.perInvestor) + ' ₸</td></tr>' +
      '</tbody></table></div>' +
      (Math.abs(sh.operator + sh.investors - 100) > 0.5
        ? '<div class="note warn">Доли дают ' + f.num(sh.operator + sh.investors) +
          '% вместо 100%.</div>' : '') +
      '<div class="hint">Эти расходы несутся до получения кредита и не входят в стоимость ' +
      'строительства фермы. Количество инвесторов считается как количество ферм минус ферма Оператора.</div></div>';
  };

  const origEcon = MTF.renderEcon;
  MTF.renderEcon = function (res) {
    return origEcon(res) + MTF.renderPrepCard(res);
  };

  const origBind = MTF.bind;
  MTF.bind = function () {
    origBind();
    const S = MTF.state, upd = () => { MTF.save(); MTF.render(); };
    MTF.ensurePrep(S);
    const on = (sel, fn) => document.querySelectorAll(sel).forEach(el =>
      el.onchange = () => { fn(el); upd(); });

    on('[data-pcn]', el => S.prepCosts[el.dataset.pcn].name = el.value);
    on('[data-pcs]', el => S.prepCosts[el.dataset.pcs].sum = parseFloat(el.value) || 0);
    on('[data-ptn]', el => S.prepTeam[el.dataset.ptn].name = el.value);
    on('[data-pts]', el => S.prepTeam[el.dataset.pts].salary = parseFloat(el.value) || 0);
    on('[data-ptm]', el => S.prepTeam[el.dataset.ptm].months = parseFloat(el.value) || 0);
    on('[data-psh]', el => S.params.prepShare[el.dataset.psh] = parseFloat(el.value) || 0);

    document.querySelectorAll('[data-pcdel]').forEach(el =>
      el.onclick = () => { S.prepCosts.splice(+el.dataset.pcdel, 1); upd(); });
    document.querySelectorAll('[data-ptdel]').forEach(el =>
      el.onclick = () => { S.prepTeam.splice(+el.dataset.ptdel, 1); upd(); });

    const a1 = document.getElementById('addPrepCost');
    if (a1) a1.onclick = () => {
      const n = prompt('Название статьи');
      if (n) { S.prepCosts.push({ id: 'pc' + Date.now(), name: n, sum: 0, perFarm: false }); upd(); }
    };
    const a2 = document.getElementById('addPrepTeam');
    if (a2) a2.onclick = () => {
      const n = prompt('Название позиции');
      if (n) { S.prepTeam.push({ id: 'pt' + Date.now(), name: n, salary: 0, months: 12 }); upd(); }
    };
  };
})();

/* ---------- Сохранение вместе с проектом ---------- */
(function () {
  if (!MTF.initState) return;

  const origInit = MTF.initState;
  MTF.initState = function () {
    const st = origInit();
    st.prepCosts = JSON.parse(JSON.stringify(MTF.prepCosts));
    st.prepTeam = JSON.parse(JSON.stringify(MTF.prepTeam));
    st.params.prepShare = JSON.parse(JSON.stringify(MTF.prepShare));
    return st;
  };

  const origLoad = MTF.load;
  MTF.load = function () {
    const st = origLoad();
    if (st) MTF.ensurePrep(st);
    return st;
  };
})();
