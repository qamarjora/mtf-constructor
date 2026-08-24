/* ============================================================
   КОНФИГУРАЦИЯ ПРОЕКТА  v1.1
   Здесь меняются справочники и значения по умолчанию.
   ============================================================ */

window.MTF = window.MTF || {};

MTF.VERSION = '1.1.0';

/* ---------- Валюты ----------
   base — валюта расчёта. Все суммы приводятся к ней.
   Курсы редактируются в интерфейсе.
------------------------------------------------ */
MTF.currencies = {
  KZT: { name: 'Тенге', sign: '₸', rate: 1 },
  EUR: { name: 'Евро', sign: '€', rate: 520 },
  USD: { name: 'Доллар', sign: '$', rate: 480 },
  RUB: { name: 'Рубль', sign: '₽', rate: 5.4 }
};

MTF.defaults = {
  project: {
    name: 'Сеть молочно-товарных ферм',
    region: '',
    district: '',
    farmsCount: 10,
    operator: '',
    startYear: 2027,
    horizon: 12,
    baseCurrency: 'KZT',
    rateEUR: 520,
    rateUSD: 480,
    rateRUB: 5.4
  },

  capacity: {
    cowPlaces: 400,
    dryPlaces: 75,
    calfPlaces: 120,
    heiferPlaces: 300,
    bullPlaces: 0,
    flexHousing: true      // размещать молодняк в свободных местах коровника
  },

  herd: {
    startHeifers: 470,
    batches: 2,
    batchInterval: 1,
    firstBatchShare: 50,
    heiferPrice: 2140,       // в валюте heiferCurrency, тыс. единиц
    heiferCurrency: 'KZT',
    gestationOnArrival: 5,
    breed: 'Голштинская',
    source: 'Импорт',
    restockMode: 'none',     // none | to_capacity — докуп нетелей по годам
    restockYears: 3
  },

  production: {
    yieldMode: 'year',       // year | lactation | daily
    milkYield: 8000,
    calvingRate: 78,
    cullRate: 26,
    calfMortality: 8,
    heiferMortality: 4,
    dryDays: 60,
    calvingPenDays: 14,      // дней в родильном отделении (до и после отёла)
    quarantineDays: 30,      // карантин завозного поголовья
    quarantineInBarn: true,  // карантин в свободном коровнике (только первый завоз)
    firstCalfYield: 85,      // удой первотёлки, % от взрослой коровы
    heiferShare: 50,
    breedingAgeMo: 15,
    firstCalvingMo: 24,
    remontMode: 'own',
    bullMode: 'sell_calf',
    calfSaleAgeMo: 2,
    fattenAgeMo: 16,
    fattenWeightKg: 450
  },

  feed: {
    mode: 'purchase',        // purchase | own | lump
    dmCow: 20,
    dmDry: 13,
    dmHeifer: 7,
    dmCalf: 3,
    dmBull: 9,
    dmPriceCow: 90,
    dmPriceYoung: 60,
    landMode: 'perHead',     // fixed | perHead
    landHa: 1000,
    landHaPerCow: 2.1,
    landCostPerHa: 220000,
    lumpAnnual: 0            // фиксированная сумма в год, тыс. ₸
  },

  staff: {
    mode: 'detailed',        // detailed | lump
    lumpAnnual: 0,           // ФОТ одной суммой, тыс. ₸ в год
    scaleToHerd: false,      // масштабировать штат под фактическое поголовье
    baseCows: 472            // поголовье, под которое составлено расписание
  },

  prices: {
    milk: 265,
    calf: 95,
    cullCow: 480,
    bullKg: 1900,
    priceInflation: 6,
    costInflation: 8
  },

  finance: {
    lender: 'АО «Аграрная кредитная корпорация»',
    program: '',
    rate: 6,
    termYears: 12,
    graceYears: 2,
    financeShareBuild: 85,
    financeShareEquip: 90,
    financeShareHerd: 85,
    wcAuto: true,            // подбирать оборотный кредит автоматически
    wcCap: 0,                // лимит оборотного кредита, тыс. ₸ (0 = авто)
    wcRate: 6,
    wcTermYears: 5,
    wacc: 8,
    operatorFeeMode: 'revenue',
    operatorFeeValue: 3,
    capexSpread: [70, 30]    // распределение капзатрат по годам, %
  }
};

/* ---------- Статьи капитальных затрат ----------
   unit:  sum | place | head
   group: prep | build | equip | herd
   cur:   валюта статьи
------------------------------------------------ */
MTF.capexItems = [
  { id: 'land',      name: 'Земельный участок',              group: 'prep',  unit: 'sum',   value: 6000,   cur: 'KZT' },
  { id: 'psd',       name: 'Проектирование (ПСД)',           group: 'prep',  unit: 'sum',   value: 45000,  cur: 'KZT' },
  { id: 'expertise', name: 'Вневедомственная экспертиза',    group: 'prep',  unit: 'sum',   value: 12000,  cur: 'KZT' },
  { id: 'geology',   name: 'Геология и топосъёмка',          group: 'prep',  unit: 'sum',   value: 9000,   cur: 'KZT' },
  { id: 'legal',     name: 'Юридическое сопровождение',      group: 'prep',  unit: 'sum',   value: 4000,   cur: 'KZT' },

  { id: 'barn',      name: 'Коровник с кормовыми столами',   group: 'build', unit: 'place', value: 900,  places: 'cowPlaces',    cur: 'KZT' },
  { id: 'dry',       name: 'Родильно-сухостойный блок',      group: 'build', unit: 'place', value: 1100, places: 'dryPlaces',    cur: 'KZT' },
  { id: 'calfhouse', name: 'Телятник',                       group: 'build', unit: 'place', value: 700,  places: 'calfPlaces',   cur: 'KZT' },
  { id: 'heiferhouse', name: 'Помещение ремонтного молодняка', group: 'build', unit: 'place', value: 550, places: 'heiferPlaces', cur: 'KZT' },
  { id: 'bullhouse', name: 'Откормочная площадка',           group: 'build', unit: 'place', value: 400,  places: 'bullPlaces',   cur: 'KZT' },
  { id: 'milkblock', name: 'Доильно-молочный блок (здание)', group: 'build', unit: 'sum',   value: 180000, cur: 'KZT' },
  { id: 'manure',    name: 'Навозохранилища и площадка',     group: 'build', unit: 'sum',   value: 65000,  cur: 'KZT' },
  { id: 'silage',    name: 'Силосные траншеи и склады',      group: 'build', unit: 'sum',   value: 55000,  cur: 'KZT' },
  { id: 'water',     name: 'Скважина и водоснабжение',       group: 'build', unit: 'sum',   value: 28000,  cur: 'KZT' },
  { id: 'power',     name: 'Электроснабжение, ТП, резерв',   group: 'build', unit: 'sum',   value: 42000,  cur: 'KZT' },
  { id: 'roads',     name: 'Дороги, ограждение, дезбарьер',  group: 'build', unit: 'sum',   value: 22000,  cur: 'KZT' },
  { id: 'admin',     name: 'Административно-бытовой корпус', group: 'build', unit: 'sum',   value: 35000,  cur: 'KZT' },

  { id: 'milking',   name: 'Доильная установка',             group: 'equip', unit: 'sum',   value: 300,  cur: 'EUR' },
  { id: 'tanks',     name: 'Танки-охладители',               group: 'equip', unit: 'sum',   value: 95,   cur: 'EUR' },
  { id: 'manureeq',  name: 'Система навозоудаления',         group: 'equip', unit: 'sum',   value: 60,   cur: 'EUR' },
  { id: 'mixer',     name: 'Кормораздатчик-миксер',          group: 'equip', unit: 'sum',   value: 75,   cur: 'EUR' },
  { id: 'tractor',   name: 'Трактор и погрузчик',            group: 'equip', unit: 'sum',   value: 62000, cur: 'KZT' },
  { id: 'vetequip',  name: 'Ветеринарное оборудование',      group: 'equip', unit: 'sum',   value: 18000, cur: 'KZT' },
  { id: 'software',  name: 'Система управления стадом',      group: 'equip', unit: 'sum',   value: 12000, cur: 'KZT' },

  { id: 'herd',      name: 'Закуп нетелей',                  group: 'herd',  unit: 'head',  value: 0, cur: 'KZT', auto: true }
];

MTF.capexReserve = 7;

/* ---------- Штатное расписание ---------- */
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

MTF.payrollTaxRate = 35;

/* ---------- Операционные расходы ----------
   base: head | cow | sum | milk
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

/* Затраты на карантин: тыс. ₸ на голову единовременно */
MTF.quarantineCostPerHead = 45;

MTF.taxes = {
  landTax: 800,
  propertyTaxRate: 0.5,
  cit: 0,
  depreciationYears: 20
};

/* ---------- Курс валюты ---------- */
MTF.rate = function (p, cur) {
  if (!cur || cur === 'KZT') return 1;
  if (cur === 'EUR') return p.project.rateEUR || 520;
  if (cur === 'USD') return p.project.rateUSD || 480;
  if (cur === 'RUB') return p.project.rateRUB || 5.4;
  return 1;
};
