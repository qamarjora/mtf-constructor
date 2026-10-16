/* Субсидии: помесячные литры, monthFrom, yearTo = 0, правила владельца.
   Запуск из корня репозитория: node tests/subsidies.test.js
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

/* Стадо проекта на 330 нетелей (как в проектах владельца) */
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
const run = st => { M.state = st; return M.runModel(st); };

console.log('1. Помесячные литры (milkMonthly)');
const r0 = run(project()), y0 = r0.herd[0];
ok(r0.herd.every(y => Array.isArray(y.milkMonthly) && y.milkMonthly.length === 12), 'в записи каждого года 12 помесячных значений');
ok(r0.herd.every(y => near(y.milkMonthly.reduce((a, b) => a + b, 0), y.milkLiters, 1e-6)), 'сумма месяцев равна годовым литрам');
ok(y0.milkMonthly.slice(0, 4).every(v => v === 0) && y0.milkMonthly[4] > 0, '1-й год: молока нет до 5-го месяца (первый отёл), с 5-го идёт');
const l812 = y0.milkMonthly.slice(7).reduce((a, b) => a + b, 0);
ok(l812 > 680000 && l812 < 690000, 'литры месяцев 8–12 первого года около 684 тыс. (' + Math.round(l812) + ')');

console.log(fails ? '\nЕсть ошибки: ' + fails : '\nВсе проверки пройдены');
process.exit(fails ? 1 : 0);
