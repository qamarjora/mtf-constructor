/* ============================================================
   РИСКИ СТОРОН
   Раздел документа с двумя таблицами. Стороны и события заданы в коде,
   значения ячеек хранятся в проекте (state.riskMatrix) и вводятся
   в карточке на вкладке «Экономика».

   Таблица 1: событие × сторона — что теряет сторона. Ячейка по диагонали
   (событие самой стороны) выводится как «—».
   Таблица 2: по каждому событию — причина, срок и размер потерь, защита
   (гарантия, залог, страхование, пункт договора), ответственный.

   Пустая ячейка выводится как [УТОЧНИТЬ] (движок документа подсвечивает
   пометку и считает её), заполненная — текстом вместо пометки.
   Раздел идёт сразу после «Рисков и их снижения» в бизнес-плане,
   инвестиционном предложении и «Своём наборе» (см. doc-layout.js).

   Подключается после ui.js и до doc-layout.js.
   ============================================================ */

window.MTF = window.MTF || {};

/* ---------- Стороны (столбцы) ---------- */
MTF.riskParties = [
  { id: 'investor',   name: 'Инвестор фермы' },
  { id: 'uk',         name: 'Управляющая компания (АУП комплекса)' },
  { id: 'contractor', name: 'Подрядчик по кормам' },
  { id: 'lender',     name: 'Кредитор' },
  { id: 'state',      name: 'Государство' },
  { id: 'plant',      name: 'Молочный завод' }
];

/* ---------- События (строки); owner — сторона, чьё это событие (диагональ таблицы 1) ---------- */
MTF.riskEvents = [
  { id: 'e_investor',   name: 'Банкротство или дефолт инвестора фермы',        owner: 'investor' },
  { id: 'e_uk',         name: 'Банкротство управляющей компании',              owner: 'uk' },
  { id: 'e_contractor', name: 'Банкротство подрядчика, срыв поставки кормов',  owner: 'contractor' },
  { id: 'e_credit',     name: 'Дефолт по кредиту',                             owner: 'investor' },   // заёмщик — инвестор фермы
  { id: 'e_support',    name: 'Прекращение или отзыв мер господдержки',        owner: 'state' },
  { id: 'e_land',       name: 'Потеря аренды земли',                           owner: 'uk' },         // арендатор — управляющая компания
  { id: 'e_plant',      name: 'Остановка завода, отказ принимать молоко',      owner: 'plant' }
];

/* ---------- Столбцы таблицы 2 ---------- */
MTF.riskDetailFields = [
  { key: 'cause',       label: 'Причина' },
  { key: 'term',        label: 'Срок и размер потерь' },
  { key: 'protection',  label: 'Защита (гарантия, залог, страхование, пункт договора)' },
  { key: 'responsible', label: 'Ответственный' }
];

/* ---------- Данные проекта ----------
   riskMatrix.loss   — { "<событие>|<сторона>": текст }
   riskMatrix.detail — { "<событие>": { cause, term, protection, responsible } }
   Проект без поля читается как пустой (в состояние ничего не пишется, пока не введено значение). */
MTF.ensureRisks = function (state) {
  if (!state.riskMatrix || typeof state.riskMatrix !== 'object') state.riskMatrix = {};
  if (!state.riskMatrix.loss || typeof state.riskMatrix.loss !== 'object') state.riskMatrix.loss = {};
  if (!state.riskMatrix.detail || typeof state.riskMatrix.detail !== 'object') state.riskMatrix.detail = {};
  return state.riskMatrix;
};

/* ---------- Таблицы для документа ---------- */
(function () {
  if (!MTF.docTables) return;

  // экранирование пользовательского текста; перевод строки — <br>, фигурные скобки не должны запускать подстановку
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/\{\{/g, '&#123;&#123;').replace(/\}\}/g, '&#125;&#125;')
    .replace(/\r?\n/g, '<br>');
  const cell = v => (v != null && String(v).trim() !== '') ? esc(String(v).trim()) : '[УТОЧНИТЬ]';

  const orig = MTF.docTables;
  MTF.docTables = function (state, res) {
    const t = orig(state, res);
    if (state.params && state.params.project && state.params.project.type === 'feedlot') {
      t.riskLossTable = ''; t.riskDetailTable = '';
      return t;
    }
    const rm = state.riskMatrix || {}, loss = rm.loss || {}, detail = rm.detail || {};

    t.riskLossTable = dt(['Событие'].concat(MTF.riskParties.map(p => p.name)),
      MTF.riskEvents.map(e => [esc(e.name)].concat(MTF.riskParties.map(p =>
        p.id === e.owner ? '—' : cell(loss[e.id + '|' + p.id])))), false);

    t.riskDetailTable = dt(['Событие'].concat(MTF.riskDetailFields.map(f => f.label)),
      MTF.riskEvents.map(e => [esc(e.name)].concat(MTF.riskDetailFields.map(f =>
        cell((detail[e.id] || {})[f.key])))), false);
    return t;
  };
})();

/* ---------- Раздел документа ---------- */
(function () {
  if (!MTF.docSections) return;

  const section = {
    id: 'riskparties', title: 'Риски сторон', enabled: true,
    body: `Ниже показано, что теряет каждая сторона проекта при наступлении ключевых событий и как предусмотрена защита. Таблицы заполняются по мере согласования с участниками, пустые ячейки отмечены пометкой в квадратных скобках. Прочерк означает, что событие относится к самой стороне.

**Что теряет сторона при наступлении события**

{{riskLossTable}}

**Причины, потери, защита и ответственные**

{{riskDetailTable}}`
  };
  const di = MTF.docSections.findIndex(s => s.id === 'disclaimer');
  if (di >= 0) MTF.docSections.splice(di, 0, section); else MTF.docSections.push(section);
})();

/* ---------- Сохранение вместе с проектом ---------- */
(function () {
  if (!MTF.initState) return;

  const origInit = MTF.initState;
  MTF.initState = function () {
    const st = origInit();
    st.riskMatrix = { loss: {}, detail: {} };
    return st;
  };

  // проект, сохранённый до появления раздела, поля не содержит — читается как пустой
  const origLoad = MTF.load;
  MTF.load = function () {
    const st = origLoad();
    if (st && st.riskMatrix) MTF.ensureRisks(st);
    return st;
  };
})();
