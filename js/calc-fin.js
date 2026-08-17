/* ============================================================
   ФИНАНСИРОВАНИЕ И МЕТРИКИ
   Кредит, график погашения, денежные потоки, NPV / IRR / DSCR,
   доходность на вложения инвестора по годам выхода.
   ============================================================ */

window.MTF = window.MTF || {};

/* ---------- Структура финансирования ---------- */
MTF.calcFunding = function (p, capex, subsidies) {
  const f = p.finance;
  const g = capex.groups;

  const loanBuild = (g.build + g.prep * 0) * f.financeShareBuild / 100;
  const loanEquip = g.equip * f.financeShareEquip / 100;
  const loanHerd = g.herd * f.financeShareHerd / 100;
  const loanTotal = loanBuild + loanEquip + loanHerd;

  const equity = capex.total - loanTotal;

  // Субсидирование ставки
  const rateSub = subsidies.filter(s => s.enabled && s.type === 'rate_sub')
    .reduce((a, s) => a + s.value, 0);
  const effRate = Math.max(0, f.rate - rateSub);

  return {
    loanBuild: loanBuild,
    loanEquip: loanEquip,
    loanHerd: loanHerd,
    loanTotal: loanTotal,
    equity: equity,
    equityShare: capex.total > 0 ? equity / capex.total * 100 : 0,
    loanShare: capex.total > 0 ? loanTotal / capex.total * 100 : 0,
    effectiveRate: effRate
  };
};

/* ---------- График погашения (равными долями основного долга) ---------- */
MTF.calcDebtSchedule = function (p, funding) {
  const f = p.finance;
  const n = p.project.horizon;
  const rate = funding.effectiveRate / 100;
  const grace = f.graceYears;
  const repayYears = Math.max(1, f.termYears - grace);
  const principalPerYear = funding.loanTotal / repayYears;

  let balance = funding.loanTotal;
  const rows = [];
  for (let i = 0; i < n; i++) {
    const opening = balance;
    const interest = opening * rate;
    const principal = i < grace ? 0 : Math.min(opening, principalPerYear);
    balance = opening - principal;
    rows.push({
      idx: i,
      year: p.project.startYear + i,
      opening: opening,
      interest: interest,
      principal: principal,
      payment: interest + principal,
      closing: balance
    });
  }
  return rows;
};

/* ---------- Денежные потоки ---------- */
MTF.calcCashFlow = function (p, pnl, capex, funding, debt) {
  const n = p.project.horizon;
  const rows = [];
  let cash = 0;
  let minCash = Infinity;
  let gapYear = null;

  for (let i = 0; i < n; i++) {
    // Инвестиции: 100% в год 1 (упрощение — можно разнести)
    const invest = i === 0 ? capex.total : 0;
    const inflowLoan = i === 0 ? funding.loanTotal : 0;
    const inflowEquity = i === 0 ? funding.equity : 0;

    const operating = pnl[i].ebitda;
    const debtService = debt[i].payment;

    const net = operating - debtService - invest + inflowLoan + inflowEquity;
    cash += net;

    if (cash < minCash) { minCash = cash; }
    if (cash < 0 && gapYear === null) gapYear = p.project.startYear + i;

    rows.push({
      idx: i,
      year: p.project.startYear + i,
      operating: operating,
      invest: -invest,
      financing: inflowLoan + inflowEquity - debtService,
      debtService: debtService,
      net: net,
      cumulative: cash,
      fcf: operating - invest,          // для NPV проекта
      cfe: operating - debtService      // для доходности инвестора
    });
  }
  return { rows: rows, minCash: minCash, gapYear: gapYear };
};

/* ---------- NPV / IRR ---------- */
MTF.npv = function (rate, flows) {
  return flows.reduce((a, v, i) => a + v / Math.pow(1 + rate, i + 1), 0);
};

MTF.irr = function (flows) {
  let lo = -0.9, hi = 5;
  const f = r => MTF.npv(r, flows);
  if (f(lo) * f(hi) > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (f(lo) * f(mid) <= 0) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
};

MTF.payback = function (flows, rate) {
  let cum = 0;
  for (let i = 0; i < flows.length; i++) {
    const v = rate === undefined ? flows[i] : flows[i] / Math.pow(1 + rate, i + 1);
    const prev = cum;
    cum += v;
    if (prev < 0 && cum >= 0) {
      return i + (cum - v < 0 ? Math.abs(prev) / Math.abs(v) : 0);
    }
  }
  return null;
};

/* ---------- Метрики проекта ---------- */
MTF.calcMetrics = function (p, cf, capex, funding, pnl, debt, herdYears) {
  const wacc = p.finance.wacc / 100;
  const fcf = cf.rows.map(r => r.fcf);
  const cfe = cf.rows.map((r, i) => i === 0 ? r.cfe - funding.equity : r.cfe);

  const npv = MTF.npv(wacc, fcf);
  const irr = MTF.irr(fcf);
  const pb = MTF.payback(fcf);
  const dpb = MTF.payback(fcf, wacc);

  // DSCR
  const dscr = pnl.map((y, i) => ({
    year: y.year,
    value: debt[i].payment > 0 ? y.ebitda / debt[i].payment : null
  }));

  // Доходность инвестора по годам выхода
  const buildBase = capex.groups.build + capex.groups.equip;
  const exits = [];
  let cumCfe = 0;
  for (let i = 0; i < cf.rows.length; i++) {
    cumCfe += cf.rows[i].cfe;
    const residualAssets = Math.max(0, buildBase * (1 - (i + 1) / MTF.taxes.depreciationYears)) +
                           (herdYears[i] ? herdYears[i].cows * p.herd.heiferPrice * 0.7 : 0);
    const equityValue = residualAssets - debt[i].closing;
    const proceeds = cumCfe + equityValue;
    const moic = funding.equity > 0 ? proceeds / funding.equity : 0;
    const flows = [];
    for (let j = 0; j <= i; j++) {
      flows.push(j === 0 ? -funding.equity + cf.rows[j].cfe : cf.rows[j].cfe);
    }
    flows[flows.length - 1] += equityValue;
    const eIrr = MTF.irr(flows.slice(1).length ? flows : [flows[0]]);
    exits.push({
      year: p.project.startYear + i,
      moic: moic,
      irr: eIrr,
      equityValue: equityValue
    });
  }

  return {
    npv: npv,
    irr: irr,
    payback: pb,
    discountedPayback: dpb,
    dscr: dscr,
    minDscr: dscr.filter(d => d.value !== null).reduce((a, d) => Math.min(a, d.value), Infinity),
    exits: exits
  };
};

/* ---------- Полный пересчёт ---------- */
MTF.runModel = function (state) {
  const p = state.params;
  const herdYears = MTF.calcHerd(p);
  const capex = MTF.calcCapex(p, state.capexItems);
  const pnl = MTF.calcPnL(p, herdYears, capex, state.staff, state.opexItems, state.subsidies);
  const funding = MTF.calcFunding(p, capex, state.subsidies);
  const debt = MTF.calcDebtSchedule(p, funding);
  const cf = MTF.calcCashFlow(p, pnl, capex, funding, debt);
  const metrics = MTF.calcMetrics(p, cf, capex, funding, pnl, debt, herdYears);

  return {
    herd: herdYears, capex: capex, pnl: pnl,
    funding: funding, debt: debt, cf: cf, metrics: metrics,
    conflicts: MTF.checkSubsidyConflicts(state.subsidies)
  };
};
