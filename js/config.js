/* ============================================================
   КОНФИГУРАЦИЯ ПРОЕКТА
   Здесь меняются справочники и значения по умолчанию.
   Код трогать не нужно — только данные в этом файле.
   ============================================================ */

window.MTF = window.MTF || {};

MTF.VERSION = '1.0.0';

/* ---------- Значения по умолчанию ---------- */
MTF.defaults = {
  project: {
    name: 'Сеть молочно-товарных ферм',
    region: '',
    district: '',
    farmsCount: 10,
    investorsCount: 10,
    operator: '',
    startYear: 2026,
    horizon: 10
  },

  capacity: {
    cowPlaces: 400,        // коровник, дойные
    dryPlaces: 72,         // родильно-сухостойный блок
    calfPlaces: 78,        // телятник (0-2 мес.)
    heiferPlaces: 0,       // тёлки 3-24 мес.
    bullPlaces: 0          // бычки на откорме
  },

  herd: {
    startHeifers: 250,       // нетелей на старте
    batches: 2,              // партий завоза
    batchInterval: 1,        // месяцев между партиями
    firstBatchShare: 40,     // % в первой партии
    heiferPrice: 800,        // тыс. ₸ за нетель
    gestationOnArrival: 4,   // месяцев стельности при завозе
    breed: 'Голштинская',
    source: 'Импорт'
  },

  production: {
    milkYield: 7500,       // л на фуражную корову в год
    calvingRate: 82,       // телят на 100 коров
    cullRate: 25,          // выбраковка, % в год
    calfMortality: 8,      // падёж телят, %
    heiferMortality: 4,    // падёж молодняка, %
    dryDays: 60,           // дней сухостоя
    heiferShare: 50,       // % тёлочек в приплоде
    breedingAgeMo: 15,     // возраст осеменения, мес.
    firstCalvingMo: 24,    // возраст первого отёла, мес.
    remontMode: 'own',     // own | purchase | outsource
    bullMode: 'sell_calf', // sell_calf | rearing | fatten
    calfSaleAgeMo: 2,      // возраст продажи телят
    fattenAgeMo: 16,       // возраст сдачи бычков
    fattenWeightKg: 450    // живой вес при сдаче
  },

  feed: {
    mode: 'purchase',      // purchase | own
    dmCow: 20,             // кг сухого вещества на корову в сутки
    dmHeifer: 7,           // на тёлку
    dmCalf: 3,             // на телёнка
    dmBull: 9,             // на бычка
    dmPriceCow: 75,        // ₸ за кг СВ рациона дойной
    dmPriceYoung: 55,      // ₸ за кг СВ рациона молодняка
    landHa: 0,             // га пашни под корма
    landCostPerHa: 0       // ₸/га себестоимость кормопроизводства
  },

  prices: {
    milk: 230,             // ₸ за литр
    calf: 90,              // тыс. ₸ за телёнка
    cullCow: 450,          // тыс. ₸ за выбракованную корову
    bullKg: 1900,          // ₸ за кг живого веса
    surplusHeifer: 800,    // тыс. ₸ за сверхремонтную нетель
    priceInflation: 6,     // % рост цен реализации в год
    costInflation: 8       // % рост затрат в год
  },

  finance: {
    lender: 'АО «Аграрная кредитная корпорация»',
    program: 'Жайлау',
    rate: 6,               // % годовых
    termYears: 10,
    graceYears: 2,
    financeShareBuild: 85, // % финансирования строительства
    financeShareEquip: 90, // % финансирования оборудования
    financeShareHerd: 85,  // % финансирования закупа скота
    wcLimit: 0,            // лимит оборотного кредита, тыс. ₸ (0 = авто)
    wcRate: 5,
    wcTermMonths: 24,
    wacc: 8,               // ставка дисконтирования, %
    operatorFeeMode: 'revenue', // revenue | fixed | ebitda
    operatorFeeValue: 3    // % или тыс. ₸ в год
  }
};

/* ---------- Статьи капитальных затрат ----------
   unit: 'sum'   — фиксированная сумма (тыс. ₸)
         'place' — цена за скотоместо × количество мест
         'head'  — цена за голову × стартовое поголовье
   group: build | equip | herd | prep — определяет % финансирования
------------------------------------------------ */
MTF.capexItems = [
  { id: 'land',      name: 'Земельный участок',              group: 'prep',  unit: 'sum',   value: 6000 },
  { id: 'psd',       name: 'Проектирование (ПСД)',           group: 'prep',  unit: 'sum',   value: 45000 },
  { id: 'expertise', name: 'Вневедомственная экспертиза',     group: 'prep',  unit: 'sum',   value: 12000 },
  { id: 'geology',   name: 'Геология и топосъёмка',           group: 'prep',  unit: 'sum',   value: 9000 },
  { id: 'legal',     name: 'Юридическое сопровождение',       group: 'prep',  unit: 'sum',   value: 4000 },

  { id: 'barn',      name: 'Коровник с кормовыми столами',    group: 'build', unit: 'place', value: 900, places: 'cowPlaces' },
  { id: 'dry',       name: 'Родильно-сухостойный блок',       group: 'build', unit: 'place', value: 1100, places: 'dryPlaces' },
  { id: 'calfhouse', name: 'Телятник',                        group: 'build', unit: 'place', value: 700, places: 'calfPlaces' },
  { id: 'heiferhouse', name: 'Помещение ремонтного молодняка', group: 'build', unit: 'place', value: 550, places: 'heiferPlaces' },
  { id: 'bullhouse', name: 'Откормочная площадка',            group: 'build', unit: 'place', value: 400, places: 'bullPlaces' },
  { id: 'milkblock', name: 'Доильно-молочный блок (здание)',  group: 'build', unit: 'sum',   value: 180000 },
  { id: 'manure',    name: 'Навозохранилища и площадка',      group: 'build', unit: 'sum',   value: 65000 },
  { id: 'silage',    name: 'Силосные траншеи и склады',       group: 'build', unit: 'sum',   value: 55000 },
  { id: 'water',     name: 'Скважина и водоснабжение',        group: 'build', unit: 'sum',   value: 28000 },
  { id: 'power',     name: 'Электроснабжение, ТП, резерв',    group: 'build', unit: 'sum',   value: 42000 },
  { id: 'roads',     name: 'Дороги, ограждение, дезбарьер',   group: 'build', unit: 'sum',   value: 22000 },
  { id: 'admin',     name: 'Административно-бытовой корпус',  group: 'build', unit: 'sum',   value: 35000 },

  { id: 'milking',   name: 'Доильная установка «параллель»',  group: 'equip', unit: 'sum',   value: 155000 },
  { id: 'tanks',     name: 'Танки-охладители',                group: 'equip', unit: 'sum',   value: 48000 },
  { id: 'manureeq',  name: 'Система навозоудаления',          group: 'equip', unit: 'sum',   value: 32000 },
  { id: 'mixer',     name: 'Кормораздатчик-миксер',           group: 'equip', unit: 'sum',   value: 38000 },
  { id: 'tractor',   name: 'Трактор и погрузчик',             group: 'equip', unit: 'sum',   value: 62000 },
  { id: 'vetequip',  name: 'Ветеринарное оборудование, расколы', group: 'equip', unit: 'sum', value: 18000 },
  { id: 'software',  name: 'Система управления стадом',       group: 'equip', unit: 'sum',   value: 12000 },

  { id: 'herd',      name: 'Закуп нетелей',                   group: 'herd',  unit: 'head',  value: 800 }
];

MTF.capexReserve = 7; // % резерв на непредвиденные расходы

/* ---------- Штатное расписание ----------
   perHead: если задано, количество считается от поголовья
------------------------------------------------ */
MTF.staff = [
  { id: 'director',  name: 'Управляющий фермой',        count: 1,  salary: 900 },
  { id: 'zootech',   name: 'Зоотехник',                 count: 1,  salary: 700 },
  { id: 'vet',       name: 'Ветеринарный врач',         count: 1,  salary: 700 },
  { id: 'inseminator', name: 'Техник-осеменатор',       count: 1,  salary: 600 },
  { id: 'milker',    name: 'Оператор машинного доения', count: 6,  salary: 400 },
  { id: 'cattleman', name: 'Скотник',                   count: 6,  salary: 350 },
  { id: 'mechanic',  name: 'Механизатор',               count: 3,  salary: 450 },
  { id: 'tech',      name: 'Слесарь-наладчик',          count: 2,  salary: 400 },
  { id: 'accountant', name: 'Бухгалтер',                count: 1,  salary: 500 },
  { id: 'security',  name: 'Охрана',                    count: 4,  salary: 300 }
];

MTF.payrollTaxRate = 35; // % начислений на ФОТ (брутто к сумме на руки)

/* ---------- Прочие операционные затраты ----------
   base: 'head' — на голову в год (тыс. ₸)
         'cow'  — на фуражную корову в год
         'sum'  — фиксированная сумма в год
         'milk' — на литр молока (₸)
------------------------------------------------ */
MTF.opexItems = [
  { id: 'vet',       name: 'Ветеринария и медикаменты',  base: 'head', value: 18 },
  { id: 'semen',     name: 'Семя и осеменение',          base: 'cow',  value: 22 },
  { id: 'energy',    name: 'Электроэнергия и вода',      base: 'cow',  value: 28 },
  { id: 'fuel',      name: 'ГСМ',                        base: 'cow',  value: 24 },
  { id: 'repair',    name: 'Ремонт и обслуживание',      base: 'sum',  value: 18000 },
  { id: 'insurance', name: 'Страхование',                base: 'sum',  value: 9000 },
  { id: 'bedding',   name: 'Подстилка и расходники',     base: 'head', value: 9 },
  { id: 'lab',       name: 'Лабораторные исследования',  base: 'milk', value: 1.2 },
  { id: 'admin',     name: 'Административные расходы',   base: 'sum',  value: 14000 },
  { id: 'transport', name: 'Транспортировка молока',     base: 'milk', value: 4 }
];

MTF.taxes = {
  landTax: 800,        // тыс. ₸ в год
  propertyTaxRate: 0.5,// % от остаточной стоимости
  cit: 0,              // % КПН (для с/х производителей часто 0 или льгота)
  depreciationYears: 20 // срок амортизации зданий
};
