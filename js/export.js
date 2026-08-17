/* ============================================================
   ЭКСПОРТ
   ============================================================ */

window.MTF = window.MTF || {};

MTF.export = {};

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

function fname(ext) {
  const p = MTF.state.params.project;
  const n = (p.name || 'Проект').replace(/[^\wа-яА-ЯёЁ\- ]/g, '').trim();
  return n + ' — модель проекта.' + ext;
}

/* ---------- Word ---------- */
MTF.export.expWord = function () {
  const secs = MTF.renderDoc(MTF.state, MTF.lastResult);
  const p = MTF.state.params.project;

  const body = secs.map(s =>
    '<h2>' + s.title + '</h2>' +
    '<div>' + s.body.split('\n').map(l =>
      l.trim().startsWith('<table') ? l : '<p>' + l + '</p>').join('') + '</div>'
  ).join('');

  const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
    'xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
    '<head><meta charset="utf-8"><title>' + p.name + '</title>' +
    '<style>' +
    '@page{size:A4;margin:2cm}' +
    'body{font-family:"Times New Roman",serif;font-size:12pt;line-height:1.4}' +
    'h1{font-size:16pt;text-align:center}' +
    'h2{font-size:13pt;margin-top:18pt}' +
    'p{margin:0 0 6pt}' +
    'table{border-collapse:collapse;width:100%;font-size:10pt;margin:8pt 0}' +
    'td,th{border:1px solid #999;padding:4pt 6pt}' +
    'th{background:#EEE;font-weight:bold}' +
    'td.n,th.n{text-align:right}' +
    '</style></head><body>' +
    '<h1>МОДЕЛЬ ПРОЕКТА (TERM SHEET)<br>' + p.name + '</h1>' +
    body + '</body></html>';

  download(new Blob(['\ufeff' + html], { type: 'application/msword' }), fname('doc'));
};

/* ---------- PDF через печать ---------- */
MTF.export.expPdf = function () { window.print(); };

/* ---------- CSV ---------- */
MTF.export.expCsv = function () {
  const r = MTF.lastResult, f = MTF.fmt;
  const rows = [];
  const add = a => rows.push(a.join(';'));

  add(['ДВИЖЕНИЕ СТАДА']);
  add(['Год', 'Фуражные', 'Дойные', 'Сухостой', 'Телята', 'Молодняк', 'Бычки', 'Всего', 'Надой, л', 'Продажа телят', 'Выбраковка']);
  r.herd.forEach(y => add([y.year, Math.round(y.cows), Math.round(y.milking), Math.round(y.dry),
    Math.round(y.calves), Math.round(y.heifers), Math.round(y.bulls), Math.round(y.total),
    Math.round(y.milkLiters), Math.round(y.calvesSold), Math.round(y.cullSold)]));

  add([]);
  add(['ФИНАНСОВЫЕ ПОКАЗАТЕЛИ, тыс. тенге']);
  add(['Год', 'Выручка', 'Субсидии', 'Затраты', 'Оператор', 'EBITDA', 'Маржа %', 'Себестоимость литра']);
  r.pnl.forEach(y => add([y.year, Math.round(y.revenue), Math.round(y.subsidy), Math.round(y.opex),
    Math.round(y.operatorFee), Math.round(y.ebitda), y.margin.toFixed(1), y.milkCost.toFixed(1)]));

  add([]);
  add(['ГРАФИК ПОГАШЕНИЯ']);
  add(['Год', 'Остаток на начало', 'Проценты', 'Основной долг', 'Платёж', 'Остаток на конец', 'DSCR']);
  r.debt.forEach((d, i) => add([d.year, Math.round(d.opening), Math.round(d.interest),
    Math.round(d.principal), Math.round(d.payment), Math.round(d.closing),
    r.metrics.dscr[i].value ? r.metrics.dscr[i].value.toFixed(2) : '']));

  add([]);
  add(['ДЕНЕЖНЫЕ ПОТОКИ']);
  add(['Год', 'Операционный', 'Инвестиционный', 'Финансовый', 'Чистый', 'Накопленный']);
  r.cf.rows.forEach(c => add([c.year, Math.round(c.operating), Math.round(c.invest),
    Math.round(c.financing), Math.round(c.net), Math.round(c.cumulative)]));

  add([]);
  add(['КАПИТАЛЬНЫЕ ЗАТРАТЫ']);
  add(['Статья', 'Группа', 'Сумма']);
  r.capex.rows.forEach(c => add([c.name, c.group, Math.round(c.sum)]));
  add(['Резерв', '', Math.round(r.capex.reserve)]);
  add(['ИТОГО', '', Math.round(r.capex.total)]);

  add([]);
  add(['МЕТРИКИ']);
  add(['NPV', Math.round(r.metrics.npv)]);
  add(['IRR проекта, %', r.metrics.irr !== null ? (r.metrics.irr * 100).toFixed(1) : '']);
  add(['Окупаемость, лет', r.metrics.payback ? r.metrics.payback.toFixed(1) : '']);
  add(['Собственное участие', Math.round(r.funding.equity)]);
  add(['Лимит займа', Math.round(r.funding.loanTotal)]);

  download(new Blob(['\ufeff' + rows.join('\n')], { type: 'text/csv;charset=utf-8' }), fname('csv'));
};

/* ---------- Правка шаблонов ---------- */
MTF.export.editTpl = function () {
  const list = MTF.state.docSections.map((s, i) => (i + 1) + '. ' + s.title).join('\n');
  const n = parseInt(prompt('Какой раздел править?\n\n' + list, '1'));
  if (!n || !MTF.state.docSections[n - 1]) return;
  const sec = MTF.state.docSections[n - 1];
  const t = prompt('Текст раздела «' + sec.title + '».\nПлейсхолдеры в фигурных скобках подставляются автоматически.', sec.body);
  if (t !== null) { sec.body = t; MTF.save(); MTF.render(); }
};

/* ---------- Сохранение и загрузка проекта ---------- */
MTF.export.saveJson = function () {
  download(new Blob([JSON.stringify(MTF.state, null, 2)], { type: 'application/json' }), fname('json'));
};

MTF.export.loadJson = function () {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.json';
  inp.onchange = () => {
    const file = inp.files[0];
    if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const s = JSON.parse(rd.result);
        if (!s.params) throw new Error('нет параметров');
        MTF.state = s;
        MTF.save();
        MTF.render();
      } catch (e) {
        alert('Файл не читается как проект. Выберите файл, сохранённый этим инструментом.');
      }
    };
    rd.readAsText(file);
  };
  inp.click();
};
