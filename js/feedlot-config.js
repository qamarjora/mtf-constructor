/* ============================================================
   ОТКОРМ БЫЧКОВ — КОНФИГУРАЦИЯ
   Значения по умолчанию, справочник капзатрат, штат, субсидии.
   Все цифры — ОРИЕНТИРЫ для примера. Калибруются по данным
   клиента и зоотехника. Суммы — в тыс. ₸, цены за кг — в ₸.
   Подключается после calc-fin.js, до feedlot-switch.js.
   ============================================================ */

window.MTF = window.MTF || {};
MTF.feedlot = MTF.feedlot || {};

/* ---------- Сезонные коэффициенты привеса ----------
   Множитель к суточному привесу по календарным месяцам (янв…дек).
   Зимой часть энергии корма уходит на обогрев — привес ниже.
   Оценка под климат Северного и Центрального Казахстана,
   откалибровать по фактическим данным площадок. */
MTF.feedlot.seasonPresets = {
  open:   [0.75, 0.75, 0.85, 0.95, 1.05, 1.05, 1.00, 1.00, 1.05, 1.00, 0.90, 0.80],
  semi:   [0.85, 0.85, 0.90, 1.00, 1.05, 1.05, 1.00, 1.00, 1.05, 1.00, 0.95, 0.88],
  closed: [0.95, 0.95, 1.00, 1.00, 1.00, 1.00, 0.97, 0.97, 1.00, 1.00, 1.00, 0.97]
};

MTF.feedlot.formats = {
  open:   'Открытая площадка',
  semi:   'Полуоткрытая площадка (навесы)',
  closed: 'Закрытое помещение'
};

/* ---------- Параметры по умолчанию ----------
   Встраиваются в state.params.feedlot. */
MTF.feedlot.defaults = {
  format: 'semi',                 // open | semi | closed
  launchMonth: 8,                 // месяц первого завоза от начала проекта (0 = январь 1-го года)
  fillMode: 'even',               // even — равномерный поток | fast — N секций в месяц («волнами»)
  sectionsPerMonth: 3,            // для fast: секций комплектуется в месяц
  firstStockFinanced: true,       // первичное комплектование — в капзатраты (группа herd, инвесткредит)

  capacity: {
    sections: 10,                 // число секций
    headsPerSection: 100,         // проектная вместимость секции, гол.
    areaTotal: 0,                 // полезная площадь секций, м² (0 = не проверять)
    areaNorm: 8,                  // норма площади на голову, м²
    feedFrontM: 0,                // фронт кормового стола, м (0 = не проверять)
    feedFrontNormCm: 30,          // норма фронта кормления, см/гол.
    drinkers: 0,                  // число групповых поилок (0 = не проверять)
    headsPerDrinker: 50           // голов на одну поилку
  },

  animals: {
    weightIn: 280,                // живой вес при закупе, кг
    weightOut: 480,               // целевой вес реализации, кг
    maxDays: 270,                 // предельный срок откорма, дней (реализация даже без целевого веса)
    adaptDays: 28,                // фаза адаптации, дней
    adgAdapt: 600,                // привес в адаптацию, г/сут
    adg: 1100,                    // привес на откорме, г/сут
    mortality: 1.5,               // падёж за цикл, %
    sanitationDays: 10,           // санитарный разрыв между партиями, дней
    season: null                  // null = пресет по формату; иначе массив из 12 коэффициентов
  },

  feed: {
    dmiPct: 2.3,                  // потребление сухого вещества, % от живого веса
    dmCostAdapt: 70,              // стоимость 1 кг СВ рациона адаптации, ₸
    dmCost: 80,                   // стоимость 1 кг СВ рациона откорма, ₸
    beddingKg: 1.5,               // подстилка, кг/гол./сут
    beddingPrice: 25              // цена подстилки, ₸/кг
  },

  sale: {
    mode: 'live',                 // live — живым весом | carcass — по убойному весу
    priceIn: 1800,                // цена закупа, ₸/кг живого веса
    priceOut: 1700,               // цена реализации, ₸/кг живого веса
    carcassYield: 55,             // убойный выход, %
    priceCarcass: 3200,           // цена туши, ₸/кг
    shrink: 4                     // усушка при транспортировке, %
  },

  costs: {
    vetPerHead: 8,                // ветеринария и обработки на голову за цикл, тыс. ₸
    purchaseExtra: 5,             // доставка, приёмка, бирки на голову, тыс. ₸
    otherPerHeadDay: 40           // энергия, вода, прочее, ₸/гол./сут
  }
};

/* ---------- Справочник капзатрат ----------
   Формат тот же, что у MTF.capexItems.
   unit: sum | qty | head (× расчётная вместимость, гол.) | place (то же, что head)
   sect: наше | стройка | техника — для КП и разделения поставки.
   Цены — примерные, до сверки с Денисом и Чингизом. */
MTF.feedlot.capexItems = [
  /* --- Строительство --- */
  { id: 'fb_site',   name: 'Площадка с твёрдым покрытием, навесы, секции', group: 'build', unit: 'head', value: 250,   cur: 'KZT', sect: 'стройка' },
  { id: 'fb_aux',    name: 'Карантинник, изолятор, ветпункт, санпропускник, дезбарьер', group: 'build', unit: 'sum', value: 60000, cur: 'KZT', sect: 'стройка' },
  { id: 'fb_feed',   name: 'Склад кормов, силосные траншеи',              group: 'build', unit: 'sum', value: 80000, cur: 'KZT', sect: 'стройка' },
  { id: 'fb_manure', name: 'Навозохранилище',                             group: 'build', unit: 'sum', value: 30000, cur: 'KZT', sect: 'стройка' },
  { id: 'fb_mount',  name: 'Монтаж технологического оборудования',        group: 'build', unit: 'sum', value: 10000, cur: 'KZT', sect: 'стройка' },

  /* --- Технологическое оборудование (наша поставка) --- */
  { id: 'fe_drink',  name: 'Поилки групповые с подогревом',                group: 'equip', unit: 'qty', value: 1100,  qty: 20,   cur: 'EUR', sect: 'наше' },
  { id: 'fe_fence',  name: 'Секционные ограждения и ворота, пм',           group: 'equip', unit: 'qty', value: 70,    qty: 1200, cur: 'EUR', sect: 'наше' },
  { id: 'fe_front',  name: 'Кормовые ограждения, пм',                      group: 'equip', unit: 'qty', value: 90,    qty: 350,  cur: 'EUR', sect: 'наше' },
  { id: 'fe_manure', name: 'Система навозоудаления, компл.',               group: 'equip', unit: 'qty', value: 22000, qty: 2,    cur: 'EUR', sect: 'наше' },
  { id: 'fe_chute',  name: 'Раскол (станок фиксации)',                     group: 'equip', unit: 'qty', value: 15000, qty: 1,    cur: 'EUR', sect: 'наше' },
  { id: 'fe_scale',  name: 'Весы для КРС',                                 group: 'equip', unit: 'qty', value: 12000, qty: 1,    cur: 'EUR', sect: 'наше' },
  { id: 'fe_sort',   name: 'Сортировочный коридор и погрузочная рампа',    group: 'equip', unit: 'qty', value: 18000, qty: 1,    cur: 'EUR', sect: 'наше' },

  /* --- Техника --- */
  { id: 'ft_mixer',  name: 'Кормораздатчик-смеситель',                     group: 'equip', unit: 'qty', value: 56200, qty: 1,    cur: 'EUR', sect: 'техника' },
  { id: 'ft_loader', name: 'Погрузчик',                                    group: 'equip', unit: 'qty', value: 46820, qty: 1,    cur: 'EUR', sect: 'техника' },

  /* --- Поголовье --- */
  { id: 'herd', name: 'Первичное комплектование бычками', group: 'herd', unit: 'sum', value: 0, cur: 'KZT', auto: true }
];

/* ---------- Штатное расписание (площадка ~1000 гол.) ---------- */
MTF.feedlot.staff = [
  { id: 'director',  name: 'Управляющий площадкой', count: 1, salary: 900 },
  { id: 'zootech',   name: 'Зоотехник',             count: 1, salary: 700 },
  { id: 'vet',       name: 'Ветеринарный врач',     count: 1, salary: 700 },
  { id: 'cattleman', name: 'Скотник',               count: 4, salary: 350 },
  { id: 'mechanic',  name: 'Механизатор',           count: 2, salary: 450 },
  { id: 'accountant', name: 'Бухгалтер',            count: 1, salary: 500 },
  { id: 'security',  name: 'Охрана',                count: 2, salary: 300 }
];

/* ---------- Меры господдержки ----------
   Тот же формат, что MTF.subsidies. Дополнительные типы для откорма:
     'per_head' — тыс. ₸ за реализованную голову
     'per_kg'   — ₸ за кг реализованного живого веса
   ВСЕ СТАВКИ ПОДТВЕРДИТЬ по действующим правилам до использования в документах. */
MTF.feedlot.subsidies = [
  {
    id: 'fl_invest_build',
    name: 'Инвестиционная субсидия на строительство откормочной площадки',
    type: 'capex_pct', base: 'build', value: 25, unit: '% от затрат',
    yearFrom: 2, yearTo: 3,
    condition: 'Строительство или расширение площадки, подтверждённые затраты',
    conflictsWith: [], enabled: true, status: 'check', source: '',
    comment: 'Процент, условия и порог мощности подтвердить'
  },
  {
    id: 'fl_invest_equip',
    name: 'Инвестиционная субсидия на оборудование и технику',
    type: 'capex_pct', base: 'equip', value: 25, unit: '% от затрат',
    yearFrom: 2, yearTo: 3,
    condition: 'Оборудование из перечня, подтверждённые затраты',
    conflictsWith: [], enabled: false, status: 'check', source: '',
    comment: 'Включить после подтверждения перечня'
  },
  {
    id: 'fl_beef_kg',
    name: 'Субсидия за реализованную говядину / живой вес',
    type: 'per_kg', value: 0, unit: '₸/кг ж.в.',
    yearFrom: 1, yearTo: 10,
    condition: 'Реализация на переработку, требования к мощности площадки',
    conflictsWith: [], enabled: false, status: 'draft', source: '',
    comment: 'Ставку внести после проверки действующей программы'
  }
];

/* ---------- Сборка состояния для проекта «Откорм» ----------
   Берёт общее состояние МТФ и подменяет доменные справочники.
   Финансовые параметры (кредит, ставки, WACC, горизонт) — общие. */
MTF.feedlot.initState = function (base) {
  const clone = o => JSON.parse(JSON.stringify(o));
  const s = base ? clone(base) : {
    params: clone(MTF.defaults),
    opexItems: clone(MTF.opexItems)
  };
  s.params.project.type = 'feedlot';
  s.params.project.name = 'Откормочная площадка КРС';
  s.params.feedlot = clone(MTF.feedlot.defaults);
  s.params.staff.baseCows = 0;          // для откорма база масштабирования — вместимость площадки
  s.capexItems = clone(MTF.feedlot.capexItems);
  s.staff = clone(MTF.feedlot.staff);
  s.subsidies = clone(MTF.feedlot.subsidies);
  return s;
};
