/* ============================================================
   ЭКОНОМИКА: капзатраты, операционные расходы, выручка, субсидии
   Все суммы в тыс. тенге, если не указано иное.
   ============================================================ */

window.MTF = window.MTF || {};

/* ---------- Капитальные затраты ---------- */
MTF.calcCapex = function (p, items) {
  const rows = [];
  const groups = { prep: 0, build: 0, equip: 0, herd: 0 };

  items.forEach(it => {
    let sum = 0;
    if (it.unit === 'sum') sum = it.value;
    else if (it.unit === 'place') sum = it.value * (p.capacity[it.places] || 0);
    else if (it.unit === 'head') sum = it.value * p.herd.startHeifers;
    if (sum > 0) {
      rows.push({ id: it.id, name: it.name, group: it.group, sum: sum });
      groups[it.group] += sum;
    }
  });

  const subtotal = groups.prep + groups.build + groups.equip + groups.herd;
  const reserve = subtotal * MTF.capexReserve / 100;
  // резерв распределяем на строительство
  groups.build += reserve;

  return {
    rows: rows,
    groups: groups,
    reserve: reserve,
    total: subtotal + reserve
  };
};

/* ---------- Фонд оплаты труда ---------- */
MTF.calcPayroll = function (staff) {
  let net = 0;
  staff.forEach(s => { net += s.count * s.salary * 12; });
  const gross = net * (1 + MTF.payrollTaxRate / 100);
  return { net: net, gross: gross };
};

/* ---------- Операционные расходы по годам ---------- */
MTF.calcOpex = function (p, herdYears, staff, opexItems) {
  const payroll = MTF.calcPayroll(staff);
  const inf = 1 + p.prices.costInflation / 100;

  return herdYears.map((y, i) => {
    const k = Math.pow(inf, i);
    const detail = {};

    // Корма
    const days = 365;
    let feed = 0;
    if (p.feed.mode === 'purchase') {
      feed += y.cows * p.feed.dmCow * days * p.feed.dmPriceCow / 1000;
      feed += y.heifers * p.feed.dmHeifer * days * p.feed.dmPriceYoung / 1000;
      feed += y.calves * p.feed.dmCalf * days * p.feed.dmPriceYoung / 1000;
      feed += y.bulls * p.feed.dmBull * days * p.feed.dmPriceYoung / 1000;
    } else {
      feed = p.feed.landHa * p.feed.landCostPerHa / 1000;
    }
    detail['Корма'] = feed * k;

    // ФОТ
    detail['Фонд оплаты труда'] = payroll.gross * k;

    // Прочие статьи
    opexItems.forEach(it => {
      let v = 0;
      if (it.base === 'head') v = it.value * y.total;
      else if (it.base === 'cow') v = it.value * y.cows;
      else if (it.base === 'sum') v = it.value;
      else if (it.base === 'milk') v = it.value * y.milkLiters / 1000;
      detail[it.name] = v * k;
    });

    // Докуп нетелей
    if (y.heifersPurchased > 0) {
      detail['Приобретение нетелей'] = y.heifersPurchased * p.herd.heiferPrice * k;
    }

    // Налоги (кроме КПН)
    detail['Земельный налог'] = MTF.taxes.landTax * k;

    const total = Object.values(detail).reduce((a, b) => a + b, 0);
    return { year: y.year, idx: i, detail: detail, total: total };
  });
};

/* ---------- Выручка по годам ---------- */
MTF.calcRevenue = function (p, herdYears) {
  const inf = 1 + p.prices.priceInflation / 100;

  return herdYears.map((y, i) => {
    const k = Math.pow(inf, i);
    const detail = {};

    detail['Молоко'] = y.milkLiters * p.prices.milk * k / 1000;
    detail['Реализация телят'] = y.calvesSold * p.prices.calf * k;
    detail['Выбракованные коровы'] = y.cullSold * p.prices.cullCow * k;
    if (y.bullsSold > 0) {
      detail['Реализация бычков'] = y.bullWeightKg * p.prices.bullKg * k / 1000;
    }

    const total = Object.values(detail).reduce((a, b) => a + b, 0);
    return { year: y.year, idx: i, detail: detail, total: total };
  });
};

/* ---------- Субсидии по годам ---------- */
MTF.calcSubsidies = function (p, herdYears, capex, subsidies) {
  return herdYears.map((y, i) => {
    const yr = i + 1;
    const detail = {};

    subsidies.filter(s => s.enabled && yr >= s.yearFrom && yr <= s.yearTo).forEach(s => {
      let v = 0;
      if (s.type === 'per_liter') {
        v = y.milkLiters * s.value / 1000;
      } else if (s.type === 'per_head') {
        if (s.id === 'breeding_heifers') {
          const heads = (i === 0 ? p.herd.startHeifers : 0) + y.heifersPurchased;
          v = heads * s.value;
        } else {
          v = y.cows * s.value;
        }
      } else if (s.type === 'capex_pct') {
        const span = s.yearTo - s.yearFrom + 1;
        const base = s.base === 'all' ? capex.total : (capex.groups[s.base] || 0);
        v = base * s.value / 100 / span;
      } else if (s.type === 'fixed_year') {
        v = s.value;
      }
      if (v > 0) detail[s.name] = v;
    });

    const total = Object.values(detail).reduce((a, b) => a + b, 0);
    return { year: y.year, idx: i, detail: detail, total: total };
  });
};

/* ---------- Вознаграждение оператора ---------- */
MTF.calcOperatorFee = function (p, revenue, ebitdaBefore) {
  const f = p.finance;
  return revenue.map((r, i) => {
    let v = 0;
    if (f.operatorFeeMode === 'revenue') v = r.total * f.operatorFeeValue / 100;
    else if (f.operatorFeeMode === 'fixed') v = f.operatorFeeValue;
    else if (f.operatorFeeMode === 'ebitda') v = Math.max(0, ebitdaBefore[i] * f.operatorFeeValue / 100);
    return v;
  });
};

/* ---------- Сводный P&L ---------- */
MTF.calcPnL = function (p, herdYears, capex, staff, opexItems, subsidies) {
  const rev = MTF.calcRevenue(p, herdYears);
  const opex = MTF.calcOpex(p, herdYears, staff, opexItems);
  const sub = MTF.calcSubsidies(p, herdYears, capex, subsidies);

  const ebitdaBefore = rev.map((r, i) => r.total + sub[i].total - opex[i].total);
  const fee = MTF.calcOperatorFee(p, rev, ebitdaBefore);

  const buildBase = capex.groups.build + capex.groups.equip;
  const depr = buildBase / MTF.taxes.depreciationYears;

  return herdYears.map((y, i) => {
    const revenue = rev[i].total;
    const subsidy = sub[i].total;
    const cost = opex[i].total + fee[i];
    const ebitda = revenue + subsidy - cost;
    return {
      year: y.year,
      idx: i,
      revenue: revenue,
      subsidy: subsidy,
      opex: opex[i].total,
      operatorFee: fee[i],
      ebitda: ebitda,
      margin: (revenue + subsidy) > 0 ? ebitda / (revenue + subsidy) * 100 : 0,
      depreciation: i === 0 ? 0 : depr,
      ebit: ebitda - (i === 0 ? 0 : depr),
      milkCost: y.milkLiters > 0 ? cost * 1000 / y.milkLiters : 0,
      revDetail: rev[i].detail,
      opexDetail: opex[i].detail,
      subDetail: sub[i].detail
    };
  });
};
