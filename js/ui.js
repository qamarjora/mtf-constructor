/* ============================================================
   ИНТЕРФЕЙС
   ============================================================ */

window.MTF = window.MTF || {};

/* ---------- Форматирование ---------- */
MTF.fmt = {
  num: function (v, d) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    return Number(v).toLocaleString('ru-RU', {
      minimumFractionDigits: d || 0, maximumFractionDigits: d || 0
    });
  },
  pct: function (v, d) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    return Number(v).toLocaleString('ru-RU', {
      minimumFractionDigits: d === undefined ? 1 : d,
      maximumFractionDigits: d === undefined ? 1 : d
    }) + '%';
  },
  x: function (v) { return v === null || isNaN(v) ? '—' : v.toFixed(1) + 'x'; }
};

/* ---------- Состояние ---------- */
MTF.state = null;

MTF.initState = function () {
  return {
    params: JSON.parse(JSON.stringify(MTF.defaults)),
    capexItems: JSON.parse(JSON.stringify(MTF.capexItems)),
    staff: JSON.parse(JSON.stringify(MTF.staff)),
    opexItems: JSON.parse(JSON.stringify(MTF.opexItems)),
    subsidies: JSON.parse(JSON.stringify(MTF.subsidies)),
    docSections: JSON.parse(JSON.stringify(MTF.docSections)),
    version: MTF.VERSION
  };
};

/* ---------- Помощники разметки ---------- */
function field(label, path, unit, type, options) {
  const v = MTF.get(path);
  if (type === 'select') {
    return '<div class="f wide"><label>' + label + '</label><select data-p="' + path + '">' +
      options.map(o => '<option value="' + o[0] + '"' + (o[0] === v ? ' selected' : '') + '>' + o[1] + '</option>').join('') +
      '</select></div>';
  }
  const t = type === 'text' ? 'text' : 'number';
  return '<div class="f"><label>' + label + '</label>' +
    '<input type="' + t + '" data-p="' + path + '" value="' + v + '" step="any">' +
    '<span class="u">' + (unit || '') + '</span></div>';
}

MTF.get = function (path) {
  return path.split('.').reduce((o, k) => o[k], MTF.state.params);
};
MTF.set = function (path, val) {
  const ks = path.split('.');
  const last = ks.pop();
  const o = ks.reduce((a, k) => a[k], MTF.state.params);
  o[last] = val;
};

/* ---------- Вкладка 1: Вводные ---------- */
MTF.renderInputs = function () {
  const P = MTF.state.params;
  return '<div class="grid g2">' +

    '<div class="card"><h3>Проект</h3>' +
    field('Название', 'project.name', '', 'text') +
    field('Область', 'project.region', '', 'text') +
    field('Район', 'project.district', '', 'text') +
    field('Оператор', 'project.operator', '', 'text') +
    field('Количество ферм', 'project.farmsCount', 'ед') +
    field('Год старта', 'project.startYear', '') +
    field('Горизонт расчёта', 'project.horizon', 'лет') +
    '</div>' +

    '<div class="card"><h3>Ёмкость комплекса</h3>' +
    field('Коровник (дойные)', 'capacity.cowPlaces', 'мест') +
    field('Родильно-сухостойный', 'capacity.dryPlaces', 'мест') +
    field('Телятник', 'capacity.calfPlaces', 'мест') +
    field('Ремонтный молодняк', 'capacity.heiferPlaces', 'мест') +
    field('Откорм бычков', 'capacity.bullPlaces', 'мест') +
    '<div class="hint">Фуражное поголовье = дойные + сухостой = <b>' +
    (P.capacity.cowPlaces + P.capacity.dryPlaces) + '</b> гол.</div>' +
    '</div>' +

    '<div class="card"><h3>Стартовое стадо</h3>' +
    field('Нетелей на старте', 'herd.startHeifers', 'гол') +
    field('Партий завоза', 'herd.batches', 'шт') +
    field('Интервал между партиями', 'herd.batchInterval', 'мес') +
    field('Доля первой партии', 'herd.firstBatchShare', '%') +
    field('Цена нетели', 'herd.heiferPrice', 'т.₸') +
    field('Стельность при завозе', 'herd.gestationOnArrival', 'мес') +
    field('Порода', 'herd.breed', '', 'text') +
    field('Источник', 'herd.source', '', 'select',
      [['Импорт', 'Импорт'], ['Казахстан', 'Казахстан'], ['Россия', 'Россия']]) +
    '</div>' +

    '<div class="card"><h3>Продуктивность и воспроизводство</h3>' +
    field('Удой на фуражную корову', 'production.milkYield', 'л/год') +
    field('Выход телят на 100 коров', 'production.calvingRate', 'гол') +
    field('Выбраковка', 'production.cullRate', '%/год') +
    field('Падёж телят', 'production.calfMortality', '%') +
    field('Падёж молодняка', 'production.heiferMortality', '%') +
    field('Дней сухостоя', 'production.dryDays', 'дн') +
    field('Доля тёлочек в приплоде', 'production.heiferShare', '%') +
    field('Возраст первого отёла', 'production.firstCalvingMo', 'мес') +
    field('Возраст продажи телят', 'production.calfSaleAgeMo', 'мес') +
    '<h4>Сценарии</h4>' +
    field('Ремонт стада', 'production.remontMode', '', 'select',
      [['own', 'Свой молодняк'], ['purchase', 'Покупка нетелей'], ['outsource', 'Сторонняя площадка']]) +
    field('Бычки', 'production.bullMode', '', 'select',
      [['sell_calf', 'Продажа телятами'], ['rearing', 'Доращивание'], ['fatten', 'Полный откорм']]) +
    field('Возраст сдачи бычков', 'production.fattenAgeMo', 'мес') +
    field('Живой вес при сдаче', 'production.fattenWeightKg', 'кг') +
    '</div>' +

    '<div class="card"><h3>Корма</h3>' +
    field('Источник кормов', 'feed.mode', '', 'select',
      [['purchase', 'Покупные'], ['own', 'Своя кормовая база']]) +
    field('СВ на корову', 'feed.dmCow', 'кг/сут') +
    field('СВ на тёлку', 'feed.dmHeifer', 'кг/сут') +
    field('СВ на телёнка', 'feed.dmCalf', 'кг/сут') +
    field('СВ на бычка', 'feed.dmBull', 'кг/сут') +
    field('Цена рациона дойных', 'feed.dmPriceCow', '₸/кг') +
    field('Цена рациона молодняка', 'feed.dmPriceYoung', '₸/кг') +
    field('Пашня под корма', 'feed.landHa', 'га') +
    field('Себестоимость га', 'feed.landCostPerHa', '₸/га') +
    '</div>' +

    '<div class="card"><h3>Цены реализации</h3>' +
    field('Молоко', 'prices.milk', '₸/л') +
    field('Телёнок', 'prices.calf', 'т.₸') +
    field('Выбракованная корова', 'prices.cullCow', 'т.₸') +
    field('Бычок, живой вес', 'prices.bullKg', '₸/кг') +
    field('Рост цен реализации', 'prices.priceInflation', '%/год') +
    field('Рост затрат', 'prices.costInflation', '%/год') +
    '</div>' +

    '</div>';
};

/* ---------- Вкладка 2: Стадо ---------- */
MTF.renderHerd = function (res) {
  const f = MTF.fmt, C = MTF.state.params.capacity;
  const last = res.herd[res.herd.length - 1];
  const peak = res.herd.reduce((a, y) => Math.max(a, y.cows), 0);

  function bar(label, cur, cap) {
    const pctv = cap > 0 ? cur / cap * 100 : (cur > 0 ? 999 : 0);
    const cls = pctv > 100 ? 'over' : pctv > 90 ? 'near' : '';
    return '<div class="cap"><div class="top"><span>' + label + '</span>' +
      '<b>' + f.num(cur) + ' / ' + f.num(cap) + '</b></div>' +
      '<div class="bar"><i class="' + cls + '" style="width:' + Math.min(100, pctv) + '%"></i></div></div>';
  }

  const warn = res.herd.filter(y => y.warnings.length);
  let warnHtml = '';
  if (warn.length) {
    const all = [...new Set(warn.flatMap(y => y.warnings))];
    warnHtml = '<div class="note err"><b>Не хватает скотомест.</b><br>' +
      all.slice(0, 6).map(w => '• ' + w).join('<br>') + '</div>';
  } else {
    warnHtml = '<div class="note ok">Поголовье помещается в проектную ёмкость на всём горизонте.</div>';
  }

  const rows = res.herd.map(y =>
    '<tr><td class="n">' + y.year + '</td>' +
    '<td class="n">' + f.num(y.cows) + '</td>' +
    '<td class="n">' + f.num(y.milking) + '</td>' +
    '<td class="n">' + f.num(y.dry) + '</td>' +
    '<td class="n">' + f.num(y.calves) + '</td>' +
    '<td class="n">' + f.num(y.heifers) + '</td>' +
    '<td class="n">' + f.num(y.bulls) + '</td>' +
    '<td class="n"><b>' + f.num(y.total) + '</b></td>' +
    '<td class="n">' + f.num(y.milkLiters / 1000) + '</td>' +
    '<td class="n">' + f.num(y.milkPerCow) + '</td>' +
    '<td class="n">' + f.num(y.calvesSold) + '</td>' +
    '<td class="n">' + f.num(y.cullSold) + '</td>' +
    '<td class="n">' + f.num(y.heifersPurchased) + '</td></tr>').join('');

  return warnHtml +
    '<div class="grid g2"><div class="card"><h3>Контроль скотомест на пике</h3>' +
    bar('Дойные', peak * 0.83, C.cowPlaces) +
    bar('Сухостой', peak * 0.17, C.dryPlaces) +
    bar('Телята', last.calves, C.calfPlaces) +
    bar('Ремонтный молодняк', last.heifers, C.heiferPlaces) +
    bar('Бычки на откорме', last.bulls, C.bullPlaces) +
    '<div class="hint">Красная полоса означает, что поголовье превышает вместимость. ' +
    'Либо добавьте места, либо смените сценарий ремонта стада.</div></div>' +

    '<div class="card"><h3>Баланс воспроизводства</h3>' +
    '<div class="kpis">' +
    '<div class="kpi"><div class="lbl">Фуражное на конец</div><div class="val">' + f.num(last.cows) + '</div></div>' +
    '<div class="kpi"><div class="lbl">Нужно нетелей в год</div><div class="val">' +
    f.num(last.cows * MTF.state.params.production.cullRate / 100) + '</div></div>' +
    '<div class="kpi"><div class="lbl">Валовой надой</div><div class="val">' +
    f.num(last.milkLiters / 1000) + '</div><div class="sub">тонн в год</div></div>' +
    '<div class="kpi"><div class="lbl">Общее поголовье</div><div class="val">' + f.num(last.total) + '</div></div>' +
    '</div></div></div>' +

    '<div class="card" style="margin-top:16px"><h3>Движение поголовья по годам</h3><div class="tw"><table>' +
    '<thead><tr><th>Год</th><th>Фураж.</th><th>Дойные</th><th>Сухост.</th><th>Телята</th>' +
    '<th>Молодн.</th><th>Бычки</th><th>Всего</th><th>Надой, т</th><th>л/фур.гол</th>' +
    '<th>Прод. телят</th><th>Выбрак.</th><th>Докуп нет.</th></tr></thead><tbody>' +
    rows + '</tbody></table></div></div>';
};

/* ---------- Вкладка 3: Экономика ---------- */
MTF.renderEcon = function (res) {
  const f = MTF.fmt;
  const cap = res.capex;

  const capexRows = cap.rows.map((r, i) =>
    '<tr><td>' + r.name + '</td><td class="n">' + f.num(r.sum) + '</td>' +
    '<td>' + ({ prep: 'Подготовка', build: 'Строительство', equip: 'Оборудование', herd: 'Поголовье' })[r.group] + '</td>' +
    '<td><input type="number" data-capex="' + r.id + '" value="' +
    MTF.state.capexItems.find(c => c.id === r.id).value + '" step="any" style="width:90px"></td></tr>').join('');

  const staffRows = MTF.state.staff.map((s, i) =>
    '<tr><td>' + s.name + '</td>' +
    '<td><input type="number" data-staff="' + i + '" data-fld="count" value="' + s.count + '" style="width:60px"></td>' +
    '<td><input type="number" data-staff="' + i + '" data-fld="salary" value="' + s.salary + '" style="width:80px"></td>' +
    '<td class="n">' + f.num(s.count * s.salary * 12) + '</td>' +
    '<td><button class="del" data-delstaff="' + i + '">×</button></td></tr>').join('');

  const pr = MTF.calcPayroll(MTF.state.staff);

  const pnlRows = res.pnl.map(y =>
    '<tr><td class="n">' + y.year + '</td>' +
    '<td class="n">' + f.num(y.revenue) + '</td>' +
    '<td class="n pos">' + f.num(y.subsidy) + '</td>' +
    '<td class="n">' + f.num(y.opex) + '</td>' +
    '<td class="n">' + f.num(y.operatorFee) + '</td>' +
    '<td class="n ' + (y.ebitda < 0 ? 'neg' : '') + '"><b>' + f.num(y.ebitda) + '</b></td>' +
    '<td class="n ' + (y.margin < 0 ? 'neg' : '') + '">' + f.pct(y.margin, 0) + '</td>' +
    '<td class="n">' + f.num(y.milkCost, 1) + '</td></tr>').join('');

  const y5 = res.pnl[Math.min(4, res.pnl.length - 1)];
  const opexDetail = Object.entries(y5.opexDetail)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => '<tr><td>' + k + '</td><td class="n">' + f.num(v) + '</td>' +
      '<td class="n">' + f.pct(v / y5.opex * 100, 1) + '</td></tr>').join('');

  return '<div class="grid g2">' +
    '<div class="card"><h3>Капитальные затраты</h3>' +
    '<div class="tw"><table><thead><tr><th>Статья</th><th>Сумма, т.₸</th><th>Группа</th><th>Ставка</th></tr></thead>' +
    '<tbody>' + capexRows +
    '<tr class="sub"><td>Резерв ' + MTF.capexReserve + '%</td><td class="n">' + f.num(cap.reserve) + '</td><td></td><td></td></tr>' +
    '<tr class="tot"><td>Итого</td><td class="n">' + f.num(cap.total) + '</td><td></td><td></td></tr>' +
    '</tbody></table></div>' +
    '<div class="hint">Ставка — цена за единицу: сумма, за скотоместо или за голову. Меняется прямо в таблице.</div></div>' +

    '<div class="card"><h3>Штатное расписание</h3>' +
    '<div class="tw"><table><thead><tr><th>Должность</th><th>Кол-во</th><th>Оклад, т.₸</th><th>В год</th><th></th></tr></thead>' +
    '<tbody>' + staffRows +
    '<tr class="tot"><td>ФОТ на руки</td><td></td><td></td><td class="n">' + f.num(pr.net) + '</td><td></td></tr>' +
    '<tr class="sub"><td>С начислениями ' + MTF.payrollTaxRate + '%</td><td></td><td></td><td class="n">' + f.num(pr.gross) + '</td><td></td></tr>' +
    '</tbody></table></div>' +
    '<button class="btn" id="addStaff" style="margin-top:10px">Добавить должность</button></div>' +
    '</div>' +

    '<div class="card" style="margin-top:16px"><h3>Прогноз финансовых показателей</h3><div class="tw"><table>' +
    '<thead><tr><th>Год</th><th>Выручка</th><th>Субсидии</th><th>Затраты</th><th>Оператор</th>' +
    '<th>EBITDA</th><th>Маржа</th><th>Себест. л, ₸</th></tr></thead><tbody>' + pnlRows +
    '</tbody></table></div><div class="hint">Суммы в тыс. тенге.</div></div>' +

    '<div class="card" style="margin-top:16px"><h3>Структура затрат, ' + y5.year + ' год</h3><div class="tw"><table>' +
    '<thead><tr><th>Статья</th><th>Сумма, т.₸</th><th>Доля</th></tr></thead><tbody>' + opexDetail +
    '<tr class="tot"><td>Итого</td><td class="n">' + f.num(y5.opex) + '</td><td class="n">100%</td></tr>' +
    '</tbody></table></div></div>';
};

/* ---------- Вкладка 4: Субсидии ---------- */
MTF.renderSubsidies = function (res) {
  const f = MTF.fmt;
  const conflicts = res.conflicts;

  let head = '';
  if (conflicts.length) {
    head = conflicts.map(c => '<div class="note warn">' + c.text + '</div>').join('');
  }

  const total = res.pnl.reduce((a, y) => a + y.subsidy, 0);
  head += '<div class="note ok">Включённые меры дают <b>' + f.num(total) +
    ' тыс. ₸</b> за весь горизонт. Выключите или включите строки, чтобы подобрать рабочую комбинацию.</div>';

  const rows = MTF.state.subsidies.map((s, i) =>
    '<div class="sub-row' + (s.enabled ? '' : ' off') + '">' +
    '<input type="checkbox" data-sub="' + i + '"' + (s.enabled ? ' checked' : '') + '>' +
    '<div><div class="nm">' + s.name +
    '<span class="tag ' + s.status + '">' +
    ({ check: 'проверить', confirmed: 'подтверждено', draft: 'черновик' })[s.status] + '</span></div>' +
    '<div class="meta">Условие: ' + (s.condition || '—') + '<br>' +
    'Период: годы ' + s.yearFrom + '–' + s.yearTo +
    (s.conflictsWith && s.conflictsWith.length ? ' · не совмещается с другими мерами по молоку' : '') + '</div>' +
    '<textarea class="cmt" rows="1" data-cmt="' + i + '" placeholder="Комментарий проверяющего">' +
    (s.comment || '') + '</textarea></div>' +
    '<div class="rate"><input type="number" data-subval="' + i + '" value="' + s.value + '" step="any">' +
    '<span class="u" style="font-size:11px;color:var(--ink-3)">' + s.unit + '</span></div>' +
    '</div>').join('');

  const byYear = res.pnl.map(y =>
    '<tr><td class="n">' + y.year + '</td><td class="n pos">' + f.num(y.subsidy) + '</td>' +
    '<td class="n">' + f.pct(y.revenue > 0 ? y.subsidy / y.revenue * 100 : 0, 0) + '</td></tr>').join('');

  return head +
    '<div class="row"><button class="btn" id="addSub">Добавить меру поддержки</button>' +
    '<button class="btn" id="allOn">Включить все</button>' +
    '<button class="btn" id="allOff">Выключить все</button></div>' +
    rows +
    '<div class="card" style="margin-top:16px"><h3>Поступление субсидий по годам</h3>' +
    '<div class="tw"><table><thead><tr><th>Год</th><th>Субсидии, т.₸</th><th>% к выручке</th></tr></thead>' +
    '<tbody>' + byYear + '</tbody></table></div></div>';
};

/* ---------- Вкладка 5: Финансирование ---------- */
MTF.renderFin = function (res) {
  const f = MTF.fmt, m = res.metrics, fd = res.funding;

  const kpi = (lbl, val, sub, cls) =>
    '<div class="kpi ' + (cls || '') + '"><div class="lbl">' + lbl + '</div><div class="val">' + val + '</div>' +
    (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>';

  const gap = res.cf.gapYear
    ? '<div class="note err"><b>Кассовый разрыв в ' + res.cf.gapYear + ' году.</b> ' +
      'Минимальный остаток ' + f.num(res.cf.minCash) + ' тыс. ₸. Нужен оборотный кредит или больше собственных средств.</div>'
    : '<div class="note ok">Кассовых разрывов нет. Минимальный остаток ' + f.num(res.cf.minCash) + ' тыс. ₸.</div>';

  const dscrBad = m.minDscr < 1.2 && isFinite(m.minDscr)
    ? '<div class="note warn">Минимальный DSCR ' + m.minDscr.toFixed(2) +
      '. Кредиторы обычно требуют не ниже 1,2.</div>' : '';

  const debtRows = res.debt.map(d =>
    '<tr><td class="n">' + d.year + '</td><td class="n">' + f.num(d.opening) + '</td>' +
    '<td class="n">' + f.num(d.interest) + '</td><td class="n">' + f.num(d.principal) + '</td>' +
    '<td class="n"><b>' + f.num(d.payment) + '</b></td><td class="n">' + f.num(d.closing) + '</td>' +
    '<td class="n">' + (m.dscr[d.idx].value ? m.dscr[d.idx].value.toFixed(2) : '—') + '</td></tr>').join('');

  const cfRows = res.cf.rows.map(r =>
    '<tr><td class="n">' + r.year + '</td>' +
    '<td class="n ' + (r.operating < 0 ? 'neg' : '') + '">' + f.num(r.operating) + '</td>' +
    '<td class="n">' + f.num(r.invest) + '</td>' +
    '<td class="n">' + f.num(r.financing) + '</td>' +
    '<td class="n ' + (r.net < 0 ? 'neg' : '') + '">' + f.num(r.net) + '</td>' +
    '<td class="n ' + (r.cumulative < 0 ? 'neg' : 'pos') + '"><b>' + f.num(r.cumulative) + '</b></td></tr>').join('');

  const exitRows = m.exits.map(e =>
    '<tr><td class="n">' + e.year + '</td><td class="n">' + f.x(e.moic) + '</td>' +
    '<td class="n ' + (e.irr !== null && e.irr < 0 ? 'neg' : '') + '">' +
    (e.irr !== null ? f.pct(e.irr * 100) : '—') + '</td>' +
    '<td class="n">' + f.num(e.equityValue) + '</td></tr>').join('');

  const N = MTF.state.params.project.farmsCount;

  return gap + dscrBad +
    '<div class="kpis" style="margin-bottom:16px">' +
    kpi('Стоимость проекта', f.num(res.capex.total), 'тыс. ₸') +
    kpi('Собственное участие', f.num(fd.equity), f.pct(fd.equityShare, 0)) +
    kpi('Лимит займа', f.num(fd.loanTotal), f.pct(fd.loanShare, 0)) +
    kpi('NPV', f.num(m.npv), 'при ставке ' + MTF.state.params.finance.wacc + '%', m.npv > 0 ? 'good' : 'bad') +
    kpi('IRR проекта', m.irr !== null ? f.pct(m.irr * 100) : '—', '',
      m.irr !== null && m.irr * 100 > MTF.state.params.finance.wacc ? 'good' : 'bad') +
    kpi('Окупаемость', m.payback ? m.payback.toFixed(1) : '—', 'лет') +
    kpi('Дисконт. окупаемость', m.discountedPayback ? m.discountedPayback.toFixed(1) : '—', 'лет') +
    kpi('Мин. DSCR', isFinite(m.minDscr) ? m.minDscr.toFixed(2) : '—', '', m.minDscr >= 1.2 ? 'good' : 'bad') +
    '</div>' +

    '<div class="grid g2"><div class="card"><h3>Параметры финансирования</h3>' +
    field('Ставка вознаграждения', 'finance.rate', '%') +
    field('Срок займа', 'finance.termYears', 'лет') +
    field('Льготный период', 'finance.graceYears', 'лет') +
    field('Финансирование стройки', 'finance.financeShareBuild', '%') +
    field('Финансирование оборудования', 'finance.financeShareEquip', '%') +
    field('Финансирование поголовья', 'finance.financeShareHerd', '%') +
    field('Ставка дисконтирования', 'finance.wacc', '%') +
    '<h4>Вознаграждение оператора</h4>' +
    field('База', 'finance.operatorFeeMode', '', 'select',
      [['revenue', '% от выручки'], ['ebitda', '% от EBITDA'], ['fixed', 'Фикс в год, т.₸']]) +
    field('Значение', 'finance.operatorFeeValue', '') +
    '</div>' +

    '<div class="card"><h3>Консолидация по проекту</h3><div class="tw"><table>' +
    '<thead><tr><th>Показатель</th><th>1 ферма</th><th>' + N + ' ферм</th></tr></thead><tbody>' +
    '<tr><td>Стоимость проекта</td><td class="n">' + f.num(res.capex.total) + '</td><td class="n">' + f.num(res.capex.total * N) + '</td></tr>' +
    '<tr><td>Собственное участие</td><td class="n">' + f.num(fd.equity) + '</td><td class="n">' + f.num(fd.equity * N) + '</td></tr>' +
    '<tr><td>Лимит займа</td><td class="n">' + f.num(fd.loanTotal) + '</td><td class="n">' + f.num(fd.loanTotal * N) + '</td></tr>' +
    '<tr><td>NPV</td><td class="n">' + f.num(m.npv) + '</td><td class="n">' + f.num(m.npv * N) + '</td></tr>' +
    '<tr><td>Валовой надой, т/год</td><td class="n">' + f.num(res.herd[res.herd.length - 1].milkLiters / 1000) +
    '</td><td class="n">' + f.num(res.herd[res.herd.length - 1].milkLiters / 1000 * N) + '</td></tr>' +
    '<tr class="tot"><td>Фуражное поголовье</td><td class="n">' + f.num(res.herd[res.herd.length - 1].cows) +
    '</td><td class="n">' + f.num(res.herd[res.herd.length - 1].cows * N) + '</td></tr>' +
    '</tbody></table></div></div></div>' +

    '<div class="card" style="margin-top:16px"><h3>График погашения</h3><div class="tw"><table>' +
    '<thead><tr><th>Год</th><th>Остаток на начало</th><th>Проценты</th><th>Основной долг</th>' +
    '<th>Платёж</th><th>Остаток на конец</th><th>DSCR</th></tr></thead><tbody>' + debtRows + '</tbody></table></div></div>' +

    '<div class="card" style="margin-top:16px"><h3>Движение денежных средств</h3><div class="tw"><table>' +
    '<thead><tr><th>Год</th><th>Операционный</th><th>Инвестиционный</th><th>Финансовый</th>' +
    '<th>Чистый</th><th>Накопленный</th></tr></thead><tbody>' + cfRows + '</tbody></table></div></div>' +

    '<div class="card" style="margin-top:16px"><h3>Доходность на вложения инвестора</h3><div class="tw"><table>' +
    '<thead><tr><th>Год выхода</th><th>MOIC</th><th>IRR на вложения</th><th>Стоимость доли, т.₸</th></tr></thead>' +
    '<tbody>' + exitRows + '</tbody></table></div>' +
    '<div class="hint">Расчёт при условном выходе из проекта: накопленные потоки плюс остаточная стоимость активов за вычетом долга.</div></div>';
};

/* ---------- Вкладка 6: Документ ---------- */
MTF.docTables = function (state, res) {
  const f = MTF.fmt, m = res.metrics, fd = res.funding;
  const t = rows => '<table>' + rows + '</table>';

  return {
    metricsTable: t(
      '<tr><th>Показатель</th><th>Ед.</th><th>Значение</th></tr>' +
      '<tr><td>Стоимость проекта</td><td>тыс. ₸</td><td class="n">' + f.num(res.capex.total) + '</td></tr>' +
      '<tr><td>Собственное участие</td><td>тыс. ₸</td><td class="n">' + f.num(fd.equity) + '</td></tr>' +
      '<tr><td>Лимит займа</td><td>тыс. ₸</td><td class="n">' + f.num(fd.loanTotal) + '</td></tr>' +
      '<tr><td>Доля займа</td><td>%</td><td class="n">' + f.pct(fd.loanShare, 0) + '</td></tr>' +
      '<tr><td>Ставка дисконтирования</td><td>%</td><td class="n">' + f.pct(MTF.state.params.finance.wacc, 1) + '</td></tr>' +
      '<tr><td>NPV</td><td>тыс. ₸</td><td class="n">' + f.num(m.npv) + '</td></tr>' +
      '<tr><td>IRR проекта</td><td>%</td><td class="n">' + (m.irr !== null ? f.pct(m.irr * 100) : '—') + '</td></tr>' +
      '<tr><td>Простая окупаемость</td><td>лет</td><td class="n">' + (m.payback ? m.payback.toFixed(1) : '—') + '</td></tr>' +
      '<tr><td>Дисконтированная окупаемость</td><td>лет</td><td class="n">' + (m.discountedPayback ? m.discountedPayback.toFixed(1) : '—') + '</td></tr>'
    ),
    fundingTable: t(
      '<tr><th>Статья</th><th>Сумма, тыс. ₸</th></tr>' +
      '<tr><td>Подготовительные расходы</td><td class="n">' + f.num(res.capex.groups.prep) + '</td></tr>' +
      '<tr><td>Строительство</td><td class="n">' + f.num(res.capex.groups.build) + '</td></tr>' +
      '<tr><td>Оборудование и техника</td><td class="n">' + f.num(res.capex.groups.equip) + '</td></tr>' +
      '<tr><td>Закуп поголовья</td><td class="n">' + f.num(res.capex.groups.herd) + '</td></tr>' +
      '<tr><td><b>Итого стоимость проекта</b></td><td class="n"><b>' + f.num(res.capex.total) + '</b></td></tr>' +
      '<tr><td>Лимит займа</td><td class="n">' + f.num(fd.loanTotal) + '</td></tr>' +
      '<tr><td>Собственное участие</td><td class="n">' + f.num(fd.equity) + '</td></tr>'
    ),
    pnlTable: t(
      '<tr><th>Год</th><th>Фураж. гол.</th><th>Надой, т</th><th>Выручка</th><th>Субсидии</th><th>EBITDA</th><th>Маржа</th></tr>' +
      res.pnl.map((y, i) =>
        '<tr><td>' + y.year + '</td><td class="n">' + f.num(res.herd[i].cows) + '</td>' +
        '<td class="n">' + f.num(res.herd[i].milkLiters / 1000) + '</td>' +
        '<td class="n">' + f.num(y.revenue) + '</td><td class="n">' + f.num(y.subsidy) + '</td>' +
        '<td class="n">' + f.num(y.ebitda) + '</td><td class="n">' + f.pct(y.margin, 0) + '</td></tr>').join('')
    ),
    exitTable: t(
      '<tr><th>Год выхода</th><th>MOIC</th><th>IRR на вложения</th></tr>' +
      m.exits.map(e => '<tr><td>' + e.year + '</td><td class="n">' + f.x(e.moic) + '</td>' +
        '<td class="n">' + (e.irr !== null ? f.pct(e.irr * 100) : '—') + '</td></tr>').join('')
    ),
    subsidyTable: t(
      '<tr><th>Мера поддержки</th><th>Ставка</th><th>Период</th></tr>' +
      MTF.state.subsidies.filter(s => s.enabled).map(s =>
        '<tr><td>' + s.name + '</td><td class="n">' + f.num(s.value, 1) + ' ' + s.unit +
        '</td><td>годы ' + s.yearFrom + '–' + s.yearTo + '</td></tr>').join('')
    )
  };
};

MTF.renderDocTab = function (res) {
  const secs = MTF.renderDoc(MTF.state, res);
  const list = MTF.state.docSections.map((s, i) =>
    '<label><input type="checkbox" data-sec="' + i + '"' + (s.enabled ? ' checked' : '') + '> ' + s.title + '</label>').join('');

  const prev = secs.map(s => '<h2>' + s.title + '</h2><pre>' + s.body + '</pre>').join('');

  return '<div class="row no-print">' +
    '<button class="btn pri" id="expWord">Скачать Word</button>' +
    '<button class="btn" id="expPdf">Печать / PDF</button>' +
    '<button class="btn" id="expCsv">Таблицы в CSV</button>' +
    '<button class="btn" id="editTpl">Править шаблоны</button></div>' +
    '<div class="doc-wrap"><div class="card doc-list no-print"><h3>Разделы</h3>' + list +
    '<div class="hint">Кнопка «Править шаблоны» открывает текст разделов для редактирования. ' +
    'Значения в фигурных скобках подставляются из расчёта.</div></div>' +
    '<div class="doc-prev" id="docPrev">' + prev + '</div></div>';
};

/* ---------- Главный рендер ---------- */
MTF.tabs = [
  { id: 'inputs', name: 'Вводные' },
  { id: 'herd', name: 'Стадо' },
  { id: 'econ', name: 'Экономика' },
  { id: 'subs', name: 'Субсидии' },
  { id: 'fin', name: 'Финансирование' },
  { id: 'doc', name: 'Документ' }
];
MTF.activeTab = 'inputs';

MTF.render = function () {
  const res = MTF.runModel(MTF.state);
  MTF.lastResult = res;

  document.getElementById('nav').innerHTML = MTF.tabs.map((t, i) =>
    '<button data-tab="' + t.id + '" class="' + (t.id === MTF.activeTab ? 'on' : '') + '">' +
    '<span class="n">' + String(i + 1).padStart(2, '0') + '</span>' + t.name + '</button>').join('');

  const map = {
    inputs: MTF.renderInputs,
    herd: MTF.renderHerd,
    econ: MTF.renderEcon,
    subs: MTF.renderSubsidies,
    fin: MTF.renderFin,
    doc: MTF.renderDocTab
  };
  document.getElementById('main').innerHTML =
    '<div class="panel on">' + map[MTF.activeTab](res) + '</div>';

  MTF.bind();
};

/* ---------- События ---------- */
MTF.bind = function () {
  document.querySelectorAll('#nav button').forEach(b =>
    b.onclick = () => { MTF.activeTab = b.dataset.tab; MTF.render(); });

  document.querySelectorAll('[data-p]').forEach(el => {
    el.onchange = () => {
      const v = el.type === 'number' ? parseFloat(el.value) || 0 : el.value;
      MTF.set(el.dataset.p, v);
      MTF.save();
      MTF.render();
    };
  });

  document.querySelectorAll('[data-capex]').forEach(el => {
    el.onchange = () => {
      const it = MTF.state.capexItems.find(c => c.id === el.dataset.capex);
      it.value = parseFloat(el.value) || 0;
      MTF.save(); MTF.render();
    };
  });

  document.querySelectorAll('[data-staff]').forEach(el => {
    el.onchange = () => {
      MTF.state.staff[el.dataset.staff][el.dataset.fld] = parseFloat(el.value) || 0;
      MTF.save(); MTF.render();
    };
  });
  document.querySelectorAll('[data-delstaff]').forEach(el => {
    el.onclick = () => {
      MTF.state.staff.splice(+el.dataset.delstaff, 1);
      MTF.save(); MTF.render();
    };
  });
  const addS = document.getElementById('addStaff');
  if (addS) addS.onclick = () => {
    const n = prompt('Название должности');
    if (n) { MTF.state.staff.push({ id: 'c' + Date.now(), name: n, count: 1, salary: 400 }); MTF.save(); MTF.render(); }
  };

  document.querySelectorAll('[data-sub]').forEach(el => {
    el.onchange = () => {
      MTF.state.subsidies[el.dataset.sub].enabled = el.checked;
      MTF.save(); MTF.render();
    };
  });
  document.querySelectorAll('[data-subval]').forEach(el => {
    el.onchange = () => {
      MTF.state.subsidies[el.dataset.subval].value = parseFloat(el.value) || 0;
      MTF.save(); MTF.render();
    };
  });
  document.querySelectorAll('[data-cmt]').forEach(el => {
    el.onchange = () => { MTF.state.subsidies[el.dataset.cmt].comment = el.value; MTF.save(); };
  });

  const on = document.getElementById('allOn'), off = document.getElementById('allOff');
  if (on) on.onclick = () => { MTF.state.subsidies.forEach(s => s.enabled = true); MTF.save(); MTF.render(); };
  if (off) off.onclick = () => { MTF.state.subsidies.forEach(s => s.enabled = false); MTF.save(); MTF.render(); };

  const addSub = document.getElementById('addSub');
  if (addSub) addSub.onclick = () => MTF.addSubsidy();

  document.querySelectorAll('[data-sec]').forEach(el => {
    el.onchange = () => {
      MTF.state.docSections[el.dataset.sec].enabled = el.checked;
      MTF.save(); MTF.render();
    };
  });

  ['expWord', 'expPdf', 'expCsv', 'editTpl'].forEach(id => {
    const b = document.getElementById(id);
    if (b) b.onclick = () => MTF.export[id]();
  });
};

MTF.addSubsidy = function () {
  const name = prompt('Название меры поддержки');
  if (!name) return;
  const type = prompt('Тип: per_liter / per_head / capex_pct / fixed_year / rate_sub', 'per_liter');
  const value = parseFloat(prompt('Ставка', '0')) || 0;
  MTF.state.subsidies.push({
    id: 's' + Date.now(), name: name, type: type, value: value,
    unit: type === 'per_liter' ? '₸/л' : type === 'capex_pct' ? '%' : 'т.₸',
    base: 'build', yearFrom: 1, yearTo: MTF.state.params.project.horizon,
    condition: '', conflictsWith: [], enabled: true, status: 'draft', comment: ''
  });
  MTF.save(); MTF.render();
};

/* ---------- Сохранение ---------- */
MTF.save = function () {
  try { sessionStorage.setItem('mtf', JSON.stringify(MTF.state)); } catch (e) { }
};
MTF.load = function () {
  try {
    const s = sessionStorage.getItem('mtf');
    if (s) return JSON.parse(s);
  } catch (e) { }
  return null;
};

/* ---------- Старт ---------- */
window.addEventListener('DOMContentLoaded', function () {
  MTF.state = MTF.load() || MTF.initState();
  document.getElementById('ver').textContent = 'v' + MTF.VERSION;
  document.getElementById('btnSave').onclick = () => MTF.export.saveJson();
  document.getElementById('btnLoad').onclick = () => MTF.export.loadJson();
  document.getElementById('btnReset').onclick = () => {
    if (confirm('Сбросить все данные к значениям по умолчанию?')) {
      MTF.state = MTF.initState(); MTF.save(); MTF.render();
    }
  };
  MTF.render();
});
