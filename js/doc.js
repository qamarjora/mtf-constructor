/* ============================================================
   ГЕНЕРАТОР ДОКУМЕНТА  v1.1
   ============================================================ */

window.MTF = window.MTF || {};

MTF.docSections = [
  {
    id: 'concept', title: '1. Общая концепция проекта', enabled: true,
    body: `**1.1. Суть проекта**

Проект представляет собой создание и эксплуатацию сети современных молочно-товарных ферм (МТФ) на территории {{region}} области Республики Казахстан.

Основной продукт — сырое молоко, реализуемое на перерабатывающие предприятия региона. Дополнительными направлениями являются реализация телят и выбракованного поголовья.

**1.2. Масштаб проекта**

- Количество ферм: {{farmsCount}} единиц
- Проектная мощность фермы: {{capacityCows}} фуражных коров ({{cowPlaces}} дойных, {{dryPlaces}} сухостойных)
- Совокупная мощность проекта: {{totalCows}} фуражных коров
- Тип фермы: молочно-товарная, беспривязного содержания
- Воспроизводство: искусственное осеменение
- Стартовое поголовье: {{startHeifers}} нетелей, завоз в {{batches}} партии

**1.3. Регион реализации**

Место реализации: {{region}} область, {{district}} район.

**1.4. Структура участия**

Проект реализуется по консорциальной модели: {{farmsCount}} самостоятельных ферм, каждая из которых принадлежит отдельному инвестору, при едином Операторе, обеспечивающем стандартизацию технологических, производственных и финансовых процессов.

**1.5. Оператор проекта**

Оператором выступает {{operator}}. Оператор совмещает функции участника консорциума, инвестора — собственника одной из ферм, и управляющей компании.`
  },
  {
    id: 'farm', title: '2. Описание типовой фермы', enabled: true,
    body: `**2.1. Ёмкость комплекса**

{{capacityTable}}

**2.2. Продуктивность**

{{productionTable}}

**2.3. Производственный цикл**

Движение поголовья по зонам комплекса:

- Завозное поголовье проходит карантин продолжительностью {{quarantineDays}} дней
- Дойные коровы содержатся в коровнике, осеменение проводится в зоне доильно-молочного блока
- За {{dryDays}} дней до отёла корова переводится в родильно-сухостойный блок
- Отёл и последующие {{calvingPenDays}} дней — родильное отделение
- После отёла корова возвращается в дойное стадо, телёнок переводится в телятник
- В возрасте {{calfSaleAge}} мес. телята переводятся из телятника: тёлочки — в группу ремонтного молодняка, бычки — на реализацию
- Ремонтные тёлки содержатся до возраста первого отёла ({{firstCalvingMo}} мес.), после чего вводятся в основное стадо

Воспроизводство осуществляется методом искусственного осеменения. Ремонт стада — {{remontModeText}}. Реализация бычков — {{bullModeText}}.

**2.4. Расчётная структура стада**

{{structureTable}}

**2.5. Динамика стада**

{{herdTable}}`
  },
  {
    id: 'deal', title: '3. Структура сделки', enabled: true,
    body: `**3.1. Правовая модель**

- Консорциум без образования юридического лица
- Индивидуальная ответственность каждого инвестора
- Отдельное финансирование каждой фермы

**3.2. Активы инвестора**

Каждый инвестор получает в собственность молочно-товарную ферму с земельным участком и инфраструктурой согласно проектно-сметной документации.

**3.3. Договор управления**

Каждый инвестор заключает с Оператором договор управления на единых стандартизированных условиях. Вознаграждение Оператора: {{operatorFeeText}}.`
  },
  {
    id: 'stages', title: '4. Этапы реализации', enabled: true,
    body: `**Этап 1. Подготовительный** — оформление земельных участков, проектирование (ПСД), геология, топосъёмка, экспертиза, юридическое сопровождение.

**Этап 2. Разрешительный** — получение разрешений на строительство, подключение инфраструктуры, согласования с уполномоченными органами.

**Этап 3. Финансирование** — подготовка пакета документов, структурирование сделки, получение финансирования.

**Этап 4. Строительство** — выбор подрядчика, строительство комплекса, контроль сроков и бюджета.

**Этап 5. Завоз поголовья** — карантин, ветеринарные мероприятия, ввод в стадо.

**Этап 6. Эксплуатация** — запуск производственного цикла, управление через Оператора, реализация продукции.`
  },
  {
    id: 'finmodel', title: '5. Финансовая модель', enabled: true,
    body: `Расчёт выполнен для одной типовой фермы на горизонте {{horizon}} лет ({{startYear}}–{{endYear}} гг.).

**5.1. Инвестиционные метрики**

{{metricsTable}}

**5.2. Структура финансирования**

{{fundingTable}}

**5.3. Прогноз финансовых показателей**

{{pnlTable}}

**5.4. График погашения**

{{debtTable}}

**5.5. Доходность на вложения инвестора**

{{exitTable}}

**5.6. Государственная поддержка**

{{subsidyTable}}`
  },
  {
    id: 'consolidated', title: '6. Консолидация по проекту', enabled: true,
    body: `Показатели проекта в целом при реализации {{farmsCount}} ферм.

{{consolidatedTable}}`
  },
  {
    id: 'operator', title: '7. Роль Оператора', enabled: true,
    body: `Оператор проекта выполняет функцию единого центра управления:

- Подготовка проекта: ПСД, экспертиза, земельные вопросы, разрешительная документация
- Сопровождение финансирования: взаимодействие с кредиторами, структурирование сделок
- Координация строительства: выбор подрядчика, контроль сроков и бюджета
- Управление эксплуатацией: единые стандарты, производственные процессы, реализация продукции
- Финансовая прозрачность: учёт, отчётность, контроль расходов

**Преимущества для инвестора**

- Снижение операционных и строительных рисков
- Экономия за счёт масштаба при закупе кормов, оборудования и поголовья
- Стандартизация процессов и прогнозируемый результат
- Возможность участия без операционного опыта в животноводстве`
  },
  {
    id: 'limits', title: '8. Ограничения и обязательства инвестора', enabled: true,
    body: `**8.1.** Ограничение на выход из проекта — на стадии строительства до ввода в эксплуатацию, на операционной стадии — не менее 3 лет с даты запуска фермы.

**8.2.** Ограничение распоряжения активами — отчуждение, залог (кроме финансирующих организаций) и аренда фермы требуют согласия Оператора.

**8.3.** Обязательность договора управления на единых условиях.

**8.4.** Ограничение конкуренции и запрет на привлечение персонала — в течение срока участия и 3 лет после его прекращения.`
  },
  {
    id: 'risks', title: '9. Риски и их снижение', enabled: true,
    body: `**Производственные риски** — падёж, снижение продуктивности, проблемы воспроизводства. Снижение: ветеринарный контроль, квалифицированный персонал, страхование поголовья.

**Рыночные риски** — снижение закупочной цены на молоко, рост стоимости кормов. Снижение: долгосрочные договоры с переработчиками, формирование кормовых запасов.

**Финансовые риски** — рост стоимости заимствований, кассовые разрывы. Снижение: льготное финансирование, оборотный кредит, резервный фонд.

**Регуляторные риски** — изменение правил субсидирования. Снижение: расчёт базового сценария без учёта субсидий.

**Строительные риски** — удорожание, срыв сроков. Снижение: единый подрядчик, фиксированная цена, контроль Оператора.`
  },
  {
    id: 'disclaimer', title: 'Оговорка', enabled: true,
    body: `Настоящий документ является информационным материалом и не является офертой. Все финансовые показатели носят прогнозный характер и могут изменяться в зависимости от рыночных условий, стоимости ресурсов, условий финансирования и иных факторов. Расчёты подлежат уточнению при подготовке проектно-сметной документации и структурировании сделки.`
  }
];

MTF.remontModeText = {
  own: 'выращивание собственного ремонтного молодняка',
  purchase: 'ежегодное приобретение нетелей',
  outsource: 'выращивание ремонтного молодняка на специализированной площадке'
};
MTF.bullModeText = {
  sell_calf: 'реализация телятами в возрасте до 2 месяцев',
  rearing: 'доращивание с последующей реализацией',
  fatten: 'полный откорм с реализацией живым весом'
};

/* Таблица в формате документа */
function dt(head, rows, align) {
  return '<table class="dt"><thead><tr>' +
    head.map((h, i) => '<th' + (i > 0 && align !== false ? ' class="r"' : '') + '>' + h + '</th>').join('') +
    '</tr></thead><tbody>' + rows.map(r => '<tr>' +
    r.map((c, i) => '<td' + (i > 0 && align !== false ? ' class="r n"' : '') + '>' + c + '</td>').join('') +
    '</tr>').join('') + '</tbody></table>';
}

MTF.docTables = function (state, res) {
  const f = MTF.fmt, m = res.metrics, fd = res.funding, p = state.params;
  const N = p.project.farmsCount, lastH = res.herd[res.herd.length - 1];

  return {
    capacityTable: dt(['Помещение', 'Скотомест'], [
      ['Коровник (дойное стадо)', f.num(p.capacity.cowPlaces)],
      ['Родильно-сухостойный блок', f.num(p.capacity.dryPlaces)],
      ['Телятник', f.num(p.capacity.calfPlaces)],
      ['Помещения ремонтного молодняка', f.num(p.capacity.heiferPlaces)],
      ['Откормочная площадка', f.num(p.capacity.bullPlaces)],
      ['<b>Фуражное поголовье</b>', '<b>' + f.num(p.capacity.cowPlaces + p.capacity.dryPlaces) + '</b>']
    ]),
    productionTable: dt(['Показатель', 'Значение'], [
      ['Порода', p.herd.breed],
      ['Источник поголовья', p.herd.source],
      ['Удой на фуражную корову, л/год', f.num(res.herd.meta.yieldYear)],
      ['Доля дойных в стаде', f.pct(res.herd.meta.milkingShare * 100, 0)],
      ['Выход телят на 100 коров', f.num(p.production.calvingRate)],
      ['Выбраковка, % в год', f.num(p.production.cullRate)],
      ['Дней сухостоя', f.num(p.production.dryDays)],
      ['Возраст первого отёла, мес.', f.num(p.production.firstCalvingMo)]
    ]),
    structureTable: dt(['Группа', 'Доля стада', 'Голов при полной мощности'], [
      ['Дойные коровы', f.pct(res.herd.meta.milkingShare * 100, 0),
        f.num((p.capacity.cowPlaces + p.capacity.dryPlaces) * res.herd.meta.milkingShare)],
      ['Сухостойные', f.pct(res.herd.meta.dryShare * 100, 0),
        f.num((p.capacity.cowPlaces + p.capacity.dryPlaces) * res.herd.meta.dryShare)],
      ['Родильное отделение', f.pct(res.herd.meta.penShare * 100, 0),
        f.num((p.capacity.cowPlaces + p.capacity.dryPlaces) * res.herd.meta.penShare)],
      ['<b>Фуражное поголовье</b>', '<b>100%</b>',
        '<b>' + f.num(p.capacity.cowPlaces + p.capacity.dryPlaces) + '</b>'],
      ['Ремонтный молодняк', '—', f.num(lastH.heifers)],
      ['Телята', '—', f.num(lastH.calves)],
      ['<b>Общее поголовье</b>', '—', '<b>' + f.num(lastH.total) + '</b>']
    ]),
    herdTable: dt(['Год', 'Фуражное', 'Дойные', 'Молодняк', 'Всего', 'Надой, т'],
      res.herd.map(y => [y.year, f.num(y.cows), f.num(y.milking), f.num(y.heifers),
        f.num(y.total), f.num(y.milkLiters / 1000)])),
    metricsTable: dt(['Показатель', 'Ед.', 'Значение'], [
      ['Стоимость проекта', 'тыс. ₸', f.num(res.capex.total)],
      ['Собственное участие', 'тыс. ₸', f.num(fd.equity)],
      ['Лимит займа', 'тыс. ₸', f.num(fd.loanTotal)],
      ['Доля заёмных средств', '%', f.pct(fd.loanShare, 0)],
      ['Ставка вознаграждения', '%', f.pct(fd.effectiveRate, 1)],
      ['Ставка дисконтирования', '%', f.pct(p.finance.wacc, 1)],
      ['NPV', 'тыс. ₸', f.num(m.npv)],
      ['IRR проекта', '%', m.irr !== null ? f.pct(m.irr * 100) : '—'],
      ['Простая окупаемость', 'лет', m.payback ? m.payback.toFixed(1) : '—'],
      ['Дисконтированная окупаемость', 'лет', m.discountedPayback ? m.discountedPayback.toFixed(1) : '—'],
      ['Минимальный DSCR', '', isFinite(m.minDscr) ? m.minDscr.toFixed(2) : '—']
    ]),
    fundingTable: dt(['Статья', 'Сумма, тыс. ₸', 'Доля'], [
      ['Подготовительные расходы', f.num(res.capex.groups.prep), f.pct(res.capex.groups.prep / res.capex.total * 100, 1)],
      ['Строительство', f.num(res.capex.groups.build), f.pct(res.capex.groups.build / res.capex.total * 100, 1)],
      ['Оборудование и техника', f.num(res.capex.groups.equip), f.pct(res.capex.groups.equip / res.capex.total * 100, 1)],
      ['Закуп поголовья', f.num(res.capex.groups.herd), f.pct(res.capex.groups.herd / res.capex.total * 100, 1)],
      ['<b>Итого</b>', '<b>' + f.num(res.capex.total) + '</b>', '<b>100%</b>'],
      ['Лимит займа', f.num(fd.loanTotal), f.pct(fd.loanShare, 0)],
      ['Собственное участие', f.num(fd.equity), f.pct(fd.equityShare, 0)]
    ]),
    pnlTable: dt(['Год', 'Выручка', 'Субсидии', 'Затраты', 'EBITDA', 'Маржа'],
      res.pnl.map(y => [y.year, f.num(y.revenue), f.num(y.subsidy), f.num(y.opex + y.operatorFee),
        f.num(y.ebitda), f.pct(y.margin, 0)])),
    debtTable: dt(['Год', 'Остаток', 'Проценты', 'Осн. долг', 'Платёж', 'DSCR'],
      res.debt.map((d, i) => [d.year, f.num(d.opening), f.num(d.interest), f.num(d.principal),
        f.num(d.payment), m.dscr[i].value !== null ? m.dscr[i].value.toFixed(2) : '—'])),
    exitTable: dt(['Год выхода', 'MOIC', 'IRR на вложения', 'Стоимость доли, тыс. ₸'],
      m.exits.map(e => [e.year, f.x(e.moic), e.irr !== null ? f.pct(e.irr * 100) : '—', f.num(e.equityValue)])),
    subsidyTable: state.subsidies.filter(s => s.enabled).length
      ? dt(['Мера поддержки', 'Ставка', 'Период'],
        state.subsidies.filter(s => s.enabled).map(s =>
          [s.name, f.num(s.value, 1) + ' ' + s.unit, 'годы ' + s.yearFrom + '–' + s.yearTo]))
      : '<p><i>Меры государственной поддержки в расчёте не учитывались.</i></p>',
    consolidatedTable: dt(['Показатель', '1 ферма', N + ' ферм'], [
      ['Стоимость проекта, тыс. ₸', f.num(res.capex.total), f.num(res.capex.total * N)],
      ['Собственное участие, тыс. ₸', f.num(fd.equity), f.num(fd.equity * N)],
      ['Лимит займа, тыс. ₸', f.num(fd.loanTotal), f.num(fd.loanTotal * N)],
      ['NPV, тыс. ₸', f.num(m.npv), f.num(m.npv * N)],
      ['Фуражное поголовье, гол.', f.num(lastH.cows), f.num(lastH.cows * N)],
      ['Валовой надой, т/год', f.num(lastH.milkLiters / 1000), f.num(lastH.milkLiters / 1000 * N)]
    ])
  };
};

MTF.buildDocData = function (state, res) {
  const p = state.params, f = MTF.fmt;
  const cc = p.capacity.cowPlaces + p.capacity.dryPlaces;
  const feeText = p.finance.operatorFeeMode === 'revenue'
    ? p.finance.operatorFeeValue + '% от выручки'
    : p.finance.operatorFeeMode === 'ebitda'
      ? p.finance.operatorFeeValue + '% от EBITDA'
      : f.num(p.finance.operatorFeeValue) + ' тыс. ₸ в год';

  return {
    region: p.project.region || '__________',
    district: p.project.district || '__________',
    operator: p.project.operator || '__________',
    farmsCount: p.project.farmsCount,
    startYear: p.project.startYear,
    endYear: p.project.startYear + p.project.horizon - 1,
    horizon: p.project.horizon,
    capacityCows: cc, totalCows: f.num(cc * p.project.farmsCount),
    cowPlaces: p.capacity.cowPlaces, dryPlaces: p.capacity.dryPlaces,
    startHeifers: p.herd.startHeifers, batches: p.herd.batches,
    remontModeText: MTF.remontModeText[p.production.remontMode],
    bullModeText: MTF.bullModeText[p.production.bullMode],
    operatorFeeText: feeText,
    quarantineDays: p.production.quarantineDays,
    dryDays: p.production.dryDays,
    calvingPenDays: p.production.calvingPenDays,
    calfSaleAge: p.production.calfSaleAgeMo,
    firstCalvingMo: p.production.firstCalvingMo
  };
};

/* Лёгкая разметка: **жирный**, - список */
function mdLite(t) {
  const lines = t.split('\n');
  let out = '', inList = false;
  lines.forEach(l => {
    const s = l.trim();
    if (s.startsWith('<table')) { if (inList) { out += '</ul>'; inList = false; } out += s; return; }
    if (s.startsWith('<p>')) { if (inList) { out += '</ul>'; inList = false; } out += s; return; }
    if (s.startsWith('- ')) {
      if (!inList) { out += '<ul>'; inList = true; }
      out += '<li>' + s.slice(2) + '</li>';
      return;
    }
    if (inList) { out += '</ul>'; inList = false; }
    if (!s) return;
    const b = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    out += (s.startsWith('**') && s.endsWith('**')) ? '<h3>' + b.replace(/<\/?b>/g, '') + '</h3>' : '<p>' + b + '</p>';
  });
  if (inList) out += '</ul>';
  return out;
}

MTF.renderDoc = function (state, res) {
  const data = Object.assign(MTF.buildDocData(state, res), MTF.docTables(state, res));
  return state.docSections.filter(s => s.enabled).map(s => {
    let body = s.body;
    Object.keys(data).forEach(k => { body = body.split('{{' + k + '}}').join(data[k]); });
    return { title: s.title, body: mdLite(body) };
  });
};

/* Полный HTML документа */
MTF.docHtml = function (state, secs) {
  const p = state.params;
  const d = new Date().toLocaleDateString('ru-RU');
  return '<div class="doc-title">' +
    '<div class="dt-label">Модель проекта</div>' +
    '<h1>' + (p.project.name || 'Молочно-товарная ферма') + '</h1>' +
    '<div class="dt-meta">' +
    (p.project.region ? p.project.region + ' область' : '__________ область') + ' · ' +
    p.project.farmsCount + ' ферм · ' +
    (p.capacity.cowPlaces + p.capacity.dryPlaces) + ' фуражных коров<br>' +
    (p.project.operator || '__________') + ' · ' + d +
    '</div></div>' +
    secs.map(s => '<section><h2>' + s.title + '</h2>' + s.body + '</section>').join('');
};
