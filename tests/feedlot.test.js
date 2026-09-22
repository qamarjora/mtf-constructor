/* Проверка модуля откорма. Запуск из корня репозитория: node tests/feedlot.test.js */
const vm = require('vm'), fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'js');
const core = ['config.js', 'subsidies.js', 'calc-herd.js', 'calc-econ.js', 'calc-fin.js'];
const fl = ['feedlot-config.js', 'calc-feedlot.js', 'feedlot-switch.js'];
function load(files) {
  const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
  files.forEach(f => vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f }));
  return ctx.MTF;
}
const c = o => JSON.parse(JSON.stringify(o));
const mtfState = M => ({ params: c(M.defaults), capexItems: c(M.capexItems), staff: c(M.staff),
  opexItems: c(M.opexItems), subsidies: c(M.subsidies) });
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✓ ' : '  ✗ ') + msg); if (!cond) fails++; };

console.log('1. МТФ не изменился при подключении модуля');
const A = load(core), B = load(core.concat(fl));
ok(JSON.stringify(A.runModel(mtfState(A))) === JSON.stringify(B.runModel(mtfState(B))), 'результат МТФ совпадает до копейки');

console.log('2. Экономика одной головы (без инфляции и сезонности)');
const st = B.feedlot.initState(mtfState(B));
Object.assign(st.params.prices, { priceInflation: 0, costInflation: 0 });
st.params.feedlot.animals.season = Array(12).fill(1);
const r = B.runModel(st), y = r.herd[5];
ok(Math.abs(y.revenue / y.sold - 480 * 0.96 * 1700 / 1000) < 3, 'выручка на голову ≈ 783 тыс. ₸');
ok(Math.abs(y.purchase / y.bought - 280 * 1800 / 1000) < 1, 'закуп на голову = 504 тыс. ₸');
ok(r.feedlot.avgCycleDays === r.feedlot.plannedDays, 'цикл = расчётному (' + r.feedlot.plannedDays + ' дн.)');
ok(!r.pnl.some(x => isNaN(x.ebitda)), 'нет NaN в P&L');

console.log('3. Узкое место');
const s2 = B.feedlot.initState(mtfState(B)); s2.params.feedlot.capacity.drinkers = 16;
const r2 = B.runModel(s2);
ok(r2.feedlot.capacity === 800 && r2.feedlot.bottleneck === 'поилки', 'поилки ограничивают до 800 гол.');

console.log(fails ? '\nОШИБОК: ' + fails : '\nВсе проверки пройдены');
process.exit(fails ? 1 : 0);
