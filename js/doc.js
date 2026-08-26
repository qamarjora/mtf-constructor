/* ============================================================
   ГЕНЕРАТОР ДОКУМЕНТА
   ============================================================ */

window.MTF = window.MTF || {};


/* ============================================================
   РЕЖИМЫ ДОКУМЕНТА
   Каждый режим — свой набор разделов и своё название.
   Добавить режим = дописать объект в этот список.
   ============================================================ */
MTF.docModes = [
  {
    id: 'estimate',
    name: 'Смета проекта',
    label: 'Смета проекта',
    hint: 'Стоимость фермы по группам затрат. Без финансовой модели.',
    sections: ['concept', 'farm', 'estimate', 'equipment', 'stages', 'disclaimer']
  },
  {
    id: 'technical',
    name: 'Техническое описание фермы',
    label: 'Техническое описание',
    hint: 'Планировка, помещения, технология, оборудование. Для подрядчиков и поставщиков.',
    sections: ['concept', 'farm', 'equipment', 'stages', 'disclaimer']
  },
  {
    id: 'passport',
    name: 'Паспорт проекта',
    label: 'Паспорт проекта',
    hint: 'Мощность, объёмы производства, состав затрат. Под инвестиционное субсидирование.',
    sections: ['concept', 'farm', 'herddyn', 'estimate', 'equipment', 'finmodel', 'stages', 'disclaimer']
  },
  {
    id: 'bizplan',
    name: 'Бизнес-план',
    label: 'Бизнес-план',
    hint: 'Полный формат для кредитора: производство, экономика, финансирование, риски.',
    sections: ['concept', 'farm', 'herddyn', 'estimate', 'equipment', 'stages', 'finmodel',
               'consolidated', 'operator', 'risks', 'disclaimer']
  },
  {
    id: 'investment',
    name: 'Инвестиционное предложение',
    label: 'Инвестиционное предложение',
    hint: 'Для привлечения инвесторов: доходность, условия участия, ограничения.',
    sections: ['concept', 'farm', 'deal', 'estimate', 'finmodel', 'consolidated',
               'operator', 'limits', 'risks', 'disclaimer']
  },
  {
    id: 'custom',
    name: 'Свой набор разделов',
    label: 'Модель проекта',
    hint: 'Разделы выбираются вручную галочками.',
    sections: null
  }
];

MTF.applyDocMode = function (state, modeId) {
  const m = MTF.docModes.find(x => x.id === modeId);
  state.docMode = modeId;
  if (!m || !m.sections) return;
  state.docSections.forEach(s => { s.enabled = m.sections.indexOf(s.id) >= 0; });
};

MTF.docSections = [
  {
    id: 'concept', title: '1. Общая концепция проекта', enabled: true,
    body: `**1.1. Суть проекта**

Проект представляет собой создание и эксплуатацию сети современных молочно-товарных ферм (МТФ). Место реализации — Республика Казахстан, {{region}} область, {{district}} район.

Основной продукт — сырое молоко, реализуемое на перерабатывающие предприятия региона. Дополнительными направлениями являются реализация телят и выбракованного поголовья.

**1.2. Масштаб проекта**

- Количество ферм: {{farmsCount}} единиц
- Проектная мощность фермы: {{capacityCows}} фуражных коров, в том числе {{cowPlaces}} дойных
- Общее поголовье с ремонтным молодняком: {{totalAtCapacity}} голов
- Совокупная мощность проекта: {{totalCows}} фуражных коров
- Тип фермы: молочно-товарная, беспривязного содержания
- Воспроизводство: искусственное осеменение
- Стартовое поголовье: {{startHeifers}} нетелей, завоз в {{batches}} партии

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

`
  },
  {
    id: 'herddyn', title: '3. Динамика стада', enabled: false,
    body: `Прогноз изменения поголовья при выбранной схеме формирования стада.

{{herdTable}}`
  },
  {
    id: 'estimate', title: '3. Стоимость проекта', enabled: true,
    body: `Расчёт стоимости создания одной типовой фермы.

{{capexTable}}

Стоимость строительства приведена предварительно и подлежит уточнению по проектно-сметной документации и коммерческим предложениям подрядчиков. Монтаж доильного оборудования выполняется поставщиком и в смету не включён.

**Стоимость проекта в целом**

{{estimateTotalTable}}`
  },
  {
    id: 'equipment', title: '4. Оборудование и техника', enabled: true,
    body: `Комплект технологического оборудования типовой фермы.

{{equipTable}}

Полная спецификация по позициям приводится в приложении к настоящему документу.`
  },
  {
    id: 'deal', title: '5. Структура сделки', enabled: false,
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
    id: 'stages', title: '6. Этапы реализации', enabled: true,
    body: `**Этап 1. Подготовительный** — оформление земельных участков, проектирование (ПСД), геология, топосъёмка, экспертиза, юридическое сопровождение.

**Этап 2. Разрешительный** — получение разрешений на строительство, подключение инфраструктуры, согласования с уполномоченными органами.

**Этап 3. Финансирование** — подготовка пакета документов, структурирование сделки, получение финансирования.

**Этап 4. Строительство** — выбор подрядчика, строительство комплекса, контроль сроков и бюджета.

**Этап 5. Завоз поголовья** — карантин, ветеринарные мероприятия, ввод в стадо.

**Этап 6. Эксплуатация** — запуск производственного цикла, управление через Оператора, реализация продукции.`
  },
  {
    id: 'finmodel', title: '7. Финансовая модель', enabled: false,
    body: `Расчёт выполнен для одной типовой фермы на горизонте {{horizon}} лет ({{startYear}}–{{endYear}} гг.).

**5.1. Инвестиционные метрики**

{{metricsTable}}

**5.2. Капитальные затраты**

{{capexTable}}

**5.3. Структура финансирования**

{{fundingTable}}

**5.4. Прогноз финансовых показателей**

{{pnlTable}}

**5.5. График погашения**

{{debtTable}}

**5.6. Доходность на вложения инвестора**

{{exitTable}}

**5.7. Государственная поддержка**

{{subsidyTable}}`
  },
  {
    id: 'consolidated', title: '8. Консолидация по проекту', enabled: false,
    body: `Показатели проекта в целом при реализации {{farmsCount}} ферм.

{{consolidatedTable}}`
  },
  {
    id: 'operator', title: '9. Роль Оператора', enabled: true,
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
    id: 'limits', title: '10. Ограничения и обязательства инвестора', enabled: false,
    body: `**8.1.** Ограничение на выход из проекта — на стадии строительства до ввода в эксплуатацию, на операционной стадии — не менее 3 лет с даты запуска фермы.

**8.2.** Ограничение распоряжения активами — отчуждение, залог (кроме финансирующих организаций) и аренда фермы требуют согласия Оператора.

**8.3.** Обязательность договора управления на единых условиях.

**8.4.** Ограничение конкуренции и запрет на привлечение персонала — в течение срока участия и 3 лет после его прекращения.`
  },
  {
    id: 'risks', title: '11. Риски и их снижение', enabled: true,
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
      ['<b>Проектная мощность, фуражных коров</b>', '<b>' + f.num(res.herd.meta.target) + '</b>']
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
    structureTable: (function () {
      const P = p.production, tgt = res.herd.meta.target;
      const M = res.herd.meta;
      // расчёт шлейфа при выходе на проектную мощность
      const need = tgt * P.cullRate / 100;
      const heifersFull = need * (P.firstCalvingMo - P.calfSaleAgeMo) / 12;
      const bornYear = tgt * P.calvingRate / 100 * (1 - P.calfMortality / 100);
      const calvesFull = bornYear * P.calfSaleAgeMo / 12;
      const totalFull = tgt + heifersFull + calvesFull;
      return dt(['Группа', 'Доля стада', 'Голов при полной мощности'], [
        ['Дойные коровы', f.pct(M.milkingShare * 100, 0), f.num(tgt * M.milkingShare)],
        ['Сухостойные', f.pct(M.dryShare * 100, 0), f.num(tgt * M.dryShare)],
        ['Родильное отделение', f.pct(M.penShare * 100, 0), f.num(tgt * M.penShare)],
        ['<b>Фуражное поголовье</b>', '<b>100%</b>', '<b>' + f.num(tgt) + '</b>'],
        ['Ремонтный молодняк', '—', f.num(heifersFull)],
        ['Телята до ' + P.calfSaleAgeMo + ' мес.', '—', f.num(calvesFull)],
        ['<b>Общее поголовье</b>', '—', '<b>' + f.num(totalFull) + '</b>']
      ]);
    })(),
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
    estimateTotalTable: (function () {
      const N = p.project.farmsCount, P = p.production, tgt = res.herd.meta.target;
      const need = tgt * P.cullRate / 100;
      const h = need * (P.firstCalvingMo - P.calfSaleAgeMo) / 12;
      const c = tgt * P.calvingRate / 100 * (1 - P.calfMortality / 100) * P.calfSaleAgeMo / 12;
      const totHead = tgt + h + c;
      return dt(['Показатель', '1 ферма', N + ' ферм'], [
        ['Стоимость, млн ₸', f.num(res.capex.total / 1000, 1), f.num(res.capex.total * N / 1000, 1)],
        ['Стоимость, тыс. ₸', f.num(res.capex.total), f.num(res.capex.total * N)],
        ['Фуражных коров, гол.', f.num(tgt), f.num(tgt * N)],
        ['Общее поголовье с молодняком, гол.', f.num(totHead), f.num(totHead * N)],
        ['Стоимость на 1 фуражную корову, тыс. ₸',
          f.num(res.capex.total / Math.max(1, tgt)),
          f.num(res.capex.total / Math.max(1, tgt))]
      ]);
    })(),
    equipTable: (function () {
      const dc = MTF.dispCur(p), dsg = MTF.dispSign(p), dd = dc === 'KZT' ? 0 : 1;
      const eq = res.capex.rows.filter(r => r.group === 'equip');
      const byS = {};
      eq.forEach(r => {
        const it = state.capexItems.find(x => x.id === r.id);
        const k = (it && it.sect) || 'Прочее оборудование';
        if (!byS[k]) byS[k] = { n: 0, sum: 0 };
        byS[k].n++; byS[k].sum += r.sum;
      });
      const order = ['ДМБ', 'Коровник', 'Техника', 'Галерея', 'Предлагуна', 'Прочее оборудование'];
      const names = { 'ДМБ': 'Доильно-молочный блок', 'Коровник': 'Коровник и содержание',
        'Техника': 'Сельскохозяйственная техника', 'Галерея': 'Галерея и переходы',
        'Предлагуна': 'Навозоудаление и предлагуна' };
      const rows = order.filter(k => byS[k]).map(k =>
        [names[k] || k, f.num(byS[k].n), f.num(MTF.disp(p, byS[k].sum, dc), dd)]);
      const tot = eq.reduce((a, r) => a + r.sum, 0);
      rows.push(['<b>Итого оборудование и техника</b>', '<b>' + f.num(eq.length) + '</b>',
        '<b>' + f.num(MTF.disp(p, tot, dc), dd) + '</b>']);
      return dt(['Узел комплекса', 'Позиций', 'Стоимость, тыс. ' + dsg], rows);
    })(),
    capexTable: (function () {
      const GN = { prep: 'Подготовительный этап', build: 'Строительство и монтаж',
                   equip: 'Оборудование и техника', herd: 'Поголовье' };
      const rows = ['prep', 'build', 'equip', 'herd']
        .filter(g => res.capex.groups[g] > 0).map(g => {
          const gc = MTF.groupCur(p, g), gs = MTF.groupSign(p, g);
          return [GN[g],
            f.num(MTF.disp(p, res.capex.groups[g], gc), gc === 'KZT' ? 0 : 1) + ' ' + gs,
            f.num(res.capex.groups[g]),
            f.pct(res.capex.groups[g] / res.capex.total * 100, 1)];
        });
      rows.push(['<b>Итого стоимость фермы</b>', '—',
        '<b>' + f.num(res.capex.total) + '</b>', '<b>100%</b>']);
      return dt(['Группа затрат', 'В валюте закупа', 'Тыс. ₸', 'Доля'], rows);
    })(),
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
    capacityCows: f.num(res.herd.meta.target),
    totalCows: f.num(res.herd.meta.target * p.project.farmsCount),
    cowPlaces: p.capacity.cowPlaces, dryPlaces: p.capacity.dryPlaces,
    startHeifers: p.herd.startHeifers, batches: p.herd.batches,
    remontModeText: MTF.remontModeText[p.production.remontMode],
    bullModeText: MTF.bullModeText[p.production.bullMode],
    operatorFeeText: feeText,
    totalAtCapacity: (function () {
      const P = p.production, tgt = res.herd.meta.target;
      const need = tgt * P.cullRate / 100;
      const h = need * (P.firstCalvingMo - P.calfSaleAgeMo) / 12;
      const c = tgt * P.calvingRate / 100 * (1 - P.calfMortality / 100) * P.calfSaleAgeMo / 12;
      return f.num(tgt + h + c);
    })(),
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
  let n = 0;
  return state.docSections.filter(s => s.enabled).map(s => {
    let body = s.body;
    Object.keys(data).forEach(k => { body = body.split('{{' + k + '}}').join(data[k]); });
    // разделы с номером перенумеровываются подряд, ненумерованные остаются как есть
    let title = s.title;
    const m = title.match(/^(\d+)\.\s*(.+)$/);
    if (m) {
      n++;
      const old = m[1];
      title = n + '. ' + m[2];
      // подтягиваем номера подпунктов внутри текста: 5.1 → 4.1
      if (String(n) !== old) {
        body = body.replace(new RegExp('\\b' + old + '\\.(\\d+)\\.', 'g'), n + '.$1.');
      }
    }
    return { title: title, body: mdLite(body) };
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
    MTF.fmt.num(MTF.lastResult ? MTF.lastResult.herd.meta.target : 0) + ' фуражных коров<br>' +
    (p.project.operator || '__________') + ' · ' + d +
    '</div></div>' +
    secs.map(s => '<section><h2>' + s.title + '</h2>' + s.body + '</section>').join('');
};
