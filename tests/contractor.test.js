/* Режим кормов «от подрядчика» (feed.mode = 'contractor').
   Запуск из корня репозитория: node tests/contractor.test.js
   Грузит все скрипты в порядке index.html с заглушкой document (jsdom не нужен).
   Главное правило: по умолчанию режим purchase, расчёт и документ прежние. */
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

/* Стадо, как в проекте на 330 нетелей (коровник 400, блок 122, тёлок до 193 мест): на мощности 475 коров,
   в последнем году 307,9 тёлки и 48,7 телят */
function project(over) {
  const st = M.initState();
  Object.assign(st.params.capacity, { cowPlaces: 400, dryPlaces: 122, calfPlaces: 100, heiferPlaces: 193, bullPlaces: 0, flexHousing: true });
  Object.assign(st.params.herd, { startHeifers: 330, batches: 2, batchInterval: 6, firstBatchShare: 50, heiferPrice: 5,
    heiferCurrency: 'EUR', gestationOnArrival: 6, restockMode: 'none' });
  Object.assign(st.params.production, { heiferShare: 85, salePlanMode: 'steps',
    salePlan: [{ age: 2, share: 33.4, price: 0 }, { age: 6, share: 33.3, price: 220 }, { age: 12, share: 33.3, price: 400 }] });
  if (over) over(st);
  M.state = st;
  return st;
}
const contractor = (idx, over) => project(st => { st.params.feed.mode = 'contractor'; st.params.feed.contractorIndexPct = idx || 0; if (over) over(st); });
const run = st => { M.state = st; return M.runModel(st); };
const feedOf = r => r.pnl.map(y => y.opexDetail['Корма']);

console.log('1. Настройки по умолчанию и совместимость');
ok(M.defaults.feed.mode === 'purchase', 'по умолчанию режим кормов purchase');
ok(M.defaults.feed.contractorAnnual === 400000 && M.defaults.feed.contractorWeightHeifer === 35 &&
   M.defaults.feed.contractorWeightCalf === 15 && M.defaults.feed.contractorIndexPct === 0, 'значения contractor по умолчанию: 400 000 тыс. ₸, 35%, 15%, индексация 0');
const withFields = run(project()), oldSt = project(st => { ['contractorAnnual', 'contractorWeightHeifer', 'contractorWeightCalf', 'contractorIndexPct'].forEach(k => delete st.params.feed[k]); });
const rOld = run(oldSt);
ok(JSON.stringify(feedOf(withFields)) === JSON.stringify(feedOf(rOld)) && near(withFields.metrics.npv, rOld.metrics.npv, 1e-9), 'проект без новых полей считается как с полями по умолчанию');
const modeDoc = (st) => { M.state = st; st.docSections = M.mergeDocSections(null); M.applyDocMode(st, 'investment'); return JSON.stringify(M.renderDoc(st, M.runModel(st))); };
ok(modeDoc(project()) === modeDoc(oldSt), 'документ проекта без новых полей побитово равен документу с полями по умолчанию');
['own', 'lump'].forEach(function (m) {
  const a = run(project(st => { st.params.feed.mode = m; })), b = run(project(st => { st.params.feed.mode = m; st.params.feed.contractorAnnual = 1; st.params.feed.contractorIndexPct = 50; }));
  ok(JSON.stringify(feedOf(a)) === JSON.stringify(feedOf(b)), 'режим ' + m + ': поля contractor на расчёт не влияют');
});

console.log('2. Режим contractor: тариф и корма');
const rC = run(contractor(0));
const mix = M.contractorMix(rC.herd.meta ? M.state.params : M.state.params, rC.herd);
ok(mix.cows === 475 && near(mix.heifers, 307.9, 0.1) && near(mix.calves, 48.7, 0.1), 'состав мощности из расчёта стада: коровы 475, тёлки 307,9, телята 48,7');
ok(near(mix.units, 475 + mix.heifers * 0.35 + mix.calves * 0.15, 1e-9), 'условные головы = коровы + тёлки × 0,35 + телята × 0,15 (' + mix.units.toFixed(2) + ')');
ok(near(mix.tariff * 1000 / 365, 1857, 1), 'тариф около 1 857 ₸ в сутки на корову (' + (mix.tariff * 1000 / 365).toFixed(0) + ')');
const last = rC.herd.length - 1, fL = M.calcFeed(M.state.params, rC.herd[last], last, rC.herd);
ok(near(fL.sum, 400000, 1e-6), 'на мощности корма ровно 400 000 тыс. ₸');
ok(near(fL.parts.cows, 321992, 2) && near(fL.parts.heifers, 73061, 2) && near(fL.parts.calves, 4947, 2), 'на мощности: коровам 321 992, тёлкам 73 061, телятам 4 947');
ok(near(feedOf(rC)[last], 400000, 1e-6) && near(feedOf(rC)[last - 1], 400000, 1e-6), 'в P&L статья «Корма» на мощности = 400 000 тыс. ₸ (с 2033 г., пока молодняк не изменился)');
ok(feedOf(rC).slice(0, 4).every(v => v < 400000) && feedOf(rC)[0] < feedOf(rC)[1] && feedOf(rC)[1] < feedOf(rC)[2], 'в годы разгона корма меньше 400 000 и растут вместе со стадом');
ok(rC.pnl.every(y => y.feedHa === 0), 'площадь кормовой базы в режиме contractor = 0 (деньги за гектары не считаются)');
const r2 = run(contractor(0, st => { st.params.feed.landCostPerHa = 999999; st.params.feed.landHaPerCow = 9; }));
ok(JSON.stringify(feedOf(r2)) === JSON.stringify(feedOf(rC)), 'landCostPerHa и landHaPerCow в режиме contractor на корма не влияют');
const rW = run(contractor(0, st => { st.params.feed.contractorWeightHeifer = 0; st.params.feed.contractorWeightCalf = 0; }));
ok(near(feedOf(rW)[last], 400000, 1e-6) && near(feedOf(rW)[0], 400000 * rC.herd[0].cows / 475, 1e-3), 'веса молодняка 0: всю сумму платят за коров (тариф 400 000 ÷ 475)');
ok(rC.checks.every(s => s.indexOf('подрядчика') < 0 && s.indexOf('Неизвестный режим') < 0), 'при стаде, вышедшем на мощность, сообщений по кормам нет');

console.log('3. Индексация подрядчика');
const rI0a = run(contractor(0, st => { st.params.prices.costInflation = 0; })), rI0b = run(contractor(0, st => { st.params.prices.costInflation = 20; }));
ok(JSON.stringify(feedOf(rI0a)) === JSON.stringify(feedOf(rI0b)), 'индексация 0: корма не зависят от costInflation (0% и 20% дают то же)');
const rI8 = run(contractor(8));
ok(rI8.pnl.every((y, i) => near(y.opexDetail['Корма'], feedOf(rC)[i] * Math.pow(1.08, i), 1e-6)), 'индексация 8%: корма каждого года = базовые × 1,08^i');
const rI8b = run(contractor(8, st => { st.params.prices.costInflation = 0; }));
ok(JSON.stringify(feedOf(rI8)) === JSON.stringify(feedOf(rI8b)), 'индексация 8%: costInflation на корма по-прежнему не влияет');
ok(rI8.pnl.every((y, i) => i === 0 || y.opexDetail['Корма'] !== feedOf(rC)[i]) && rI8.metrics.npv < rC.metrics.npv, 'рост индексации снижает NPV');
const rP = run(project(st => { st.params.prices.costInflation = 0; })), rP2 = run(project(st => { st.params.prices.costInflation = 8; }));
ok(feedOf(rP2)[5] > feedOf(rP)[5] * 1.4, 'purchase: costInflation, как и раньше, индексирует корма');

console.log('4. Сообщения в res.checks');
const unk = run(project(st => { st.params.feed.mode = 'xyz'; })), pur = run(project());
ok(unk.checks.indexOf('Неизвестный режим кормов, использованы нормы.') >= 0, 'неизвестный режим: сообщение «Неизвестный режим кормов, использованы нормы.»');
ok(JSON.stringify(feedOf(unk)) === JSON.stringify(feedOf(pur)), 'неизвестный режим по-прежнему считается как purchase');
ok(['purchase', 'own', 'lump', 'contractor'].every(m => run(project(st => { st.params.feed.mode = m; })).checks.every(s => s.indexOf('Неизвестный') < 0)), 'известные режимы сообщения не дают');
const small = run(contractor(0, st => { st.params.herd.startHeifers = 100; }));
ok(small.checks.some(s => /Корма от подрядчика: в последнем году горизонта стадо не вышло на мощность/.test(s)), 'стадо не вышло на мощность: сообщение о неполном составе');
ok(rC.checks.every(s => s.indexOf('не вышло на мощность') < 0), 'стадо вышло на мощность: сообщения нет');

console.log('5. Интерфейс: карточка «Корма»');
const inp = st => { M.state = st; return M.renderInputs(run(st)); };
const iC = inp(contractor(0)), iP = inp(project()), iO = inp(project(st => { st.params.feed.mode = 'own'; })), iL = inp(project(st => { st.params.feed.mode = 'lump'; }));
ok(/<option value="contractor"[^>]*>Корма от подрядчика<\/option>/.test(iC), 'в списке режимов есть «Корма от подрядчика»');
ok(/value="contractor" selected/.test(iC) && !/value="contractor" selected/.test(iP), 'выбранный режим отражается');
['feed.contractorAnnual', 'feed.contractorWeightHeifer', 'feed.contractorWeightCalf', 'feed.contractorIndexPct'].forEach(k =>
  ok(iC.indexOf('data-p="' + k + '"') >= 0 && iP.indexOf('data-p="' + k + '"') < 0 && iO.indexOf('data-p="' + k + '"') < 0 && iL.indexOf('data-p="' + k + '"') < 0, 'поле ' + k + ' только в режиме contractor'));
ok(iC.indexOf('Затраты на корма на ферму в год, все группы') >= 0 && iC.indexOf('Пересмотр цены подрядчиком, % в год') >= 0, 'подписи полей по ТЗ');
ok(iC.indexOf('data-p="feed.landCostPerHa"') < 0 && iC.indexOf('data-p="feed.dmCow"') < 0, 'в режиме contractor нет себестоимости гектара и норм СВ');
ok(iC.indexOf('data-p="feed.landHaPerCow"') >= 0 && /справочно/.test(iC), 'площадь аренды — справочное поле');
ok(/Тариф: <b>677,9 тыс\. ₸<\/b> в год на корову \(<b>1\s?857 ₸<\/b> в сутки\)/.test(iC), 'подсказка показывает тариф (677,9 тыс. ₸, 1 857 ₸ в сутки)');
ok(iP.indexOf('Тариф:') < 0 && iP.indexOf('data-p="feed.dmCow"') >= 0, 'режим purchase: прежняя карточка с нормами СВ');

console.log('6. Автоотключение блока «Земельный фонд» и парка при contractor (производное)');
const withLand = over => (st => { st.staff.forEach(x => { if (x.block === 'land') { x.count = 2; x.salary = 300; } }); if (over) over(st); })
const landStaff = st => st.staff.forEach(x => { if (x.block === 'land') { x.count = 2; x.salary = 300; } });
const cx = (over) => contractor(0, st => { landStaff(st); if (over) over(st); });
const pc = cx(), pp = project(landStaff);
const bC = M.staffBlockOf(pc.params, 'land'), bP = M.staffBlockOf(pp.params, 'land');
ok(bC.off === true && bC.offReason === 'contractor' && bP.off === false && bP.offReason === '', 'contractor: блок land off (причина contractor); purchase: включён');
ok(pc.params.staff.blocks.land.enabled === true || pc.params.staff.blocks.land.enabled === undefined, 'поле enabled при contractor не меняется (' + pc.params.staff.blocks.land.enabled + ')');
const before = JSON.stringify(pc.params.staff.blocks); M.staffBlockOf(pc.params, 'land'); M.calcPayroll(pc.params, pc.staff, 475);
ok(JSON.stringify(pc.params.staff.blocks) === before && !('off' in pc.params.staff.blocks.land), 'расчёт ничего не записывает в блоки (off и offReason в проект не попадают)');
pc.params.feed.mode = 'purchase';
ok(M.staffBlockOf(pc.params, 'land').off === false, 'при возврате к purchase блок снова включён');
pc.params.feed.mode = 'contractor';
const swSt = cx(st => { st.params.staff.blocks.land.enabled = false; });
ok(M.staffBlockOf(swSt.params, 'land').offReason === 'switch', 'выключен и галочкой, и режимом: причина switch (галочка важнее)');
const pyC = M.calcPayroll(cx().params, cx().staff, 475), pyP = M.calcPayroll(pp.params, pp.staff, 475);
ok(pyC.blocks.find(b => b.id === 'land').gross === 0 && pyC.gross < pyP.gross, 'ФОТ земельного фонда при contractor 0, ФОТ на ферму меньше, чем при purchase');
ok(near(run(cx(st => { st.params.staff.blocks.land.enabled = false; })).metrics.npv, run(cx()).metrics.npv, 1e-9), 'contractor с галочкой и без неё: деньги те же (блок уже выключен режимом)');
ok(M.machineryOff(contractor(0).params) && M.machineryOff(contractor(0, st => { st.params.feed.machineryMode = 'own'; }).params), 'machineryOff при contractor не зависит от machineryMode');
ok(!M.machineryOff(project().params) && !M.machineryOff(project(st => { st.params.feed.mode = 'own'; }).params), 'purchase и own (по умолчанию): парк не выключен');
ok(M.machineryOff(project(st => { st.params.feed.mode = 'own'; st.params.feed.machineryMode = 'complex'; }).params), 'own + complex: парк выключен, как раньше');

console.log('7. Документ и интерфейс при contractor');
const docOf = (st, mode) => {
  const x = c(st); M.state = x; x.docSections = M.mergeDocSections(null);
  if (mode === 'custom') { x.docSections.forEach(s => s.enabled = true); x.docMode = 'custom'; } else M.applyDocMode(x, mode);
  return M.renderDoc(x, M.runModel(x));
};
const LET = 'АБВГДЕЖИКЛМНПРСТУФХЦЧШЭЮЯ';
['passport', 'bizplan', 'investment', 'custom'].forEach(function (mode) {
  const a = docOf(contractor(0, landStaff), mode), p = docOf(project(landStaff), mode);
  ok(!a.some(x => /Машинно-технологический парк/.test(x.title)) && p.some(x => /Машинно-технологический парк/.test(x.title)), mode + ': при contractor раздела парка нет, при purchase есть');
  const nums = a.filter(x => !x.appendix).map(x => (x.title.match(/^(\d+)\./) || [])[1]).filter(Boolean).map(Number);
  ok(nums.every((n, i) => n === i + 1) && a.filter(x => x.appendix).every((x, i) => x.title.indexOf('Приложение ' + LET[i] + '.') === 0), mode + ': нумерация разделов и буквы приложений подряд');
  const farm = a.find(x => /Описание типовой фермы/.test(x.title)).body;
  ok(/Кормовая база/.test(farm) && /Корма поставляет подрядчик по фиксированной цене/.test(farm) && /аренда учтена на уровне комплекса/.test(farm) &&
     /400\s?000 тыс\. ₸ в год/.test(farm) && /Кормовые угодья, га/.test(farm), mode + ': в описании фермы подпункт «Кормовая база»: подрядчик, аренда на уровне комплекса, 400 000, таблица земли');
  ok(!/Кормовая база/.test(p.find(x => /Описание типовой фермы/.test(x.title)).body), mode + ': при purchase блока кормовой базы нет');
});
const stfC = docOf(contractor(0, landStaff), 'investment').find(x => /Персонал и оплата труда/.test(x.title)).body;
ok(/двумя блоками/.test(stfC) && /Земельный фонд \(корма поставляет подрядчик\)/.test(text(stfC)) && /корма поставляет подрядчик по фиксированной цене/.test(stfC) && !/выполняет АУП комплекса/.test(stfC), 'персонал: «двумя блоками», строка и примечание о подрядчике');
const stfP = docOf(project(landStaff), 'investment').find(x => /Персонал и оплата труда/.test(x.title)).body;
ok(/тремя блоками/.test(stfP) && !/подрядчик/.test(stfP), 'персонал при purchase: «тремя блоками», без подрядчика');
ok(docOf(project(landStaff), 'investment').every(x => !/Корма поставляет подрядчик|корма поставляет подрядчик|подрядчик по фиксированной цене/.test(x.body)), 'при purchase в документе нет текстов про поставку кормов подрядчиком');
const rcS = run(cx()); const hsAll = ctx.staffBlocksHtml(cx().params, rcS); const hs = hsAll.slice(hsAll.indexOf('data-blkn="land"'));   // только блок «Земельный фонд»
ok(/data-blken="land"[^>]* disabled/.test(hs) && /Корма поставляет подрядчик, блок не нужен/.test(hs) && hs.indexOf('Блок не заполнен') < 0 && hs.indexOf('В блоке нет должностей') < 0 && hs.indexOf('data-addstaff="land"') < 0, 'интерфейс ФОТ: галочка неактивна, «Корма поставляет подрядчик», без предупреждений и кнопок добавления');
ok(/Корма поставляет подрядчик по фиксированной цене, свой парк техники не нужен/.test((M.state = contractor(0), M.renderMachineryCard(run(M.state)))), 'карточка парка в «Экономике»: пояснение про подрядчика');
const tab = (M.state = contractor(0), M.renderDocTab(run(M.state)));
ok(!/Машинно-технологический парк<\/label>/.test(tab), 'вкладка «Документ»: пункта парка в списке разделов нет');

console.log(fails ? '\nЕсть ошибки: ' + fails : '\nВсе проверки пройдены');
process.exit(fails ? 1 : 0);
