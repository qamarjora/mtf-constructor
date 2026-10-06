/* ============================================================
   ПОРЯДОК И НУМЕРАЦИЯ ДОКУМЕНТА
   Единственное место, где задаётся, какие разделы входят в каждый
   вид документа, в каком порядке и что из них приложения.

   Как менять: правьте MTF.docLayout ниже. Номера в заголовки не пишутся —
   основные разделы нумеруются подряд (1, 2, 3 …), приложения получают
   буквы (А, Б, В …), подпункты вида «**3.1.» подтягиваются под номер раздела.

   Подключается после renewal.js (когда все модули уже добавили свои
   разделы) и до feedlot-ui.js. Режим откорма использует свои разделы
   и этим файлом не затрагивается.
   ============================================================ */

(function () {
  if (!MTF.docSections || !MTF.docModes || !MTF.renderDoc) return;

  /* ---------- Названия и признак нумерации ----------
     Название без номера. numbered: false — раздел идёт без номера. */
  MTF.docMeta = {
    summary:        { title: 'Резюме проекта', numbered: true },
    concept:        { title: 'Общая концепция проекта', numbered: true },
    structure:      { title: 'Участники проекта и структура финансирования', numbered: true },
    farm:           { title: 'Описание типовой фермы', numbered: true },
    herddyn:        { title: 'Динамика стада и выход на мощность', numbered: true },
    estimate:       { title: 'Стоимость проекта', numbered: true },
    equipment:      { title: 'Оборудование и техника', numbered: true },
    staff:          { title: 'Персонал и оплата труда', numbered: true },
    deal:           { title: 'Структура сделки', numbered: true },
    stages:         { title: 'Этапы реализации', numbered: true },
    finmodel:       { title: 'Финансовая модель', numbered: true },
    renewal:        { title: 'Обновление основных средств', numbered: true },
    subsidycompare: { title: 'Сравнение сценариев с господдержкой и без', numbered: true },
    consolidated:   { title: 'Консолидация по проекту', numbered: true },
    operator:       { title: 'Роль Оператора', numbered: true },
    limits:         { title: 'Ограничения и обязательства инвестора', numbered: true },
    risks:          { title: 'Риски и их снижение', numbered: true },
    machinery:      { title: 'Машинно-технологический парк', numbered: true },
    prep:           { title: 'Подготовительный этап', numbered: true },
    utilities:      { title: 'Инженерное обеспечение', numbered: true },
    disclaimer:     { title: 'Оговорка', numbered: false }
  };

  /* ---------- Порядок разделов по видам документа ----------
     sections   — что входит и в каком порядке (приложения тоже здесь);
     appendices — какие из них выводятся как приложения, в конце документа.
     «Свой набор» (custom) использует порядок MASTER. */
  MTF.docLayout = {
    estimate: {
      sections: ['concept', 'farm', 'estimate', 'equipment', 'structure', 'stages', 'prep', 'disclaimer'],
      appendices: []
    },
    technical: {
      sections: ['concept', 'farm', 'equipment', 'utilities', 'stages', 'disclaimer'],
      appendices: []
    },
    passport: {
      sections: ['concept', 'structure', 'farm', 'herddyn', 'estimate', 'equipment', 'staff', 'finmodel',
        'renewal', 'subsidycompare', 'stages', 'disclaimer', 'machinery', 'utilities', 'prep'],
      appendices: ['machinery', 'utilities', 'prep']
    },
    bizplan: {
      sections: ['concept', 'structure', 'farm', 'herddyn', 'estimate', 'equipment', 'staff', 'stages',
        'finmodel', 'renewal', 'subsidycompare', 'consolidated', 'operator', 'risks', 'disclaimer',
        'machinery', 'utilities', 'prep'],
      appendices: ['machinery', 'utilities', 'prep']
    },
    /* Инвестиционный вид: «Участники» и «Источники финансирования» встроены в разделы
       «Стоимость проекта» и «Структура сделки», «Обновление основных средств» — в «Финансовую
       модель», консолидация заменена колонками «1 ферма | N ферм» в самих таблицах. */
    investment: {
      sections: ['summary', 'concept', 'farm', 'herddyn', 'estimate', 'deal', 'finmodel',
        'subsidycompare', 'operator', 'stages', 'risks', 'limits', 'disclaimer',
        'equipment', 'machinery', 'utilities', 'staff', 'prep'],
      appendices: ['equipment', 'machinery', 'utilities', 'staff', 'prep']
    }
  };

  /* Общий порядок: для «Своего набора» и для списка галочек на вкладке «Документ» */
  MTF.docMaster = {
    sections: ['summary', 'concept', 'structure', 'farm', 'herddyn', 'estimate', 'deal', 'finmodel', 'renewal',
      'consolidated', 'subsidycompare', 'operator', 'stages', 'risks', 'limits', 'disclaimer',
      'equipment', 'machinery', 'utilities', 'staff', 'prep'],
    appendices: ['equipment', 'machinery', 'utilities', 'staff', 'prep']
  };

  /* ---------- Раздел «Резюме проекта» ---------- */
  const summary = {
    id: 'summary', title: 'Резюме проекта', enabled: false,
    body: `{{summaryIntro}}\n\n**Ключевые показатели**\n\n{{summaryTable}}\n\n{{summaryNote}}\n\n[УТОЧНИТЬ: условия участия инвестора — размер доли, срок, порядок выхода]`
  };
  if (!MTF.docSections.some(function (s) { return s.id === 'summary'; })) MTF.docSections.unshift(summary);

  /* ---------- Применяем: названия без номеров, общий порядок ---------- */
  const byId = {};
  MTF.docSections.forEach(function (s) { byId[s.id] = s; });
  MTF.docSections.forEach(function (s) { if (MTF.docMeta[s.id]) s.title = MTF.docMeta[s.id].title; });
  const ordered = MTF.docMaster.sections.filter(function (id) { return byId[id]; }).map(function (id) { return byId[id]; });
  MTF.docSections.forEach(function (s) { if (ordered.indexOf(s) < 0) ordered.push(s); });   // чужие разделы — в конец
  MTF.docSections.length = 0;
  ordered.forEach(function (s) { MTF.docSections.push(s); });

  MTF.docModes.forEach(function (m) {
    const l = MTF.docLayout[m.id];
    if (l) { m.sections = l.sections.slice(); m.appendices = l.appendices.slice(); }
    else if (m.id === 'custom') { m.sections = null; m.appendices = MTF.docMaster.appendices.slice(); }
  });
  const inv = MTF.docModes.find(function (m) { return m.id === 'investment'; });
  if (inv) inv.hint = 'Для инвесторов: резюме, доходность, условия участия, риски. Подробности в приложениях.';

  /* ---------- Вывод: порядок режима, номера, буквы приложений ---------- */
  const LETTERS = 'АБВГДЕЖИКЛМНПРСТУФХЦЧШЭЮЯ';

  MTF.renderDoc = function (state, res) {
    const data = Object.assign(MTF.buildDocData(state, res), MTF.docTables(state, res));
    const mode = MTF.docModes.find(function (x) { return x.id === state.docMode; });
    const lay = mode && mode.sections ? mode : null;
    const appIds = (mode && mode.appendices) || [];

    let list = state.docSections.filter(function (s) { return s.enabled; });
    if (lay) {   // порядок задаёт вид документа, а не порядок в массиве
      const pos = function (id) { const i = lay.sections.indexOf(id); return i < 0 ? 1e6 : i; };
      list = list.map(function (s, i) { return { s: s, i: i }; })
        .sort(function (a, b) { return (pos(a.s.id) - pos(b.s.id)) || (a.i - b.i); })
        .map(function (x) { return x.s; });
    }
    const isApp = function (s) { return appIds.indexOf(s.id) >= 0; };
    const main = list.filter(function (s) { return !isApp(s); });
    const apps = list.filter(isApp);

    const fill = function (s) {
      let body = s.body;
      Object.keys(data).forEach(function (k) { body = body.split('{{' + k + '}}').join(data[k]); });
      return body;
    };
    let n = 0, a = 0, todo = 0;
    const out = [];

    main.concat(apps).forEach(function (s) {
      let body = fill(s), title = s.title;
      const meta0 = MTF.docMeta && MTF.docMeta[s.id];
      const meta = meta0 && s.title === meta0.title ? meta0 : null;   // у откорма свои заголовки — их не трогаем
      let label = null;
      if (meta) {
        if (isApp(s)) { label = LETTERS[a++] || String(a); title = 'Приложение ' + label + '. ' + meta.title; }
        else if (meta.numbered) { label = String(++n); title = label + '. ' + meta.title; }
        else title = meta.title;
      } else {   // раздел без описания (откорм, добавленный пользователем): прежнее правило
        const m = title.match(/^(\d+)\.\s*(.+)$/);
        if (m) { n++; label = String(n); title = n + '. ' + m[2]; }
      }
      if (label) body = body.replace(/(^|\n)\*\*\d+\.(\d+)\./g, function (_, pre, k) { return pre + '**' + label + '.' + k + '.'; });
      const html = (typeof mdLite === 'function' ? mdLite(body) : body)
        .replace(/\[УТОЧНИТЬ[^\]]*\]/g, function (m) { todo++; return '<mark class="todo">' + m + '</mark>'; });
      out.push({ title: title, body: html, appendix: isApp(s) });
    });
    MTF._todoCount = todo;
    return out;
  };

  /* ---------- Данные для «Резюме проекта» ---------- */
  const origTables = MTF.docTables;
  MTF.docTables = function (state, res) {
    const t = origTables(state, res);
    const p = state.params, f = MTF.fmt, N = Math.max(1, p.project.farmsCount || 1);
    const fd = res.funding, cx = res.capex, mt = res.metrics, tgt = res.herd.meta.target;
    // первый год, когда стадо вышло на мощность (иначе последний год расчёта)
    let iy = res.herd.findIndex(function (y) { return y.cows >= tgt * 0.99; });
    if (iy < 0) iy = res.herd.length - 1;
    const yr = res.herd[iy], pn = res.pnl[iy];
    const row = function (name, one, all, bold) {
      const b = function (x) { return bold ? '<b>' + x + '</b>' : x; };
      return [b(name), b(one), b(all)];
    };
    const tbl = function (head, rows) {
      return '<table class="dt"><thead><tr>' + head.map(function (h, i) { return '<th' + (i > 0 ? ' class="r"' : '') + '>' + h + '</th>'; }).join('') +
        '</tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + r.map(function (c, i) { return '<td' + (i > 0 ? ' class="r n"' : '') + '>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
    };
    const num = function (v) { return f.num(v); }, all = function (v) { return f.num(v * N); };
    const rows = [
      row('Фуражных коров на мощности, гол.', num(tgt), all(tgt)),
      row('Молока на мощности (' + yr.year + ' г.), тыс. л в год', num(yr.milkLiters / 1000), all(yr.milkLiters / 1000)),
      row('Стоимость проекта, тыс. ₸', num(cx.total), all(cx.total), true),
      row('в т.ч. кредит, тыс. ₸', num(fd.loanTotal), all(fd.loanTotal)),
      row('в т.ч. собственное участие, тыс. ₸', num(fd.equity), all(fd.equity)),
      row('Выручка на мощности (' + yr.year + ' г.), тыс. ₸', num(pn.revenue), all(pn.revenue)),
      row('EBITDA на мощности (' + yr.year + ' г.), тыс. ₸', num(pn.ebitda), all(pn.ebitda)),
      row('NPV, тыс. ₸', num(mt.npv), all(mt.npv), true),
      row('IRR проекта', f.pct(mt.irr * 100), f.pct(mt.irr * 100)),
      row('Срок окупаемости, лет', f.num(mt.payback, 1), f.num(mt.payback, 1)),
      row('DSCR: минимум за весь срок / со 2-го года', f.num(mt.minDscr, 2) + ' / ' + f.num(mt.minDscrY2, 2),
        f.num(mt.minDscr, 2) + ' / ' + f.num(mt.minDscrY2, 2))
    ];
    t.summaryTable = tbl(['Показатель', '1 ферма', N + ' ферм'], rows);
    t.summaryIntro = 'Проект предусматривает создание **' + N + ' молочно-товарных ферм** мощностью ' + f.num(tgt) +
      ' фуражных коров каждая (' + f.num(tgt * N) + ' коров по проекту в целом). Основной продукт — сырое молоко; ' +
      'дополнительно реализуются телята, лишний молодняк и выбракованные коровы.';
    t.summaryNote = 'Показатели «' + N + ' ферм» равны показателям одной фермы, умноженным на ' + N +
      ': фермы приняты одинаковыми, общие затраты проекта уже распределены между ними поровну. ' +
      'IRR, срок окупаемости и DSCR от числа ферм не зависят. Суммы в тыс. ₸. ' +
      (MTF.prepModeOf && MTF.prepModeOf(p) === 'in_project'
        ? 'Подготовительный этап включён в стоимость проекта.'
        : 'Подготовительный этап (отдельный вклад инициаторов) в стоимость проекта и показатели не входит.');
    return t;
  };
  /* ---------- Блоки и таблицы для инвестиционного вида ---------- */
  const cap = function (txt) { return '<p><i>' + txt + '</i></p>'; };
  const html2 = function (head, rows) {
    return '<table class="dt"><thead><tr>' + head.map(function (h, i) { return '<th' + (i > 0 ? ' class="r"' : '') + '>' + h + '</th>'; }).join('') +
      '</tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + r.map(function (c, i) { return '<td' + (i > 0 ? ' class="r n"' : '') + '>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
  };
  const cloneState = function (state) {
    return Object.assign({}, state, {
      params: JSON.parse(JSON.stringify(state.params)),
      capexItems: JSON.parse(JSON.stringify(state.capexItems)),
      subsidies: JSON.parse(JSON.stringify(state.subsidies))
    });
  };

  const origTables2 = MTF.docTables;
  MTF.docTables = function (state, res) {
    const t = origTables2(state, res);
    const p = state.params, f = MTF.fmt, N = Math.max(1, p.project.farmsCount || 1);
    const inv = state.docMode === 'investment';
    const tgt = res.herd.meta.target;
    let iy = res.herd.findIndex(function (y) { return y.cows >= tgt * 0.99; });
    if (iy < 0) iy = res.herd.length - 1;
    const prepIn = MTF.prepModeOf && MTF.prepModeOf(p) === 'in_project';

    // вознаграждение Оператора в деньгах: на ферму и на проект
    const fee = res.pnl[iy].operatorFee || 0;
    t.operatorFeeAmount = fee > 0
      ? 'На мощности (' + res.pnl[iy].year + ' г.) оно составляет ' + f.num(fee) + ' тыс. ₸ в год на одну ферму и ' + f.num(fee * N) + ' тыс. ₸ на ' + N + ' ферм.'
      : '';

    // проект в целом по годам = одна ферма × N
    t.projPnlBlock = cap('Проект в целом, ' + N + ' ферм, тыс. ₸ (одна ферма × ' + N + ')') +
      html2(['Год', 'Выручка', 'Субсидии', 'Затраты', 'EBITDA', 'Платёж по кредиту', 'EBITDA после платежа'],
        res.pnl.map(function (y, i) {
          const pay = res.debt[i] ? res.debt[i].payment : 0, cost = y.opex + y.operatorFee;
          return [y.year, f.num(y.revenue * N), f.num(y.subsidy * N), f.num(cost * N), f.num(y.ebitda * N),
            f.num(pay * N), f.num((y.ebitda - pay) * N)];
        }));

    // чувствительность: каждый сценарий — полный пересчёт модели
    const base = { npv: res.metrics.npv, irr: res.metrics.irr, d2: res.metrics.minDscrY2 };
    const scen = [['Базовый сценарий', null],
      ['Цена молока −10%', function (s) { s.params.prices.milk *= 0.9; }],
      ['Капзатраты на строительство и оборудование +10%', function (s) {
        s.capexItems.forEach(function (it) { if (it.group === 'build' || it.group === 'equip') it.value *= 1.1; }); }],
      ['Ставка по кредиту +2 п.п.', function (s) { s.params.finance.rate += 2; }],
      ['Без государственной поддержки', function (s) { s.subsidies.forEach(function (x) { x.enabled = false; }); }]];
    t.riskSensTable = html2(['Сценарий', 'NPV, тыс. ₸', 'Изменение NPV', 'IRR', 'DSCR со 2-го года'],
      scen.map(function (sc) {
        let m = base;
        if (sc[1]) {
          const s2 = cloneState(state); sc[1](s2);
          const r2 = MTF.runModel(s2); m = { npv: r2.metrics.npv, irr: r2.metrics.irr, d2: r2.metrics.minDscrY2 };
        }
        return [sc[0], f.num(m.npv), sc[1] ? (Math.abs(m.npv - base.npv) < 0.5 ? '0' : (m.npv - base.npv >= 0 ? '+' : '−') + f.num(Math.abs(m.npv - base.npv))) : '—',
          m.irr !== null && m.irr !== undefined ? f.pct(m.irr * 100) : '—', isFinite(m.d2) ? f.num(m.d2, 2) : '—'];
      }));
    t.riskSensTable += '\n<p><i>Ставка по кредиту влияет на покрытие долга (DSCR), но не на NPV и IRR проекта. Значение DSCR ниже 1 означает, что операционного дохода не хватает на платежи по кредиту.</i></p>';

    // блоки, которые подмешиваются только в инвестиционный вид
    t.estimateTotalBlock = inv ? '' : '**Стоимость проекта в целом**\n\n' + (t.estimateTotalTable || '');
    t.prepShortNote = prepIn
      ? 'Подготовительный этап включён в стоимость проекта.'
      : 'Подготовительный этап (расходы инициаторов до финансирования) в стоимость проекта не входит, его итоги — в разделе «Структура сделки».';
    t.estimateFundingBlock = inv
      ? ['**Источники финансирования**', t.fundingSourcesTable || '', t.prepShortNote,
         '**Что требуется от инвестора**', t.investorRequestTable || '', t.structRequest || ''].join('\n\n')
      : '';
    t.prepDealBlock = [cap('Подготовительный этап, тыс. ₸: на одну ферму и на проект в целом'),
      t.prepShareTable || '', t.prepModeNote || ''].join('\n\n');
    t.finRenewalBlock = inv
      ? ['**8.7. Обновление основных средств**', t.renewalIntro || '',
         cap('Нормативные сроки службы, одна ферма'), t.renewalCyclesTable || '',
         cap('График обновления, одна ферма, тыс. ₸'), t.renewalScheduleTable || '', t.renewalNote || ''].join('\n\n')
      : '';
    return t;
  };

  /* Счётчик мест «УТОЧНИТЬ» над документом */
  const origTab = MTF.renderDocTab;
  if (origTab) MTF.renderDocTab = function (res) {
    const out = origTab.apply(this, arguments), n = MTF._todoCount || 0;
    const note = n ? '<div class="note warn no-print">В документе мест, помеченных «УТОЧНИТЬ» (жёлтым): <b>' + n +
      '</b>. Их нужно заполнить или подтвердить до отправки.</div>' : '';
    return out.replace('<div class="doc-wrap">', note + '<div class="doc-wrap">');
  };
})();
