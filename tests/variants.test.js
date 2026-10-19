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

console.log('4. База «% от выручки» для прочих расходов');
{
  const tax = v => ({ id: 'o_tax', name: 'Налоги и медикаменты', base: 'revenue', value: v });
  ok(!M.opexItems.some(it => it.base === 'revenue') && !project().opexItems.some(it => it.base === 'revenue'), 'по умолчанию такой статьи нет');
  const r0 = run(project());
  const st = project(s => { s.opexItems.push(tax(10)); }), r1 = run(st);
  ok(r1.pnl.every((y, i) => near(y.opexDetail['Налоги и медикаменты'], 0.1 * y.revenue, 1e-6)), 'статья = 10% выручки каждого года');
  ok(r1.pnl.every((y, i) => near(r0.pnl[i].ebitda - y.ebitda, 0.1 * y.revenue, 1e-6)), 'EBITDA ниже ровно на эту сумму (вознаграждение от выручки не меняется)');
  ok(r1.pnl.every((y, i) => near(y.opex - r0.pnl[i].opex, 0.1 * y.revenue, 1e-6)), 'остальные статьи не изменились');
  const infl = Math.pow(1 + st.params.prices.costInflation / 100, 3);
  ok(!near(r1.pnl[3].opexDetail['Налоги и медикаменты'], 0.1 * r0.pnl[3].revenue * infl, 1), 'рост затрат к статье не применяется');
  const r2 = run(project(s => { s.opexItems.push(tax(0)); }));
  ok(strip(r2.pnl) === strip(r0.pnl), 'ставка 0 даёт расчёт без статьи');
  const sAll = project(s => { s.params.prices.revenueScope = 'all'; s.opexItems.push(tax(10)); }), rA = run(sAll);
  ok(rA.pnl.every(y => near(y.opexDetail['Налоги и медикаменты'], 0.1 * y.revenue, 1e-6)) && rA.pnl[4].revenue > rA.herd[4].milkLiters * sAll.params.prices.milk * Math.pow(1.06, 4) / 1000 + 1,
    'при полной выручке база = вся выручка (rev.total), как у вознаграждения оператора');
  const rNoSub = run(project(s => { s.opexItems.push(tax(10)); s.subsidies.forEach(x => { x.enabled = false; }); }));
  ok(rNoSub.pnl.every((y, i) => near(y.opexDetail['Налоги и медикаменты'], r1.pnl[i].opexDetail['Налоги и медикаменты'], 1e-9)), 'субсидии в базу не входят');
  const fee = run(project(s => { s.opexItems.push(tax(10)); s.params.finance.operatorFeeMode = 'ebitda'; s.params.finance.operatorFeeValue = 10; }));
  ok(fee.pnl.every(y => y.operatorFee >= 0), 'работает и при вознаграждении от EBITDA (выручку статья не меняет)');
  const h = M.renderEcon(r1);
  ok(h.indexOf('<option value="revenue"') >= 0 && /<option value="revenue" selected>% от выручки/.test(h), 'в списке баз есть «% от выручки», у статьи выбрана');
  ok(count(h, '<option value="revenue"') === st.opexItems.length && count(h, '<option value="milk"') === st.opexItems.length, 'пункт «% от выручки» добавлен в список базы каждой статьи, остальные пункты на месте');
  const stf = project(s => { s.params.project.type = 'feedlot'; });
  let hf; try { hf = M.renderEcon(run(stf)); } catch (e) { hf = 'ERR'; }
  ok(hf.indexOf('<option value="revenue"') < 0, 'для откорма пункта нет');
  const care0 = M.careCostPerCow(project().params, r0, project().opexItems), care1 = M.careCostPerCow(st.params, r1, st.opexItems);
  ok(care0.count > 0 && care1.count === care0.count && near(care1.perCow, care0.perCow, 1e-9), 'обслуживание стада на корову эту статью не учитывает');
}

console.log('5. Проценты льготного периода (finance.graceInterest)');
{
  const r0 = run(project());
  const F = r0.funding, L = F.loanTotal, rate = F.effectiveRate / 100, fin = r0.pnl.length;
  ok(M.graceCapitalized(project().params) === false && project().params.finance.graceInterest === undefined, 'по умолчанию проценты платятся, поле не пишется');
  ok(r0.debt.every(d => d.capitalized === undefined), 'в обычном графике строки без нового поля');
  ok(near(r0.debt[0].payment, L * rate) && near(r0.debt[2].principal, L / 10), 'обычный график: льгота 2 года, дальше тело по L/10');

  const cap = run(project(s => { s.params.finance.graceInterest = 'capitalize'; })), D = cap.debt;
  ok(D[0].payment === 0 && D[1].payment === 0 && D[0].principal === 0 && D[1].principal === 0, 'в льготные годы платежей нет');
  ok(near(D[0].capitalized, L * rate) && near(D[1].capitalized, L * (1 + rate) * rate), 'проценты льготы прибавляются к долгу');
  ok(near(D[1].closing, L * Math.pow(1 + rate, 2), 1e-6), 'долг к концу льготы = заём × (1 + ставка)^льгота (' + Math.round(D[1].closing) + ')');
  ok(near(D[2].principal, D[1].closing / 10) && near(D[2].interest, D[1].closing * rate), 'после льготы тело = остаток / оставшиеся годы, проценты на растущий остаток');
  ok(D.slice(2).every((d, i) => i === 0 || near(d.principal, D[2].principal)), 'тело равными частями');
  ok(near(D[D.length - 1].closing, 0, 1e-6), 'при сроке не больше горизонта долг погашен');
  const totPay = D.reduce((a, d) => a + d.payment, 0), totInt = D.reduce((a, d) => a + d.interest, 0);
  ok(near(totPay, L + totInt, 1e-6), 'всего платежей = заём + все проценты (включая капитализированные)');
  ok(cap.cf.rows[0].debtService === 0 && cap.cf.rows[1].debtService === 0, 'в денежном потоке обслуживание долга в льготу нулевое');
  ok(cap.metrics.dscr[0].value === null && cap.metrics.dscr[1].value === null && cap.metrics.dscr[2].value !== null, 'DSCR в льготные годы не считается (нет платежа)');
  ok(Number.isFinite(cap.metrics.minDscr) && Number.isFinite(cap.metrics.minDscrY2), 'минимумы DSCR берутся по годам с платежом');
  ok(cap.metrics.npv === r0.metrics.npv && cap.metrics.irr === r0.metrics.irr, 'NPV и IRR проекта от графика не зависят');
  ok(strip(cap.funding) === strip(r0.funding), 'структура финансирования та же');
  ok(cap.metrics.dscr[2].value < r0.metrics.dscr[2].value, 'платёж после льготы выше, DSCR 2029 г. ниже, чем при уплате процентов');

  const g0 = run(project(s => { s.params.finance.graceYears = 0; s.params.finance.graceInterest = 'capitalize'; }));
  const g00 = run(project(s => { s.params.finance.graceYears = 0; }));
  ok(strip(g0.debt) === strip(g00.debt) && strip(g0.cf) === strip(g00.cf), 'льгота 0 лет: capitalize ничего не меняет');
  const t15 = run(project(s => { s.params.finance.termYears = 15; s.params.finance.graceInterest = 'capitalize'; })).debt;
  ok(t15[t15.length - 1].closing > 0 && near(t15[2].principal, t15[1].closing / 13), 'срок больше горизонта: тело делится на срок минус льгота, остаток на конец горизонта не гасится');

  const fl = project(s => { s.params.project.type = 'feedlot'; s.params.finance.graceInterest = 'capitalize'; });
  ok(M.graceCapitalized(fl.params) === false, 'откорм: поле не действует');

  const h = M.renderFin(project(s => { }) && run(M.state));
  ok(h.indexOf('data-p="finance.graceInterest"') >= 0 && /<option value="pay" selected>/.test(h), 'в параметрах финансирования выбор есть, по умолчанию «Платятся»');
  ok(h.indexOf('в т.ч. в долг') < 0, 'по умолчанию колонки «в т.ч. в долг» нет');
  const stC = project(s => { s.params.finance.graceInterest = 'capitalize'; }), hc = M.renderFin(run(stC));
  ok(/<option value="capitalize" selected>/.test(hc) && hc.indexOf('в т.ч. в долг') >= 0, 'при capitalize выбор сохранён, в таблице колонка «в т.ч. в долг»');
  const dOn = docOf(project(s => { s.params.finance.graceInterest = 'capitalize'; }), 'bizplan');
  ok(dOn.indexOf('в т.ч. в долг') >= 0 && dOn.indexOf('прибавляются к долгу') >= 0, 'документ: колонка и пояснение при capitalize');
  ok(docOf(project(), 'bizplan').indexOf('в т.ч. в долг') < 0, 'документ по умолчанию без них');
}

console.log('6. Результат оператора');
{
  const st = project(s => { s.params.staff.payer = 'operator'; s.opexItems.push({ id: 'o_tax', name: 'Налоги', base: 'revenue', value: 10 }); });
  const res = run(st), before = strip(res.pnl) + strip(res.cf) + strip(res.metrics);
  const o = M.calcOperatorResult(st, res), N = st.params.project.farmsCount;
  ok(strip(res.pnl) + strip(res.cf) + strip(res.metrics) === before, 'расчёт ничего в res не меняет');
  const i = 4, k = Math.pow(1 + st.params.prices.costInflation / 100, i);
  const pr = M.calcPayroll(st.params, st.staff, res.herd[i].cows);
  ok(near(o.rows[i].fee, res.pnl[i].operatorFee) && near(o.rows[i].payroll, pr.gross * k, 1e-6), 'operator: ФОТ оператора = весь ФОТ × рост затрат, вознаграждение из P&L');
  ok(near(o.rows[i].result, o.rows[i].fee - o.rows[i].payroll), 'результат = вознаграждение минус ФОТ');
  ok(near(o.rows[o.rows.length - 1].cumulative, o.rows.reduce((a, r) => a + r.result, 0), 1e-6), 'накопленно = сумма результатов');
  const tgt = res.herd.meta.target;
  ok(res.herd[o.capIdx].cows >= tgt * 0.99 && (o.capIdx === 0 || res.herd[o.capIdx - 1].cows < tgt * 0.99), 'год мощности = первый год с 99% целевого поголовья (' + o.capYear + ')');
  ok(near(o.breakEven, o.rows[o.capIdx].payroll / o.rows[o.capIdx].revenue * 100, 1e-9), 'безубыточная доля = ФОТ оператора / выручка года');
  const tuned = run(project(s => { s.params.staff.payer = 'operator'; s.params.finance.operatorFeeValue = o.breakEven; }));
  const ot = M.calcOperatorResult(M.state, tuned);
  ok(near(ot.rows[ot.capIdx].result, 0, 1e-6), 'при безубыточной доле результат в год мощности равен нулю');
  ok(o.breakEvenMin <= o.breakEven + 1e-9 && o.breakEven <= o.breakEvenMax + 1e-9 && o.breakEvenMin > 0, 'диапазон доли с мощности включает долю года мощности');

  const fo = project(s => { s.params.staff.payer = 'farm_only'; }), rf = run(fo), of = M.calcOperatorResult(fo, rf);
  const prf = M.calcPayroll(fo.params, fo.staff, rf.herd[i].cows);
  ok(near(of.rows[i].payroll, prf.blocks.find(b => b.id === 'complex').gross * k, 1e-6), 'farm_only: оператор платит только АУП комплекса');
  const ff = project(), rff = run(ff), off = M.calcOperatorResult(ff, rff);
  ok(off.rows.every(r => r.payroll === 0 && near(r.result, r.fee)), 'farm: оператор ничего не платит, результат = вознаграждение');

  const h = M.renderFin(res);
  ok(h.indexOf('<h3>Результат оператора</h3>') >= 0 && h.indexOf('<h3>Результат оператора</h3>') < h.indexOf('<h3>График погашения</h3>'), 'карточка на вкладке «Финансирование» перед графиком погашения');
  ok(h.indexOf('Безубыточная доля оператора') >= 0 && h.indexOf('вне EBITDA, NPV и IRR фермы') >= 0, 'есть безубыточная доля и пометка «вне EBITDA, NPV и IRR»');
  const w = M.renderFin(run(project(s => { s.params.staff.payer = 'operator'; s.params.finance.operatorFeeMode = 'ebitda'; })));
  ok(w.indexOf('не в % от выручки') >= 0, 'при другой базе вознаграждения предупреждение в карточке');
  ok(M.renderFin(run(project())).indexOf('<h3>Результат оператора</h3>') >= 0, 'карточка есть и у проекта по умолчанию');
  const fl = project(s => { s.params.project.type = 'feedlot'; });
  let hf; try { hf = M.renderFin(run(fl)); } catch (e) { hf = 'ERR'; }
  ok(hf.indexOf('Результат оператора') < 0, 'для откорма карточки нет');
  ['estimate', 'technical', 'passport', 'bizplan', 'investment', 'custom'].forEach(mode =>
    ok(docOf(project(s => { s.params.staff.payer = 'operator'; }), mode).indexOf('Результат оператора') < 0, 'документ «' + mode + '»: результата оператора нет'));
}

console.log(fails ? '\nОШИБОК: ' + fails : '\nвсе проверки пройдены');
process.exit(fails ? 1 : 0);
