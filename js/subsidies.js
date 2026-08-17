/* ============================================================
   РЕЕСТР СУБСИДИЙ
   Добавляйте меры поддержки в этот список. Каждая строка
   включается и выключается в интерфейсе независимо.

   type:
     'per_liter'   — ₸ за литр реализованного молока
     'per_head'    — тыс. ₸ на голову (разово, при закупе)
     'capex_pct'   — % возмещения от группы капзатрат
     'rate_sub'    — снижение ставки кредита на N п.п.
     'fixed_year'  — фиксированная сумма в год, тыс. ₸

   base (для capex_pct): build | equip | herd | prep | all
   yearFrom / yearTo — годы действия (1 = первый год проекта)
   conflictsWith — id мер, с которыми не совмещается
   status — 'confirmed' | 'check' | 'draft'
   ============================================================ */

window.MTF = window.MTF || {};

MTF.subsidies = [
  {
    id: 'milk_400',
    name: 'Субсидия за реализованное молоко (фермы от 400 голов)',
    type: 'per_liter',
    value: 45,
    unit: '₸/л',
    yearFrom: 1,
    yearTo: 10,
    condition: 'Фуражное поголовье от 400 голов, подтверждённая реализация на переработку',
    conflictsWith: ['milk_50_400'],
    enabled: true,
    status: 'check',
    source: '',
    comment: 'Ставку и порог поголовья подтвердить по действующим правилам субсидирования'
  },
  {
    id: 'milk_50_400',
    name: 'Субсидия за реализованное молоко (фермы 50–400 голов)',
    type: 'per_liter',
    value: 20,
    unit: '₸/л',
    yearFrom: 1,
    yearTo: 10,
    condition: 'Фуражное поголовье от 50 до 400 голов',
    conflictsWith: ['milk_400'],
    enabled: false,
    status: 'check',
    source: '',
    comment: 'Применяется в период формирования стада, пока поголовье ниже 400'
  },
  {
    id: 'invest_build',
    name: 'Инвестиционная субсидия на строительство МТФ',
    type: 'capex_pct',
    base: 'build',
    value: 25,
    unit: '% от затрат',
    yearFrom: 2,
    yearTo: 3,
    condition: 'Ввод объекта в эксплуатацию, соответствие типовым требованиям',
    conflictsWith: [],
    enabled: true,
    status: 'check',
    source: '',
    comment: 'Возмещение поступает после ввода в эксплуатацию — уточнить год поступления'
  },
  {
    id: 'invest_equip',
    name: 'Инвестиционная субсидия на оборудование',
    type: 'capex_pct',
    base: 'equip',
    value: 25,
    unit: '% от затрат',
    yearFrom: 2,
    yearTo: 3,
    condition: 'Приобретение нового оборудования по перечню',
    conflictsWith: [],
    enabled: true,
    status: 'check',
    source: '',
    comment: ''
  },
  {
    id: 'breeding_heifers',
    name: 'Субсидия на приобретение племенного маточного поголовья',
    type: 'per_head',
    value: 200,
    unit: 'тыс. ₸/гол',
    yearFrom: 1,
    yearTo: 2,
    condition: 'Племенной статус, происхождение подтверждено',
    conflictsWith: [],
    enabled: true,
    status: 'check',
    source: '',
    comment: 'Ставка различается для импортного и отечественного поголовья — проверить'
  },
  {
    id: 'semen',
    name: 'Удешевление семени быков-производителей',
    type: 'fixed_year',
    value: 1200,
    unit: 'тыс. ₸/год',
    yearFrom: 1,
    yearTo: 10,
    condition: 'Использование семени из перечня, ведение учёта осеменений',
    conflictsWith: [],
    enabled: false,
    status: 'check',
    source: '',
    comment: ''
  },
  {
    id: 'selection',
    name: 'Ведение селекционно-племенной работы (товарное стадо)',
    type: 'per_head',
    value: 10,
    unit: 'тыс. ₸/гол в год',
    yearFrom: 2,
    yearTo: 10,
    condition: 'Учёт продуктивности, идентификация животных',
    conflictsWith: [],
    enabled: false,
    status: 'check',
    source: '',
    comment: 'Начисляется ежегодно на маточное поголовье'
  },
  {
    id: 'rate_subsidy',
    name: 'Субсидирование ставки вознаграждения по кредиту',
    type: 'rate_sub',
    value: 0,
    unit: 'п.п. снижения',
    yearFrom: 1,
    yearTo: 10,
    condition: 'Инвестиционный кредит в рамках программы',
    conflictsWith: [],
    enabled: false,
    status: 'draft',
    source: '',
    comment: 'Если ставка АКК уже льготная (6%), удешевление может не применяться'
  }
];

/* Проверка конфликтов между включёнными мерами */
MTF.checkSubsidyConflicts = function (list) {
  const on = list.filter(s => s.enabled);
  const issues = [];
  on.forEach(s => {
    (s.conflictsWith || []).forEach(cid => {
      if (on.some(o => o.id === cid)) {
        const pair = [s.id, cid].sort().join('|');
        if (!issues.some(i => i.pair === pair)) {
          issues.push({
            pair: pair,
            text: 'Одновременно включены «' + s.name + '» и «' +
                  (list.find(x => x.id === cid) || {}).name + '». Проверьте совместимость.'
          });
        }
      }
    });
  });
  return issues;
};
