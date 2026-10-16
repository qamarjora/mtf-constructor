/* Подпункт «Миссия и цикл проекта» в разделе «Концепция».
   Запуск из корня репозитория: node tests/mission.test.js
   Грузит все скрипты в порядке index.html с заглушкой document (jsdom не нужен).
   Побитовое равенство документа в остальных режимах проверено при коммите сравнением с предыдущей версией кода. */
const vm = require('vm'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);

function load() {
  const ctx = { console, setTimeout, clearTimeout,
    sessionStorage: { getItem() { return null; }, setItem() {} },
    localStorage: { getItem() { return null; }, setItem() {} } };
  ctx.window = ctx;
  ctx.document = { addEventListener() {}, getElementById() { return { style: {}, addEventListener() {} }; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    createElement() { return { style: {}, click() {} }; } };
  ctx.addEventListener = () => {}; ctx.navigator = {};
  vm.createContext(ctx);
  scripts.forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
  return ctx;
}
const ctx = load(), M = ctx.MTF;
const c = o => JSON.parse(JSON.stringify(o));
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✓ ' : '  ✗ ') + msg); if (!cond) fails++; };
const plain = s => String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

function render(mode, over) {
  const st = M.initState();
  st.docSections = M.mergeDocSections(null);
  if (mode === 'custom') { st.docSections.forEach(s => s.enabled = true); st.docMode = 'custom'; } else M.applyDocMode(st, mode);
  if (over) over(st);
  M.state = st;
  return M.renderDoc(st, M.runModel(st));
}
const concept = secs => secs.find(x => /Общая концепция проекта/.test(x.title));
const heads = secs => (concept(secs).body.match(/<h3>(.*?)<\/h3>/g) || []).map(h => h.replace(/<\/?h3>/g, ''));
const parsed = secs => heads(secs).map(h => { const m = h.match(/^(\d+)\.(\d+)\.\s*(.+)$/); return m ? { sec: +m[1], k: +m[2], name: m[3] } : null; });

console.log('1. Склонение');
const nom = n => M.pluralRu(n, 'молочная ферма', 'молочные фермы', 'молочных ферм');
const gen = n => M.pluralRu(n, 'молочной фермы', 'молочных ферм', 'молочных ферм');
ok([[1, 'молочная ферма'], [2, 'молочные фермы'], [3, 'молочные фермы'], [4, 'молочные фермы'], [5, 'молочных ферм'], [10, 'молочных ферм'],
    [11, 'молочных ферм'], [12, 'молочных ферм'], [14, 'молочных ферм'], [21, 'молочная ферма'], [22, 'молочные фермы'], [25, 'молочных ферм'],
    [101, 'молочная ферма'], [111, 'молочных ферм']].every(x => nom(x[0]) === x[1]), 'именительный: 1, 2–4, 5+, 11–14, 21, 22, 101, 111');
ok([[1, 'молочной фермы'], [2, 'молочных ферм'], [5, 'молочных ферм'], [10, 'молочных ферм'], [11, 'молочных ферм'], [21, 'молочной фермы'], [22, 'молочных ферм']]
    .every(x => gen(x[0]) === x[1]), 'родительный (после «из»): 1 — «молочной фермы», 2+ — «молочных ферм», 21 — «молочной фермы»');
const bd = M.buildDocData(c(M.initState()), { herd: { meta: { target: 474 } } });
ok(bd.farmsWord === 'молочных ферм' && bd.farmsWordOf === 'молочных ферм', 'buildDocData: farmsWord и farmsWordOf (10 ферм)');
const st1 = M.initState(); st1.params.project.farmsCount = 1;
const bd1 = M.buildDocData(st1, { herd: { meta: { target: 474 } } });
ok(bd1.farmsWord === 'молочная ферма' && bd1.farmsWordOf === 'молочной фермы', 'buildDocData: 1 ферма — «молочная ферма» / «молочной фермы»');

console.log('2. Режимы документа');
ok(M.missionModes.join() === 'passport,bizplan,investment,custom', 'подпункт показывается в passport, bizplan, investment, custom');
['estimate', 'technical'].forEach(function (mode) {
  const d = render(mode), p = parsed(d);
  ok(plain(concept(d).body).indexOf('Миссия и цикл проекта') < 0, mode + ': подпункта «Миссия и цикл проекта» нет');
  ok(p.every(x => x) && p.map(x => x.name).join('|') === 'Суть проекта|Масштаб проекта|Структура участия|Оператор проекта' && p.every((x, i) => x.k === i + 1),
    mode + ': подпункты прежние 1.1–1.4 (Суть, Масштаб, Структура участия, Оператор)');
  ok(concept(d).body.indexOf('{{') < 0 && concept(d).body.indexOf('conceptN') < 0, mode + ': нераскрытых плейсхолдеров нет');
});
['passport', 'bizplan', 'investment', 'custom'].forEach(function (mode) {
  const d = render(mode), p = parsed(d);
  ok(p.every(x => x) && p.map(x => x.name).join('|') === 'Суть проекта|Миссия и цикл проекта|Масштаб проекта|Структура участия|Оператор проекта',
    mode + ': вторым подпунктом идёт «Миссия и цикл проекта», затем Масштаб, Структура, Оператор');
  ok(p.every((x, i) => x.k === i + 1) && p.every(x => x.sec === p[0].sec), mode + ': номера подпунктов подряд (' + p.map(x => x.sec + '.' + x.k).join(', ') + ')');
  ok(concept(d).body.indexOf('{{') < 0 && concept(d).body.indexOf('conceptN') < 0, mode + ': нераскрытых плейсхолдеров нет');
  const mains = d.filter(x => !x.appendix).map(x => (x.title.match(/^(\d+)\./) || [])[1]).filter(Boolean).map(Number);
  ok(mains.every((n, i) => n === i + 1), mode + ': нумерация разделов подряд');
});
const saved = M.missionModes; M.missionModes = [];
const off = parsed(render('passport'));
M.missionModes = saved;
ok(off.map(x => x.name).join('|') === 'Суть проекта|Масштаб проекта|Структура участия|Оператор проекта' && off.every((x, i) => x.k === i + 1), 'список режимов пуст: в паспорте подпункты снова 1.1–1.4 (блок управляется только списком режимов)');

console.log('3. Текст подпункта');
const dI = render('investment'), bI = concept(dI).body;
ok(/Миссия проекта: создать в Казахстане замкнутый цикл производства молока/.test(plain(bI)), 'абзац о миссии');
['Заготовка кормов.', 'Фермы.', 'Управляющая компания.', 'Государственная поддержка.', 'Молочный завод.'].forEach(h =>
  ok(bI.indexOf('<b>' + h + '</b>') >= 0, 'звено «' + h + '» выделено названием в начале абзаца'));
ok(/Посевные и полевые работы выполняет подрядчик на земле, арендованной у государства/.test(plain(bI)) && /по фиксированной цене/.test(plain(bI)) && /излишки кормов могут быть реализованы/.test(plain(bI)), 'заготовка кормов: подрядчик, аренда у государства, фиксированная цена, излишки');
ok(/Экономика молочного завода в настоящем расчёте не рассматривается/.test(plain(bI)), 'оговорка: экономика молочного завода не рассматривается');
ok(M.missionText(10).split('\n\n').length === 7, 'в тексте заголовок и шесть абзацев');
[[1, 'из 1 молочной фермы'], [2, 'из 2 молочных ферм'], [5, 'из 5 молочных ферм'], [10, 'из 10 молочных ферм'], [21, 'из 21 молочной фермы']].forEach(function (x) {
  const d = render('investment', st => { st.params.project.farmsCount = x[0]; });
  ok(plain(concept(d).body).indexOf('Сеть состоит из ' + x[1].slice(3)) >= 0 || plain(concept(d).body).indexOf('Сеть состоит ' + x[1]) >= 0, 'farmsCount = ' + x[0] + ': «Сеть состоит ' + x[1] + '.»');
});
ok(M.missionText(7).indexOf('{{') < 0, 'текст собирается в коде без вложенных плейсхолдеров');

console.log('4. Старые проекты и правленные шаблоны');
const oldBody = c(M.docSections.find(s => s.id === 'concept')).body
  .replace('{{missionBlock}}', '').replace('{{conceptN2}}', '2').replace('{{conceptN3}}', '3').replace('{{conceptN4}}', '4');
const withOld = render('investment', function (st) {
  const s = st.docSections.find(x => x.id === 'concept'); s.body = oldBody; s.edited = true;
});
ok(plain(concept(withOld).body).indexOf('Миссия и цикл проекта') < 0 && parsed(withOld).every((x, i) => x && x.k === i + 1) && parsed(withOld).length === 4,
  'проект с edited: true на «Концепции» остаётся без подпункта (известное поведение), подпункты 1.1–1.4');
const savedNoEdit = [{ id: 'concept', title: 'Концепция', enabled: true, body: oldBody }];
const merged = M.mergeDocSections(savedNoEdit).find(x => x.id === 'concept');
ok(merged.body.indexOf('{{missionBlock}}') >= 0 && !merged.edited, 'старый .json без edited получает шаблон из кода (с подпунктом)');
const keepEdited = M.mergeDocSections([{ id: 'concept', title: 'Концепция', enabled: true, body: oldBody, edited: true }]).find(x => x.id === 'concept');
ok(keepEdited.body === oldBody && keepEdited.edited === true, 'правленый шаблон сохраняется как есть');

console.log('5. Откорм не затронут');
const fl = M.initState(); fl.params.project.type = 'feedlot'; fl.docMode = 'passport';
ok(M.missionOn(fl) === false, 'для проекта откорма подпункт отключён (MTF.missionOn)');
const flc = (MTF => MTF.feedlot && MTF.feedlot.docSections)(M);
ok(Array.isArray(flc) ? flc.every(s => s.body.indexOf('missionBlock') < 0 && s.body.indexOf('conceptN') < 0) : true, 'разделы откорма (fl_*) плейсхолдеров миссии не содержат');
ok(M.docSections.some(s => s.id === 'concept') && M.docSections.find(s => s.id === 'concept').body.indexOf('{{missionBlock}}') >= 0, 'шаблон «Концепции» МТФ содержит {{missionBlock}}');

console.log(fails ? '\nЕсть ошибки: ' + fails : '\nВсе проверки пройдены');
process.exit(fails ? 1 : 0);
