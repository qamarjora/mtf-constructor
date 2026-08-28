/* ============================================================
   ФИНАНСИРОВАНИЕ И МЕТРИКИ
   Разнесение капзатрат по годам, оборотный кредит,
   NPV / IRR / DSCR, доходность инвестора.
   ============================================================ */

window.MTF = window.MTF || {};

MTF.calcFunding = function (p, capex, subsidies) {
  const f = p.finance, g = capex.groups;
  const loanBuild = g.build * f.financeShareBuild / 100;
  const loanEquip = g.equip * f.financeShareEquip / 100;
  const loanHerd = g.herd * f.financeShareHerd / 100;
  const loanTotal = loanBuild + loanEquip + loanHerd;
  const equity = capex.total - loanTotal;

  const rateSub = subsidies.filter(s => s.enabled && s.type === 'rate_sub')
    .reduce((a, s) => a + s.value, 0);

  return {
    loanBuild: loanBuild, loanEquip: loanEquip, loanHerd: loanHerd,
    loanTotal: loanTotal, equity: equity,
    equityShare: capex.total > 0 ? equity / capex.total * 100 : 0,
    loanShare: capex.total > 0 ? loanTotal / capex.total * 100 : 0,
    effectiveRate: Math.max(0, f.rate - rateSub)
  };
};

MTF.calcDebtSchedule = function (p, funding) {
  const f = p.finance, n = p.project.horizon;
  const rate = funding.effectiveRate / 100;
  const repay = Math.max(1, f.termYears - f.graceYears);
  const per = funding.loanTotal / repay;
  let bal = funding.loanTotal;
  const rows = [];
  for (let i = 0; i < n; i++) {
    const open = bal;
    const interest = open * rate;
    const principal = i < f.graceYears ? 0 : Math.min(open, per);
    bal = open - principal;
    rows.push({
      idx: i, year: p.project.startYear + i,
      opening: open, interest: interest, principal: principal,
      payment: interest + principal, closing: bal
    });
  }
  return rows;
};

/* ---------- Денежные потоки с оборотным кредитом ---------- */
MTF.calcCashFlow = function (p, pnl, capex, funding, debt) {
  const n = p.project.horizon;
  const spread = p.finance.capexSpread || [100];
  const rows = [];
  let cash = 0, wcBalance = 0, wcDrawn = 0;
  let minCash = Infinity, gapYear = null, capHit = false;
  const wcRate = p.finance.wcRate / 100;

  // Лимит оборотного кредита: заданный вручную либо
  // половина максимальной годовой выручки — дальше банк не даст
  const peakRev = pnl.reduce((a, y) => Math.max(a, y.revenue), 0);
  const wcCap = p.finance.wcCap > 0 ? p.finance.wcCap : Math.max(peakRev * 0.5, capex.total * 0.1);

  for (let i = 0; i < n; i++) {
    const share = (spread[i] || 0) / 100;
    const invest = capex.total * share;
    const loanIn = funding.loanTotal * share;
    const eqIn = funding.equity * share;

    const operating = pnl[i].ebitda;
    const ds = debt[i].payment;
    const wcInterest = wcBalance * wcRate;

    let net = operating - ds - wcInterest - invest + loanIn + eqIn;
    let draw = 0, repay = 0;

    if (p.finance.wcAuto) {
      if (cash + net < 0) {
        const need = Math.ceil((-(cash + net)) * 1.05);
        draw = Math.min(need, Math.max(0, wcCap - wcBalance));
        if (draw < need) capHit = true;
        wcBalance += draw; wcDrawn += draw; net += draw;
      } else if (wcBalance > 0 && cash + net > wcBalance * 0.3) {
        repay = Math.min(wcBalance, (cash + net) * 0.4);
        wcBalance -= repay; net -= repay;
      }
    }

    cash += net;
    if (cash < minCash) minCash = cash;
    if (cash < -1 && gapYear === null) gapYear = p.project.startYear + i;

    rows.push({
      idx: i, year: p.project.startYear + i,
      operating: operating, invest: -invest,
      financing: loanIn + eqIn - ds - wcInterest + draw - repay,
      debtService: ds + wcInterest,
      wcDraw: draw, wcRepay: repay, wcBalance: wcBalance,
      net: net, cumulative: cash,
      fcf: operating - invest,
      cfe: operating - ds - wcInterest
    });
  }
  return { rows: rows, minCash: minCash, gapYear: gapYear, wcPeak: wcDrawn, wcCap: wcCap, capHit: capHit };
};

MTF.npv = function (rate, flows) {
  return flows.reduce((a, v, i) => a + v / Math.pow(1 + rate, i + 1), 0);
};

MTF.irr = function (flows) {
  let lo = -0.95, hi = 5;
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
    const prev = cum; cum += v;
    if (prev < 0 && cum >= 0) return i + (v !== 0 ? Math.abs(prev) / Math.abs(v) : 0);
  }
  return null;
};

/* skipExits — не считать таблицу выходов инвестора.
   Внутри неё бисекция IRR на каждый год горизонта, и это почти вся
   стоимость функции. Контрольному прогону без господдержки нужны только
   npv, irr, payback и minDscr, поэтому там таблица не строится. */
MTF.calcMetrics = function (p, cf, capex, funding, pnl, debt, herdYears, skipExits) {
  const wacc = p.finance.wacc / 100;
  const fcf = cf.rows.map(r => r.fcf);
  const npv = MTF.npv(wacc, fcf);
  const irr = MTF.irr(fcf);

  const dscr = pnl.map((y, i) => ({
    year: y.year,
    value: cf.rows[i].debtService > 0 ? y.ebitda / cf.rows[i].debtService : null
  }));
  const valid = dscr.filter(d => d.value !== null).map(d => d.value);
  /* Отдельный минимум без первого года: там пусконаладка и неполная загрузка
     стада, долговая нагрузка уже есть, а проектного удоя ещё нет. Общий
     минимум почти всегда приходится именно на него и мало говорит
     о способности проекта обслуживать долг в рабочем режиме. */
  const validY2 = dscr.filter((d, i) => i > 0 && d.value !== null).map(d => d.value);

  const exits = [];
  if (!skipExits) {
    const buildBase = capex.groups.build + capex.groups.equip;
    let cum = 0;
    for (let i = 0; i < cf.rows.length; i++) {
      cum += cf.rows[i].cfe;
      const residual = Math.max(0, buildBase * (1 - (i + 1) / MTF.taxes.depreciationYears)) +
        (herdYears[i] ? herdYears[i].cows * p.herd.heiferPrice * MTF.rate(p, p.herd.heiferCurrency) * 0.7 : 0);
      const eqValue = residual - debt[i].closing - cf.rows[i].wcBalance;
      const flows = [];
      for (let j = 0; j <= i; j++) flows.push(j === 0 ? -funding.equity + cf.rows[j].cfe : cf.rows[j].cfe);
      flows[flows.length - 1] += eqValue;
      exits.push({
        year: p.project.startYear + i,
        moic: funding.equity > 0 ? (cum + eqValue) / funding.equity : 0,
        irr: MTF.irr(flows),
        equityValue: eqValue
      });
    }
  }

  return {
    npv: npv, irr: irr,
    payback: MTF.payback(fcf), discountedPayback: MTF.payback(fcf, wacc),
    dscr: dscr,
    minDscr: valid.length ? Math.min.apply(null, valid) : Infinity,
    minDscrY2: validY2.length ? Math.min.apply(null, validY2) : Infinity,
    exits: exits
  };
};

/* Расчётная цепочка на заданном наборе субсидий.
   Стадо и капзатраты от господдержки не зависят — приходят готовыми
   и считаются один раз на оба прогона. Обычная функция, не MTF.runModel:
   рекурсия при повторном прогоне невозможна. */
function runPipeline(state, herd, capex, subsidies, skipExits) {
  const p = state.params;
  const pnl = MTF.calcPnL(p, herd, capex, state.staff, state.opexItems, subsidies);
  const funding = MTF.calcFunding(p, capex, subsidies);
  const debt = MTF.calcDebtSchedule(p, funding);
  const cf = MTF.calcCashFlow(p, pnl, capex, funding, debt);
  const metrics = MTF.calcMetrics(p, cf, capex, funding, pnl, debt, herd, skipExits);
  return { pnl: pnl, funding: funding, debt: debt, cf: cf, metrics: metrics };
}

MTF.runModel = function (state) {
  const p = state.params;
  const herd = MTF.calcHerd(p);
  const capex = MTF.calcCapex(p, state.capexItems);

  const main = runPipeline(state, herd, capex, state.subsidies, false);
  const pnl = main.pnl, funding = main.funding;
  const debt = main.debt, cf = main.cf, metrics = main.metrics;

  /* Контрольный прогон без господдержки. Субсидии влияют не только на выручку,
     но и на ставку кредита через rate_sub, поэтому цепочка пересчитывается
     целиком, а не вычитанием субсидий из EBITDA.
     Таблица выходов инвестора здесь не нужна — считается со skipExits. */
  const noSubsidy = state.subsidies.some(s => s.enabled)
    ? runPipeline(state, herd, capex,
        state.subsidies.map(s => Object.assign({}, s, { enabled: false })), true)
    : null;

  // Проверки согласованности вводных
  const checks = [];
  const noPrice = state.capexItems.filter(i => i.unit === 'qty' && (!i.value || i.value === 0) && i.qty > 0);
  if (noPrice.length) {
    checks.push('Не заполнена цена: ' + noPrice.map(i => i.name).join(', ') +
      '. Эти позиции в расчёт не попали.');
  }

  const sh = MTF.herdShares(p.production);
  const tgt = herd.meta.target;
  const needDry = tgt * (sh.dry + sh.pen);
  if (needDry > p.capacity.dryPlaces * 1.05) {
    checks.push('Родильно-сухостойному блоку нужно ' + Math.round(needDry) + ' мест (сухостой ' +
      Math.round(tgt * sh.dry) + ' + родилка ' + Math.round(tgt * sh.pen) + '), а заложено ' +
      p.capacity.dryPlaces + '. Расширьте блок или сократите сухостой.');
  }
  if (p.herd.heiferPrice > 100000 && p.herd.heiferCurrency === 'KZT') {
    checks.push('Цена нетели ' + Math.round(p.herd.heiferPrice) + ' тыс. ₸ выглядит завышенной. ' +
      'Поле в тысячах: 2 140 000 ₸ вводится как 2140.');
  }
  const spreadSum = (p.finance.capexSpread || []).reduce((a, b) => a + b, 0);
  if (Math.abs(spreadSum - 100) > 0.5) {
    checks.push('Распределение капзатрат по годам даёт ' + spreadSum + '% вместо 100%.');
  }

  return {
    herd: herd, capex: capex, pnl: pnl, funding: funding,
    debt: debt, cf: cf, metrics: metrics, checks: checks,
    noSubsidy: noSubsidy,
    conflicts: MTF.checkSubsidyConflicts(state.subsidies)
  };
};

/* ---------- Влияние господдержки ----------
   Один набор цифр для документа и для вкладки «Финансирование»,
   чтобы сравнение нигде не разъезжалось.
   better — в какую сторону двигается показатель, когда поддержка помогает.
   Значение null означает «не считается» (нет IRR, окупаемость не достигнута,
   DSCR без долговой нагрузки) и выводится прочерком. */
MTF.subsidyImpact = function (res) {
  if (!res.noSubsidy) return null;
  const off = res.noSubsidy, on = res;
  const fin = v => (v === null || v === undefined || !isFinite(v)) ? null : v;
  const pct = v => v === null || v === undefined ? null : fin(v * 100);
  /* Средняя EBITDA за весь горизонт, а не за последний год.
     Меры поддержки заканчиваются раньше конца расчёта, и показатель
     за последний год совпал бы в обоих сценариях до копейки —
     в документе это читалось бы как «поддержка на EBITDA не влияет». */
  const avgEbitda = pnl => pnl.length
    ? fin(pnl.reduce((a, y) => a + y.ebitda, 0) / pnl.length)
    : null;

  return [
    { id: 'npv', label: 'NPV', unit: 'тыс. ₸', d: 0, better: 'up',
      off: fin(off.metrics.npv), on: fin(on.metrics.npv) },
    { id: 'irr', label: 'IRR проекта', unit: '%', d: 1, better: 'up', diffUnit: 'п.п.',
      off: pct(off.metrics.irr), on: pct(on.metrics.irr) },
    { id: 'payback', label: 'Простая окупаемость', unit: 'лет', d: 1, better: 'down',
      off: fin(off.metrics.payback), on: fin(on.metrics.payback) },
    { id: 'dscr', label: 'Минимальный DSCR', unit: '', d: 2, better: 'up',
      off: fin(off.metrics.minDscr), on: fin(on.metrics.minDscr) },
    { id: 'ebitda', label: 'Средняя EBITDA за период', unit: 'тыс. ₸', d: 0, better: 'up',
      off: avgEbitda(off.pnl), on: avgEbitda(on.pnl) },
    { id: 'support', label: 'Объём господдержки за период', unit: 'тыс. ₸', d: 0, better: 'up',
      off: 0, on: on.pnl.reduce((a, y) => a + y.subsidy, 0) }
  ].map(r => Object.assign(r, {
    diff: (r.off === null || r.on === null) ? null : r.on - r.off
  }));
};
