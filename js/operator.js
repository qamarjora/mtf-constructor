/* ============================================================
   РЕЗУЛЬТАТ ОПЕРАТОРА
   Вознаграждение оператора минус ФОТ, который он платит (staff.payer):
   при operator весь штат, при farm_only только доля АУП комплекса, при farm нуль.
   Вне EBITDA, NPV и IRR фермы: расчёт ничего в res не меняет, читает готовый res.
   Показывается на вкладке «Финансирование», в документы не выносится.

   Подключается после ui.js.
   ============================================================ */

window.MTF = window.MTF || {};

/* По годам: вознаграждение, ФОТ оператора, результат, накопленно (на ферму и на проект).
   Безубыточная доля оператора — доля выручки, при которой вознаграждение равно его ФОТ
   (выручка та же, что база вознаграждения: rev.total без субсидий). Для года выхода на мощность
   и для диапазона годов с мощности. */
MTF.calcOperatorResult = function (state, res) {
  const p = state.params, N = Math.max(1, p.project.farmsCount || 1);
  const inf = 1 + p.prices.costInflation / 100;
  const tgt = res.herd.meta.target;
  let ci = res.herd.findIndex(y => y.cows >= tgt * 0.99);
  if (ci < 0) ci = res.herd.length - 1;

  let cum = 0;
  const rows = res.pnl.map((y, i) => {
    const pr = MTF.calcPayroll(p, state.staff, res.herd[i].cows);
    const payroll = MTF.payrollOnOperator(p, pr) * Math.pow(inf, i);
    const result = y.operatorFee - payroll;
    cum += result;
    return {
      year: y.year, idx: i, fee: y.operatorFee, payroll: payroll, result: result, cumulative: cum,
      revenue: y.revenue, breakEvenPct: y.revenue > 0 ? payroll / y.revenue * 100 : null
    };
  });

  const fromCap = rows.slice(ci).map(r => r.breakEvenPct).filter(v => v !== null);
  return {
    rows: rows, N: N, capIdx: ci, capYear: rows[ci].year,
    payer: MTF.staffPayer(p), feeMode: p.finance.operatorFeeMode, feeValue: p.finance.operatorFeeValue,
    atCapacity: rows[ci], last: rows[rows.length - 1],
    breakEven: rows[ci].breakEvenPct,
    breakEvenMin: fromCap.length ? Math.min.apply(null, fromCap) : null,
    breakEvenMax: fromCap.length ? Math.max.apply(null, fromCap) : null
  };
};

MTF.renderOperatorCard = function (res) {
  const S = MTF.state, P = S.params, f = MTF.fmt;
  if (MTF.isFeedlot && MTF.isFeedlot(P)) return '';
  const o = MTF.calcOperatorResult(S, res), N = o.N;
  const kpi = (l, v, s, c) => '<div class="kpi ' + (c || '') + '"><div class="lbl">' + l + '</div>' +
    '<div class="val">' + v + '</div>' + (s ? '<div class="sub">' + s + '</div>' : '') + '</div>';
  const who = o.payer === 'operator' ? 'весь штат (ФОТ с начислениями)'
    : o.payer === 'farm_only' ? 'только АУП комплекса' : 'ничего, штат на ферме';
  const rows = o.rows.map(r =>
    '<tr><td class="n">' + r.year + '</td><td class="n">' + f.num(r.fee * N) + '</td>' +
    '<td class="n">' + f.num(r.payroll * N) + '</td>' +
    '<td class="n ' + (r.result < 0 ? 'neg' : '') + '">' + f.num(r.result * N) + '</td>' +
    '<td class="n ' + (r.cumulative < 0 ? 'neg' : 'pos') + '"><b>' + f.num(r.cumulative * N) + '</b></td>' +
    '<td class="n">' + (o.payer === 'farm' || r.breakEvenPct === null ? '—' : f.pct(r.breakEvenPct, 1)) + '</td></tr>').join('');
  const feeNow = o.feeMode === 'revenue' ? f.pct(o.feeValue, 1) + ' выручки'
    : o.feeMode === 'ebitda' ? f.pct(o.feeValue, 1) + ' EBITDA' : f.num(o.feeValue) + ' тыс. ₸ в год';
  const be = o.payer === 'farm' ? '—' : f.pct(o.breakEven, 1);
  const beSub = o.payer === 'farm' ? 'ФОТ платит ферма'
    : 'с ' + o.capYear + ' г.: от ' + f.pct(o.breakEvenMin, 1) + ' до ' + f.pct(o.breakEvenMax, 1) + '; сейчас ' + feeNow;
  return '<div class="card" style="margin-top:14px"><h3>Результат оператора</h3>' +
    '<div class="hint" style="margin-top:0">Вознаграждение оператора минус ФОТ, который он платит. Оператор платит: ' + who + '. ' +
    'Проект в целом, ' + N + ' ферм, тыс. ₸. Показатель вне EBITDA, NPV и IRR фермы и в документы не выносится.</div>' +
    (o.payer !== 'farm' && o.feeMode !== 'revenue'
      ? '<div class="note warn">Вознаграждение задано не в % от выручки: при этом режиме оно зависит от EBITDA фермы, а она меняется вместе с тем, кто платит штат. Результат оператора недостоверен, задайте «% от выручки».</div>' : '') +
    '<div class="kpis" style="margin-bottom:10px">' +
    kpi('Результат на мощности (' + o.capYear + ' г.)', f.num(o.atCapacity.result * N), 'тыс. ₸ в год', o.atCapacity.result >= 0 ? 'good' : 'bad') +
    kpi('Накопленно к ' + o.last.year + ' г.', f.num(o.last.cumulative * N), 'тыс. ₸', o.last.cumulative >= 0 ? 'good' : 'bad') +
    kpi('Безубыточная доля оператора', be, beSub) + '</div>' +
    '<div class="tw"><table><thead><tr><th>Год</th><th>Вознаграждение</th><th>ФОТ оператора</th><th>Результат</th><th>Накопленно</th>' +
    '<th>Безубыточная доля</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<div class="hint">Безубыточная доля: какую долю выручки года должно составлять вознаграждение, чтобы покрыть ФОТ оператора. ' +
    'Растёт со временем, потому что затраты индексируются быстрее цен.</div></div>';
};

(function () {
  if (!MTF.renderFin) return;
  const orig = MTF.renderFin;
  const marker = '<div class="card" style="margin-top:14px"><h3>График погашения</h3>';
  MTF.renderFin = function (res) {
    const h = orig(res), card = MTF.renderOperatorCard(res);
    if (!card) return h;
    const i = h.indexOf(marker);
    return i < 0 ? h + card : h.slice(0, i) + card + h.slice(i);
  };
})();
