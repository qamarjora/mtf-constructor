/* ============================================================
   ДВИЖЕНИЕ СТАДА — помесячная модель  v1.1
   Гибкое размещение молодняка, режимы задания удоя,
   докуп поголовья по годам.
   ============================================================ */

window.MTF = window.MTF || {};

/* Межотёльный период в днях */
MTF.calvingInterval = function (P) {
  return 365 * 100 / Math.max(1, P.calvingRate);
};

/* Расчётная доля дойных в фуражном поголовье */
MTF.milkingShare = function (P) {
  const interval = MTF.calvingInterval(P);
  return Math.max(0.5, Math.min(0.95, 1 - P.dryDays / interval));
};

/* Приведение удоя к годовому на фуражную корову */
MTF.annualYield = function (P) {
  const share = MTF.milkingShare(P);
  if (P.yieldMode === 'lactation') {
    // введён удой за лактацию 305 дней на дойную корову
    return P.milkYield / 305 * share * 365;
  }
  if (P.yieldMode === 'daily') {
    // введён среднесуточный удой дойной коровы
    return P.milkYield * share * 365;
  }
  return P.milkYield; // уже годовой на фуражную
};

MTF.calcHerd = function (p) {
  const H = p.herd, P = p.production, C = p.capacity;
  const months = p.project.horizon * 12;
  const yieldYear = MTF.annualYield(P);
  const mShare = MTF.milkingShare(P);
  const target = C.cowPlaces + C.dryPlaces;

  let cows = 0;
  const pregHeifers = {};
  const heifers = new Array(32).fill(0);
  const bulls = new Array(32).fill(0);

  // График завоза
  const arrivals = {};
  const b1 = Math.round(H.startHeifers * H.firstBatchShare / 100);
  arrivals[1] = b1;
  const rest = H.startHeifers - b1;
  const nb = Math.max(1, H.batches - 1);
  for (let i = 0; i < nb; i++) {
    const m = 1 + H.batchInterval * (i + 1);
    arrivals[m] = (arrivals[m] || 0) + Math.round(rest / nb);
  }

  // Плановый докуп до проектной мощности
  let purchasedTotal = H.startHeifers;
  if (H.restockMode === 'to_capacity') {
    const gap = Math.max(0, target - H.startHeifers);
    const perYear = gap / Math.max(1, H.restockYears);
    for (let y = 1; y <= H.restockYears; y++) {
      const m = y * 12 + 1;
      arrivals[m] = (arrivals[m] || 0) + Math.round(perYear);
      purchasedTotal += Math.round(perYear);
    }
  }

  const years = [];
  let acc = newYear();

  function newYear() {
    return {
      milkLiters: 0, calvings: 0, calvesBorn: 0,
      calvesSoldM: 0, calvesSoldF: 0, cullSold: 0,
      bullsSold: 0, bullWeightKg: 0,
      heifersPurchased: 0, surplusSold: 0,
      warnings: []
    };
  }
  function warn(a, t) { if (!a.warnings.includes(t)) a.warnings.push(t); }

  for (let m = 1; m <= months; m++) {
    const yIdx = Math.floor((m - 1) / 12);

    if (arrivals[m]) {
      const at = m + Math.max(1, 9 - H.gestationOnArrival);
      pregHeifers[at] = (pregHeifers[at] || 0) + arrivals[m];
      if (m > 12) acc.heifersPurchased += arrivals[m];
    }

    // Ежегодный докуп при ремонте покупкой
    if (P.remontMode !== 'own' && m > 12 && m % 12 === 1) {
      const gap = Math.max(0, target - cows);
      const need = Math.round(cows * P.cullRate / 100 + Math.min(gap, target * 0.25));
      if (need > 0) {
        const at = m + Math.max(1, 9 - H.gestationOnArrival);
        pregHeifers[at] = (pregHeifers[at] || 0) + need;
        acc.heifersPurchased += need;
      }
    }

    if (pregHeifers[m]) { cows += pregHeifers[m]; acc.calvings += pregHeifers[m]; delete pregHeifers[m]; }

    const calvings = cows * (P.calvingRate / 100) / 12;
    acc.calvings += calvings;

    const born = calvings * (1 - P.calfMortality / 100);
    acc.calvesBorn += born;
    const females = born * (P.heiferShare / 100);
    heifers[0] += females;
    bulls[0] += born - females;

    const culled = cows * (P.cullRate / 100) / 12;
    cows -= culled;
    acc.cullSold += culled;

    for (let a = 31; a > 0; a--) {
      heifers[a] = heifers[a - 1] * (1 - P.heiferMortality / 100 / 12);
      bulls[a] = bulls[a - 1] * (1 - P.heiferMortality / 100 / 12);
    }
    heifers[0] = 0; bulls[0] = 0;

    const saleAge = Math.max(1, P.calfSaleAgeMo);

    if (P.remontMode === 'own') {
      const avail = heifers[saleAge];
      const keep = cows < target * 0.98
        ? avail
        : Math.min(avail, cows * (P.cullRate / 100) / 12 * 1.3);
      heifers[saleAge] = keep;
      acc.calvesSoldF += Math.max(0, avail - keep);
    } else {
      acc.calvesSoldF += heifers[saleAge];
      heifers[saleAge] = 0;
    }

    const fc = Math.min(31, P.firstCalvingMo);
    if (P.remontMode === 'own' && heifers[fc] > 0) {
      const room = Math.max(0, target - cows);
      const enter = Math.min(heifers[fc], Math.max(0, room));
      cows += enter;
      acc.calvings += enter;
      acc.surplusSold += heifers[fc] - enter;
      heifers[fc] = 0;
    }

    if (P.bullMode === 'sell_calf') {
      acc.calvesSoldM += bulls[saleAge];
      bulls[saleAge] = 0;
    } else {
      const fa = Math.min(31, P.fattenAgeMo);
      if (bulls[fa] > 0) {
        acc.bullsSold += bulls[fa];
        acc.bullWeightKg += bulls[fa] * P.fattenWeightKg;
        bulls[fa] = 0;
      }
    }

    acc.milkLiters += cows * yieldYear / 12;

    // ----- Контроль скотомест -----
    const heiferTotal = heifers.slice(saleAge + 1).reduce((a, b) => a + b, 0);
    const calfTotal = heifers.slice(0, saleAge + 1).reduce((a, b) => a + b, 0) +
                      bulls.slice(0, saleAge + 1).reduce((a, b) => a + b, 0);
    const bullTotal = bulls.slice(saleAge + 1).reduce((a, b) => a + b, 0);
    const dry = cows * (1 - mShare);
    const milking = cows - dry;

    // свободные места коровника, доступные под молодняк
    const freeCow = C.flexHousing ? Math.max(0, C.cowPlaces - milking) : 0;
    const freeDry = C.flexHousing ? Math.max(0, C.dryPlaces - dry) : 0;
    let flexPool = freeCow + freeDry;

    function over(cur, cap, label, coef) {
      let excess = cur - cap * 1.02;
      if (excess <= 0) return;
      const used = Math.min(excess, flexPool / (coef || 1));
      flexPool -= used * (coef || 1);
      excess -= used;
      if (excess > 0.5) {
        warn(acc, label + ': ' + Math.round(cur) + ' при ' + Math.round(cap) + ' местах' +
          (C.flexHousing && flexPool <= 0 ? ' (свободные места коровника уже заняты)' : ''));
      }
    }

    if (milking > C.cowPlaces * 1.02) warn(acc, 'Дойные: ' + Math.round(milking) + ' при ' + C.cowPlaces + ' местах');
    if (dry > C.dryPlaces * 1.02) warn(acc, 'Сухостой: ' + Math.round(dry) + ' при ' + C.dryPlaces + ' местах');
    over(calfTotal, C.calfPlaces, 'Телята', 0.5);
    over(heiferTotal, C.heiferPlaces, 'Ремонтный молодняк', 1);
    over(bullTotal, C.bullPlaces, 'Бычки', 1);

    if (m % 12 === 0) {
      years.push({
        year: p.project.startYear + yIdx, idx: yIdx,
        cows: cows, milking: milking, dry: dry,
        calves: calfTotal, heifers: heiferTotal, bulls: bullTotal,
        total: cows + calfTotal + heiferTotal + bullTotal,
        milkLiters: acc.milkLiters,
        milkPerCow: cows > 0 ? acc.milkLiters / cows : 0,
        calvesSold: acc.calvesSoldM + acc.calvesSoldF,
        surplusSold: acc.surplusSold,
        cullSold: acc.cullSold,
        bullsSold: acc.bullsSold,
        bullWeightKg: acc.bullWeightKg,
        heifersPurchased: acc.heifersPurchased,
        flexUsed: C.flexHousing ? Math.max(0, (freeCow + freeDry) - flexPool) : 0,
        warnings: acc.warnings.slice(0, 6)
      });
      acc = newYear();
    }
  }

  years.meta = {
    yieldYear: yieldYear,
    milkingShare: mShare,
    calvingInterval: MTF.calvingInterval(P),
    purchasedTotal: purchasedTotal,
    target: target
  };
  return years;
};
