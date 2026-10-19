/* Режимы для проверки вариантов: кто платит ФОТ, база «% от выручки», проценты льготы, результат оператора,
   сравнение вариантов. Запуск из корня репозитория: node tests/variants.test.js
   Грузит все скрипты в порядке index.html с заглушкой document (jsdom не нужен). */
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
const count = (s, sub) => s.split(sub).length - 1;

/* Проект на 330 нетелей (как у владельца), штат с тремя блоками, включённый земельный фонд */
function project(over) {
  const st = M.initState();
  Object.assign(st.params.capacity, { cowPlaces: 400, dryPlaces: 122, calfPlaces: 100, heiferPlaces: 193, bullPlaces: 0, flexHousing: true });
  Object.assign(st.params.herd, { startHeifers: 330, batches: 2, batchInterval: 6, firstBatchShare: 50, heiferPrice: 5,
    heiferCurrency: 'EUR', gestationOnArrival: 6, restockMode: 'none' });
  Object.assign(st.params.production, { heiferShare: 85, salePlanMode: 'steps',
    salePlan: [{ age: 2, share: 33.4, price: 0 }, { age: 6, share: 33.3, price: 220 }, { age: 12, share: 33.3, price: 400 }] });
  st.params.prices.revenueScope = 'milk';
  st.staff = [
    { id: 'z', block: 'farm', name: 'Зоотехник', count: 2, salary: 500 },
    { id: 'm', block: 'farm', name: 'Оператор доения', count: 6, salary: 400 },
    { id: 'cm', block: 'complex', name: 'Управляющий', count: 1, salary: 1500 },
    { id: 'ca', block: 'complex', name: 'Бухгалтер', count: 2, salary: 1200 },
    { id: 'la', block: 'land', name: 'Агроном', count: 1, salary: 800 },
    { id: 'lt', block: 'land', name: 'Механизатор', count: 6, salary: 600 }
  ];
  if (over) over(st);
  M.state = st;
  return st;
}
const run = st => { M.state = st; return M.runModel(st); };
/* Текст документа всех включённых разделов в заданном виде */
const docOf = (st, mode) => { st.docSections = M.mergeDocSections(null); M.applyDocMode(st, mode); M.state = st;
  return M.renderDoc(st, M.runModel(st)).map(x => x.body).join('\n'); };
const strip = o => JSON.stringify(o, (k, v) => typeof v === 'function' ? undefined : v);

console.log('1. Кто платит штат (staff.payer)');
{
  const base = project(), rb = run(base);
  ok(M.staffPayer(base.params) === 'farm' && base.params.staff.payer === undefined, 'по умолчанию farm, в проект поле не пишется');
  const a = project(s => { s.params.staff.payer = 'farm'; });
  ok(strip(run(a).pnl) === strip(rb.pnl) && strip(run(a).cf) === strip(rb.cf), 'payer = farm: расчёт тот же, что без поля');
  const bad = project(s => { s.params.staff.payer = 'что-то'; });
  ok(M.staffPayer(bad.params) === 'farm', 'неизвестное значение читается как farm');

  const i = 3, k = Math.pow(1 + base.params.prices.costInflation / 100, i);
  const pr = M.calcPayroll(base.params, base.staff, rb.herd[i].cows);
  const g = id => pr.blocks.find(b => b.id === id).gross;
  ok(pr.blocks.find(b => b.id === 'land').off === false && g('land') > 0, 'в проекте земельный фонд включён и стоит денег');
  ok(near(rb.pnl[i].opexDetail['Фонд оплаты труда'], pr.gross * k, 1e-6), 'farm: ФОТ на ферме = весь ФОТ × рост затрат');

  const fo = run(project(s => { s.params.staff.payer = 'farm_only'; }));
  ok(near(fo.pnl[i].opexDetail['Фонд оплаты труда'], g('farm') * k, 1e-6), 'farm_only: на ферме только блок фермы');
  ok(near(fo.pnl[i].ebitda - rb.pnl[i].ebitda, (g('complex') + g('land')) * k, 1e-6), 'farm_only: EBITDA выше на АУП комплекса и земельный фонд');
  const op = run(project(s => { s.params.staff.payer = 'operator'; }));
  ok(op.pnl[i].opexDetail['Фонд оплаты труда'] === 0, 'operator: ФОТ на ферме 0');
  ok(near(op.pnl[i].ebitda - rb.pnl[i].ebitda, pr.gross * k, 1e-6), 'operator: EBITDA выше ровно на весь ФОТ × рост затрат');
  ok(op.pnl.every((y, j) => near(y.revenue, rb.pnl[j].revenue) && near(y.subsidy, rb.pnl[j].subsidy)), 'выручка и субсидии от payer не зависят');

  const p0 = base.params;
  ok(near(M.payrollOnFarm(p0, pr) + M.payrollOnOperator(p0, pr), pr.gross), 'farm: на ферме весь ФОТ, у оператора ноль');
  const pf = c(p0); pf.staff.payer = 'farm_only';
  ok(near(M.payrollOnFarm(pf, pr), g('farm')) && near(M.payrollOnOperator(pf, pr), g('complex')), 'farm_only: ферме блок фермы, оператору только АУП комплекса (земля нигде не считается)');
  const po = c(p0); po.staff.payer = 'operator';
  ok(M.payrollOnFarm(po, pr) === 0 && near(M.payrollOnOperator(po, pr), pr.gross), 'operator: оператору весь ФОТ');

  const lump = project(s => { s.params.staff.mode = 'lump'; s.params.staff.lumpAnnual = 50000; s.params.staff.payer = 'farm_only'; });
  const rl = run(lump), lump0 = run(project(s => { s.params.staff.mode = 'lump'; s.params.staff.lumpAnnual = 50000; }));
  ok(strip(rl.pnl) === strip(lump0.pnl), 'режим «одной суммой»: farm_only оставляет сумму на ферме');
  const lumpO = run(project(s => { s.params.staff.mode = 'lump'; s.params.staff.lumpAnnual = 50000; s.params.staff.payer = 'operator'; }));
  ok(lumpO.pnl[2].opexDetail['Фонд оплаты труда'] === 0, 'режим «одной суммой»: operator выносит сумму');

  const fl = project(s => { s.params.project.type = 'feedlot'; s.params.staff.payer = 'operator'; });
  ok(M.staffPayer(fl.params) === 'farm', 'откорм: payer не действует');
}

console.log('2. Проверки и пометки при payer не farm');
{
  const rb = run(project());
  ok(!rb.checks.some(x => x.indexOf('ФОТ вынесен') >= 0 || x.indexOf('только блок фермы') >= 0), 'по умолчанию предупреждений нет');
  const op = run(project(s => { s.params.staff.payer = 'operator'; }));
  ok(op.checks.some(x => x.indexOf('ФОТ вынесен из экономики фермы') >= 0 && x.indexOf('не сопоставимы') >= 0), 'operator: сообщение про несопоставимость');
  ok(!op.checks.some(x => x.indexOf('рассчитан для вознаграждения') >= 0), 'operator + «% от выручки»: предупреждения про базу нет');
  const op2 = run(project(s => { s.params.staff.payer = 'operator'; s.params.finance.operatorFeeMode = 'ebitda'; }));
  ok(op2.checks.some(x => x.indexOf('рассчитан для вознаграждения «% от выручки»') >= 0), 'operator + другая база: предупреждение');
  const fo = run(project(s => { s.params.staff.payer = 'farm_only'; s.params.finance.operatorFeeMode = 'ebitda'; }));
  ok(fo.checks.some(x => x.indexOf('только блок фермы') >= 0) && !fo.checks.some(x => x.indexOf('рассчитан для вознаграждения') >= 0), 'farm_only: свой текст, предупреждения про базу нет');

  const dR = docOf(project(), 'bizplan');
  ok(dR.indexOf('Без ФОТ, не сопоставимо') < 0, 'документ по умолчанию без пометки');
  const dO = docOf(project(s => { s.params.staff.payer = 'operator'; }), 'bizplan');
  ok(count(dO, 'Без ФОТ, не сопоставимо') >= 2, 'документ при payer = operator: пометка у показателей (' + count(dO, 'Без ФОТ, не сопоставимо') + ' шт.)');
}

console.log('3. Интерфейс');
{
  const st = project(), res = run(st);
  const h = M.renderEcon(res);
  ok(h.indexOf('data-p="staff.payer"') >= 0, 'в карточке «Оплата труда» есть выбор «Кто платит штат»');
  ok(/<option value="farm" selected>/.test(h), 'у проекта без поля выбрано значение по умолчанию, а не пусто');
  const st2 = project(s => { s.params.staff.payer = 'operator'; }); const h2 = M.renderEcon(run(st2));
  ok(/<option value="operator" selected>/.test(h2), 'сохранённое значение показывается выбранным');
  const stf = project(s => { s.params.project.type = 'feedlot'; }); 
  let hf = ''; try { hf = M.renderEcon(run(stf)); } catch (e) { hf = 'ERR ' + e.message; }
  ok(hf.indexOf('ERR') !== 0 && hf.indexOf('data-p="staff.payer"') < 0, 'для откорма выбора нет');
  const fin = M.renderFin(run(st2));
  ok(fin.indexOf('без ФОТ, не сопоставимо') >= 0, 'вкладка «Финансирование»: NPV помечен при payer = operator');
  ok(M.renderFin(run(project())).indexOf('не сопоставимо') < 0, 'по умолчанию пометки нет');
}

console.log(fails ? '\nОШИБОК: ' + fails : '\nвсе проверки пройдены');
process.exit(fails ? 1 : 0);
