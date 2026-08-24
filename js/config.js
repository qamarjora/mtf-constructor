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
   unit:  sum | place | head | qty (цена за единицу × количество)
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

  /* --- Оборудование доильно-молочного блока --- */
  { id: 'e_parallel', name: 'Доильная установка «Параллель», комплект', group: 'equip', unit: 'qty', value: 252000, qty: 1, cur: 'EUR' },
  { id: 'e_fan5_dmb', name: 'Вентилятор горизонтальный Ø5 м (ДМБ)',    group: 'equip', unit: 'qty', value: 3606.6, qty: 3, cur: 'EUR' },
  { id: 'e_fan7_dmb', name: 'Вентилятор горизонтальный Ø7 м (ДМБ)',    group: 'equip', unit: 'qty', value: 3606.6, qty: 1, cur: 'EUR' },
  { id: 'e_fence_dmb', name: 'Разделительные заборы и калитки (ДМБ), пм', group: 'equip', unit: 'qty', value: 89.6, qty: 300, cur: 'EUR' },
  { id: 'e_mats_dmb', name: 'Рулонные маты (ДМБ), пм',                  group: 'equip', unit: 'qty', value: 80, qty: 150, cur: 'EUR' },

  /* --- Оборудование коровника --- */
  { id: 'e_mattress', name: 'Матрас 4-слойный 5,5 см',                  group: 'equip', unit: 'qty', value: 125, qty: 472, cur: 'EUR' },
  { id: 'e_stall',    name: 'Стойловое оборудование',                   group: 'equip', unit: 'qty', value: 100, qty: 550, cur: 'EUR' },
  { id: 'e_drink',    name: 'Поилки нержавеющие с подогревом 2,5×0,5',  group: 'equip', unit: 'qty', value: 1059.63, qty: 40, cur: 'EUR' },
  { id: 'e_fan5_barn', name: 'Вентилятор горизонтальный Ø5 м (коровник)', group: 'equip', unit: 'qty', value: 3606.6, qty: 20, cur: 'EUR' },
  { id: 'e_curtain',  name: 'Шторы автоматические ПВХ 1,5 м, пм',       group: 'equip', unit: 'qty', value: 149.7, qty: 252, cur: 'EUR' },
  { id: 'e_headlock', name: 'Кормовые заграждения ХЭДЛОК, пм',          group: 'equip', unit: 'qty', value: 166.5, qty: 210, cur: 'EUR' },
  { id: 'e_scraper',  name: 'Скреперная система навозоудаления, компл.', group: 'equip', unit: 'qty', value: 22000, qty: 6, cur: 'EUR' },
  { id: 'e_fence_barn', name: 'Разделительные заборы и калитки (коровник), пм', group: 'equip', unit: 'qty', value: 89.6, qty: 500, cur: 'EUR' },
  { id: 'e_brush',    name: 'Автоматическая щётка для коров',           group: 'equip', unit: 'qty', value: 2560.3, qty: 8, cur: 'EUR' },
  { id: 'e_shaft',    name: 'Шахты с вентилятором 14 тыс. м³',          group: 'equip', unit: 'qty', value: 750, qty: 29, cur: 'EUR' },
  { id: 'e_puzzle',   name: 'Пазловые маты',                           group: 'equip', unit: 'qty', value: 72, qty: 200, cur: 'EUR' },
  { id: 'e_simple_lock', name: 'Упрощённые кормовые заграждения, пм',   group: 'equip', unit: 'qty', value: 60, qty: 110, cur: 'EUR' },
  { id: 'e_calfhut',  name: 'Домики для телят',                        group: 'equip', unit: 'qty', value: 350, qty: 100, cur: 'EUR' },
  { id: 'e_hoof',     name: 'Станок гидравлический для обработки копыт', group: 'equip', unit: 'qty', value: 14956.9, qty: 2, cur: 'EUR' },
  { id: 'e_milktaxi', name: 'Молочное такси 250 л с подогревом',        group: 'equip', unit: 'qty', value: 11150, qty: 2, cur: 'EUR' },
  { id: 'e_belt',     name: 'Лента для кормового стола, пм',            group: 'equip', unit: 'qty', value: 0, qty: 276, cur: 'EUR' },

  /* --- Техника --- */
  { id: 't_mixer',    name: 'Кормораздатчик',                          group: 'equip', unit: 'qty', value: 56200, qty: 1, cur: 'EUR' },
  { id: 't_loader1',  name: 'Погрузчик',                               group: 'equip', unit: 'qty', value: 46820, qty: 1, cur: 'EUR' },
  { id: 't_milktruck', name: 'Молоковоз',                              group: 'equip', unit: 'qty', value: 125000, qty: 1, cur: 'EUR' },
  { id: 't_manitou',  name: 'Телескопический погрузчик',               group: 'equip', unit: 'qty', value: 65500, qty: 1, cur: 'EUR' },
  { id: 't_loader2',  name: 'Погрузчик (второй)',                      group: 'equip', unit: 'qty', value: 46810, qty: 1, cur: 'EUR' },

  /* --- Оборудование галереи --- */
  { id: 'g_fence',    name: 'Разделительные заборы и калитки (галерея), пм', group: 'equip', unit: 'qty', value: 89.6, qty: 180, cur: 'EUR' },
  { id: 'g_mats',     name: 'Рулонные маты (галерея), пм',             group: 'equip', unit: 'qty', value: 80, qty: 168, cur: 'EUR' },

  /* --- Оборудование предлагуны --- */
  { id: 'l_separator', name: 'Сепаратор 5,5 кВт',                      group: 'equip', unit: 'qty', value: 34333.2, qty: 1, cur: 'EUR' },
  { id: 'l_pump37',   name: 'Насос погружной 37 кВт',                  group: 'equip', unit: 'qty', value: 31059, qty: 1, cur: 'EUR' },
  { id: 'l_pump22',   name: 'Насос погружной 22 кВт',                  group: 'equip', unit: 'qty', value: 14912.2, qty: 1, cur: 'EUR' },
  { id: 'l_pump55',   name: 'Насос погружной 5,5 кВт',                 group: 'equip', unit: 'qty', value: 13525.5, qty: 1, cur: 'EUR' },
  { id: 'l_manmixer', name: 'Миксер навозный',                        group: 'equip', unit: 'qty', value: 12733, qty: 1, cur: 'EUR' },

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
