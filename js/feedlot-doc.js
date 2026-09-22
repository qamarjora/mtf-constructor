/* ============================================================
   ОТКОРМ БЫЧКОВ — ДОКУМЕНТЫ
   Свои разделы, режимы и таблицы. Генератор, нумерация,
   Word/PDF и правка шаблонов — из doc.js и export.js без изменений:
   на время работы с проектом откорма подменяются справочники.
   Общие финансовые таблицы (метрики, P&L, долг, субсидии) берутся
   из ядра как есть.

   Подключается ПОСЛЕДНИМ, после feedlot-ui.js.
   ============================================================ */

window.MTF = window.MTF || {};

(function () {
  if (!MTF.docSections || !MTF.feedlot) return;
  const FL = MTF.feedlot;
  const isFState = st => MTF.isFeedlot(st && st.params);

  /* ---------- Режимы ---------- */
  FL.docModes = [
    { id: 'estimate', name: 'Смета проекта', label: 'Смета проекта',
      hint: 'Стоимость площадки по группам затрат. Без финансовой модели.',
      sections: ['fl_concept', 'fl_site', 'fl_estimate', 'fl_equipment', 'fl_stages', 'fl_disclaimer'] },
    { id: 'technical', name: 'Техническое описание площадки', label: 'Техническое описание',
      hint: 'Мощность, технология откорма, кормление, оборудование. Для подрядчиков и поставщиков.',
      sections: ['fl_concept', 'fl_site', 'fl_equipment', 'fl_stages', 'fl_disclaimer'] },
    { id: 'passport', name: 'Паспорт проекта', label: 'Паспорт проекта',
      hint: 'Мощность, объёмы реализации, состав затрат. Под инвестиционное субсидирование.',
      sections: ['fl_concept', 'fl_site', 'fl_flow', 'fl_estimate', 'fl_equipment', 'fl_finmodel',
        'fl_subsidycompare', 'fl_stages', 'fl_disclaimer'] },
    { id: 'bizplan', name: 'Бизнес-план', label: 'Бизнес-план',
      hint: 'Полный формат для кредитора: технология, экономика головы, финансирование, чувствительность, риски.',
      sections: ['fl_concept', 'fl_site', 'fl_flow', 'fl_unit', 'fl_estimate', 'fl_equipment', 'fl_stages',
        'fl_finmodel', 'fl_subsidycompare', 'fl_sensitivity', 'fl_risks', 'fl_disclaimer'] },
    { id: 'investment', name: 'Инвестиционное предложение', label: 'Инвестиционное предложение',
      hint: 'Для инвестора: экономика головы, доходность, чувствительность, риски.',
      sections: ['fl_concept', 'fl_unit', 'fl_estimate', 'fl_finmodel', 'fl_subsidycompare',
        'fl_sensitivity', 'fl_risks', 'fl_disclaimer'] },
    { id: 'custom', name: 'Свой набор разделов', label: 'Модель проекта',
      hint: 'Разделы выбираются вручную галочками.', sections: null }
  ];

  /* ---------- Разделы ----------
     {{…}} — подстановки из FL.docData и FL.docTables.
     Номера подпунктов (1.1, 2.3) перенумеровываются генератором сами. */
  FL.docSections = [
    { id: 'fl_concept', title: '1. Общая концепция проекта', enabled: true,
      body: `**1.1. Суть проекта**

Проект предусматривает создание и эксплуатацию откормочной площадки крупного рогатого скота. Место реализации — Республика Казахстан, {{region}} область, {{district}} район.

Площадка закупает бычков живым весом {{weightIn}} кг, откармливает их до {{weightOut}} кг и реализует {{saleModeText}}. Основной продукт — откормленный молодняк КРС для мясоперерабатывающих предприятий.

**1.2. Масштаб проекта**

- Формат: {{formatText}}
- Единовременная вместимость: {{capacity}} голов ({{sections}} секций по {{perSection}} голов)
- Срок откорма одной партии: около {{cycleDays}} дней
- Оборот площадки: {{rotations}} раза в год
- Реализация в рабочем режиме: {{soldPerYear}} голов и {{liveTons}} тонн живого веса в год (среднее с 3-го года)
- Первый завоз поголовья: {{launchText}}
- Горизонт расчёта: {{horizon}} лет ({{startYear}}–{{endYear}} гг.)

**1.3. Инициатор проекта**

{{operator}}`
    },
    { id: 'fl_site', title: '2. Описание площадки и технологии', enabled: true,
      body: `**2.1. Мощность площадки**

{{siteTable}}

**2.2. Технология откорма**

Площадка работает по принципу «всё занято — всё пусто»: секция комплектуется одной партией, после реализации проходит санитарную обработку ({{sanitationDays}} дней) и комплектуется снова. Секции заходят со смещением, поэтому закуп и реализация идут равномерно в течение года.

{{techTable}}

Привес рассчитан с учётом сезонности: в холодные месяцы часть энергии корма уходит на поддержание температуры тела, и суточный привес снижается.

**2.3. Кормление**

{{feedTable}}`
    },
    { id: 'fl_flow', title: '3. Движение поголовья', enabled: false,
      body: `Прогноз закупа, реализации и поголовья на площадке по годам.

{{flowTable}}`
    },
    { id: 'fl_unit', title: '4. Экономика одной головы', enabled: false,
      body: `Расчёт на одну закупленную голову в базовых ценах, без сезонности и инфляции. Падёж уменьшает выручку, затраты на закуп остаются.

{{unitTable}}

**Цена безубыточности** — {{breakEven}}. Это минимальная цена реализации, при которой голова окупает закуп и прямые затраты на откорм. Расчётная цена реализации — {{priceOut}}.

Главные факторы результата — разница цен закупа и реализации, стоимость рациона и суточный привес.`
    },
    { id: 'fl_estimate', title: '5. Стоимость проекта', enabled: true,
      body: `Расчёт стоимости создания площадки.

{{capexTable}}

**Состав затрат**

{{capexItemsTable}}

{{estimateTotalTable}}

Стоимость строительства приведена предварительно и подлежит уточнению по проектно-сметной документации и коммерческим предложениям подрядчиков.`
    },
    { id: 'fl_equipment', title: '6. Оборудование и техника', enabled: true,
      body: `Комплект технологического оборудования и техники площадки.

{{equipTable}}

Оборудование подбирается под формат площадки и климат региона: групповые поилки с подогревом, секционные и кормовые ограждения, система навозоудаления, узел фиксации и взвешивания скота.`
    },
    { id: 'fl_stages', title: '7. Этапы реализации', enabled: true,
      body: `**Этап 1. Подготовительный** — оформление земельного участка, проектирование (ПСД), экспертиза.

**Этап 2. Разрешительный** — разрешения на строительство, ветеринарно-санитарные согласования, подключение инфраструктуры.

**Этап 3. Финансирование** — подготовка пакета документов, получение финансирования.

**Этап 4. Строительство и монтаж** — строительство площадки, монтаж технологического оборудования, закуп техники.

**Этап 5. Комплектование** — первый завоз {{launchText}}, карантин и адаптация ({{adaptDays}} дней). Секции комплектуются со смещением, площадка выходит на полную загрузку в течение одного цикла откорма.

**Этап 6. Эксплуатация** — непрерывный цикл закупа, откорма и реализации.`
    },
    { id: 'fl_finmodel', title: '8. Финансовая модель', enabled: false,
      body: `Расчёт выполнен на горизонте {{horizon}} лет ({{startYear}}–{{endYear}} гг.).

**8.1. Инвестиционные метрики**

{{metricsTable}}

**8.2. Структура финансирования**

{{fundingTable}}

**8.3. Оборотные средства**

{{wcTable}}

**8.4. Прогноз финансовых показателей**

{{pnlTable}}

**8.5. График погашения**

{{debtTable}}

**8.6. Доходность на собственные вложения**

{{exitTable}}

**8.7. Государственная поддержка**

{{subsidyTable}}`
    },
    { id: 'fl_subsidycompare', title: '9. Сравнение сценариев с господдержкой и без', enabled: false,
      body: `Проект просчитан в двух вариантах: с учётом включённых мер государственной поддержки и полностью без них. Сценарий без субсидий показывает, выдерживает ли проект нагрузку самостоятельно, если условия субсидирования изменятся.

{{subsidyComparisonTable}}`
    },
    { id: 'fl_sensitivity', title: '10. Чувствительность проекта', enabled: false,
      body: `Как меняются результаты проекта при отклонении ключевых параметров на 10% от базового сценария. Остальные параметры неизменны.

{{sensitivityTable}}

Минимальный DSCR привязан к одному году и зависит от того, сколько партий реализовано именно в этом году, поэтому может меняться скачкообразно. Устойчивость проекта точнее показывают NPV и EBITDA на голову (среднее с 3-го года).

**Пороговые значения цены реализации**

{{breakEvenTable}}`
    },
    { id: 'fl_risks', title: '11. Риски и их снижение', enabled: true,
      body: `**Ценовые риски** — сужение разницы между ценой закупа бычков и ценой реализации. Главный риск откорма. Снижение: договоры с мясокомбинатами, закуп в сезон низких цен, контроль цены безубыточности.

**Кормовые риски** — рост стоимости кормов, неурожай. Снижение: формирование запасов, договоры с поставщиками, собственная кормовая база в перспективе.

**Производственные риски** — падёж, заболевания, снижение привеса. Снижение: карантин и адаптация, ветеринарный контроль, вакцинация, комфортное содержание и поение.

**Сезонные риски** — снижение привеса в холодный период. Снижение: навесы и ветрозащита, поилки с подогревом, корректировка рациона.

**Финансовые риски** — кассовый разрыв в первые месяцы, пока нет выручки, рост ставок. Снижение: оборотный кредит под закуп поголовья, льготное финансирование, резерв.

**Регуляторные и ветеринарные риски** — изменение правил субсидирования, ограничения на перемещение и вывоз скота. Снижение: базовый сценарий без субсидий, соблюдение ветеринарных требований.

**Строительные риски** — удорожание, срыв сроков. Снижение: фиксированная цена подряда, контроль графика.`
    },
    { id: 'fl_disclaimer', title: 'Оговорка', enabled: true,
      body: `Настоящий документ является информационным материалом и не является офертой. Все финансовые показатели носят прогнозный характер и могут изменяться в зависимости от рыночных условий, цен на скот и корма, условий финансирования и иных факторов. Расчёты подлежат уточнению при подготовке проектно-сметной документации.`
    }
  ];

  /* ---------- Данные для подстановки ---------- */
  const MONTHS_GEN = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе',
    'сентябре', 'октябре', 'ноябре', 'декабре'];

  FL.docData = function (state, res) {
    const p = state.params, F = p.feedlot, A = F.animals, S = F.sale, k = res.feedlot, f = MTF.fmt;
    const u = FL.unitEconomics(p), lm = Number(F.launchMonth) || 0;
    const kgUnit = S.mode === 'carcass' ? ' ₸/кг туши' : ' ₸/кг живого веса';
    return {
      region: p.project.region || '__________',
      district: p.project.district || '__________',
      operator: p.project.operator || '__________',
      startYear: p.project.startYear,
      endYear: p.project.startYear + p.project.horizon - 1,
      horizon: p.project.horizon,
      formatText: (FL.formats[F.format] || '').toLowerCase(),
      capacity: f.num(k.capacity),
      sections: f.num(F.capacity.sections),
      perSection: f.num(res.herd.meta.capacity.perSection),
      soldPerYear: f.num(k.soldPerYear),
      liveTons: f.num(k.liveTonsPerYear),
      cycleDays: f.num(k.avgCycleDays),
      rotations: f.num(k.rotations, 1),
      weightIn: f.num(A.weightIn), weightOut: f.num(A.weightOut),
      adaptDays: f.num(A.adaptDays), sanitationDays: f.num(A.sanitationDays),
      saleModeText: S.mode === 'carcass' ? 'на переработку по убойному весу' : 'живым весом',
      launchText: 'в ' + MONTHS_GEN[lm % 12] + ' ' + (p.project.startYear + Math.floor(lm / 12)) + ' года',
      breakEven: f.num(u.breakEvenPrice) + kgUnit,
      priceOut: f.num(S.mode === 'carcass' ? S.priceCarcass : S.priceOut) + kgUnit
    };
  };

  /* ---------- Чувствительность ---------- */
  function variant(state, mutate) {
    const s = JSON.parse(JSON.stringify(state));
    mutate(s.params.feedlot);
    const r = MTF.runModel(s);
    return { npv: r.metrics.npv, irr: r.metrics.irr, dscr: r.metrics.minDscrY2, margin: r.feedlot.marginPerHead };
  }

  /* Цена реализации, при которой показатель проекта достигает цели (бисекция).
     null — цель недостижима в диапазоне от половины до двойной текущей цены. */
  function solvePrice(state, metric, target) {
    const S = state.params.feedlot.sale, key = S.mode === 'carcass' ? 'priceCarcass' : 'priceOut';
    const at = v => variant(state, F => { F.sale[key] = v; })[metric] - target;
    let lo = S[key] * 0.5, hi = S[key] * 2;
    const flo = at(lo), fhi = at(hi);
    if (!isFinite(flo) || !isFinite(fhi) || flo * fhi > 0) return null;
    for (let i = 0; i < 16; i++) {
      const mid = (lo + hi) / 2, fm = at(mid);
      if (!isFinite(fm)) return null;
      if ((fm < 0) === (flo < 0)) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  FL.sensitivity = function (state) {
    const saleKey = state.params.feedlot.sale.mode === 'carcass' ? 'priceCarcass' : 'priceOut';
    const factors = [
      ['Цена реализации', (F, k) => { F.sale[saleKey] *= k; }],
      ['Цена закупа бычков', (F, k) => { F.sale.priceIn *= k; }],
      ['Стоимость рациона', (F, k) => { F.feed.dmCost *= k; F.feed.dmCostAdapt *= k; }],
      ['Суточный привес', (F, k) => { F.animals.adg *= k; F.animals.adgAdapt *= k; }]
    ];
    const rows = [];
    factors.forEach(([name, fn]) => [0.9, 1.1].forEach(k => rows.push(Object.assign(
      { name: name, delta: k < 1 ? '−10%' : '+10%' }, variant(state, F => fn(F, k))))));
    return {
      base: variant(state, () => {}), rows: rows,
      priceNpv0: solvePrice(state, 'npv', 0),
      priceDscr: solvePrice(state, 'dscr', 1.2)
    };
  };

  /* ---------- Таблицы ---------- */
  const PICK = ['metricsTable', 'fundingTable', 'pnlTable', 'debtTable', 'exitTable',
    'subsidyTable', 'subsidyComparisonTable', 'capexTable'];
  const RELABEL = [['стоимость фермы', 'стоимость площадки'], ['показатели фермы', 'показатели площадки'],
    ['наполнение стада', 'комплектование площадки'], ['проектную продуктивность', 'проектную загрузку']];

  FL.docTables = function (state, res, coreTables) {
    const p = state.params, F = p.feedlot, A = F.animals, fd = F.feed, S = F.sale;
    const f = MTF.fmt, k = res.feedlot, cap = res.herd.meta.capacity;
    const out = {};
    PICK.forEach(key => {
      out[key] = RELABEL.reduce((h, r) => h.split(r[0]).join(r[1]), coreTables[key] || '');
    });

    out.siteTable = dt(['Показатель', 'Значение'], [
      ['Формат', FL.formats[F.format]],
      ['Секций', f.num(F.capacity.sections)],
      ['Голов на секцию (проект)', f.num(F.capacity.headsPerSection)]
    ].concat(cap.limits.map(l => ['Ограничение «' + l.label + '», гол.', f.num(l.value)]))
      .concat([['<b>Расчётная вместимость, гол.</b>', '<b>' + f.num(cap.value) + '</b>']]));

    out.techTable = dt(['Параметр', 'Значение'], [
      ['Живой вес при закупе, кг', f.num(A.weightIn)],
      ['Целевой вес реализации, кг', f.num(A.weightOut)],
      ['Адаптация: дней / привес, г/сут', f.num(A.adaptDays) + ' / ' + f.num(A.adgAdapt)],
      ['Привес на откорме, г/сут', f.num(A.adg)],
      ['Срок откорма с учётом сезонности, дней', f.num(k.avgCycleDays)],
      ['Предельный срок откорма, дней', f.num(A.maxDays)],
      ['Падёж за цикл, %', f.num(A.mortality, 1)],
      ['Оборот площадки, раз в год', f.num(k.rotations, 2)]
    ]);

    out.feedTable = dt(['Параметр', 'Значение'], [
      ['Потребление сухого вещества, % живого веса', f.num(fd.dmiPct, 1)],
      ['Стоимость 1 кг СВ: адаптация / откорм, ₸', f.num(fd.dmCostAdapt) + ' / ' + f.num(fd.dmCost)],
      ['Конверсия корма, кг СВ на кг привеса', f.num(k.fcr, 1)],
      ['Подстилка, кг на голову в сутки', f.num(fd.beddingKg, 1)]
    ]);

    out.flowTable = dt(['Год', 'Закуплено', 'Реализовано', 'Падёж', 'Среднее поголовье', 'Живой вес, т', 'Привес, т'],
      res.herd.map(y => [y.year, f.num(y.bought), f.num(y.sold), f.num(y.dead), f.num(y.headsAvg),
        f.num(y.liveKgSold / 1000), f.num(y.gainKg / 1000)]));

    const u = FL.unitEconomics(p);
    out.unitTable = dt(['Статья', 'Тыс. ₸ на голову'], [
      ['Выручка от реализации', f.num(u.revenue, 1)],
      ['Закуп бычка', '−' + f.num(u.purchase, 1)],
      ['Корма', '−' + f.num(u.feed, 1)],
      ['Подстилка', '−' + f.num(u.bedding, 1)],
      ['Ветеринария', '−' + f.num(u.vet, 1)],
      ['Доставка и приёмка', '−' + f.num(u.extra, 1)],
      ['Энергия, вода, прочее', '−' + f.num(u.other, 1)],
      ['<b>Маржа до оплаты труда и постоянных расходов</b>', '<b>' + f.num(u.margin, 1) + '</b>']
    ]) + '\n' + dt(['Показатель', 'Значение'], [
      ['Срок откорма, дней', f.num(u.days)],
      ['Привес за цикл, кг', f.num(u.gain)],
      ['Конверсия корма, кг СВ на кг привеса', f.num(u.fcr, 1)],
      ['Себестоимость 1 кг привеса без закупа, ₸', f.num(u.costPerKgGain)]
    ]);

    const rateLine = MTF.rateNote(p, res.capex.rows.map(r => r.cur));
    const GN = { build: 'Строительство', equip: 'Оборудование и техника', herd: 'Поголовье' };
    out.capexItemsTable = rateLine + dt(['Статья', 'Группа', 'Тыс. ₸'],
      res.capex.rows.map(r => [r.name, GN[r.group] || r.group, f.num(r.sum)])
        .concat(res.capex.reserve > 0
          ? [['Резерв на непредвиденные расходы (' + MTF.capexReserve + '% от строительства и оборудования)', 'Строительство', f.num(res.capex.reserve)]]
          : [])
        .concat([['<b>Итого</b>', '', '<b>' + f.num(res.capex.total) + '</b>']]));

    const perPlace = cap.value > 0 ? (res.capex.groups.build + res.capex.groups.equip) / cap.value : 0;
    out.estimateTotalTable = dt(['Показатель', 'Значение'], [
      ['Стоимость проекта, млн ₸', f.num(res.capex.total / 1000, 1)],
      ['Вместимость, гол.', f.num(cap.value)],
      ['Строительство и оборудование на 1 скотоместо, тыс. ₸', f.num(perPlace)]
    ]);

    const eq = res.capex.rows.filter(r => r.group === 'equip');
    const SN = { 'наше': 'Технологическое оборудование', 'техника': 'Техника' };
    const dc = MTF.dispCur(p), dsg = MTF.dispSign(p), dd = dc === 'KZT' ? 0 : 1;
    out.equipTable = rateLine + dt(['Позиция', 'Кол-во', 'Стоимость, тыс. ' + dsg],
      eq.map(r => [(SN[r.sect] ? SN[r.sect] + ': ' : '') + r.name, f.num(r.qty), f.num(MTF.disp(p, r.sum, dc), dd)])
        .concat([['<b>Итого оборудование и техника</b>', '',
          '<b>' + f.num(MTF.disp(p, eq.reduce((a, r) => a + r.sum, 0), dc), dd) + '</b>']]));

    out.wcTable = dt(['Показатель', 'Тыс. ₸'], [
      ['Первичное комплектование в составе капзатрат', f.num(res.capex.groups.herd)],
      ['Пиковая потребность в оборотных средствах (помесячно, первые 24 мес.)', f.num(k.wc.peak)],
      ['Привлечено оборотного кредита в годовом расчёте', f.num(res.cf.wcPeak)],
      ['Лимит оборотного кредита', f.num(res.cf.wcCap)]
    ]) + '\n<p><i>Первые месяцы площадка закупает и кормит скот без выручки. Годовая модель этот ' +
      'разрыв сглаживает, поэтому потребность в оборотных средствах дополнительно рассчитана помесячно.</i></p>';

    /* Чувствительность — десятки пересчётов модели. Считаем, только если
       раздел с её таблицами включён в документ. */
    const needSens = (state.docSections || []).some(s => s.enabled &&
      /\{\{(sensitivityTable|breakEvenTable)\}\}/.test(s.body || ''));
    if (!needSens) return out;
    const sens = FL.sensitivity(state);
    const fmtRow = x => [f.num(x.npv), x.irr !== null && isFinite(x.irr) ? f.pct(x.irr * 100) : '—',
      isFinite(x.dscr) ? x.dscr.toFixed(2) : '—', f.num(x.margin, 1)];
    out.sensitivityTable = dt(['Параметр', 'Изменение', 'NPV, тыс. ₸', 'IRR', 'Мин. DSCR со 2-го года', 'EBITDA на голову, тыс. ₸'],
      [['<b>Базовый сценарий</b>', '—'].concat(fmtRow(sens.base))]
        .concat(sens.rows.map(r => [r.name, r.delta].concat(fmtRow(r)))));

    const unit = S.mode === 'carcass' ? ' ₸/кг туши' : ' ₸/кг ж.в.';
    const pv = v => v === null ? 'не достигается в диапазоне ±50% от текущей' : f.num(v) + unit;
    out.breakEvenTable = dt(['Порог', 'Цена реализации'], [
      ['Текущая цена в расчёте', f.num(S.mode === 'carcass' ? S.priceCarcass : S.priceOut) + unit],
      ['Голова окупает закуп и прямые затраты (без ФОТ и кредита)', f.num(u.breakEvenPrice) + unit],
      ['Проект окупается (NPV = 0)', pv(sens.priceNpv0)],
      ['Покрытие долга DSCR = 1,2 со 2-го года', pv(sens.priceDscr)]
    ]);
    return out;
  };

  /* ---------- Подмена справочников на время работы с документом ---------- */
  function withFeedlotDoc(state, fn) {
    if (!isFState(state)) return fn();
    const saved = { docModes: MTF.docModes, buildDocData: MTF.buildDocData, docTables: MTF.docTables, docHtml: MTF.docHtml };
    const coreTables = saved.docTables;
    MTF.docModes = FL.docModes;
    MTF.buildDocData = (st, res) => FL.docData(st, res);
    MTF.docTables = (st, res) => FL.docTables(st, res, coreTables(st, res));
    MTF.docHtml = function (st, secs) {
      const p = st.params, m = FL.docModes.find(x => x.id === st.docMode) || FL.docModes[FL.docModes.length - 1];
      const r = MTF.lastResult, d = new Date().toLocaleDateString('ru-RU');
      return '<div class="doc-title"><div class="dt-label">' + m.label + '</div>' +
        '<h1>' + (p.project.name || 'Откормочная площадка КРС') + '</h1><div class="dt-meta">' +
        (p.project.region ? p.project.region + ' область' : '__________ область') + ' · ' +
        MTF.fmt.num(r && r.feedlot ? r.feedlot.capacity : 0) + ' голов единовременно · ' +
        (FL.formats[p.feedlot.format] || '').toLowerCase() + '<br>' +
        (p.project.operator || '__________') + ' · ' + d + '</div></div>' +
        secs.map(s => '<section><h2>' + s.title + '</h2>' + s.body + '</section>').join('');
    };
    try { return fn(); }
    finally { Object.assign(MTF, saved); }
  }
  FL.withDoc = withFeedlotDoc;

  const origTab = MTF.renderDocTab;
  MTF.renderDocTab = function (res) {
    return withFeedlotDoc(MTF.state, () => origTab.call(this, res));
  };

  const origApply = MTF.applyDocMode;
  MTF.applyDocMode = function (state, modeId) {
    return withFeedlotDoc(state, () => origApply.call(this, state, modeId));
  };

  ['expWord', 'expPdf'].forEach(id => {
    const orig = MTF.export && MTF.export[id];
    if (orig) MTF.export[id] = function () {
      const args = arguments;
      return withFeedlotDoc(MTF.state, () => orig.apply(this, args));
    };
  });

  /* Сохранённые разделы откорма сливаются со своим набором, а не с набором МТФ */
  const origMerge = MTF.mergeDocSections;
  MTF.mergeDocSections = function (saved) {
    const isFl = Array.isArray(saved) && saved.some(s => s && String(s.id).indexOf('fl_') === 0);
    if (!isFl) return origMerge.apply(this, arguments);
    const base = MTF.docSections;
    MTF.docSections = FL.docSections;
    try { return origMerge.apply(this, arguments); }
    finally { MTF.docSections = base; }
  };

  FL.defaultDocSections = function (modeId) {
    const secs = JSON.parse(JSON.stringify(FL.docSections));
    const m = FL.docModes.find(x => x.id === modeId);
    if (m && m.sections) secs.forEach(s => { s.enabled = m.sections.indexOf(s.id) >= 0; });
    return secs;
  };

  /* ---------- CSV ---------- */
  const origCsv = MTF.export && MTF.export.expCsv;
  if (origCsv) MTF.export.expCsv = function () {
    if (!isFState(MTF.state)) return origCsv.apply(this, arguments);
    const r = MTF.lastResult, rows = [], add = a => rows.push(a.join(';'));
    add(['ДВИЖЕНИЕ ПОГОЛОВЬЯ']);
    add(['Год', 'Закуплено', 'Реализовано', 'Падёж', 'Среднее поголовье', 'На конец года',
      'Живой вес реализации, кг', 'Привес, кг', 'Конверсия корма']);
    r.herd.forEach(y => add([y.year, Math.round(y.bought), Math.round(y.sold), Math.round(y.dead), Math.round(y.headsAvg),
      Math.round(y.headsEnd), Math.round(y.liveKgSold), Math.round(y.gainKg), y.fcr.toFixed(2)]));
    add([]); add(['ФИНАНСОВЫЕ ПОКАЗАТЕЛИ, тыс. тенге']);
    add(['Год', 'Выручка', 'Субсидии', 'Затраты', 'Оператор', 'EBITDA', 'Маржа %', 'Себестоимость кг ж.в., тенге']);
    r.pnl.forEach(y => add([y.year, Math.round(y.revenue), Math.round(y.subsidy), Math.round(y.opex),
      Math.round(y.operatorFee), Math.round(y.ebitda), y.margin.toFixed(1), y.costPerKgLive.toFixed(0)]));
    add([]); add(['ГРАФИК ПОГАШЕНИЯ']);
    add(['Год', 'Остаток на начало', 'Проценты', 'Основной долг', 'Платёж', 'Остаток на конец', 'Оборотный', 'DSCR']);
    r.debt.forEach((d, i) => add([d.year, Math.round(d.opening), Math.round(d.interest), Math.round(d.principal),
      Math.round(d.payment), Math.round(d.closing), Math.round(r.cf.rows[i].wcBalance),
      r.metrics.dscr[i].value !== null ? r.metrics.dscr[i].value.toFixed(2) : '']));
    add([]); add(['КАПИТАЛЬНЫЕ ЗАТРАТЫ']);
    add(['Статья', 'Группа', 'Сумма, тыс. тенге']);
    r.capex.rows.forEach(c => add([c.name, c.group, Math.round(c.sum)]));
    add(['Резерв', '', Math.round(r.capex.reserve)]);
    add(['ИТОГО', '', Math.round(r.capex.total)]);
    add([]); add(['МЕТРИКИ']);
    add(['NPV', Math.round(r.metrics.npv)]);
    add(['IRR проекта, %', r.metrics.irr !== null ? (r.metrics.irr * 100).toFixed(1) : '']);
    add(['Мин. DSCR со 2-го года', isFinite(r.metrics.minDscrY2) ? r.metrics.minDscrY2.toFixed(2) : '']);
    add(['Пик оборотных средств, тыс. тенге', Math.round(r.feedlot.wc.peak)]);
    download(new Blob(['\ufeff' + rows.join('\n')], { type: 'text/csv;charset=utf-8' }), fname('csv'));
  };
})();
