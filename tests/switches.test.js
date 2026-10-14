/* Переключатели: труд земельного фонда (staff.blocks.land.enabled) и парк техники; проверки ликвидности.
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

console.log('4. Парк техники (feed.machineryMode): настройка и расчёт');
const ownSt = project(); ownSt.params.feed.mode = 'own';
const mk = (mode, feedMode) => { const x = c(ownSt); x.params.feed.mode = feedMode || 'own'; if (mode === undefined) delete x.params.feed.machineryMode; else x.params.feed.machineryMode = mode; M.state = x; return x; };
ok(M.defaults.feed.machineryMode === 'own', 'по умолчанию machineryMode = own');
ok(!M.machineryOff(mk('own').params) && !M.machineryOff(mk(undefined).params), 'own и отсутствие поля (старый проект): парк включён');
ok(M.machineryOff(mk('complex').params), 'complex при своей кормовой базе: парк выключен');
ok(!M.machineryOff(mk('complex', 'purchase').params) && !M.machineryOff(mk('complex', 'lump').params), 'complex действует только при feed.mode = own');
const rOwn = M.runModel(mk('own')), rCx = M.runModel(mk('complex')), rOld = M.runModel(mk(undefined));
const sameMoney = (a, b) => near(a.capex.total, b.capex.total, 1e-9) && near(a.metrics.npv, b.metrics.npv, 1e-9) && a.pnl.every((y, i) => near(y.ebitda, b.pnl[i].ebitda, 1e-9)) && a.herd.every((y, i) => near(y.milkLiters, b.herd[i].milkLiters, 1e-9));
ok(sameMoney(rOwn, rCx) && sameMoney(rOwn, rOld), 'деньги и стадо не меняются (парк в расчёт не входит)');

console.log('5. Парк техники: карточка в «Экономике»');
const cardOwn = (mk('own'), M.renderMachineryCard(rOwn)), cardCx = (mk('complex'), M.renderMachineryCard(rCx));
ok(cardOwn.indexOf('Схема 1') >= 0 && cardOwn.indexOf('addMach') >= 0, 'own: карточка парка с таблицей и кнопкой');
ok(cardCx.indexOf('Техника и полевые работы выполняет АУП комплекса') >= 0 && cardCx.indexOf('addMach') < 0 && cardCx.indexOf('Схема 1') < 0, 'complex: вместо карточки пояснение');
const cardA = (mk('own'), M.renderMachineryCard(rOwn)), cardB = (mk(undefined), M.renderMachineryCard(rOld));
ok(cardA === cardB, 'старый проект без поля: карточка как при own');

console.log('6. Парк техники: документ');
const modeIds = ['passport', 'bizplan', 'investment', 'custom'];
const docOf = (st, mode) => {
  const x = c(st); M.state = x;
  if (mode === 'custom') { x.docSections = M.mergeDocSections(null); x.docSections.forEach(s => s.enabled = true); x.docMode = 'custom'; }
  else { x.docSections = M.mergeDocSections(null); M.applyDocMode(x, mode); }
  return M.renderDoc(x, M.runModel(x));
};
const hasMach = secs => secs.some(x => /Машинно-технологический парк/.test(x.title));
modeIds.forEach(function (mode) {
  const a = docOf(mk('own'), mode), b = docOf(mk('complex'), mode), o = docOf(mk(undefined), mode);
  ok(hasMach(a), mode + ': при own раздел «Машинно-технологический парк» есть');
  ok(JSON.stringify(a) === JSON.stringify(o), mode + ': старый проект без поля — документ побитово равен документу при own');
  ok(!hasMach(b), mode + ': при complex раздела парка нет');
  const mains = b.filter(x => !x.appendix).map(x => x.title), apps = b.filter(x => x.appendix).map(x => x.title);
  const nums = mains.map(t => (t.match(/^(\d+)\./) || [])[1]).filter(Boolean).map(Number);
  ok(nums.every((n, i) => n === i + 1), mode + ': нумерация основных разделов подряд (1…' + nums.length + ')');
  const LET = 'АБВГДЕЖИКЛМНПРСТУФХЦЧШЭЮЯ';
  ok(apps.every((t, i) => t.indexOf('Приложение ' + LET[i] + '.') === 0), mode + ': буквы приложений подряд (' + apps.length + ' шт.)');
  const farm = b.find(x => /Описание типовой фермы/.test(x.title));
  ok(/Кормовая база/.test(farm.body) && /Кормовые угодья, га/.test(farm.body) && /Техника и полевые работы выполняет АУП комплекса/.test(farm.body), mode + ': потребность в земле перенесена в «Описание типовой фермы» (подпункт «Кормовая база»)');
  ok(!/Кормовая база<\/strong>|Кормовые угодья/.test(a.find(x => /Описание типовой фермы/.test(x.title)).body), mode + ': при own в описании фермы блока кормовой базы нет');
  ok(/Приложение/.test(a.map(x => x.title).join('')) === (a.some(x => x.appendix)), mode + ': (контроль) приложения определены');
});
const inv = docOf(mk('complex'), 'investment');
const farmCx = inv.find(x => /Описание типовой фермы/.test(x.title)).body;
const farmNum = (inv.find(x => /Описание типовой фермы/.test(x.title)).title.match(/^(\d+)\./) || [])[1];
ok(new RegExp('<strong>' + farmNum + '\\.5\\. Кормовая база').test(farmCx) || farmCx.indexOf(farmNum + '.5. Кормовая база') >= 0, 'подпункт кормовой базы получает номер раздела (' + farmNum + '.5)');

console.log('7. Парк техники: интерфейс');
const inputsOwn = M.renderInputs(M.runModel(mk('own'))), inputsCx = M.renderInputs(M.runModel(mk('complex'))), inputsPur = M.renderInputs(M.runModel(mk('own', 'purchase')));
ok(inputsOwn.indexOf('data-p="feed.machineryMode"') >= 0 && inputsCx.indexOf('data-p="feed.machineryMode"') >= 0, 'переключатель есть в карточке «Корма» при режиме «Своя кормовая база»');
ok(inputsPur.indexOf('data-p="feed.machineryMode"') < 0, 'при покупных кормах переключателя нет');
ok(/value="complex" selected/.test(inputsCx) && !/value="complex" selected/.test(inputsOwn), 'выбранное значение отражается');
const docTabOwn = (mk('own'), M.renderDocTab(rOwn)), docTabCx = (mk('complex'), M.renderDocTab(rCx));
ok(/Машинно-технологический парк<\/label>/.test(docTabOwn) && !/Машинно-технологический парк<\/label>/.test(docTabCx), 'в списке разделов вкладки «Документ» при complex пункта парка нет');

console.log('8. Проверки ликвидности (MTF.liquidityChecks): кассовый разрыв, DSCR, оборотный кредит');
/* Реальные проекты в репозиторий не кладём; здесь проект с теми же признаками: низкая цена молока и дорогие корма.
   Проекты 07.10.26.json и 14.10.json (и сценарий «свои корма») проверены отдельным прогоном при коммите. */
const healthy = () => { const x = M.initState(); M.state = x; return x; };
const failing = () => { const x = M.initState(); x.params.prices.milk = 150; x.params.feed.dmPriceCow = 110; M.state = x; return x; };
const own = () => { const x = M.initState(); x.params.feed.mode = 'own'; M.state = x; return x; };
const runS = x => { M.state = x; return M.runModel(x); };
const rH = runS(healthy()), rF = runS(failing()), rO = runS(own());
ok(Array.isArray(rH.liquidity) && rH.liquidity.length === 0, 'дефолтный проект: новых сообщений нет');
ok(rH.checks.every(c => rH.liquidity.indexOf(c) < 0), 'дефолтный проект: res.checks не содержит сообщений ликвидности');
ok(rO.liquidity.length === 0, 'сценарий «свои корма»: сообщений нет');
ok(rF.liquidity.length === 3, 'проект с убытком: три сообщения (' + rF.liquidity.length + ')');
ok(/^Кассовый разрыв с \d{4} г\./.test(rF.liquidity[0]) && rF.cf.gapYear && rF.liquidity[0].indexOf(String(rF.cf.gapYear)) >= 0, 'первое: кассовый разрыв с года ' + rF.cf.gapYear);
ok(/^Покрытие долга \(DSCR\) ниже 1,0 в \d+ из \d+ лет, считая со 2-го года/.test(rF.liquidity[1]), 'второе: DSCR ниже 1,0 в N годах со 2-го года');
ok(/^Оборотный кредит вырос до .* и не погашался/.test(rF.liquidity[2]), 'третье: оборотный кредит вырос и не погашался');
ok(rF.liquidity.every(m => !/предупрежд/i.test(m)), 'в сообщениях нет слова «предупреждение»');
ok(rF.liquidity.every(m => rF.checks.indexOf(m) >= 0), 'сообщения добавлены в res.checks');
const nLow = rF.metrics.dscr.filter(d => d.year > 2027 && d.value !== null && d.value < 1).length;
ok(rF.liquidity[1].indexOf('в ' + nLow + ' из ') >= 0, 'число лет с DSCR ниже 1,0 совпадает с таблицей DSCR (' + nLow + ')');
const rF2 = (() => { const x = failing(); x.params.prices.milk = 265; x.params.feed.dmPriceCow = 90; return runS(x); })();
ok(rF2.liquidity.length === 0, 'тот же проект с нормальной ценой молока: сообщений нет');
const before = JSON.stringify([rF.pnl.map(y => y.ebitda), rF.metrics.npv, rF.cf.rows.map(r => r.cumulative)]);
const nrm = runS(failing());
ok(JSON.stringify([nrm.pnl.map(y => y.ebitda), nrm.metrics.npv, nrm.cf.rows.map(r => r.cumulative)]) === before, 'проверки расчёт не меняют (EBITDA, NPV, поток те же)');

const tinv = st => { st.docSections = M.mergeDocSections(null); M.applyDocMode(st, 'investment'); return M.renderDoc(st, runS(st)); };
const risksOf = secs => secs.find(x => /Риски и их снижение/.test(x.title)).body;
const riskF = risksOf(tinv(failing())), riskH = risksOf(tinv(healthy()));
ok(riskF.indexOf('Кассовый разрыв с') >= 0 && riskF.indexOf('Оборотный кредит вырос') >= 0, 'документ: в разделе «Риски» есть строка с выводами по ликвидности');
ok(riskF.indexOf('Значение DSCR ниже 1 означает') < riskF.indexOf('Кассовый разрыв с'), 'выводы стоят после общей фразы про DSCR');
ok(riskH.indexOf('Кассовый разрыв') < 0 && riskH.indexOf('Покрытие долга (DSCR) ниже 1,0') < 0 && riskH.indexOf('Значение DSCR ниже 1 означает') >= 0, 'документ здорового проекта: общая фраза есть, выводов нет');
const fF = (M.state = failing(), M.renderFin(runS(M.state)));
ok(fF.indexOf('Покрытие долга (DSCR) ниже 1,0 в') < 0 && fF.indexOf('Оборотный кредит вырос до') < 0, 'вкладка «Финансирование» не дублирует новые сообщения');
const iF = (M.state = failing(), M.renderInputs(runS(M.state)));
ok(iF.indexOf('Кассовый разрыв с') >= 0, 'вкладка «Вводные»: сообщения видны среди проверок');

console.log(fails ? '\nЕсть ошибки: ' + fails : '\nВсе проверки пройдены');
process.exit(fails ? 1 : 0);
