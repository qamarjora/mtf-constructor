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

/* ---------- Запись значений (общая для карточки и тестов) ----------
   Пустое значение удаляет ключ; поле riskMatrix создаётся только при первом непустом вводе.
   Диагональные ячейки таблицы 1 и неизвестные идентификаторы игнорируются. */
MTF.setRiskLoss = function (state, eventId, partyId, value) {
  const e = MTF.riskEvents.find(x => x.id === eventId), p = MTF.riskParties.find(x => x.id === partyId);
  if (!e || !p || e.owner === p.id) return false;
  const v = String(value == null ? '' : value).trim(), k = eventId + '|' + partyId;
  if (v === '') { if (state.riskMatrix && state.riskMatrix.loss) delete state.riskMatrix.loss[k]; return true; }
  MTF.ensureRisks(state).loss[k] = v;
  return true;
};
MTF.setRiskDetail = function (state, eventId, key, value) {
  if (!MTF.riskEvents.some(x => x.id === eventId) || !MTF.riskDetailFields.some(f => f.key === key)) return false;
  const v = String(value == null ? '' : value).trim();
  if (v === '') {
    const d = state.riskMatrix && state.riskMatrix.detail && state.riskMatrix.detail[eventId];
    if (d) { delete d[key]; if (!Object.keys(d).length) delete state.riskMatrix.detail[eventId]; }
    return true;
  }
  const rm = MTF.ensureRisks(state);
  (rm.detail[eventId] = rm.detail[eventId] || {})[key] = v;
  return true;
};

/* ---------- Карточка на вкладке «Экономика» ---------- */
(function () {
  if (!MTF.renderEcon) return;

  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');

  MTF.renderRiskCard = function () {
    const S = MTF.state, rm = S.riskMatrix || {}, loss = rm.loss || {}, detail = rm.detail || {};
    const filled = Object.keys(loss).length +
      Object.keys(detail).reduce((a, k) => a + Object.keys(detail[k] || {}).length, 0);
    const total = MTF.riskEvents.length * (MTF.riskParties.length - 1) + MTF.riskEvents.length * MTF.riskDetailFields.length;

    const ta = (attr, val) => '<textarea class="cmt" rows="2" ' + attr + ' style="margin:0;min-width:120px">' + esc(val) + '</textarea>';

    const rows1 = MTF.riskEvents.map(e =>
      '<tr><td style="min-width:160px">' + esc(e.name) + '</td>' + MTF.riskParties.map(p =>
        p.id === e.owner
          ? '<td class="n" title="Событие самой стороны">—</td>'
          : '<td>' + ta('data-rkl="' + e.id + '|' + p.id + '"', loss[e.id + '|' + p.id]) + '</td>').join('') + '</tr>').join('');

    const rows2 = MTF.riskEvents.map(e =>
      '<tr><td style="min-width:160px">' + esc(e.name) + '</td>' + MTF.riskDetailFields.map(f =>
        '<td>' + ta('data-rkd="' + e.id + '|' + f.key + '"', (detail[e.id] || {})[f.key]) + '</td>').join('') + '</tr>').join('');

    return '<div class="card" style="margin-top:14px"><h3>Риски сторон</h3>' +
      '<div class="hint" style="margin-top:0">Данные для раздела документа «Риски сторон» (бизнес-план, инвестиционное предложение, «Свой набор»). ' +
      'Пустые ячейки выводятся в документе как [УТОЧНИТЬ], заполненные — текстом. Заполнено ' + filled + ' из ' + total + '. ' +
      'Прочерк — событие самой стороны, вводить не нужно.</div>' +
      '<h4>Что теряет сторона при наступлении события</h4>' +
      '<div class="tw"><table><thead><tr><th>Событие</th>' + MTF.riskParties.map(p => '<th>' + esc(p.name) + '</th>').join('') +
      '</tr></thead><tbody>' + rows1 + '</tbody></table></div>' +
      '<h4>Причины, потери, защита и ответственные</h4>' +
      '<div class="tw"><table><thead><tr><th>Событие</th>' + MTF.riskDetailFields.map(f => '<th>' + esc(f.label) + '</th>').join('') +
      '</tr></thead><tbody>' + rows2 + '</tbody></table></div>' +
      '<div class="hint">Счётчик «УТОЧНИТЬ» над документом считает каждую пустую ячейку (до ' + total + ' штук), поэтому при незаполненных таблицах он большой.</div></div>';
  };

  const origEcon = MTF.renderEcon;
  MTF.renderEcon = function (res) {
    return origEcon(res) + MTF.renderRiskCard(res);
  };

  const origBind = MTF.bind;
  MTF.bind = function () {
    origBind();
    const S = MTF.state, upd = () => { MTF.save(); MTF.render(); };
    const on = (sel, fn) => document.querySelectorAll(sel).forEach(el =>
      el.onchange = () => { fn(el); upd(); });
    on('[data-rkl]', el => { const k = el.dataset.rkl.split('|'); MTF.setRiskLoss(S, k[0], k[1], el.value); });
    on('[data-rkd]', el => { const k = el.dataset.rkd.split('|'); MTF.setRiskDetail(S, k[0], k[1], el.value); });
  };
})();
