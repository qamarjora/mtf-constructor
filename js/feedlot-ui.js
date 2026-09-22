/* ============================================================
   ОТКОРМ БЫЧКОВ — ИНТЕРФЕЙС
   Переключатель «МТФ / Откорм», свои вкладки «Вводные» и
   «Площадка», адаптация вкладок «Экономика» и «Финансирование».

   Модуль самодостаточный: подключается ПОСЛЕДНИМ, после prep.js.
   ui.js, machinery.js и prep.js не трогает — только оборачивает.
   В режиме МТФ все функции работают как раньше.
   ============================================================ */

window.MTF = window.MTF || {};

(function () {
  if (!MTF.renderInputs || !MTF.feedlot) return;

  const FL = MTF.feedlot;
  const isF = () => MTF.isFeedlot(MTF.state && MTF.state.params);
  const clone = o => JSON.parse(JSON.stringify(o));
  const f = MTF.fmt;
  const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

  /* ---------- Состояние ----------
     params.project.type — тип проекта.
     params.feedlot      — вводные откорма.
     params.stash        — справочники неактивного типа (капзатраты, штат,
                           расходы, субсидии), чтобы переключение туда-обратно
                           ничего не теряло. Лежит в params, потому что params
                           переживает и обновление страницы, и открытие .json. */
  function deepMerge(base, over) {
    const out = clone(base);
    Object.keys(over || {}).forEach(k => {
      const b = out[k], o = over[k];
      out[k] = (b && o && typeof b === 'object' && !Array.isArray(b) && typeof o === 'object' && !Array.isArray(o))
        ? deepMerge(b, o) : o;
    });
    return out;
  }

  FL.ensure = function (st) {
    if (!st || !st.params) return st;
    const P = st.params;
    if (!P.project.type) P.project.type = 'mtf';
    P.feedlot = deepMerge(FL.defaults, P.feedlot || {});
    if (!P.stash || typeof P.stash !== 'object') P.stash = {};
    return st;
  };

  const origInit = MTF.initState;
  MTF.initState = function () { return FL.ensure(origInit()); };

  const origLoad = MTF.load;
  MTF.load = function () { return FL.ensure(origLoad()); };

  /* Переключение типа проекта */
  const DOMAIN = ['capexItems', 'staff', 'opexItems', 'subsidies', 'docSections'];
  FL.switchType = function (type) {
    const S = FL.ensure(MTF.state), P = S.params, from = P.project.type || 'mtf';
    if (type === from) return;

    P.stash[from] = { lists: {}, project: { name: P.project.name, farmsCount: P.project.farmsCount,
      groupCurrency: clone(P.project.groupCurrency || {}) },
      baseCows: P.staff.baseCows, docMode: S.docMode };
    DOMAIN.forEach(k => { P.stash[from].lists[k] = clone(S[k]); });

    const saved = P.stash[type];
    if (saved) {
      DOMAIN.forEach(k => { if (saved.lists[k]) S[k] = clone(saved.lists[k]); });
      Object.assign(P.project, saved.project);
      P.staff.baseCows = saved.baseCows;
      S.docMode = saved.docMode || 'estimate';
    } else if (type === 'feedlot') {
      S.capexItems = clone(FL.capexItems);
      S.staff = clone(FL.staff);
      S.opexItems = [];
      S.subsidies = clone(FL.subsidies);
      P.project.name = 'Откормочная площадка КРС';
      P.project.farmsCount = 1;
      P.project.groupCurrency = Object.assign({}, P.project.groupCurrency, { herd: 'KZT' });  // бычки — за тенге
      P.staff.baseCows = FL.capacity(P).design;
      S.docMode = 'estimate';
      S.docSections = FL.defaultDocSections ? FL.defaultDocSections('estimate') : S.docSections;
    } else {
      S.capexItems = clone(MTF.capexItems);
      S.staff = clone(MTF.staff);
      S.opexItems = clone(MTF.opexItems);
      S.subsidies = clone(MTF.subsidies);
      P.project.name = MTF.defaults.project.name;
      P.project.farmsCount = MTF.defaults.project.farmsCount;
      P.staff.baseCows = MTF.defaults.staff.baseCows;
      S.docMode = 'estimate';
      S.docSections = MTF.mergeDocSections(null);
      P.project.type = 'mtf';
      MTF.applyDocMode(S, 'estimate');
    }
    P.project.type = type;
    MTF.activeTab = 'inputs';
  };

  /* ---------- Названия вкладок ---------- */
  const TAB_NAMES = {
    mtf: { herd: 'Стадо' },
    feedlot: { herd: 'Площадка' }
  };
  const origInner = MTF.renderInner;
  MTF.renderInner = function () {
    FL.ensure(MTF.state);   // проект из старого .json может не содержать блока откорма
    const names = TAB_NAMES[isF() ? 'feedlot' : 'mtf'];
    MTF.tabs.forEach(t => { if (names[t.id]) t.name = names[t.id]; });
    const h = document.querySelector('header h1');
    if (h) h.textContent = isF() ? 'Конструктор модели: откорм КРС' : 'Конструктор модели МТФ';
    return origInner.apply(this, arguments);
  };

  /* ---------- Переключатель типа (над вводными в обоих режимах) ---------- */
  function typeBar() {
    const t = MTF.state.params.project.type || 'mtf';
    const opt = (v, n) => '<option value="' + v + '"' + (v === t ? ' selected' : '') + '>' + n + '</option>';
    return '<div class="card" style="margin-bottom:14px"><div class="f wide"><label>Тип проекта</label>' +
      '<select id="projType">' + opt('mtf', 'Молочно-товарная ферма') + opt('feedlot', 'Откормочная площадка КРС') +
      '</select></div><div class="hint">Финансовые параметры (кредит, ставки, горизонт) общие для обоих типов. ' +
      'Капзатраты, штат, расходы и субсидии у каждого типа свои и сохраняются при переключении.</div></div>';
  }

  /* ---------- 1. Вводные откорма ---------- */
  function monthOptions(P) {
    const out = [];
    for (let m = 0; m < 24; m++) out.push([String(m), MONTHS[m % 12] + ' ' + (P.project.startYear + Math.floor(m / 12))]);
    return out;
  }

  function seasonBlock(P) {
    const cur = FL.season(P), custom = Array.isArray(P.feedlot.animals.season);
    return '<h4>Сезонность привеса</h4><div class="tw"><table><thead><tr>' +
      MONTHS.map(m => '<th>' + m + '</th>').join('') + '</tr></thead><tbody><tr>' +
      cur.map((v, i) => '<td><input type="number" data-fls="' + i + '" value="' + v + '" step="0.05" style="width:52px"></td>').join('') +
      '</tr></tbody></table></div>' +
      '<div class="hint">Множитель к суточному привесу по месяцам. ' +
      (custom ? 'Заданы вручную. <button class="btn" id="flSeasonReset">Вернуть пресет формата</button>'
        : 'Пресет для формата «' + FL.formats[P.feedlot.format] + '». Правка любой ячейки переводит в ручной режим.') +
      '</div>';
  }

  function unitCard(P) {
    const u = FL.unitEconomics(P), S = P.feedlot.sale;
    const unitKg = S.mode === 'carcass' ? '₸/кг туши' : '₸/кг ж.в.';
    const curPrice = S.mode === 'carcass' ? S.priceCarcass : S.priceOut;
    const row = (n, v, cls) => '<tr><td>' + n + '</td><td class="n ' + (cls || '') + '">' + f.num(v, 1) + '</td></tr>';
    return '<div class="card"><h3>Экономика одной головы</h3><div class="tw"><table>' +
      '<thead><tr><th>Статья</th><th>тыс. ₸</th></tr></thead><tbody>' +
      row('Выручка (с учётом падежа и усушки)', u.revenue, 'pos') +
      row('Закуп бычка', -u.purchase) + row('Корма', -u.feed) + row('Подстилка', -u.bedding) +
      row('Ветеринария', -u.vet) + row('Доставка и приёмка', -u.extra) + row('Энергия, вода, прочее', -u.other) +
      '<tr class="tot"><td>Маржа до ФОТ и постоянных</td><td class="n ' + (u.margin < 0 ? 'neg' : 'pos') + '">' +
      f.num(u.margin, 1) + '</td></tr></tbody></table></div>' +
      '<div class="kpis" style="margin-top:10px">' +
      '<div class="kpi"><div class="lbl">Цена безубыточности</div><div class="val">' + f.num(u.breakEvenPrice) +
      '</div><div class="sub">' + unitKg + ' (сейчас ' + f.num(curPrice) + ')</div></div>' +
      '<div class="kpi"><div class="lbl">Себестоимость привеса</div><div class="val">' + f.num(u.costPerKgGain) +
      '</div><div class="sub">₸/кг без закупа</div></div>' +
      '<div class="kpi"><div class="lbl">Конверсия корма</div><div class="val">' + f.num(u.fcr, 1) +
      '</div><div class="sub">кг СВ на кг привеса</div></div>' +
      '<div class="kpi"><div class="lbl">Срок откорма</div><div class="val">' + f.num(u.days) +
      '</div><div class="sub">дней, привес ' + f.num(u.gain) + ' кг</div></div></div>' +
      '<div class="hint">Базовые цены, без сезонности и инфляции, на одну закупленную голову. ' +
      'Если цена безубыточности выше цены реализации — площадка работает в минус ещё до зарплат и кредита.</div></div>';
  }

  MTF.renderInputsFeedlot = function (res) {
    const P = MTF.state.params, F = P.feedlot, cap = res.herd.meta.capacity;
    const checks = res.checks.map(c => '<div class="note warn">' + c + '</div>').join('');
    const limits = cap.limits.map(l => (l.id === cap.bottleneck.id ? '<b>' : '') + l.label + ': ' + f.num(l.value) +
      (l.id === cap.bottleneck.id ? '</b>' : '')).join(' · ');

    return checks + '<div class="grid g2">' +

      '<div class="card"><h3>Проект</h3>' +
      field('Название', 'project.name', '', 'text') +
      field('Область', 'project.region', '', 'text') +
      field('Район', 'project.district', '', 'text') +
      field('Оператор', 'project.operator', '', 'text') +
      field('Год старта', 'project.startYear', '') +
      field('Горизонт расчёта', 'project.horizon', 'лет') +
      '<h4>Курсы валют, ₸</h4>' +
      field('Евро', 'project.rateEUR', '€') + field('Доллар', 'project.rateUSD', '$') + field('Рубль', 'project.rateRUB', '₽') +
      '</div>' +

      '<div class="card"><h3>Площадка и мощность</h3>' +
      field('Формат', 'feedlot.format', '', 'select', Object.keys(FL.formats).map(k => [k, FL.formats[k]])) +
      field('Секций', 'feedlot.capacity.sections', 'шт') +
      field('Голов на секцию', 'feedlot.capacity.headsPerSection', 'гол') +
      '<h4>Проверка узких мест (0 — не проверять)</h4>' +
      field('Полезная площадь секций', 'feedlot.capacity.areaTotal', 'м²') +
      field('Норма площади', 'feedlot.capacity.areaNorm', 'м²/гол') +
      field('Фронт кормового стола', 'feedlot.capacity.feedFrontM', 'м') +
      field('Норма фронта кормления', 'feedlot.capacity.feedFrontNormCm', 'см/гол') +
      field('Групповых поилок', 'feedlot.capacity.drinkers', 'шт') +
      field('Голов на поилку', 'feedlot.capacity.headsPerDrinker', 'гол') +
      '<div class="hint">Расчётная вместимость: <b>' + f.num(cap.value) + '</b> гол. (' + f.num(cap.perSection) +
      ' на секцию).<br>Ограничения: ' + limits + '.</div></div>' +

      '<div class="card"><h3>Комплектование</h3>' +
      field('Первый завоз', 'feedlot.launchMonth', '', 'select', monthOptions(P)) +
      field('Режим', 'feedlot.fillMode', '', 'select',
        [['even', 'Равномерный поток'], ['fast', 'Волнами: N секций в месяц']]) +
      (F.fillMode === 'fast' ? field('Секций в месяц', 'feedlot.sectionsPerMonth', 'шт') : '') +
      field('Первичное комплектование в капзатраты', 'feedlot.firstStockFinanced', '', 'check') +
      '<div class="hint">Равномерный поток: секции заходят с интервалом в течение одного цикла, продажи идут ' +
      'каждые 2–4 недели. Первичное комплектование в капзатратах: ' +
      f.num(res.herd.meta.initialStockTotal) + ' тыс. ₸ ' +
      (F.firstStockFinanced ? '(финансируется как «Поголовье»).' : '(выключено — весь закуп идёт из оборотных средств).') +
      '</div></div>' +

      '<div class="card"><h3>Животные и привес</h3>' +
      field('Живой вес при закупе', 'feedlot.animals.weightIn', 'кг') +
      field('Целевой вес реализации', 'feedlot.animals.weightOut', 'кг') +
      field('Предельный срок откорма', 'feedlot.animals.maxDays', 'дн') +
      field('Адаптация', 'feedlot.animals.adaptDays', 'дн') +
      field('Привес в адаптацию', 'feedlot.animals.adgAdapt', 'г/сут') +
      field('Привес на откорме', 'feedlot.animals.adg', 'г/сут') +
      field('Падёж за цикл', 'feedlot.animals.mortality', '%') +
      field('Санитарный разрыв', 'feedlot.animals.sanitationDays', 'дн') +
      seasonBlock(P) + '</div>' +

      '<div class="card"><h3>Кормление</h3>' +
      field('Потребление СВ', 'feedlot.feed.dmiPct', '% ж.в.') +
      field('Рацион адаптации, 1 кг СВ', 'feedlot.feed.dmCostAdapt', '₸') +
      field('Рацион откорма, 1 кг СВ', 'feedlot.feed.dmCost', '₸') +
      field('Подстилка', 'feedlot.feed.beddingKg', 'кг/гол/сут') +
      field('Цена подстилки', 'feedlot.feed.beddingPrice', '₸/кг') +
      '<h4>Прочие затраты на голову</h4>' +
      field('Ветеринария за цикл', 'feedlot.costs.vetPerHead', 'т.₸') +
      field('Доставка и приёмка', 'feedlot.costs.purchaseExtra', 'т.₸') +
      field('Энергия, вода, прочее', 'feedlot.costs.otherPerHeadDay', '₸/сут') +
      '</div>' +

      '<div class="card"><h3>Цены закупа и реализации</h3>' +
      field('Способ продажи', 'feedlot.sale.mode', '', 'select', [['live', 'Живым весом'], ['carcass', 'По убойному весу']]) +
      field('Цена закупа', 'feedlot.sale.priceIn', '₸/кг ж.в.') +
      (F.sale.mode === 'carcass'
        ? field('Убойный выход', 'feedlot.sale.carcassYield', '%') + field('Цена туши', 'feedlot.sale.priceCarcass', '₸/кг')
        : field('Цена реализации', 'feedlot.sale.priceOut', '₸/кг ж.в.')) +
      field('Усушка при транспортировке', 'feedlot.sale.shrink', '%') +
      field('Рост цен (закуп и реализация)', 'prices.priceInflation', '%/год') +
      field('Рост затрат', 'prices.costInflation', '%/год') +
      '<div class="hint">Разница цен реализации и закупа: <b>' + f.num(F.sale.priceOut - F.sale.priceIn) +
      ' ₸/кг</b>. Главный рычаг экономики откорма вместе со стоимостью корма.</div></div>' +

      unitCard(P) +
      '</div>';
  };

  const origInputs = MTF.renderInputs;
  MTF.renderInputs = function (res) {
    return typeBar() + (isF() ? MTF.renderInputsFeedlot(res) : origInputs.apply(this, arguments));
  };

  /* ---------- 2. Площадка ---------- */
  MTF.renderFeedlot = function (res) {
    const k = res.feedlot, herd = res.herd, cap = herd.meta.capacity;
    const kpi = (lbl, val, sub) => '<div class="kpi"><div class="lbl">' + lbl + '</div><div class="val">' + val +
      '</div>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>';

    const bars = cap.limits.map(l => {
      const pv = cap.design > 0 ? l.value / cap.design * 100 : 0;
      return '<div class="cap"><div class="top"><span>' + l.label + '</span><b>' + f.num(l.value) + ' гол.</b></div>' +
        '<div class="bar"><i class="' + (l.value < cap.design ? 'over' : '') + '" style="width:' +
        Math.min(100, pv) + '%"></i></div></div>';
    }).join('');

    const rows = herd.map(y => '<tr><td class="n">' + y.year + '</td>' +
      [y.bought, y.sold, y.dead, y.headsAvg, y.headsEnd].map(v => '<td class="n">' + f.num(v) + '</td>').join('') +
      '<td class="n">' + f.num(y.liveKgSold / 1000) + '</td>' +
      '<td class="n">' + f.num(y.gainKg / 1000) + '</td>' +
      '<td class="n">' + (y.fcr ? f.num(y.fcr, 1) : '—') + '</td>' +
      '<td class="n">' + f.num(y.batches) + '</td>' +
      '<td class="n ' + (y.batchesByDays ? 'neg' : '') + '">' + f.num(y.batchesByDays) + '</td></tr>').join('');

    return (res.checks.length ? res.checks.map(c => '<div class="note warn">' + c + '</div>').join('')
      : '<div class="note ok">Вводные согласованы, узких мест и аномалий не найдено.</div>') +

      '<div class="card"><h3>Ключевые показатели рабочего режима</h3><div class="kpis">' +
      kpi('Вместимость', f.num(k.capacity), 'гол. единовременно') +
      kpi('Узкое место', k.bottleneck, 'из ' + f.num(k.capacityDesign) + ' проектных') +
      kpi('Цикл откорма', f.num(k.avgCycleDays), 'дней, план ' + f.num(k.plannedDays)) +
      kpi('Оборот площадки', f.num(k.rotations, 2), 'раза в год') +
      kpi('Реализация', f.num(k.soldPerYear), 'гол. в год') +
      kpi('Живой вес', f.num(k.liveTonsPerYear), 'тонн в год') +
      kpi('Конверсия корма', f.num(k.fcr, 1), 'кг СВ на кг привеса') +
      kpi('Себестоимость кг ж.в.', f.num(k.costPerKgLive), '₸, все затраты') +
      kpi('EBITDA на голову', f.num(k.marginPerHead, 1), 'тыс. ₸') +
      kpi('Пик оборотки', f.num(k.wc.peak), 'тыс. ₸, помесячно') +
      '</div><div class="hint">Рабочий режим — среднее за годы с 3-го до конца горизонта. Пик оборотки считается помесячно ' +
      'за первые 24 месяца после завоза: годовая модель этот разрыв сглаживает.</div></div>' +

      '<div class="grid g2" style="margin-top:14px">' +
      '<div class="card"><h3>Ограничения мощности</h3>' + bars +
      '<div class="hint">Вместимость площадки — наименьшее из ограничений. Добавить поилки или фронт кормления ' +
      'обычно дешевле, чем строить новые секции.</div></div>' +
      unitCard(MTF.state.params) + '</div>' +

      '<div class="card" style="margin-top:14px"><h3>Движение поголовья по годам</h3><div class="tw"><table>' +
      '<thead><tr><th>Год</th><th>Закуплено</th><th>Реализовано</th><th>Падёж</th><th>Среднее</th>' +
      '<th>На конец</th><th>Ж.в., т</th><th>Привес, т</th><th>Конв.</th><th>Партий</th><th>По сроку</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="hint">«По сроку» — партии, ушедшие по предельному сроку без целевого веса.</div></div>';
  };

  const origHerd = MTF.renderHerd;
  MTF.renderHerd = function (res) {
    return isF() ? MTF.renderFeedlot(res) : origHerd.apply(this, arguments);
  };

  /* ---------- 3–5. Экономика и финансирование: отображение ядра ----------
     Таблицы ядра читают поля МТФ (цена нетели, коровник, надой).
     На время отрисовки подставляем их значения откорма в копию данных
     и меняем подписи. Реальное состояние не меняется. */
  const LABELS = [
    ['На одну фуражную корову', 'На одно скотоместо'],
    ['Себест. л, ₸', 'Себест. кг ж.в., ₸'],
    ['Валовой надой, т/год', 'Реализация ж.в., т/год'],
    ['Фуражное поголовье', 'Скотомест'],
    ['<th>1 ферма</th>', '<th>Площадка</th>'],
    ['<th>1 ферм</th>', '<th>Итого</th>'],
    ['Стоимость проекта, 1 ферм<', 'Стоимость проекта<'],
    ['<option value="milk">На литр</option>', ''],
    ['<option value="cow">На корову</option>', '']
  ];
  const relabel = html => LABELS.reduce((h, l) => h.split(l[0]).join(l[1]), html);

  function withDisplay(res, fn) {
    const S = MTF.state, real = S.params, P = clone(real), cap = res.herd.meta.capacity.value;
    P.herd.startHeifers = cap;
    P.herd.heiferCurrency = 'KZT';
    P.herd.heiferPrice = real.feedlot.firstStockFinanced && cap > 0 ? res.capex.groups.herd / cap : 0;
    P.capacity.cowPlaces = cap;
    P.capacity.dryPlaces = 0;

    const herd = res.herd.map(y => Object.assign({}, y, { cows: cap, milkLiters: y.liveKgSold }));
    herd.meta = res.herd.meta;
    const view = Object.assign({}, res, { herd: herd });

    const hide = ['renderMachineryCard', 'renderPrepCard'], saved = {};
    hide.forEach(k => { saved[k] = MTF[k]; if (MTF[k]) MTF[k] = () => ''; });
    S.params = P;
    try { return relabel(fn(view)); }
    finally { S.params = real; hide.forEach(k => { if (saved[k]) MTF[k] = saved[k]; }); }
  }

  const origEcon = MTF.renderEcon;
  MTF.renderEcon = function (res) {
    if (!isF()) return origEcon.apply(this, arguments);
    return '<div class="note ok">Строка «Первичное комплектование бычками» считается автоматически ' +
      'из вводных (вес × цена закупа × вместимость) и здесь не редактируется.</div>' +
      withDisplay(res, origEcon);
  };

  const origFin = MTF.renderFin;
  MTF.renderFin = function (res) {
    return isF() ? withDisplay(res, origFin) : origFin.apply(this, arguments);
  };

  /* ---------- Субсидии: типы откорма в подсказке ---------- */
  const origAddSub = MTF.addSubsidy;
  MTF.addSubsidy = function () {
    if (!isF()) return origAddSub.apply(this, arguments);
    const name = prompt('Название меры поддержки');
    if (!name) return;
    const type = prompt('Тип: per_kg (₸/кг ж.в.) / per_head (т.₸ за проданную голову) / capex_pct / fixed_year / rate_sub', 'per_kg');
    const value = parseFloat(prompt('Ставка', '0')) || 0;
    MTF.state.subsidies.push({
      id: 's' + Date.now(), name: name, type: type, value: value,
      unit: { per_kg: '₸/кг ж.в.', per_head: 'т.₸/гол', capex_pct: '%', rate_sub: 'п.п.' }[type] || 'т.₸',
      base: 'build', yearFrom: 1, yearTo: MTF.state.params.project.horizon,
      condition: '', conflictsWith: [], enabled: true, status: 'draft', comment: ''
    });
    MTF.save(); MTF.render();
  };

  /* ---------- События ---------- */
  const origBind = MTF.bind;
  MTF.bind = function () {
    origBind.apply(this, arguments);
    const upd = () => { MTF.save(); MTF.render(); };

    const pt = document.getElementById('projType');
    if (pt) pt.onchange = () => { FL.switchType(pt.value); upd(); };

    if (!isF()) return;
    const P = MTF.state.params;

    document.querySelectorAll('[data-fls]').forEach(el => el.onchange = () => {
      const arr = FL.season(P).slice();
      arr[+el.dataset.fls] = parseFloat(el.value) || 0;
      P.feedlot.animals.season = arr;
      upd();
    });
    const sr = document.getElementById('flSeasonReset');
    if (sr) sr.onclick = () => { P.feedlot.animals.season = null; upd(); };

    // Автоматическую строку поголовья не редактируем: её ввод писал бы в поля МТФ
    const hi = MTF.state.capexItems.findIndex(it => it.id === 'herd' && it.auto);
    if (hi >= 0) ['cxv', 'cxq', 'cxc', 'cxu', 'cxg', 'cxn'].forEach(a =>
      document.querySelectorAll('[data-' + a + '="' + hi + '"]').forEach(el => { el.disabled = true; }));
  };
})();
