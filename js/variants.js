/* ============================================================
   СРАВНЕНИЕ ВАРИАНТОВ
   Таблица на вкладке «Финансирование»: кто платит штат (staff.payer) × доля оператора (% от выручки).
   Каждая строка — полный пересчёт клона состояния, проект не меняется.
   Проценты льготы, график капзатрат и остальные вводные берутся из проекта как есть.

   Подключается после operator.js.
   ============================================================ */

window.MTF = window.MTF || {};

MTF.variantPayers = [
  { id: 'farm', name: 'Ферма: весь ФОТ' },
  { id: 'farm_only', name: 'Ферма: только блок фермы' },
  { id: 'operator', name: 'Оператор: весь ФОТ' }
];
MTF.variantShares = [3, 15, 30];

/* Год, с которого DSCR не ниже порога и дальше не опускается ниже; null, если последний год ниже порога.
   Годы без платежа (DSCR не считается) порог не нарушают. dscr — массив { year, value } из метрик. */
MTF.dscrSustainedYear = function (dscr, threshold) {
  let from = null;
  for (let i = dscr.length - 1; i >= 0; i--) {
    const v = dscr[i].value;
    if (v !== null && v !== undefined && v < threshold) break;
    from = dscr[i].year;
  }
  return from;
};

/* Минимум DSCR со 2-го года и его год (годы без платежа не считаются). */
MTF.dscrMinFromSecond = function (dscr) {
  let best = null;
  dscr.forEach(function (d, i) {
    if (i === 0 || d.value === null || d.value === undefined) return;
    if (best === null || d.value < best.value) best = { year: d.year, value: d.value };
  });
  return best;
};

let variantsCache = { key: null, rows: null };

/* Строки сравнения. Клонирует состояние (JSON), результат кэшируется по содержимому состояния. */
MTF.compareVariants = function (state) {
  const key = JSON.stringify(state);
  if (variantsCache.key === key) return variantsCache.rows;
  const N = Math.max(1, state.params.project.farmsCount || 1);
  const rows = [];
  MTF.variantPayers.forEach(function (pay) {
    MTF.variantShares.forEach(function (share) {
      const s = JSON.parse(key);
      s.params.staff.payer = pay.id;
      s.params.finance.operatorFeeMode = 'revenue';
      s.params.finance.operatorFeeValue = share;
      const r = MTF.runModel(s), m = r.metrics, d = m.dscr;
      const min2 = MTF.dscrMinFromSecond(d), op = MTF.calcOperatorResult(s, r);
      rows.push({
        payer: pay.id, payerName: pay.name, share: share,
        dscr: d.map(function (x) { return x.value; }), years: d.map(function (x) { return x.year; }),
        min2: min2 ? min2.value : null, min2Year: min2 ? min2.year : null,
        sustained: MTF.dscrSustainedYear(d, 1.2),
        npv: m.npv, irr: m.irr,
        operatorResult: op.atCapacity.result * N, operatorYear: op.capYear
      });
    });
  });
  variantsCache = { key: key, rows: rows };
  return rows;
};

MTF.renderVariantsCard = function () {
  const S = MTF.state, P = S.params, f = MTF.fmt;
  if (MTF.isFeedlot && MTF.isFeedlot(P)) return '';
  const rows = MTF.compareVariants(S), y0 = P.project.startYear, N = Math.max(1, P.project.farmsCount || 1);
  const dv = (r, i) => r.dscr[i] === null || r.dscr[i] === undefined ? '—'
    : '<span class="' + (r.dscr[i] < 1.2 ? 'neg' : '') + '">' + r.dscr[i].toFixed(2) + '</span>';
  const body = rows.map(function (r, idx) {
    return '<tr' + (idx % MTF.variantShares.length === 0 ? ' style="border-top:2px solid var(--line)"' : '') + '>' +
      '<td>' + (idx % MTF.variantShares.length === 0 ? r.payerName : '') + '</td>' +
      '<td class="n">' + r.share + '%</td>' +
      '<td class="n">' + dv(r, 1) + '</td><td class="n">' + dv(r, 2) + '</td><td class="n">' + dv(r, 3) + '</td><td class="n">' + dv(r, 4) + '</td>' +
      '<td class="n ' + (r.min2 !== null && r.min2 < 1.2 ? 'neg' : '') + '"><b>' + (r.min2 !== null ? r.min2.toFixed(2) : '—') + '</b></td>' +
      '<td class="n">' + (r.min2Year || '—') + '</td>' +
      '<td class="n">' + (r.sustained || 'нет') + '</td>' +
      '<td class="n ' + (r.npv < 0 ? 'neg' : '') + '">' + f.num(r.npv) + (r.payer === 'farm' ? '' : ' *') + '</td>' +
      '<td class="n">' + (r.irr !== null ? f.pct(r.irr * 100) : '—') + (r.payer === 'farm' ? '' : ' *') + '</td>' +
      '<td class="n ' + (r.operatorResult < 0 ? 'neg' : '') + '">' + f.num(r.operatorResult) + '</td></tr>';
  }).join('');
  return '<div class="card" style="margin-top:14px"><h3>Сравнение вариантов</h3>' +
    '<div class="hint" style="margin-top:0">Кто платит штатное расписание и какую долю выручки получает оператор. ' +
    'Каждая строка пересчитана моделью целиком на копии проекта, сам проект не меняется. Вознаграждение принято в % от выручки, ' +
    'остальные вводные (проценты льготы, график капзатрат, субсидии) как в проекте. DSCR красным ниже 1,2.</div>' +
    '<div class="tw"><table><thead><tr><th>Кто платит штат</th><th>Доля оператора</th>' +
    [1, 2, 3, 4].map(i => '<th>DSCR ' + (y0 + i) + '</th>').join('') +
    '<th>Мин. DSCR со 2-го года</th><th>Год мин.</th><th>DSCR ≥ 1,2 с года и дальше</th><th>NPV</th><th>IRR</th>' +
    '<th>Результат оператора на мощности, проект (' + N + ' ферм)</th></tr></thead><tbody>' + body + '</tbody></table></div>' +
    '<div class="hint">«DSCR ≥ 1,2 с года и дальше»: первый год, начиная с которого покрытие не опускается ниже 1,2 до конца горизонта; ' +
    '«нет», если последний год ниже. * NPV и IRR без ФОТ, не сопоставимы с вариантом «ферма: весь ФОТ». ' +
    'Результат оператора по каждой строке считается при его же доле и том, кто платит штат; тыс. ₸ в год.</div></div>';
};

(function () {
  if (!MTF.renderFin) return;
  const orig = MTF.renderFin;
  const marker = '<div class="card" style="margin-top:14px"><h3>График погашения</h3>';
  MTF.renderFin = function (res) {
    const h = orig(res), card = MTF.renderVariantsCard();
    if (!card) return h;
    const i = h.indexOf(marker);
    return i < 0 ? h + card : h.slice(0, i) + card + h.slice(i);
  };
})();
