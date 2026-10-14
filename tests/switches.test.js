/* Переключатели: труд земельного фонда (staff.blocks.land.enabled) и парк техники.
   Запуск из корня репозитория: node tests/switches.test.js
   Грузит все скрипты в порядке index.html с заглушкой document (jsdom не нужен).
   Главное правило: при выключенных переключателях (по умолчанию) цифры и текст документа прежние. */
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
const near = (a, b, tol) => Math.abs(a - b) <= (tol === undefined ? 1e-6 : tol);
const text = s => String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/* Проект с заполненными блоками: комплекс и земельный фонд не нулевые */
function project() {
  const st = M.initState();
  st.params.project.farmsCount = 10;
  st.staff.forEach(x => {
    if (x.block === 'complex') { x.count = 1; x.salary = 1000; }
    if (x.block === 'land') { x.count = 2; x.salary = 300; }
  });
  M.state = st;
  return st;
}
const withLandOff = st => { const s = c(st); s.params.staff.blocks.land.enabled = false; M.state = s; return s; };

console.log('1. Труд земельного фонда: значения по умолчанию и расчёт');
const base = project();
const cows = 475;
ok(M.staffBlockOf(base.params, 'land').enabled === true && M.staffBlockOf(base.params, 'land').off === false, 'по умолчанию блок «Земельный фонд» включён (enabled = true, off = false)');
ok(M.defaults.staff.blocks.land.enabled === true, 'в config.js у блока land enabled = true');
const old = c(base); delete old.params.staff.blocks.land.enabled; delete old.params.staff.blocks.complex.enabled;
const p0 = M.calcPayroll(base.params, base.staff, cows), pOld = M.calcPayroll(old.params, old.staff, cows);
ok(near(p0.net, pOld.net) && near(p0.gross, pOld.gross) && p0.headcount === pOld.headcount, 'проект без поля enabled считается как с enabled = true (числа прежние)');
ok(p0.blocks.every(b => b.off === false), 'у включённых блоков off = false');

const off = withLandOff(base);
const p1 = M.calcPayroll(off.params, off.staff, cows);
const bl = id => p1.blocks.find(b => b.id === id);
ok(bl('land').off === true && bl('land').net === 0 && bl('land').gross === 0 && bl('land').grossTotal === 0 && bl('land').headcountFull === 0, 'выключенный блок: off = true, стоимость и численность 0');
ok(bl('land').rows > 0, 'должности выключенного блока в данных сохранены (rows = ' + bl('land').rows + ')');
ok(near(p1.gross, bl('complex').gross + bl('farm').gross), 'ФОТ на ферму = комплекс + ферма (земельный фонд не входит)');
ok(p1.gross < p0.gross && p1.headcount <= p0.headcount, 'ФОТ на ферму меньше, штат на ферму не больше, чем при включённом блоке');
ok(near(p0.gross - p1.gross, p0.blocks.find(b => b.id === 'land').gross), 'разница ФОТ равна прежней стоимости блока');
off.params.staff.blocks.land.enabled = true;
ok(near(M.calcPayroll(off.params, off.staff, cows).gross, p0.gross), 'включение обратно возвращает прежний ФОТ');

const r0 = M.runModel(project()), r1 = M.runModel(withLandOff(project()));
ok(near(r0.capex.total, r1.capex.total), 'капзатраты не меняются');
ok(r1.pnl.every((y, i) => y.opexDetail['Фонд оплаты труда'] < r0.pnl[i].opexDetail['Фонд оплаты труда']), 'ФОТ в P&L меньше в каждом году');
ok(r1.metrics.npv > r0.metrics.npv, 'NPV выше при выключенном блоке');
ok(r1.herd.every((y, i) => near(y.milkLiters, r0.herd[i].milkLiters, 1e-9) && near(y.cows, r0.herd[i].cows, 1e-9)), 'стадо и надой не меняются');
M.state = project();

console.log('2. Труд земельного фонда: документ');
const sOn = project(), rOn = M.runModel(sOn), tOn = M.docTables(sOn, rOn);
const OLD_INTRO = 'Фонд оплаты труда сформирован тремя блоками. Блок фермы считается на каждую ферму отдельно. Общие блоки обслуживают все фермы проекта, и их стоимость распределяется между фермами поровну.';
ok(tOn.staffIntro === OLD_INTRO, 'при включённых блоках вводная фраза прежняя слово в слово («тремя блоками»)');
ok(/учтена 1\/10 часть общих блоков\. В пересчёте на одну фуражную корову/.test(tOn.staffNote) && tOn.staffNote.indexOf('АУП комплекса') < 0, 'при включённых блоках staffNote прежний');
ok(/Земельный фонд \(на проект, делится на 10 ферм\)/.test(text(tOn.staffBlocksTable)), 'строка блока в таблице прежняя');
const sOff = withLandOff(project()), rOff = M.runModel(sOff), tOff = M.docTables(sOff, rOff);
ok(/двумя блоками/.test(tOff.staffIntro) && !/тремя блоками/.test(tOff.staffIntro), 'вводная фраза: «двумя блоками» берётся из данных');
ok(/Общий блок обслуживает все фермы проекта, и его стоимость/.test(tOff.staffIntro), 'общий блок в единственном числе');
ok(/Земельный фонд \(выполняет АУП комплекса\) — — —/.test(text(tOff.staffBlocksTable)), 'строка блока: «выполняет АУП комплекса», прочерки');
ok(/Функции блока «Земельный фонд» выполняет АУП комплекса/.test(tOff.staffNote) && /1\/10 часть общего блока/.test(tOff.staffNote), 'staffNote: функции блока выполняет АУП комплекса, «общего блока»');
const roster = text(tOff.staffRosterTable);
ok(roster.indexOf('Земельный фонд') < 0, 'в штатном расписании строк выключенного блока нет');
const rosterOn = text(tOn.staffRosterTable);
ok(rosterOn.indexOf('Земельный фонд') >= 0, 'при включённом блоке строки блока в расписании есть');
const body = M.docSections.find(s => s.id === 'staff').body;
ok(/^\{\{staffIntro\}\}/.test(body), 'шаблон раздела начинается с {{staffIntro}}');

console.log('3. Труд земельного фонда: интерфейс');
const htmlOn = ctx.staffBlocksHtml(sOn.params, rOn), htmlOff = ctx.staffBlocksHtml(sOff.params, rOff);
ok(htmlOn.indexOf('data-blken="land"') >= 0 && /data-blken="land" checked/.test(htmlOn), 'галочка «Блок включён» есть и отмечена');
ok(htmlOff.indexOf('data-blken="land"') >= 0 && !/data-blken="land" checked/.test(htmlOff), 'при выключенном блоке галочка снята');
ok(htmlOff.indexOf('Выполняет АУП комплекса') >= 0, 'при выключенном блоке показано «Выполняет АУП комплекса»');
const sEmpty = project(); sEmpty.staff.forEach(x => { if (x.block === 'land') x.count = 0; });
ok(ctx.staffBlocksHtml(sEmpty.params, M.runModel(sEmpty)).indexOf('Блок не заполнен') >= 0, 'включённый блок без чисел по-прежнему даёт «Блок не заполнен»');
const sEmpty2 = withLandOff(sEmpty);
const hEmpty2 = ctx.staffBlocksHtml(sEmpty2.params, M.runModel(sEmpty2));
ok(hEmpty2.indexOf('Блок не заполнен') < 0 && hEmpty2.indexOf('В блоке нет должностей') < 0, 'у выключенного блока нет предупреждений «Блок не заполнен» и «В блоке нет должностей»');
const sNone = withLandOff(project()); sNone.staff = sNone.staff.filter(x => x.block !== 'land');
const hNone = ctx.staffBlocksHtml(sNone.params, M.runModel(sNone));
ok(hNone.indexOf('В блоке нет должностей') < 0 && hNone.indexOf('Выполняет АУП комплекса') >= 0, 'выключенный блок без должностей: «Выполняет АУП комплекса», без предупреждения');

console.log(fails ? '\nЕсть ошибки: ' + fails : '\nВсе проверки пройдены');
process.exit(fails ? 1 : 0);
