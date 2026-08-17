/* ============================================================
   ДВИЖЕНИЕ СТАДА — помесячная модель
   Возвращает массив по годам: поголовье, надой, продажи, дефициты.
   ============================================================ */

window.MTF = window.MTF || {};

MTF.calcHerd = function (p) {
  const H = p.herd, P = p.production, C = p.capacity;
  const months = p.project.horizon * 12;

  // Состояния
  let cows = 0;                        // фуражное поголовье (дойные + сухостой)
  const pregHeifers = {};              // нетели: ключ = месяц отёла
  const heifers = new Array(30).fill(0); // тёлки по возрасту в месяцах 0..29
  const bulls = new Array(30).fill(0);   // бычки по возрасту

  // График завоза нетелей
  const arrivals = {};
  const b1 = Math.round(H.startHeifers * H.firstBatchShare / 100);
  arrivals[1] = b1;
  const rest = H.startHeifers - b1;
  const otherBatches = Math.max(1, H.batches - 1);
  for (let i = 0; i < otherBatches; i++) {
    const m = 1 + H.batchInterval * (i + 1);
    arrivals[m] = (arrivals[m] || 0) + Math.round(rest / otherBatches);
  }

  const dryShare = Math.min(0.35, (P.dryDays / 365) * (P.calvingRate / 100) * (365 / 305) * 0.85 + P.dryDays / 365 * 0.15);
  const dryShareSimple = P.dryDays / (365 * 100 / Math.max(1, P.calvingRate));

  const years = [];
  let acc = newYear();
  const purchaseLog = {};

  function newYear() {
    return {
      milkLiters: 0, calvings: 0, calvesBorn: 0,
      calvesSoldM: 0, calvesSoldF: 0, cullSold: 0,
      bullsSold: 0, bullWeightKg: 0, surplusHeifersSold: 0,
      heifersPurchased: 0, deaths: 0,
      capacityWarnings: []
    };
  }

  for (let m = 1; m <= months; m++) {
    const yIdx = Math.floor((m - 1) / 12);

    // 1. Завоз нетелей на старте
    if (arrivals[m]) {
      const calveAt = m + Math.max(1, 9 - H.gestationOnArrival);
      pregHeifers[calveAt] = (pregHeifers[calveAt] || 0) + arrivals[m];
    }

    // 2. Ежегодный докуп нетелей (режим purchase / outsource)
    if (P.remontMode !== 'own' && m > 12 && m % 12 === 1) {
      const target = C.cowPlaces + C.dryPlaces;
      const gap = Math.max(0, target - cows);
      const need = Math.round(cows * P.cullRate / 100 + Math.min(gap, target * 0.25));
      if (need > 0) {
        const calveAt = m + Math.max(1, 9 - H.gestationOnArrival);
        pregHeifers[calveAt] = (pregHeifers[calveAt] || 0) + need;
        acc.heifersPurchased += need;
        purchaseLog[yIdx] = (purchaseLog[yIdx] || 0) + need;
      }
    }

    // 3. Отёл нетелей → вход в основное стадо
    if (pregHeifers[m]) {
      const n = pregHeifers[m];
      cows += n;
      acc.calvings += n;
      delete pregHeifers[m];
    }

    // 4. Отёлы коров
    const calvings = cows * (P.calvingRate / 100) / 12;
    acc.calvings += calvings;

    // 5. Приплод
    const born = calvings * (1 - P.calfMortality / 100);
    acc.calvesBorn += born;
    const females = born * (P.heiferShare / 100);
    const males = born - females;

    heifers[0] += females;
    bulls[0] += males;

    // 6. Выбраковка коров
    const culled = cows * (P.cullRate / 100) / 12;
    cows -= culled;
    acc.cullSold += culled;

    // 7. Продвижение молодняка по возрасту
    for (let a = 29; a > 0; a--) {
      heifers[a] = heifers[a - 1] * (1 - P.heiferMortality / 100 / 12);
      bulls[a] = bulls[a - 1] * (1 - P.heiferMortality / 100 / 12);
    }
    heifers[0] = 0;
    bulls[0] = 0;

    // 8. Реализация тёлочек
    const saleAge = Math.max(1, P.calfSaleAgeMo);
    const targetCows = C.cowPlaces + C.dryPlaces;
    if (P.remontMode === 'own') {
      // пока стадо ниже проектной мощности — оставляем всех тёлочек;
      // после выхода на мощность оставляем только на ремонт, излишек продаём
      const avail = heifers[saleAge];
      let keep;
      if (cows < targetCows * 0.98) {
        keep = avail;
      } else {
        keep = Math.min(avail, cows * (P.cullRate / 100) / 12 * 1.3);
      }
      const sell = Math.max(0, avail - keep);
      heifers[saleAge] = keep;
      acc.calvesSoldF += sell;
    } else {
      acc.calvesSoldF += heifers[saleAge];
      heifers[saleAge] = 0;
    }

    // 9. Ввод нетелей своего воспроизводства в стадо
    const fc = Math.min(29, P.firstCalvingMo);
    if (P.remontMode === 'own' && heifers[fc] > 0) {
      cows += heifers[fc];
      acc.calvings += heifers[fc];
      heifers[fc] = 0;
    }

    // 10. Бычки
    if (P.bullMode === 'sell_calf') {
      acc.calvesSoldM += bulls[saleAge];
      bulls[saleAge] = 0;
    } else {
      const fa = Math.min(29, P.fattenAgeMo);
      if (bulls[fa] > 0) {
        acc.bullsSold += bulls[fa];
        acc.bullWeightKg += bulls[fa] * P.fattenWeightKg;
        bulls[fa] = 0;
      }
    }

    // 11. Молоко
    acc.milkLiters += cows * P.milkYield / 12;

    // 12. Контроль скотомест
    const heiferTotal = heifers.slice(saleAge + 1).reduce((a, b) => a + b, 0);
    const calfTotal = heifers.slice(0, saleAge + 1).reduce((a, b) => a + b, 0) +
                      bulls.slice(0, saleAge + 1).reduce((a, b) => a + b, 0);
    const bullTotal = bulls.slice(saleAge + 1).reduce((a, b) => a + b, 0);
    const dry = cows * dryShareSimple;
    const milkingNow = cows - dry;

    if (milkingNow > C.cowPlaces * 1.02) push(acc, 'Дойные: ' + Math.round(milkingNow) + ' при ' + C.cowPlaces + ' местах');
    if (dry > C.dryPlaces * 1.02) push(acc, 'Сухостой: ' + Math.round(dry) + ' при ' + C.dryPlaces + ' местах');
    if (calfTotal > C.calfPlaces * 1.02) push(acc, 'Телята: ' + Math.round(calfTotal) + ' при ' + C.calfPlaces + ' местах');
    if (heiferTotal > C.heiferPlaces * 1.02) push(acc, 'Ремонтный молодняк: ' + Math.round(heiferTotal) + ' при ' + C.heiferPlaces + ' местах');
    if (bullTotal > C.bullPlaces * 1.02) push(acc, 'Бычки: ' + Math.round(bullTotal) + ' при ' + C.bullPlaces + ' местах');

    // 13. Закрытие года
    if (m % 12 === 0) {
      years.push({
        year: p.project.startYear + yIdx,
        idx: yIdx,
        cows: cows,
        milking: milkingNow,
        dry: dry,
        calves: calfTotal,
        heifers: heiferTotal,
        bulls: bullTotal,
        total: cows + calfTotal + heiferTotal + bullTotal,
        milkLiters: acc.milkLiters,
        milkPerCow: cows > 0 ? acc.milkLiters / cows : 0,
        calvesSold: acc.calvesSoldM + acc.calvesSoldF,
        cullSold: acc.cullSold,
        bullsSold: acc.bullsSold,
        bullWeightKg: acc.bullWeightKg,
        heifersPurchased: acc.heifersPurchased,
        warnings: acc.capacityWarnings.slice(0, 5)
      });
      acc = newYear();
    }
  }

  function push(a, t) {
    if (!a.capacityWarnings.includes(t)) a.capacityWarnings.push(t);
  }

  return years;
};
