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
const count = (s, sub) => s.split(sub).length - 1;

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


/* Меры по правилам владельца на умолчательном списке: milk_400 с 8-го месяца без окончания, капитальные 25% в 1-й год,
   breeding 400 тыс. ₸ разово, semen 1 200 без окончания, selection с 2-го года без окончания */
function ownerRules(st) {
  const g = id => st.subsidies.find(x => x.id === id);
  Object.assign(g('milk_400'), { value: 35, yearFrom: 1, yearTo: 0, monthFrom: 8, enabled: true });
  Object.assign(g('invest_build'), { value: 25, yearFrom: 1, yearTo: 1, enabled: true });
  Object.assign(g('invest_equip'), { value: 25, yearFrom: 1, yearTo: 1, enabled: true });
  Object.assign(g('breeding_heifers'), { value: 400, yearFrom: 1, yearTo: 1, enabled: true });
  Object.assign(g('semen'), { value: 1200, yearFrom: 1, yearTo: 0, enabled: true });
  Object.assign(g('selection'), { value: 10, yearFrom: 2, yearTo: 0, enabled: true });
}
const named = (pn, key) => Object.entries(pn.subDetail).filter(([k]) => k.indexOf(key) === 0).reduce((a, [, v]) => a + v, 0);
const MILK = 'Субсидия за реализованное', CAP = 'Инвестиционная', BREED = 'Субсидия на приобретение', SEMEN = 'Удешевление', SEL = 'Ведение';

console.log('2. Помощники периода');
ok(M.subsidyActive({ enabled: true, yearFrom: 2, yearTo: 3 }, 2) && M.subsidyActive({ enabled: true, yearFrom: 2, yearTo: 3 }, 3) &&
   !M.subsidyActive({ enabled: true, yearFrom: 2, yearTo: 3 }, 1) && !M.subsidyActive({ enabled: true, yearFrom: 2, yearTo: 3 }, 4), 'yearTo > 0: годы с yearFrom по yearTo включительно, как раньше');
ok(M.subsidyActive({ enabled: true, yearFrom: 1, yearTo: 0 }, 1) && M.subsidyActive({ enabled: true, yearFrom: 1, yearTo: 0 }, 40), 'yearTo = 0: до конца горизонта');
ok(!M.subsidyActive({ enabled: false, yearFrom: 1, yearTo: 0 }, 5) && !M.subsidyActive({ enabled: true, yearFrom: 1 }, 1), 'выключенная мера и мера без yearTo не действуют (как раньше)');
ok(M.subsidyLastYear({ yearTo: 0 }, 12) === 12 && M.subsidyLastYear({ yearTo: 10 }, 12) === 10, 'последний год: 0 → горизонт, иначе yearTo');
ok(M.subsidyPeriodText({ type: 'capex_pct', yearFrom: 2, yearTo: 3 }) === 'годы 2–3', 'текст периода обычной меры прежний: «годы 2–3»');
ok(M.subsidyPeriodText({ type: 'fixed_year', yearFrom: 1, yearTo: 0 }) === 'годы 1–до конца горизонта' && M.subsidyPeriodText({ type: 'fixed_year', yearFrom: 1, yearTo: 0 }).indexOf('1–0') < 0, 'открытая мера: «годы 1–до конца горизонта», без «1–0»');
ok(M.subsidyPeriodText({ type: 'per_liter', yearFrom: 1, yearTo: 0, monthFrom: 8 }) === 'годы 1–до конца горизонта, с 8-го месяца года 1', 'с месяца: «, с 8-го месяца года 1»');
ok(M.subsidyPeriodText({ type: 'per_liter', yearFrom: 1, yearTo: 10, monthFrom: 1 }) === 'годы 1–10' && M.subsidyMonthFrom({}) === 1 && M.subsidyMonthFrom({ monthFrom: 99 }) === 12 && M.subsidyMonthFrom({ monthFrom: 0 }) === 1, 'monthFrom: нет поля или 1 — с начала года, предел 12');

console.log('3. Старые файлы: числа прежние');
/* эталон: прежняя формула без monthFrom и без yearTo = 0 */
function oldCalc(p, herd, capex, subs) {
  return herd.map((y, i) => {
    const yr = i + 1; let total = 0;
    subs.filter(s => s.enabled && yr >= s.yearFrom && yr <= s.yearTo).forEach(s => {
      if (s.type === 'per_liter') total += y.milkLiters * s.value / 1000;
      else if (s.type === 'per_head') total += s.id === 'breeding_heifers' ? ((i === 0 ? p.herd.startHeifers : 0) + y.heifersPurchased) * s.value : y.cows * s.value;
      else if (s.type === 'capex_pct') total += (s.base === 'all' ? capex.total - (capex.prepIncluded || 0) : (capex.groups[s.base] || 0)) * s.value / 100 / (s.yearTo - s.yearFrom + 1);
      else if (s.type === 'fixed_year') total += s.value;
    });
    return total;
  });
}
[['умолчательный список', st => {}], ['все меры включены, разные периоды', st => st.subsidies.forEach((s, k) => { s.enabled = s.type !== 'rate_sub'; s.yearFrom = 1 + (k % 3); s.yearTo = s.yearFrom + 2 + (k % 4); })]].forEach(function (x) {
  const st = project(x[1]), r = run(st), ref = oldCalc(st.params, r.herd, r.capex, st.subsidies);
  ok(r.pnl.every((y, i) => near(y.subsidy, ref[i], 1e-6)), x[0] + ': субсидии по годам равны прежней формуле');
});
const base = project(), rb = run(base);
const withMF1 = project(st => { st.subsidies.find(s => s.id === 'milk_400').monthFrom = 1; });
ok(JSON.stringify(run(withMF1).pnl.map(y => y.subsidy)) === JSON.stringify(rb.pnl.map(y => y.subsidy)), 'monthFrom = 1 равносилен отсутствию поля');

console.log('4. Правила владельца');
const sO = project(ownerRules), rO = run(sO), H = sO.params.project.horizon;
const y0m = rO.herd[0].milkMonthly, l812b = y0m.slice(7).reduce((a, b) => a + b, 0);
ok(near(named(rO.pnl[0], MILK), l812b * 35 / 1000, 1e-6) && near(named(rO.pnl[0], MILK), 23955, 5), 'milk_400 в 2027: литры месяцев 8–12 × 35 ₸/л = ' + Math.round(named(rO.pnl[0], MILK)) + ' тыс. ₸ (23 955)');
ok(rO.pnl.slice(1).every((y, i) => near(named(y, MILK), rO.herd[i + 1].milkLiters * 35 / 1000, 1e-6)), 'milk_400 со 2-го года и до конца горизонта: весь год × 35 ₸/л');
ok(rO.pnl.every(y => named(y, MILK) > 0), 'milk_400 платится в каждый из ' + H + ' лет, без окончания');
ok(near(named(rO.pnl[0], CAP), 0.25 * (rO.capex.groups.build + rO.capex.groups.equip), 1e-6) && rO.pnl.slice(1).every(y => named(y, CAP) === 0), 'капитальные: 25% от build + equip единоразово в 2027, дальше нет');
ok(near(named(rO.pnl[0], BREED), 330 * 400, 1e-6) && rO.pnl.slice(1).every(y => named(y, BREED) === 0), 'breeding_heifers: 330 × 400 = 132 000 разово в 2027');
ok(rO.pnl.every(y => near(named(y, SEMEN), 1200, 1e-9)), 'semen: 1 200 тыс. ₸ в каждый год до конца горизонта');
ok(named(rO.pnl[0], SEL) === 0 && rO.pnl.slice(1).every((y, i) => near(named(y, SEL), rO.herd[i + 1].cows * 10, 1e-6)), 'selection: коровы × 10 каждый год, начиная со 2-го, до конца горизонта');
ok(near(named(rO.pnl[H - 1], SEL), rO.herd[H - 1].cows * 10, 1e-6) && named(rO.pnl[H - 1], SEL) > 4000, 'selection в последний год горизонта: ' + Math.round(rO.herd[H - 1].cows) + ' коров × 10');

console.log('5. Смена горизонта продлевает меры с yearTo = 0');
const sH = project(function (st) { ownerRules(st); st.params.project.horizon = 15; }), rH = run(sH);
ok(rH.pnl.length === 15 && rH.pnl.every(y => named(y, MILK) > 0 && near(named(y, SEMEN), 1200, 1e-9)), 'горизонт 15 лет: milk_400 и semen идут все 15 лет');
ok(rH.pnl.slice(1).every((y, i) => near(named(y, SEL), rH.herd[i + 1].cows * 10, 1e-6)), 'горизонт 15 лет: selection идёт до 15-го года');
const sH2 = project(function (st) { ownerRules(st); st.params.project.horizon = 8; }), rH2 = run(sH2);
ok(rH2.pnl.length === 8 && rH2.pnl.every(y => named(y, MILK) > 0), 'горизонт 8 лет: меры заканчиваются вместе с горизонтом');
const capOpen = (hz) => { const st = project(function (s) { s.params.project.horizon = hz; Object.assign(s.subsidies.find(x => x.id === 'invest_build'), { yearFrom: 2, yearTo: 0, enabled: true }); }); const r = run(st); return { r: r, sum: r.pnl.reduce((a, y) => a + named(y, 'Инвестиционная субсидия на стр'), 0), n: r.pnl.filter(y => named(y, 'Инвестиционная субсидия на стр') > 0).length }; };
const c12 = capOpen(12), c15 = capOpen(15);
ok(c12.n === 11 && c15.n === 14 && near(c12.sum, 0.25 * c12.r.capex.groups.build, 1e-6) && near(c15.sum, 0.25 * c15.r.capex.groups.build, 1e-6), 'капитальная мера с yearTo = 0 делится поровну на годы до конца горизонта; полная сумма та же (11 и 14 лет)');

console.log('6. Месяц начала');
const sM = project(function (st) { const m = st.subsidies.find(x => x.id === 'milk_400'); Object.assign(m, { yearFrom: 2, yearTo: 5, monthFrom: 8, enabled: true }); }), rM = run(sM);
ok(named(rM.pnl[0], MILK) === 0 && near(named(rM.pnl[1], MILK), rM.herd[1].milkMonthly.slice(7).reduce((a, b) => a + b, 0) * 45 / 1000, 1e-6), 'monthFrom действует в год yearFrom (2-й год), не в 1-й');
ok(near(named(rM.pnl[2], MILK), rM.herd[2].milkLiters * 45 / 1000, 1e-6), 'в следующие годы литры за весь год');
const sF = project(function (st) { const t = st.subsidies.find(x => x.id === 'semen'); Object.assign(t, { monthFrom: 8, enabled: true }); }), rF = run(sF);
ok(near(named(rF.pnl[0], SEMEN), 1200, 1e-9), 'monthFrom у меры не за литр на сумму не влияет');

console.log('7. Документ и интерфейс');
const docT = st => { st.docSections = M.mergeDocSections(null); M.applyDocMode(st, 'investment'); M.state = st; const r = M.runModel(st); return M.docTables(st, r); };
const plainT = x => String(x).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const tO = plainT(docT(project(ownerRules)).subsidyTable);
ok(/годы 1–до конца горизонта, с 8-го месяца года 1/.test(tO) && /годы 1–1/.test(tO) && /годы 2–до конца горизонта/.test(tO) && !/1–0|2–0/.test(tO), 'таблица мер в документе: периоды читаются, «1–0» нет');
ok(!/заданы по \d+-й год/.test(tO), 'сноска «меры заданы по N-й год» не появляется, если есть меры до конца горизонта');
const tOld = plainT(docT(project()).subsidyTable);
ok(/годы 1–10/.test(tOld) && /годы 2–3/.test(tOld) && /заданы по 10-й год/.test(tOld), 'умолчательные меры: периоды и сноска прежние');
const subsUi = (st) => { M.state = st; return M.renderSubsidies(run(st)); };
const uiO = subsUi(project(ownerRules));
ok(count(uiO, 'data-subyf="') === 8 && count(uiO, 'data-subyt="') === 8, 'вкладка «Субсидии»: поля «годы с» и «по» у каждой меры (8)');
ok(count(uiO, 'data-submf="') === 2 && /data-submf="0" value="8"/.test(uiO), 'поле «с месяца» только у мер за литр (2), у milk_400 стоит 8');
ok(uiO.indexOf('Период: годы 1–до конца горизонта, с 8-го месяца года 1') >= 0 && /0 — до конца горизонта/.test(uiO), 'в карточке меры текст периода и подсказка про 0');

console.log('8. Откорм');
const FL = M.feedlot;
const fakeHerd = [{ year: 2027, sold: 0, liveKgSold: 0 }, { year: 2028, sold: 0, liveKgSold: 0 }, { year: 2029, sold: 0, liveKgSold: 0 }];
const flSub = FL.calcSubsidies({ project: { horizon: 3 } }, fakeHerd, { total: 0, groups: {} }, [{ enabled: true, type: 'fixed_year', value: 100, yearFrom: 1, yearTo: 0 }]);
ok(flSub.every(y => y.total === 100), 'расчёт субсидий откорма тоже читает yearTo = 0 как «до конца горизонта»');

console.log(fails ? '\nЕсть ошибки: ' + fails : '\nВсе проверки пройдены');
process.exit(fails ? 1 : 0);
