/* ============================================================
   УЧАСТНИКИ И СТРУКТУРА ФИНАНСИРОВАНИЯ

   Всё содержимое раздела правится в интерфейсе: роли сторон,
   их вклад и ответственность, источники средств, запрос
   к инвестору. Суммы, привязанные к расчёту, подставляются
   автоматически — их можно отвязать и вписать вручную.

   Подключается после ui.js.
   ============================================================ */

window.MTF = window.MTF || {};

/* ---------- Стороны проекта ----------
   Всё — свободный текст, правится в карточке.
   Строки добавляются и удаляются.
------------------------------------------------ */
MTF.participants = [
  {
    id: 'pt_init',
    role: 'Инициаторы проекта',
    contributes: 'Отраслевые компетенции: проектирование фермы, подбор и поставка оборудования, закуп поголовья, запуск и операционное управление',
    responsible: 'Подготовительный этап, проектно-сметная документация, строительство, ввод в эксплуатацию, управление фермой',
    receives: 'Вознаграждение управляющей компании, доля в проекте'
  },
  {
    id: 'pt_inv',
    role: 'Инвестор',
    contributes: 'Собственное участие в проекте, обеспечение по кредиту',
    responsible: 'Финансирование проекта, привлечение заёмных средств',
    receives: 'Ферма в собственности, доход от реализации молока и поголовья'
  },
  {
    id: 'pt_state',
    role: 'Государство',
    contributes: 'Меры государственной поддержки: инвестиционные субсидии, субсидия за реализованное молоко, льготная ставка финансирования',
    responsible: 'Программы поддержки АПК, земельные отношения, ветеринарный надзор',
    receives: 'Производство молока в регионе, рабочие места, налоговые поступления'
  }
];

/* ---------- Дополнительные строки в источниках финансирования ----------
   Основные строки (собственное участие, кредит, подготовка, субсидии)
   считаются автоматически. Здесь — то, что нужно добавить руками.
------------------------------------------------ */
MTF.fundingExtra = [];

/* ---------- Тексты раздела ----------
   Правятся в карточке, попадают в документ как есть.
------------------------------------------------ */
MTF.structureTexts = {
  intro: 'Проект реализуется при участии трёх сторон. Инициаторы вносят отраслевые компетенции и берут на себя подготовку и запуск, инвестор обеспечивает финансирование, государство участвует мерами поддержки агропромышленного комплекса.',
  fundingNote: 'Расходы подготовительного этапа вносятся участниками до получения проектного финансирования и в стоимость строительства не входят. Меры государственной поддержки поступают в ходе реализации проекта и уменьшают фактическую нагрузку на инвестора.',
  requestTitle: 'Что требуется от инвестора',
  request: 'Собственное участие в размере, указанном выше, вносится на этапе финансирования проекта. Средства направляются на покрытие доли затрат, не финансируемой заёмными средствами: строительство, оборудование, закуп поголовья.',
  guarantees: 'Инвестор получает ферму в собственность. Актив выступает обеспечением по кредиту. Операционное управление осуществляется Оператором на основании договора управления.'
};

/* ---------- Расчёт ---------- */
MTF.calcStructure = function (p, res) {
  const N = p.project.farmsCount || 1;
  const cap = res.capex, fd = res.funding;
  const subsTotal = res.pnl.reduce((a, y) => a + y.subsidy, 0);
  const prep = MTF.calcPrep ? MTF.calcPrep(p) : null;

  const rows = [
    {
      id: 'own', name: 'Собственное участие инвестора',
      perFarm: fd.equity, total: fd.equity * N,
      share: cap.total > 0 ? fd.equity / cap.total * 100 : 0,
      note: 'вносится на этапе финансирования'
    },
    {
      id: 'loan', name: 'Инвестиционный кредит',
      perFarm: fd.loanTotal, total: fd.loanTotal * N,
      share: cap.total > 0 ? fd.loanTotal / cap.total * 100 : 0,
      note: 'ставка ' + MTF.fmt.num(fd.effectiveRate, 1) + '%, срок ' +
            MTF.fmt.num(p.finance.termYears) + ' лет'
    }
  ];

  (MTF.state && MTF.state.fundingExtra || []).forEach(e => {
    rows.push({
      id: e.id, name: e.name, perFarm: e.perFarm, total: e.perFarm * N,
      share: cap.total > 0 ? e.perFarm / cap.total * 100 : 0,
      note: e.note || '', custom: true
    });
  });

  const totalPerFarm = rows.reduce((a, r) => a + r.perFarm, 0);

  return {
    rows: rows,
    capexTotal: cap.total, capexAll: cap.total * N,
    totalPerFarm: totalPerFarm, totalAll: totalPerFarm * N,
    prepTotal: prep ? prep.grand : 0,
    prepPerInvestor: prep ? prep.perInvestor : 0,
    subsidyTotal: subsTotal, subsidyAll: subsTotal * N,
    farms: N,
    investorNeed: fd.equity,
    investorNeedAll: fd.equity * N
  };
};

/* ---------- Раздел документа ---------- */
(function () {
  if (!MTF.docSections) return;

  const section = {
    id: 'structure',
    title: '2. Участники проекта и структура финансирования',
    enabled: false,
    body: `{{structIntro}}

**Распределение ролей**

{{participantsTable}}

**Источники финансирования**

{{fundingSourcesTable}}

{{structFundingNote}}

**{{structRequestTitle}}**

{{investorRequestTable}}

{{structRequest}}

{{structGuarantees}}`
  };

  // раздел идёт сразу после общей концепции — читатель сначала понимает,
  // кто участвует и сколько нужно денег, и только потом читает про ферму
  const ci = MTF.docSections.findIndex(s => s.id === 'concept');
  if (ci >= 0) MTF.docSections.splice(ci + 1, 0, section);
  else MTF.docSections.unshift(section);

  if (MTF.docModes) {
    ['bizplan', 'passport', 'investment', 'estimate'].forEach(id => {
      const m = MTF.docModes.find(x => x.id === id);
      if (m && m.sections && m.sections.indexOf('structure') < 0) {
        // сразу после концепции
        const i = m.sections.indexOf('farm');
        if (i > 0) m.sections.splice(i, 0, 'structure');
        else m.sections.splice(1, 0, 'structure');
      }
    });
  }

  const orig = MTF.docTables;
  MTF.docTables = function (state, res) {
    const t = orig(state, res);
    const p = state.params, f = MTF.fmt;
    const S = MTF.calcStructure(p, res);
    const parts = (state.participants && state.participants.length)
      ? state.participants : MTF.participants;
    const txt = state.structureTexts || MTF.structureTexts;

    const tbl = (head, rows, alignAll) =>
      '<table class="dt"><thead><tr>' +
      head.map((h, i) => '<th' + (i > 0 && alignAll !== false ? ' class="r"' : '') + '>' + h + '</th>').join('') +
      '</tr></thead><tbody>' + rows.map(r => '<tr>' +
      r.map((c, i) => '<td' + (i > 0 && alignAll !== false ? ' class="r n"' : '') + '>' + c + '</td>').join('') +
      '</tr>').join('') + '</tbody></table>';

    t.structIntro = '<p>' + txt.intro + '</p>';
    t.structFundingNote = '<p>' + txt.fundingNote + '</p>';
    t.structRequestTitle = txt.requestTitle;
    t.structRequest = '<p>' + txt.request + '</p>';
    t.structGuarantees = '<p>' + txt.guarantees + '</p>';

    t.participantsTable = tbl(
      ['Сторона', 'Что вносит', 'За что отвечает', 'Что получает'],
      parts.map(x => [x.role, x.contributes, x.responsible, x.receives]), false);

    t.fundingSourcesTable = tbl(
      ['Источник', 'На 1 ферму, тыс. ₸', 'На ' + S.farms + ' ферм, тыс. ₸', 'Доля'],
      S.rows.map(r => [r.name + (r.note ? ' (' + r.note + ')' : ''),
        f.num(r.perFarm), f.num(r.total), f.pct(r.share, 0)])
        .concat([['<b>Стоимость проекта</b>', '<b>' + f.num(S.capexTotal) + '</b>',
          '<b>' + f.num(S.capexAll) + '</b>', '<b>100%</b>']])
        .concat(S.prepTotal > 0
          ? [['Подготовительный этап (до финансирования)', '—', f.num(S.prepTotal / 1000), 'сверх сметы']]
          : [])
        .concat(S.subsidyTotal > 0
          ? [['Государственная поддержка за период', f.num(S.subsidyTotal), f.num(S.subsidyAll), 'возврат']]
          : []));

    t.investorRequestTable = tbl(['Показатель', 'На 1 ферму', 'На ' + S.farms + ' ферм'], [
      ['Собственное участие, тыс. ₸', f.num(S.investorNeed), f.num(S.investorNeedAll)],
      ['Собственное участие, млн ₸', f.num(S.investorNeed / 1000, 1), f.num(S.investorNeedAll / 1000, 1)],
      ['Доля в стоимости проекта', f.pct(S.capexTotal > 0 ? S.investorNeed / S.capexTotal * 100 : 0, 0), '—'],
      ['Взнос в подготовительный этап, тыс. ₸',
        S.prepPerInvestor > 0 ? f.num(S.prepPerInvestor / 1000) : '—', '—']
    ]);

    return t;
  };
})();

/* ---------- Карточка на вкладке «Экономика» ---------- */
(function () {
  if (!MTF.renderEcon) return;

  MTF.ensureStructure = function (state) {
    if (!Array.isArray(state.participants) || !state.participants.length) {
      state.participants = JSON.parse(JSON.stringify(MTF.participants));
    }
    if (!Array.isArray(state.fundingExtra)) state.fundingExtra = [];
    if (!state.structureTexts) {
      state.structureTexts = JSON.parse(JSON.stringify(MTF.structureTexts));
    }
    return state;
  };

  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');

  MTF.renderStructureCard = function (res) {
    MTF.ensureStructure(MTF.state);
    const P = MTF.state.params, f = MTF.fmt;
    const S = MTF.calcStructure(P, res);
    const parts = MTF.state.participants;
    const extra = MTF.state.fundingExtra;
    const txt = MTF.state.structureTexts;

    const area = (key, label, rows) =>
      '<h4>' + label + '</h4>' +
      '<textarea class="cmt" rows="' + (rows || 3) + '" data-stx="' + key + '" ' +
      'style="width:100%;line-height:1.55">' + esc(txt[key]) + '</textarea>';

    const partRows = parts.map((x, i) =>
      '<tr>' +
      '<td><input type="text" data-prr="' + i + '" value="' + esc(x.role) +
        '" style="width:100%;text-align:left;font-family:var(--sans);font-weight:600"></td>' +
      '<td><textarea class="cmt" rows="3" data-prc="' + i + '" style="margin:0">' + esc(x.contributes) + '</textarea></td>' +
      '<td><textarea class="cmt" rows="3" data-prs="' + i + '" style="margin:0">' + esc(x.responsible) + '</textarea></td>' +
      '<td><textarea class="cmt" rows="3" data-prg="' + i + '" style="margin:0">' + esc(x.receives) + '</textarea></td>' +
      '<td><button class="del" data-prdel="' + i + '">×</button></td></tr>').join('');

    const extraRows = extra.map((e, i) =>
      '<tr>' +
      '<td><input type="text" data-fen="' + i + '" value="' + esc(e.name) +
        '" style="width:100%;text-align:left;font-family:var(--sans)"></td>' +
      '<td><input type="number" data-fev="' + i + '" value="' + e.perFarm + '" step="any" style="width:118px"></td>' +
      '<td><input type="text" data-fet="' + i + '" value="' + esc(e.note) +
        '" style="width:100%;text-align:left;font-family:var(--sans)"></td>' +
      '<td><button class="del" data-fedel="' + i + '">×</button></td></tr>').join('');

    return '<div class="card" style="margin-top:14px"><h3>Участники и структура финансирования</h3>' +

      '<div class="kpis" style="margin-bottom:16px">' +
      '<div class="kpi"><div class="lbl">Нужно от инвестора</div><div class="val">' +
        f.num(S.investorNeed / 1000, 0) + '</div><div class="sub">млн ₸ на ферму</div></div>' +
      '<div class="kpi"><div class="lbl">На весь проект</div><div class="val">' +
        f.num(S.investorNeedAll / 1000, 0) + '</div><div class="sub">млн ₸ · ' + S.farms + ' ферм</div></div>' +
      '<div class="kpi"><div class="lbl">Кредит</div><div class="val">' +
        f.num((S.capexTotal - S.investorNeed) / 1000, 0) + '</div><div class="sub">млн ₸ на ферму</div></div>' +
      '<div class="kpi good"><div class="lbl">Господдержка</div><div class="val">' +
        f.num(S.subsidyTotal / 1000, 0) + '</div><div class="sub">млн ₸ за период</div></div>' +
      '</div>' +

      area('intro', 'Вводный абзац', 3) +

      '<h4>Стороны проекта</h4>' +
      '<div class="tw"><table><thead><tr><th style="min-width:130px">Сторона</th>' +
      '<th style="min-width:200px">Что вносит</th><th style="min-width:200px">За что отвечает</th>' +
      '<th style="min-width:180px">Что получает</th><th></th></tr></thead><tbody>' +
      partRows + '</tbody></table></div>' +
      '<button class="btn" id="addPart" style="margin-top:10px">Добавить сторону</button>' +

      '<h4>Дополнительные источники финансирования</h4>' +
      '<div class="hint" style="margin-top:0">Собственное участие, кредит, подготовительный этап ' +
      'и субсидии считаются автоматически. Здесь добавляются прочие источники: гранты, ' +
      'вклад имуществом, средства соинвесторов.</div>' +
      (extra.length
        ? '<div class="tw"><table><thead><tr><th>Источник</th><th>На 1 ферму, тыс. ₸</th>' +
          '<th>Примечание</th><th></th></tr></thead><tbody>' + extraRows + '</tbody></table></div>'
        : '') +
      '<button class="btn" id="addFundSrc" style="margin-top:10px">Добавить источник</button>' +

      area('fundingNote', 'Пояснение к источникам', 3) +

      '<div class="f wide" style="margin-top:22px"><label>Заголовок блока запроса</label>' +
      '<input type="text" data-stx="requestTitle" value="' + esc(txt.requestTitle) + '"></div>' +
      area('request', 'Что требуется от инвестора', 3) +
      area('guarantees', 'Гарантии и обеспечение', 3) +

      '<div class="hint">Тексты попадают в раздел документа как есть. ' +
      'Суммы в таблицах подставляются из расчёта и обновляются при изменении вводных.</div></div>';
  };

  const origEcon = MTF.renderEcon;
  MTF.renderEcon = function (res) {
    return origEcon(res) + MTF.renderStructureCard(res);
  };

  const origBind = MTF.bind;
  MTF.bind = function () {
    origBind();
    const S = MTF.state, upd = () => { MTF.save(); MTF.render(); };
    MTF.ensureStructure(S);
    const on = (sel, fn) => document.querySelectorAll(sel).forEach(el =>
      el.onchange = () => { fn(el); upd(); });

    on('[data-stx]', el => S.structureTexts[el.dataset.stx] = el.value);
    on('[data-prr]', el => S.participants[el.dataset.prr].role = el.value);
    on('[data-prc]', el => S.participants[el.dataset.prc].contributes = el.value);
    on('[data-prs]', el => S.participants[el.dataset.prs].responsible = el.value);
    on('[data-prg]', el => S.participants[el.dataset.prg].receives = el.value);
    on('[data-fen]', el => S.fundingExtra[el.dataset.fen].name = el.value);
    on('[data-fev]', el => S.fundingExtra[el.dataset.fev].perFarm = parseFloat(el.value) || 0);
    on('[data-fet]', el => S.fundingExtra[el.dataset.fet].note = el.value);

    document.querySelectorAll('[data-prdel]').forEach(el =>
      el.onclick = () => { S.participants.splice(+el.dataset.prdel, 1); upd(); });
    document.querySelectorAll('[data-fedel]').forEach(el =>
      el.onclick = () => { S.fundingExtra.splice(+el.dataset.fedel, 1); upd(); });

    const a1 = document.getElementById('addPart');
    if (a1) a1.onclick = () => {
      const n = prompt('Название стороны');
      if (!n) return;
      S.participants.push({ id: 'pt' + Date.now(), role: n,
        contributes: '', responsible: '', receives: '' });
      upd();
    };
    const a2 = document.getElementById('addFundSrc');
    if (a2) a2.onclick = () => {
      const n = prompt('Название источника');
      if (!n) return;
      S.fundingExtra.push({ id: 'fe' + Date.now(), name: n, perFarm: 0, note: '' });
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
    st.participants = JSON.parse(JSON.stringify(MTF.participants));
    st.fundingExtra = [];
    st.structureTexts = JSON.parse(JSON.stringify(MTF.structureTexts));
    return st;
  };

  const origLoad = MTF.load;
  MTF.load = function () {
    const st = origLoad();
    if (st) MTF.ensureStructure(st);
    return st;
  };
})();
