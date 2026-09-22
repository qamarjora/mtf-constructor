/* ============================================================
   ОТКОРМ БЫЧКОВ — РАСЧЁТ
   Посуточная модель по секциям (всё занято — всё пусто),
   агрегация в месяцы и годы. Выход совместим с цепочкой ядра:
   calcHerd → calcCapex → calcPnL → финблок без изменений.
   Суммы — тыс. ₸, цены за кг — ₸.
   ============================================================ */

window.MTF = window.MTF || {};
MTF.feedlot = MTF.feedlot || {};

(function () {
  const FL = MTF.feedlot;
  const YEAR = 365;

  /* ---------- Мощность и узкое место ---------- */
  FL.capacity = function (p) {
    const C = p.feedlot.capacity;
    const limits = [{ id: 'sections', label: 'секции', value: C.sections * C.headsPerSection }];
    if (C.areaTotal > 0 && C.areaNorm > 0)
      limits.push({ id: 'area', label: 'площадь на голову', value: Math.floor(C.areaTotal / C.areaNorm) });
    if (C.feedFrontM > 0 && C.feedFrontNormCm > 0)
      limits.push({ id: 'front', label: 'фронт кормления', value: Math.floor(C.feedFrontM * 100 / C.feedFrontNormCm) });
    if (C.drinkers > 0 && C.headsPerDrinker > 0)
      limits.push({ id: 'drink', label: 'поилки', value: C.drinkers * C.headsPerDrinker });

    const min = limits.reduce((a, l) => (l.value < a.value ? l : a), limits[0]);
    const perSection = C.sections > 0 ? Math.floor(min.value / C.sections) : 0;
    return {
      design: C.sections * C.headsPerSection,
      value: perSection * C.sections,
      perSection: perSection,
      bottleneck: min,
      limits: limits
    };
  };

  FL.season = function (p) {
    const A = p.feedlot.animals;
    if (Array.isArray(A.season) && A.season.length === 12) return A.season;
    return FL.seasonPresets[p.feedlot.format] || FL.seasonPresets.semi;
  };

  /* Расчётная длительность цикла без сезонности — для падежа и KPI */
  FL.plannedDays = function (A) {
    const gainAdapt = A.adaptDays * A.adgAdapt / 1000;
    const rest = Math.max(0, A.weightOut - A.weightIn - gainAdapt);
    const days = A.adaptDays + (A.adg > 0 ? rest / (A.adg / 1000) : A.maxDays);
    return Math.min(A.maxDays, Math.ceil(days));
  };

  /* Цена реализации 1 кг живого веса на площадке (после усушки) — для оценки поголовья */
  function saleValuePerKg(S) {
    const net = 1 - S.shrink / 100;
    return S.mode === 'carcass' ? net * S.carcassYield / 100 * S.priceCarcass : net * S.priceOut;
  }

  /* ---------- Посуточная симуляция ---------- */
  FL.simulate = function (p) {
    const F = p.feedlot, A = F.animals, fd = F.feed, S = F.sale, K = F.costs;
    const horizon = p.project.horizon;
    const nMonths = horizon * 12, nDays = horizon * YEAR;
    const pi = p.prices.priceInflation / 100, ci = p.prices.costInflation / 100;
    const cap = FL.capacity(p);
    const season = FL.season(p);
    const planned = FL.plannedDays(A);
    const mortDaily = 1 - Math.pow(1 - A.mortality / 100, 1 / Math.max(1, planned));
    const unitValue = saleValuePerKg(S);

    const dayOfMonth = m => Math.floor(m / 12) * YEAR + Math.round((m % 12) * YEAR / 12);
    const monthOfDay = d => {
      const y = Math.floor(d / YEAR);
      return Math.min(nMonths - 1, y * 12 + Math.floor((d % YEAR) * 12 / YEAR));
    };

    const blank = () => ({
      revenue: 0, purchase: 0, initialStock: 0, feed: 0, bedding: 0, vet: 0, extra: 0, other: 0,
      bought: 0, sold: 0, dead: 0, liveKgSold: 0, gainKg: 0, dmKg: 0, headDays: 0,
      batches: 0, batchesByDays: 0, cycleDaysSum: 0
    });
    const months = [];
    for (let m = 0; m < nMonths; m++) months.push(blank());

    /* Комплектование:
       even — секции заходят равномерно в течение одного цикла, площадка
              работает непрерывным потоком (продажи каждые 2–4 недели);
       fast — N секций в месяц, партии идут «волнами». */
    const perMonth = Math.max(1, Number(F.sectionsPerMonth) || 1);
    const launch = Number(F.launchMonth) || 0;   // из выпадающего списка приходит строкой
    const nSec = F.capacity.sections;
    const step = (planned + A.sanitationDays) / Math.max(1, nSec);
    const sections = [];
    for (let s = 0; s < nSec; s++) {
      const start = F.fillMode === 'fast'
        ? dayOfMonth(launch + Math.floor(s / perMonth))
        : dayOfMonth(launch) + Math.round(s * step);
      sections.push({ state: 'wait', start: start, heads: 0, w: 0, age: 0, rest: 0, initial: true });
    }

    function purchase(sec, M, kP, kC) {
      const heads = cap.perSection;
      if (heads <= 0) { sec.state = 'wait'; sec.start = Infinity; return; }
      const animals = heads * A.weightIn * S.priceIn * kP / 1000;
      if (sec.initial && F.firstStockFinanced) M.initialStock += animals;
      else M.purchase += animals;
      M.extra += heads * K.purchaseExtra * kC;
      M.vet += heads * K.vetPerHead * kC;
      M.bought += heads;
      sec.state = 'fat'; sec.heads = heads; sec.w = A.weightIn; sec.age = 0; sec.initial = false;
    }

    function sell(sec, M, kP) {
      const live = sec.heads * sec.w * (1 - S.shrink / 100);
      M.revenue += S.mode === 'carcass'
        ? live * S.carcassYield / 100 * S.priceCarcass * kP / 1000
        : live * S.priceOut * kP / 1000;
      M.sold += sec.heads;
      M.liveKgSold += live;
      M.batches += 1;
      M.cycleDaysSum += sec.age;
      if (sec.w < A.weightOut) M.batchesByDays += 1;
      sec.heads = 0; sec.w = 0;
      sec.state = 'rest'; sec.rest = A.sanitationDays;
    }

    for (let d = 0; d < nDays; d++) {
      const mi = monthOfDay(d), M = months[mi];
      const yi = Math.floor(mi / 12);
      const kP = Math.pow(1 + pi, yi), kC = Math.pow(1 + ci, yi);
      const coef = season[mi % 12];

      sections.forEach(sec => {
        if (sec.state === 'wait' && d >= sec.start) purchase(sec, M, kP, kC);
        else if (sec.state === 'rest') {
          sec.rest -= 1;
          if (sec.rest <= 0) purchase(sec, M, kP, kC);
        }
        if (sec.state !== 'fat') return;

        const adapt = sec.age < A.adaptDays;
        const dm = sec.heads * sec.w * fd.dmiPct / 100;
        M.dmKg += dm;
        M.feed += dm * (adapt ? fd.dmCostAdapt : fd.dmCost) * kC / 1000;
        M.bedding += sec.heads * fd.beddingKg * fd.beddingPrice * kC / 1000;
        M.other += sec.heads * K.otherPerHeadDay * kC / 1000;
        M.headDays += sec.heads;

        const dead = sec.heads * mortDaily;
        sec.heads -= dead;
        M.dead += dead;

        const gain = (adapt ? A.adgAdapt : A.adg) * coef / 1000;
        sec.w += gain;
        M.gainKg += sec.heads * gain;
        sec.age += 1;

        if (sec.w >= A.weightOut || sec.age >= A.maxDays) sell(sec, M, kP);
      });

      // Снимок поголовья на конец года — для остаточной стоимости и отчёта
      if ((d + 1) % YEAR === 0) {
        const y = (d + 1) / YEAR - 1;
        const heads = sections.reduce((a, s) => a + (s.state === 'fat' ? s.heads : 0), 0);
        const kg = sections.reduce((a, s) => a + (s.state === 'fat' ? s.heads * s.w : 0), 0);
        months[y * 12 + 11].endHeads = heads;
        months[y * 12 + 11].endKg = kg;
        months[y * 12 + 11].assetValue = kg * unitValue * Math.pow(1 + pi, y) / 1000;
      }
    }

    return { months: months, capacity: cap, plannedDays: planned, season: season };
  };

  /* ---------- Годовая сводка в формате herdYears ядра ---------- */
  /* Симуляция зависит только от этих вводных. runModel вызывает её дважды
     (стадо и капзатраты), анализ чувствительности — десятки раз, поэтому
     последний результат запоминается. */
  let memo = { key: null, sim: null };
  function simulateCached(p) {
    const key = JSON.stringify([p.feedlot, p.project.horizon, p.project.startYear,
      p.prices.priceInflation, p.prices.costInflation]);
    if (memo.key !== key) memo = { key: key, sim: FL.simulate(p) };
    return memo.sim;
  }

  FL.calcHerd = function (p) {
    const sim = simulateCached(p);
    const keys = ['revenue', 'purchase', 'initialStock', 'feed', 'bedding', 'vet', 'extra', 'other',
      'bought', 'sold', 'dead', 'liveKgSold', 'gainKg', 'dmKg', 'headDays',
      'batches', 'batchesByDays', 'cycleDaysSum'];
    const years = [];
    for (let y = 0; y < p.project.horizon; y++) {
      const acc = {};
      keys.forEach(k => { acc[k] = 0; });
      for (let m = y * 12; m < y * 12 + 12; m++) keys.forEach(k => { acc[k] += sim.months[m][k]; });
      const last = sim.months[y * 12 + 11];
      years.push(Object.assign(acc, {
        year: p.project.startYear + y, idx: y,
        headsAvg: acc.headDays / YEAR,
        headsEnd: last.endHeads || 0,
        weightEndAvg: last.endHeads > 0 ? last.endKg / last.endHeads : 0,
        assetValue: last.assetValue || 0,       // оценка скота на площадке — для выхода инвестора
        fcr: acc.gainKg > 0 ? acc.dmKg / acc.gainKg : 0,
        // поля ядра МТФ — нули, чтобы общие функции не получали undefined
        cows: 0, total: last.endHeads || 0, milkLiters: 0, heifersPurchased: 0,
        warnings: []
      }));
    }
    const initialStockTotal = years.reduce((a, y) => a + y.initialStock, 0);
    years.meta = {
      type: 'feedlot',
      target: sim.capacity.value,
      capacity: sim.capacity,
      plannedDays: sim.plannedDays,
      season: sim.season,
      initialStockTotal: initialStockTotal,
      months: sim.months
    };
    return years;
  };

  /* ---------- Капзатраты ---------- */
  FL.calcCapex = function (p, items, herd) {
    const cap = FL.capacity(p);
    const initialStock = herd ? herd.meta.initialStockTotal : FL.calcHerd(p).meta.initialStockTotal;
    const rows = [];
    const groups = { prep: 0, build: 0, equip: 0, herd: 0 };

    items.forEach(it => {
      const k = MTF.rate(p, it.cur);
      let sum = 0;
      if (it.id === 'herd' && it.auto) sum = p.feedlot.firstStockFinanced ? initialStock : 0;
      else if (it.unit === 'sum') sum = it.value * k;
      else if (it.unit === 'head' || it.unit === 'place') sum = it.value * k * cap.value;
      else if (it.unit === 'qty') sum = it.value * (it.qty || 0) * k / 1000;
      if (sum > 0) {
        rows.push({ id: it.id, name: it.name, group: it.group, sum: sum, cur: it.cur,
          native: it.value, qty: it.unit === 'qty' ? it.qty : cap.value, unit: it.unit, sect: it.sect });
        groups[it.group] += sum;
      }
    });

    const subtotal = groups.build + groups.equip + groups.herd;
    const reserve = (groups.build + groups.equip) * MTF.capexReserve / 100;
    groups.build += reserve;
    return { rows: rows, groups: groups, reserve: reserve, total: subtotal + reserve };
  };

  /* ---------- Субсидии ---------- */
  FL.calcSubsidies = function (p, herdYears, capex, subsidies) {
    return herdYears.map((y, i) => {
      const yr = i + 1, detail = {};
      subsidies.filter(s => s.enabled && yr >= s.yearFrom && yr <= s.yearTo).forEach(s => {
        let v = 0;
        if (s.type === 'per_head') v = y.sold * s.value;
        else if (s.type === 'per_kg') v = y.liveKgSold * s.value / 1000;
        else if (s.type === 'capex_pct') {
          const span = s.yearTo - s.yearFrom + 1;
          const base = s.base === 'all' ? capex.total : (capex.groups[s.base] || 0);
          v = base * s.value / 100 / span;
        } else if (s.type === 'fixed_year') v = s.value;
        if (v > 0) detail[s.name] = v;
      });
      const total = Object.values(detail).reduce((a, b) => a + b, 0);
      return { year: y.year, idx: i, detail: detail, total: total };
    });
  };

  /* ---------- P&L в формате ядра ---------- */
  FL.calcPnL = function (p, herdYears, capex, staff, opexItems, subsidies) {
    const inf = 1 + p.prices.costInflation / 100;
    const cap = herdYears.meta.capacity.value;
    // ФОТ масштабируется от вместимости площадки, а не от коров
    const base = p.staff.baseCows > 0 ? p.staff.baseCows : cap;
    const pPay = Object.assign({}, p, { staff: Object.assign({}, p.staff, { baseCows: base }) });

    const rev = herdYears.map((y, i) => {
      const detail = {};
      if (y.revenue > 0) detail['Реализация бычков с откорма'] = y.revenue;
      return { year: y.year, idx: i, detail: detail, total: y.revenue };
    });

    const opex = herdYears.map((y, i) => {
      const k = Math.pow(inf, i), detail = {};
      if (y.purchase > 0) detail['Закуп бычков на откорм'] = y.purchase;
      detail['Корма'] = y.feed;
      detail['Подстилка'] = y.bedding;
      detail['Ветеринария и обработки'] = y.vet;
      detail['Доставка и приёмка поголовья'] = y.extra;
      detail['Энергия, вода, прочие на голову'] = y.other;

      const pr = MTF.calcPayroll(pPay, staff, y.headsAvg);
      detail['Фонд оплаты труда'] = pr.gross * k;

      opexItems.forEach(it => {
        let v = 0;
        if (it.base === 'head' || it.base === 'cow') v = it.value * y.headsAvg;
        else if (it.base === 'sum') v = it.value;
        if (v > 0) detail[it.name] = v * k;
      });
      detail['Земельный налог'] = MTF.taxes.landTax * k;

      Object.keys(detail).forEach(key => { if (!(detail[key] > 0)) delete detail[key]; });
      const total = Object.values(detail).reduce((a, b) => a + b, 0);
      return { detail: detail, total: total, headcount: pr.headcount };
    });

    const sub = FL.calcSubsidies(p, herdYears, capex, subsidies);
    const before = rev.map((r, i) => r.total + sub[i].total - opex[i].total);
    const fee = MTF.calcOperatorFee(p, rev, before);
    const depr = (capex.groups.build + capex.groups.equip) / MTF.taxes.depreciationYears;

    return herdYears.map((y, i) => {
      const revenue = rev[i].total, subsidy = sub[i].total;
      const cost = opex[i].total + fee[i];
      const ebitda = revenue + subsidy - cost;
      return {
        year: y.year, idx: i,
        revenue: revenue, subsidy: subsidy,
        opex: opex[i].total, operatorFee: fee[i],
        ebitda: ebitda,
        margin: (revenue + subsidy) > 0 ? ebitda / (revenue + subsidy) * 100 : 0,
        depreciation: i === 0 ? 0 : depr,
        ebit: ebitda - (i === 0 ? 0 : depr),
        costPerKgLive: y.liveKgSold > 0 ? cost * 1000 / y.liveKgSold : 0,   // ₸ на кг реализованного ж.в.
        milkCost: y.liveKgSold > 0 ? cost * 1000 / y.liveKgSold : 0,        // колонка «себестоимость» в таблицах ядра
        costPerKgGain: y.gainKg > 0 ? (cost - (y.purchase || 0)) * 1000 / y.gainKg : 0, // ₸ на кг привеса
        marginPerHead: y.sold > 0 ? ebitda / y.sold : 0,                     // тыс. ₸
        feedHa: 0,
        headcount: opex[i].headcount,
        revDetail: rev[i].detail, opexDetail: opex[i].detail, subDetail: sub[i].detail
      };
    });
  };

  /* ---------- Помесячный пик оборотного капитала ----------
     Годовая модель ядра сглаживает кассовый разрыв внутри года:
     первые 6–9 месяцев площадка закупает и кормит без выручки.
     Здесь операционный поток считается помесячно (постоянные
     расходы — равными долями), пик — максимальная глубина минуса. */
  FL.wcPeakMonthly = function (herd, pnl) {
    const months = herd.meta.months;
    // Окно — стартовый кассовый разрыв: от первого завоза 24 месяца.
    // Дальше отрицательный поток — уже вопрос рентабельности, а не оборотки.
    const from = months.findIndex(M => M.bought > 0);
    let cum = 0, peak = 0, peakMonth = null;
    months.forEach((M, m) => {
      if (from < 0 || m < from || m >= from + 24) return;
      const y = Math.floor(m / 12);
      const variable = M.purchase + M.feed + M.bedding + M.vet + M.extra + M.other;
      const annualVar = herd[y].purchase + herd[y].feed + herd[y].bedding + herd[y].vet + herd[y].extra + herd[y].other;
      const fixed = Math.max(0, pnl[y].opex + pnl[y].operatorFee - annualVar) / 12;
      cum += M.revenue - variable - fixed;
      if (cum < peak) { peak = cum; peakMonth = m; }
    });
    return { peak: -peak, month: peakMonth };
  };

  /* ---------- Экономика одной головы ----------
     Базовые цены, без сезонности и инфляции. Считается на одну
     закупленную голову: падёж уменьшает выручку, но не закуп.
     Главный показатель для переговоров — цена безубыточности. */
  FL.unitEconomics = function (p) {
    const F = p.feedlot, A = F.animals, fd = F.feed, S = F.sale, K = F.costs;
    const days = FL.plannedDays(A);
    const adaptGain = A.adaptDays * A.adgAdapt / 1000;
    const wAdaptEnd = A.weightIn + adaptGain;
    const restDays = Math.max(0, days - A.adaptDays);
    const wOut = Math.min(A.weightOut, wAdaptEnd + restDays * A.adg / 1000);
    const dmAdapt = (A.weightIn + wAdaptEnd) / 2 * fd.dmiPct / 100 * A.adaptDays;
    const dmFat = (wAdaptEnd + wOut) / 2 * fd.dmiPct / 100 * restDays;
    const surv = 1 - A.mortality / 100;
    const liveOut = wOut * (1 - S.shrink / 100) * surv;
    const priceKg = S.mode === 'carcass' ? S.carcassYield / 100 * S.priceCarcass : S.priceOut;

    const r = {
      days: days, weightOut: wOut, gain: wOut - A.weightIn,
      revenue: liveOut * priceKg / 1000,
      purchase: A.weightIn * S.priceIn / 1000,
      feed: (dmAdapt * fd.dmCostAdapt + dmFat * fd.dmCost) / 1000,
      bedding: fd.beddingKg * fd.beddingPrice * days / 1000,
      vet: K.vetPerHead, extra: K.purchaseExtra,
      other: K.otherPerHeadDay * days / 1000,
      fcr: (wOut - A.weightIn) > 0 ? (dmAdapt + dmFat) / (wOut - A.weightIn) : 0
    };
    r.costs = r.purchase + r.feed + r.bedding + r.vet + r.extra + r.other;
    r.margin = r.revenue - r.costs;
    r.costPerKgGain = r.gain > 0 ? (r.costs - r.purchase) * 1000 / r.gain : 0;       // ₸
    // Цена реализации, при которой маржа = 0: ₸/кг ж.в. или ₸/кг туши — по способу продажи
    const saleKg = S.mode === 'carcass' ? liveOut * S.carcassYield / 100 : liveOut;
    r.breakEvenPrice = saleKg > 0 ? r.costs * 1000 / saleKg : 0;
    return r;
  };

  /* ---------- Показатели для документа ---------- */
  FL.kpi = function (p, res) {
    const herd = res.herd, pnl = res.pnl;
    /* Рабочий режим — среднее за годы с 3-го до конца горизонта.
       Один год брать нельзя: партии не совпадают с календарём, и в отдельном
       году может быть на одну продажу больше или меньше — показатели на
       голову прыгают на десятки процентов. */
    const from = Math.min(2, herd.length - 1);
    const H = herd.slice(from), R = pnl.slice(from), n = H.length;
    const sum = (arr, fn) => arr.reduce((a, x) => a + fn(x), 0);
    const sold = sum(H, y => y.sold), kg = sum(H, y => y.liveKgSold), gain = sum(H, y => y.gainKg);
    const cost = sum(R, r => r.opex + r.operatorFee), purch = sum(H, y => y.purchase);
    const y = { sold: sold / n, liveKgSold: kg / n, gainKg: gain / n, fcr: gain > 0 ? sum(H, y => y.dmKg) / gain : 0 };
    const r = {
      costPerKgGain: gain > 0 ? (cost - purch) * 1000 / gain : 0,
      costPerKgLive: kg > 0 ? cost * 1000 / kg : 0,
      marginPerHead: sold > 0 ? sum(R, r => r.ebitda) / sold : 0
    };
    const totBatches = herd.reduce((a, h) => a + h.batches, 0);
    const avgCycle = totBatches > 0 ? herd.reduce((a, h) => a + h.cycleDaysSum, 0) / totBatches : 0;
    const S = p.feedlot.sale;
    return {
      capacity: herd.meta.capacity.value,
      capacityDesign: herd.meta.capacity.design,
      bottleneck: herd.meta.capacity.bottleneck.label,
      plannedDays: herd.meta.plannedDays,
      avgCycleDays: avgCycle,
      rotations: avgCycle > 0 ? YEAR / (avgCycle + p.feedlot.animals.sanitationDays) : 0,
      soldPerYear: y.sold,
      liveTonsPerYear: y.liveKgSold / 1000,
      gainTonsPerYear: y.gainKg / 1000,
      fcr: y.fcr,
      costPerKgGain: r.costPerKgGain,
      costPerKgLive: r.costPerKgLive,
      marginPerHead: r.marginPerHead,
      priceSpread: S.priceOut - S.priceIn,
      mortality: p.feedlot.animals.mortality,
      byDaysShare: totBatches > 0 ? herd.reduce((a, h) => a + h.batchesByDays, 0) / totBatches * 100 : 0,
      wc: FL.wcPeakMonthly(herd, pnl)
    };
  };

  /* ---------- Проверки согласованности ---------- */
  FL.checks = function (p, res, kpi) {
    const out = [];
    const A = p.feedlot.animals, cap = res.herd.meta.capacity;
    const n = v => Math.round(v).toLocaleString('ru-RU');

    if (cap.bottleneck.id !== 'sections')
      out.push('Мощность ограничена параметром «' + cap.bottleneck.label + '»: ' + n(cap.value) +
        ' гол. вместо проектных ' + n(cap.design) + '.');
    if (A.weightOut <= A.weightIn)
      out.push('Целевой вес реализации не больше веса при закупе — откорм не имеет смысла.');
    if (A.adg > 1600)
      out.push('Привес ' + A.adg + ' г/сут выше реалистичного для откорма бычков. Проверьте породу и рацион.');
    if (kpi.fcr > 0 && (kpi.fcr < 5 || kpi.fcr > 11))
      out.push('Конверсия корма ' + kpi.fcr.toFixed(1) + ' кг СВ на кг привеса вне обычного диапазона 5–11. ' +
        'Проверьте потребление СВ и привес.');
    if (kpi.byDaysShare > 10)
      out.push(Math.round(kpi.byDaysShare) + '% партий уходят по предельному сроку, не набрав ' + A.weightOut +
        ' кг. Проверьте привес, сезонность или предельный срок.');
    if (kpi.marginPerHead < 0)
      out.push('В рабочем режиме EBITDA на реализованную голову отрицательная. Главный рычаг — разница ' +
        'цен закупа и реализации (сейчас ' + n(kpi.priceSpread) + ' ₸/кг).');
    if (res.cf && kpi.wc.peak > 0) {
      const annual = res.cf.wcPeak;
      if (kpi.wc.peak > res.cf.wcCap)
        out.push('Помесячный пик потребности в оборотных средствах ' + n(kpi.wc.peak) + ' тыс. ₸ выше лимита ' +
          'оборотного кредита ' + n(res.cf.wcCap) + ' тыс. ₸.');
      else if (kpi.wc.peak > annual * 1.2)
        out.push('Годовой расчёт занижает оборотку: помесячный пик ' + n(kpi.wc.peak) + ' тыс. ₸ (месяц ' +
          (kpi.wc.month + 1) + '), в годовой модели привлечено ' + n(annual) + ' тыс. ₸.');
    }
    return out;
  };
})();
