/* ============================================================
   ОБНОВЛЕНИЕ ОСНОВНЫХ СРЕДСТВ

   Плановая замена оборудования и техники по нормативным срокам
   службы. Расходы встают в денежные потоки того года, в котором
   наступает замена, и индексируются на рост затрат.

   Сроки, доли обновления и группы правятся в интерфейсе.
   Наименования конкретных позиций в документ не выносятся —
   обновление показывается группами.

   Подключается после ui.js.
   ============================================================ */

window.MTF = window.MTF || {};

/* ---------- Циклы обновления ----------
   base   — от какой группы капзатрат считается сумма: build | equip | herd
   years  — нормативный срок службы, лет
   share  — доля первоначальной стоимости группы, %
   repeat — повторять цикл до конца горизонта
------------------------------------------------ */
MTF.renewalCycles = [
  {
    id: 'rn_fast',
    name: 'Быстроизнашиваемое оборудование и инвентарь',
    base: 'equip', years: 5, share: 10, repeat: true
  },
  {
    id: 'rn_tech',
    name: 'Сельскохозяйственная техника',
    base: 'equip', years: 8, share: 35, repeat: true
  },
  {
    id: 'rn_equip',
    name: 'Технологическое оборудование фермы',
    base: 'equip', years: 10, share: 45, repeat: true
  }
];

/* Учитывать обновление в денежных потоках, а не только показывать таблицей */
MTF.renewalInCashFlow = true;

/* ---------- Расчёт ---------- */
MTF.calcRenewal = function (p, res, cycles) {
  const list = cycles || (MTF.state && MTF.state.renewalCycles) || MTF.renewalCycles;
  const n = p.project.horizon;
  const y0 = p.project.startYear;
  const inf = 1 + p.prices.costInflation / 100;
  const groups = res.capex.groups;

  const byYear = new Array(n).fill(0);
  const events = [];

  list.forEach(c => {
    const base = groups[c.base] || 0;
    const amount = base * c.share / 100;
    if (amount <= 0 || c.years <= 0) return;
    for (let y = c.years; y < n; y += c.years) {
      events.push({
        idx: y, year: y0 + y, cycleId: c.id, name: c.name,
        base: c.base, share: c.share, years: c.years,
        amountBase: amount,
        amount: amount * Math.pow(inf, y)
      });
      byYear[y] += amount * Math.pow(inf, y);
      if (!c.repeat) break;
    }
  });

  events.sort((a, b) => a.idx - b.idx || a.years - b.years);

  return {
    cycles: list, events: events, byYear: byYear,
    total: byYear.reduce((a, b) => a + b, 0),
    groups: groups
  };
};

/* ---------- Встраивание в денежные потоки ----------
   Оборачиваем runModel: после основного расчёта пересобираем
   денежные потоки с учётом расходов на обновление. Метрики
   пересчитываются на новых потоках.
------------------------------------------------ */
(function () {
  const origRun = MTF.runModel;

  MTF.runModel = function (state) {
    const res = origRun.apply(this, arguments);
    const p = state.params;

    const cycles = (state.renewalCycles && state.renewalCycles.length)
      ? state.renewalCycles : MTF.renewalCycles;
    const enabled = state.renewalEnabled !== false && MTF.renewalInCashFlow;

    const rn = MTF.calcRenewal(p, res, cycles);
    res.renewal = rn;

    if (!enabled || rn.total <= 0) return res;

    /* Расход на обновление уменьшает свободный поток того года.
       Операционная EBITDA не трогается — это капитальные вложения,
       а не операционные затраты. */
    let cash = 0, minCash = Infinity, gapYear = null;
    res.cf.rows.forEach((r, i) => {
      const spend = rn.byYear[i] || 0;
      r.renewal = spend;
      r.invest = r.invest - spend;
      r.net = r.net - spend;
      r.fcf = r.fcf - spend;
      r.cfe = r.cfe - spend;
      cash += r.net;
      r.cumulative = cash;
      if (cash < minCash) minCash = cash;
      if (cash < -1 && gapYear === null) gapYear = r.year;
    });
    res.cf.minCash = minCash;
    res.cf.gapYear = gapYear;

    res.metrics = MTF.calcMetrics(p, res.cf, res.capex, res.funding,
      res.pnl, res.debt, res.herd, false);

    if (res.noSubsidy) {
      let c2 = 0;
      res.noSubsidy.cf.rows.forEach((r, i) => {
        const spend = rn.byYear[i] || 0;
        r.invest -= spend; r.net -= spend; r.fcf -= spend; r.cfe -= spend;
        c2 += r.net; r.cumulative = c2;
      });
      res.noSubsidy.metrics = MTF.calcMetrics(p, res.noSubsidy.cf, res.capex,
        res.noSubsidy.funding, res.noSubsidy.pnl, res.noSubsidy.debt, res.herd, true);
    }

    return res;
  };
})();

/* ---------- Раздел документа ---------- */
(function () {
  if (!MTF.docSections) return;

  const section = {
    id: 'renewal',
    title: '18. Обновление основных средств',
    enabled: false,
    body: `{{renewalIntro}}

**Нормативные сроки службы**

{{renewalCyclesTable}}

**График обновления**

{{renewalScheduleTable}}

{{renewalNote}}`
  };

  const fi = MTF.docSections.findIndex(s => s.id === 'finmodel');
  const di = MTF.docSections.findIndex(s => s.id === 'disclaimer');
  if (fi >= 0) MTF.docSections.splice(fi + 1, 0, section);
  else if (di >= 0) MTF.docSections.splice(di, 0, section);
  else MTF.docSections.push(section);

  if (MTF.docModes) {
    ['bizplan', 'passport', 'investment'].forEach(id => {
      const m = MTF.docModes.find(x => x.id === id);
      if (m && m.sections && m.sections.indexOf('renewal') < 0) {
        const i = m.sections.indexOf('finmodel');
        if (i >= 0) m.sections.splice(i + 1, 0, 'renewal');
        else m.sections.push('renewal');
      }
    });
  }

  MTF.renewalTexts = {
    intro: 'Проект предусматривает плановое обновление технологического оборудования и техники в течение периода эксплуатации. Сроки замены определяются нормативным сроком службы групп основных средств. Расходы на обновление покрываются из операционного денежного потока и учтены в финансовой модели.',
    note: 'Суммы приведены с учётом индексации на рост затрат и рассчитаны как доля первоначальной стоимости соответствующей группы. Конкретный перечень позиций к замене определяется по фактическому состоянию оборудования на момент обновления.'
  };

  const orig = MTF.docTables;
  MTF.docTables = function (state, res) {
    const t = orig(state, res);
    const p = state.params, f = MTF.fmt;
    const rn = res.renewal || MTF.calcRenewal(p, res);
    const txt = state.renewalTexts || MTF.renewalTexts;
    const GN = { build: 'строительство', equip: 'оборудование и техника', herd: 'поголовье' };

    const tbl = (head, rows) =>
      '<table class="dt"><thead><tr>' +
      head.map((h, i) => '<th' + (i > 0 ? ' class="r"' : '') + '>' + h + '</th>').join('') +
      '</tr></thead><tbody>' + rows.map(r => '<tr>' +
      r.map((c, i) => '<td' + (i > 0 ? ' class="r n"' : '') + '>' + c + '</td>').join('') +
      '</tr>').join('') + '</tbody></table>';

    t.renewalIntro = '<p>' + txt.intro + '</p>';
    t.renewalNote = '<p>' + txt.note + '</p>';

    t.renewalCyclesTable = tbl(
      ['Группа основных средств', 'Срок службы, лет', 'Доля обновления', 'Сумма в ценах проекта, тыс. ₸'],
      rn.cycles.map(c => [c.name, f.num(c.years), f.pct(c.share, 0),
        f.num((rn.groups[c.base] || 0) * c.share / 100)]));

    t.renewalScheduleTable = rn.events.length
      ? tbl(['Год', 'Группа обновления', 'Доля', 'Сумма, тыс. ₸'],
          rn.events.map(e => [f.num(e.year), e.name, f.pct(e.share, 0), f.num(e.amount)])
            .concat([['<b>Итого за период</b>', '', '', '<b>' + f.num(rn.total) + '</b>']]))
      : '<p><i>В пределах горизонта расчёта обновление основных средств не наступает.</i></p>';

    return t;
  };
})();

/* ---------- Карточка на вкладке «Экономика» ---------- */
(function () {
  if (!MTF.renderEcon) return;

  MTF.ensureRenewal = function (state) {
    if (!Array.isArray(state.renewalCycles) || !state.renewalCycles.length) {
      state.renewalCycles = JSON.parse(JSON.stringify(MTF.renewalCycles));
    }
    if (state.renewalEnabled === undefined) state.renewalEnabled = true;
    if (!state.renewalTexts) {
      state.renewalTexts = JSON.parse(JSON.stringify(MTF.renewalTexts));
    }
    return state;
  };

  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');

  MTF.renderRenewalCard = function (res) {
    MTF.ensureRenewal(MTF.state);
    const P = MTF.state.params, f = MTF.fmt;
    const rn = res.renewal || MTF.calcRenewal(P, res);
    const list = MTF.state.renewalCycles;
    const GN = { build: 'Строительство', equip: 'Оборудование и техника', herd: 'Поголовье' };

    const rows = list.map((c, i) =>
      '<tr>' +
      '<td><input type="text" data-rnn="' + i + '" value="' + esc(c.name) +
        '" style="width:100%;text-align:left;font-family:var(--sans)"></td>' +
      '<td><select data-rnb="' + i + '">' + Object.keys(GN).map(g =>
        '<option value="' + g + '"' + (g === c.base ? ' selected' : '') + '>' +
        GN[g] + '</option>').join('') + '</select></td>' +
      '<td><input type="number" data-rny="' + i + '" value="' + c.years + '" step="1" style="width:60px"></td>' +
      '<td><input type="number" data-rns="' + i + '" value="' + c.share + '" step="any" style="width:66px"></td>' +
      '<td><input type="checkbox" data-rnr="' + i + '"' + (c.repeat ? ' checked' : '') +
        ' style="width:17px;height:17px"></td>' +
      '<td class="n">' + f.num((rn.groups[c.base] || 0) * c.share / 100) + '</td>' +
      '<td><button class="del" data-rndel="' + i + '">×</button></td></tr>').join('');

    const sched = rn.events.length
      ? '<div class="tw"><table><thead><tr><th>Год</th><th>Группа</th><th>Доля</th>' +
        '<th>Сумма, тыс. ₸</th></tr></thead><tbody>' +
        rn.events.map(e => '<tr><td class="n">' + f.num(e.year) + '</td><td>' + e.name +
          '</td><td class="n">' + f.pct(e.share, 0) + '</td><td class="n">' +
          f.num(e.amount) + '</td></tr>').join('') +
        '<tr class="tot"><td>Итого за период</td><td></td><td></td><td class="n">' +
        f.num(rn.total) + '</td></tr></tbody></table></div>'
      : '<div class="note ok">В пределах горизонта расчёта обновление не наступает.</div>';

    const shareSum = list.filter(c => c.base === 'equip').reduce((a, c) => a + c.share, 0);

    return '<div class="card" style="margin-top:14px"><h3>Обновление основных средств</h3>' +
      (MTF.state.renewalEnabled
        ? '<div class="note ok">Расходы на обновление учтены в денежных потоках. ' +
          'Всего за период: <b>' + f.num(rn.total) + ' тыс. ₸</b>.</div>'
        : '<div class="note warn">Обновление показывается таблицей, но в денежные потоки ' +
          'не включено — метрики его не учитывают.</div>') +

      '<div class="f"><label>Учитывать в денежных потоках</label>' +
      '<input type="checkbox" data-rnen' + (MTF.state.renewalEnabled ? ' checked' : '') +
      ' style="width:18px;height:18px"><span class="u"></span></div>' +

      '<h4>Циклы обновления</h4>' +
      '<div class="tw"><table><thead><tr><th>Группа основных средств</th><th>База</th>' +
      '<th>Лет</th><th>Доля, %</th><th>Повтор</th><th>Сумма, тыс. ₸</th><th></th></tr></thead><tbody>' +
      rows + '</tbody></table></div>' +
      '<button class="btn" id="addRenewal" style="margin-top:10px">Добавить цикл</button>' +
      (shareSum > 100
        ? '<div class="note warn">Доли по группе «Оборудование и техника» дают ' +
          f.pct(shareSum, 0) + '. Обновляется больше, чем было куплено.</div>' : '') +
      '<div class="hint">Доля считается от первоначальной стоимости группы капзатрат. ' +
      'Повтор означает, что цикл наступает каждые N лет до конца горизонта. ' +
      'Суммы индексируются на рост затрат.</div>' +

      '<h4>График обновления</h4>' + sched +
      '</div>';
  };

  const origEcon = MTF.renderEcon;
  MTF.renderEcon = function (res) {
    return origEcon(res) + MTF.renderRenewalCard(res);
  };

  const origBind = MTF.bind;
  MTF.bind = function () {
    origBind();
    const S = MTF.state, upd = () => { MTF.save(); MTF.render(); };
    MTF.ensureRenewal(S);
    const on = (sel, fn) => document.querySelectorAll(sel).forEach(el =>
      el.onchange = () => { fn(el); upd(); });

    on('[data-rnn]', el => S.renewalCycles[el.dataset.rnn].name = el.value);
    on('[data-rnb]', el => S.renewalCycles[el.dataset.rnb].base = el.value);
    on('[data-rny]', el => S.renewalCycles[el.dataset.rny].years = Math.max(1, Math.round(parseFloat(el.value) || 1)));
    on('[data-rns]', el => S.renewalCycles[el.dataset.rns].share = parseFloat(el.value) || 0);
    on('[data-rnr]', el => S.renewalCycles[el.dataset.rnr].repeat = el.checked);
    document.querySelectorAll('[data-rnen]').forEach(el =>
      el.onchange = () => { S.renewalEnabled = el.checked; upd(); });

    document.querySelectorAll('[data-rndel]').forEach(el =>
      el.onclick = () => { S.renewalCycles.splice(+el.dataset.rndel, 1); upd(); });

    const a = document.getElementById('addRenewal');
    if (a) a.onclick = () => {
      const n = prompt('Название группы основных средств');
      if (!n) return;
      S.renewalCycles.push({ id: 'rn' + Date.now(), name: n,
        base: 'equip', years: 10, share: 10, repeat: true });
      upd();
    };
  };
})();

/* ---------- Сохранение вместе с проектом ---------- */
(function () {
  if (!MTF.initState) return;

  const origInit = MTF.initState;
  MTF.initState = function () {
    const st = origInit();
    st.renewalCycles = JSON.parse(JSON.stringify(MTF.renewalCycles));
    st.renewalEnabled = true;
    st.renewalTexts = JSON.parse(JSON.stringify(MTF.renewalTexts));
    return st;
  };

  const origLoad = MTF.load;
  MTF.load = function () {
    const st = origLoad();
    if (st) MTF.ensureRenewal(st);
    return st;
  };
})();
