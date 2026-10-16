/* Раздел «Риски сторон» (state.riskMatrix, js/riskmatrix.js).
   Запуск из корня репозитория: node tests/riskmatrix.test.js
   Грузит все скрипты в порядке index.html с заглушкой document (jsdom не нужен).
   Побитовое равенство документа в смете, техническом описании и паспорте проверено при коммите
   сравнением с предыдущей версией кода; здесь — независимость этих видов от данных раздела. */
const vm = require('vm'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);

/* store — содержимое sessionStorage (для MTF.load); picked — «выбранный файл» для MTF.export.loadJson */
function load(store) {
  const box = { picked: null };
  const ctx = { console, setTimeout, clearTimeout,
    sessionStorage: { getItem() { return store === undefined ? null : store; }, setItem() {} },
    localStorage: { getItem() { return null; }, setItem() {} },
    alert(m) { console.log('ALERT', m); }, confirm() { return true }, prompt() { return null },
    FileReader: function () { this.readAsText = function (t) { this.result = String(t); this.onload(); }; },
    Blob: function () {}, URL: { createObjectURL() { return ''; } } };
  ctx.window = ctx;
  ctx.document = { addEventListener() {}, getElementById() { return { style: {}, addEventListener() {} }; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    createElement() { const el = { style: {}, files: [], click() { el.files = [box.picked]; el.onchange(); } }; return el; } };
  ctx.addEventListener = () => {}; ctx.navigator = {};
  vm.createContext(ctx);
  scripts.forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
  ctx.__box = box;
  return ctx;
}
const ctx = load(), M = ctx.MTF;
const c = o => JSON.parse(JSON.stringify(o));
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✓ ' : '  ✗ ') + msg); if (!cond) fails++; };
const MARK = '<mark class="todo">[УТОЧНИТЬ]</mark>';
const count = (s, sub) => s.split(sub).length - 1;

function render(mode, over, M2) {
  const MM = M2 || M;
  const st = MM.initState();
  st.docSections = MM.mergeDocSections(null);
  if (mode === 'custom') { st.docSections.forEach(s => s.enabled = true); st.docMode = 'custom'; } else MM.applyDocMode(st, mode);
  if (over) over(st);
  MM.state = st;
  return MM.renderDoc(st, MM.runModel(st));
}
const risk = secs => secs.find(x => /Риски сторон/.test(x.title));
const tables = body => body.split('<table').slice(1).map(t => '<table' + t.split('</table>')[0] + '</table>');
const rowsOf = tbl => tbl.split('<tr>').slice(2).map(r => r.split('</tr>')[0].split(/<td[^>]*>/).slice(1).map(x => x.replace(/<\/td>/, '')));

console.log('1. Стороны, события, диагональ');
ok(M.riskParties.length === 6 && M.riskEvents.length === 7, 'шесть сторон и семь событий');
ok(M.riskParties.map(p => p.id).join() === 'investor,uk,contractor,lender,state,plant', 'стороны: инвестор фермы, управляющая компания, подрядчик, кредитор, государство, молочный завод');
ok(M.riskEvents.map(e => e.owner).join() === 'investor,uk,contractor,investor,state,uk,plant',
  'диагональ по решению владельца: 1→инвестор, 2→УК, 3→подрядчик, 4→инвестор (заёмщик), 5→государство, 6→УК (арендатор), 7→завод');
ok(new Set(M.riskEvents.map(e => e.id)).size === 7 && M.riskEvents.every(e => M.riskParties.some(p => p.id === e.owner)), 'идентификаторы событий уникальны, владелец — существующая сторона');
ok(M.riskDetailFields.map(f => f.key).join() === 'cause,term,protection,responsible', 'столбцы таблицы 2: причина, срок и размер потерь, защита, ответственный');
ok(M.initState().riskMatrix && JSON.stringify(M.initState().riskMatrix) === '{"loss":{},"detail":{}}', 'новый проект: riskMatrix = { loss: {}, detail: {} }');

console.log('2. Где виден раздел');
['bizplan', 'investment', 'custom'].forEach(function (mode) {
  const d = render(mode), i = d.findIndex(x => /Риски и их снижение/.test(x.title));
  ok(i >= 0 && /Риски сторон/.test(d[i + 1].title), mode + ': «Риски сторон» сразу после «Рисков и их снижения»');
  const mains = d.filter(x => !x.appendix).map(x => (x.title.match(/^(\d+)\./) || [])[1]).filter(Boolean).map(Number);
  ok(mains.every((n, k) => n === k + 1), mode + ': нумерация разделов подряд');
});
['estimate', 'technical', 'passport'].forEach(function (mode) {
  ok(!risk(render(mode)), mode + ': раздела «Риски сторон» нет');
});

console.log('3. Пустые ячейки: [УТОЧНИТЬ] и диагональ');
const body = risk(render('investment')).body, tb = tables(body);
ok(tb.length === 2, 'в разделе две таблицы');
ok(count(body, MARK) === 63, 'пустые ячейки выводятся как [УТОЧНИТЬ] с подсветкой: 35 в таблице 1 и 28 в таблице 2 (' + count(body, MARK) + ')');
const r1 = rowsOf(tb[0]), r2 = rowsOf(tb[1]);
ok(r1.length === 7 && r1.every(r => r.length === 7), 'таблица 1: 7 событий × (событие + 6 сторон)');
ok(r1.every((r, i) => r.slice(1).every((v, j) => (M.riskParties[j].id === M.riskEvents[i].owner) === (v === '—'))), 'таблица 1: прочерк только на диагонали (событие самой стороны)');
ok(r1.every(r => r.slice(1).filter(v => v === '—').length === 1), 'в каждой строке ровно один прочерк');
ok(r2.length === 7 && r2.every(r => r.length === 5 && r.slice(1).every(v => v.indexOf('[УТОЧНИТЬ]') >= 0)), 'таблица 2: 7 событий × (событие + 4 столбца), все ячейки пусты');
ok(/Банкротство или дефолт инвестора фермы/.test(tb[0]) && /Остановка завода, отказ принимать молоко/.test(tb[1]), 'названия событий в обеих таблицах');
ok(M._todoCount >= 63, 'счётчик «УТОЧНИТЬ» над документом включает эти ячейки (известное поведение, ' + M._todoCount + ')');

console.log('4. Заполненные ячейки вместо [УТОЧНИТЬ]');
const filled = render('investment', function (st) {
  st.riskMatrix = { loss: { 'e_investor|lender': 'Невозврат кредита, 100% остатка', 'e_uk|investor': '  Потеря управления  ', 'e_plant|contractor': '   ' },
    detail: { e_land: { cause: 'Расторжение договора аренды', term: '12 мес., до 40 млн ₸', protection: 'Пункт договора', responsible: 'УК' } } };
});
const fb = risk(filled).body, ft = tables(fb), fr1 = rowsOf(ft[0]), fr2 = rowsOf(ft[1]);
ok(fr1[0][4] === 'Невозврат кредита, 100% остатка' && fr1[1][1] === 'Потеря управления', 'таблица 1: значения вместо пометки (пробелы по краям обрезаны)');
ok(fr1[6][3].indexOf('[УТОЧНИТЬ]') >= 0, 'ячейка из одних пробелов считается пустой');
ok(fr2[5].slice(1).join('|') === 'Расторжение договора аренды|12 мес., до 40 млн ₸|Пункт договора|УК', 'таблица 2: строка «Потеря аренды земли» заполнена');
ok(count(fb, MARK) === 63 - 2 - 4, 'пометок стало на число заполненных ячеек меньше (' + count(fb, MARK) + ')');
ok(fr1[0][1] === '—', 'диагональ остаётся прочерком, даже если в проекте для неё есть значение');
const diagFilled = render('investment', st => { st.riskMatrix = { loss: { 'e_investor|investor': 'не должно показываться' }, detail: {} }; });
ok(risk(diagFilled).body.indexOf('не должно показываться') < 0, 'значение диагональной ячейки в документ не попадает');

console.log('5. Экранирование');
const evil = render('bizplan', function (st) {
  st.riskMatrix = { loss: { 'e_uk|lender': '<b>жирно</b> & "кавычки" {{farmsCount}}', 'e_credit|state': 'строка 1\nстрока 2' }, detail: {} };
});
const eb = risk(evil).body, er = rowsOf(tables(eb)[0]);
ok(er[1][4] === '&lt;b&gt;жирно&lt;/b&gt; &amp; &quot;кавычки&quot; &#123;&#123;farmsCount&#125;&#125;', 'теги, амперсанд, кавычки и фигурные скобки экранированы');
ok(eb.indexOf('<b>жирно</b>') < 0 && !/\{\{|\}\}/.test(eb), 'в документе нет сырой разметки и нераскрытых плейсхолдеров');
ok(er[3][5] === 'строка 1<br>строка 2' && tables(eb)[0].indexOf('\n') < 0, 'перевод строки превращается в <br>, таблица остаётся одной строкой');

console.log('6. Независимость других видов документа');
['estimate', 'technical', 'passport'].forEach(function (mode) {
  const a = JSON.stringify(render(mode)), b = JSON.stringify(render(mode, st => { st.riskMatrix = { loss: { 'e_uk|lender': 'x' }, detail: { e_uk: { cause: 'y' } } }; }));
  ok(a === b, mode + ': документ не зависит от riskMatrix');
});

console.log('7. Сохранение и повторное открытие');
const st0 = M.initState();
st0.riskMatrix = { loss: { 'e_uk|lender': 'Потеря обеспечения' }, detail: { e_contractor: { cause: 'Срыв заготовки', term: 'сезон', protection: 'Гарантия', responsible: 'УК' } } };
const file = JSON.stringify(Object.assign({}, st0, { scenarios: [] }));
ok(JSON.parse(file).riskMatrix.loss['e_uk|lender'] === 'Потеря обеспечения', 'saveJson-формат: riskMatrix записывается в файл');
const cA = load(file); const stA = cA.MTF.load();
ok(JSON.stringify(stA.riskMatrix) === JSON.stringify(st0.riskMatrix), 'MTF.load (сессия) возвращает riskMatrix без изменений');
const cB = load(); cB.MTF.save = () => {}; cB.MTF.render = () => {}; cB.__box.picked = file; cB.MTF.export.loadJson();
ok(JSON.stringify(cB.MTF.state.riskMatrix) === JSON.stringify(st0.riskMatrix), 'MTF.export.loadJson («Открыть») возвращает riskMatrix без изменений');
const docOf = (MM, st) => { st.docSections = MM.mergeDocSections(null); MM.applyDocMode(st, 'investment'); MM.state = st; return risk(MM.renderDoc(st, MM.runModel(st))).body; };
const stOrig = M.initState(); stOrig.riskMatrix = c(st0.riskMatrix);
ok(docOf(cB.MTF, cB.MTF.state) === docOf(M, stOrig), 'документ после повторного открытия тот же, что до сохранения');

console.log('8. Старый .json без поля');
const oldFile = JSON.stringify(Object.assign({}, st0, { scenarios: [] }, { riskMatrix: undefined }));
ok(JSON.parse(oldFile).riskMatrix === undefined, 'в старом файле поля riskMatrix нет');
const cC = load(oldFile); const stC = cC.MTF.load();
ok(stC && stC.riskMatrix === undefined, 'MTF.load открывает файл без поля, в состояние ничего не дописывается');
const cD = load(); cD.MTF.save = () => {}; cD.MTF.render = () => {}; cD.__box.picked = oldFile; cD.MTF.export.loadJson();
ok(cD.MTF.state && cD.MTF.state.riskMatrix === undefined, 'MTF.export.loadJson открывает файл без поля');
const oldBody = docOf(cD.MTF, cD.MTF.state);
ok(count(oldBody, MARK) === 63, 'раздел появляется с [УТОЧНИТЬ] во всех ячейках (63)');
ok(cD.MTF.state.riskMatrix === undefined, 'построение документа не записывает поле в проект');
ok(JSON.stringify(cD.MTF.ensureRisks(cD.MTF.state)) === '{"loss":{},"detail":{}}', 'ensureRisks создаёт пустую структуру (для карточки ввода)');

console.log('9. Откорм не затронут');
ok((M.feedlot && M.feedlot.docSections ? M.feedlot.docSections : []).every(s => s.id !== 'riskparties' && s.body.indexOf('riskLossTable') < 0), 'разделы откорма (fl_*) раздела «Риски сторон» не содержат');
ok(M.docSections.some(s => s.id === 'riskparties') && M.docSections.find(s => s.id === 'riskparties').enabled === true, 'в наборе разделов МТФ раздел есть и включён по умолчанию (виден в «Своём наборе»)');

console.log('10. Карточка ввода на вкладке «Экономика»');
const cs = M.initState(); M.state = cs;
const card0 = M.renderRiskCard();
ok(count(card0, 'data-rkl="') === 35 && count(card0, 'data-rkd="') === 28, 'поля ввода: 35 в таблице 1 (без диагонали) и 28 в таблице 2');
ok(count(card0, 'title="Событие самой стороны">—</td>') === 7, 'на диагонали семь прочерков без поля ввода');
ok(/Заполнено 0 из 63/.test(card0), 'счётчик заполнения: 0 из 63');
ok(M.renderEcon(M.runModel(cs)).indexOf('<h3>Риски сторон</h3>') >= 0, 'карточка выводится на вкладке «Экономика»');
ok(card0.indexOf('data-rkl="e_investor|investor"') < 0 && card0.indexOf('data-rkl="e_credit|investor"') < 0 && card0.indexOf('data-rkl="e_land|uk"') < 0, 'поля для диагональных ячеек нет (в том числе «дефолт по кредиту» × инвестор и «потеря аренды» × УК)');

console.log('11. Запись значений');
const ws = M.initState();
ok(M.setRiskLoss(ws, 'e_uk', 'lender', '  Потеря обеспечения ') === true && ws.riskMatrix.loss['e_uk|lender'] === 'Потеря обеспечения', 'значение таблицы 1 записывается, пробелы по краям обрезаются');
ok(M.setRiskDetail(ws, 'e_land', 'cause', 'Расторжение') === true && ws.riskMatrix.detail.e_land.cause === 'Расторжение', 'значение таблицы 2 записывается');
ok(M.setRiskLoss(ws, 'e_investor', 'investor', 'x') === false && !('e_investor|investor' in ws.riskMatrix.loss), 'диагональная ячейка не записывается');
ok(M.setRiskLoss(ws, 'нет', 'lender', 'x') === false && M.setRiskLoss(ws, 'e_uk', 'нет', 'x') === false && M.setRiskDetail(ws, 'e_uk', 'нет', 'x') === false && M.setRiskDetail(ws, 'нет', 'cause', 'x') === false, 'неизвестные идентификаторы игнорируются');
M.setRiskLoss(ws, 'e_uk', 'lender', '   ');
ok(!('e_uk|lender' in ws.riskMatrix.loss), 'пустое значение удаляет ячейку');
M.setRiskDetail(ws, 'e_land', 'cause', '');
ok(!('e_land' in ws.riskMatrix.detail), 'последняя очищенная ячейка события убирает запись события');
const fresh = M.initState(); delete fresh.riskMatrix;
M.setRiskLoss(fresh, 'e_uk', 'lender', ''); M.setRiskDetail(fresh, 'e_uk', 'cause', '');
ok(fresh.riskMatrix === undefined, 'очистка пустого значения в проекте без поля поле не создаёт');
M.setRiskLoss(fresh, 'e_uk', 'lender', 'Потеря');
ok(fresh.riskMatrix && fresh.riskMatrix.loss['e_uk|lender'] === 'Потеря', 'первое непустое значение создаёт поле');
const cs2 = M.initState(); M.setRiskLoss(cs2, 'e_uk', 'lender', '<i>&"x"'); M.setRiskDetail(cs2, 'e_uk', 'cause', 'причина'); M.state = cs2;
const card1 = M.renderRiskCard();
ok(/Заполнено 2 из 63/.test(card1) && card1.indexOf('&lt;i&gt;&amp;&quot;x&quot;') >= 0 && card1.indexOf('<i>') < 0, 'карточка показывает значения (экранированные) и счётчик 2 из 63');
ok(count(risk(render('investment', st => { st.riskMatrix = c(cs2.riskMatrix); })).body, MARK) === 61, 'введённые в карточке значения уходят в документ вместо пометок (61)');

console.log('12. Подсветка пометок в экспорте (Word и PDF)');
const pcss = M.printCss();
ok(/mark\.todo\{background:#fff1a8;color:inherit;padding:0 2pt\}/.test(pcss), 'в печатном стиле есть подсветка mark.todo (как на экране)');
ok(pcss.split('\n').filter(l => l.indexOf('mark.todo') >= 0).length === 1, 'правило одно');

console.log(fails ? '\nЕсть ошибки: ' + fails : '\nВсе проверки пройдены');
process.exit(fails ? 1 : 0);
