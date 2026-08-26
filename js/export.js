/* ============================================================
   ЭКСПОРТ  v1.1
   ============================================================ */

window.MTF = window.MTF || {};
MTF.export = {};

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* Мажорная часть версии: '1.2.0' -> '1'. Пустая/битая версия даёт '' */
function majorVersion(v) {
  const m = String(v == null ? '' : v).match(/^\s*(\d+)\./);
  return m ? m[1] : '';
}

function fname(ext) {
  const n = (MTF.state.params.project.name || 'Проект').replace(/[^\wа-яА-ЯёЁ\- ]/g, '').trim();
  return n + ' — модель проекта.' + ext;
}

/* Единый стиль печатного документа */
MTF.printCss = function () {
  return `
@page{size:A4;margin:20mm 18mm}
body{font-family:'Georgia','Times New Roman',serif;font-size:10.5pt;line-height:1.55;color:#1A1A1A;margin:0}
.doc-title{text-align:center;padding:70pt 0 40pt;border-bottom:2pt solid #1A1A1A;margin-bottom:26pt;page-break-after:always}
.dt-label{font-family:Arial,sans-serif;font-size:8.5pt;letter-spacing:2.5pt;text-transform:uppercase;color:#6B6B66;margin-bottom:16pt}
.doc-title h1{font-size:26pt;font-weight:normal;margin:0 0 22pt;line-height:1.25;letter-spacing:-.3pt}
.dt-meta{font-family:Arial,sans-serif;font-size:9.5pt;color:#4A4A46;line-height:1.85}
section{page-break-inside:auto}
h2{font-family:Arial,sans-serif;font-size:13pt;font-weight:bold;margin:26pt 0 12pt;padding-bottom:6pt;border-bottom:1pt solid #C9C9C2;page-break-after:avoid}
h3{font-family:Arial,sans-serif;font-size:10.5pt;font-weight:bold;margin:16pt 0 7pt;page-break-after:avoid}
p{margin:0 0 8pt;text-align:justify}
ul{margin:0 0 10pt;padding-left:16pt}
li{margin-bottom:3pt}
table.dt{border-collapse:collapse;width:100%;margin:10pt 0 14pt;font-family:Arial,sans-serif;font-size:9pt;page-break-inside:avoid}
table.dt th{background:#1A1A1A;color:#FFF;font-weight:bold;padding:6pt 8pt;text-align:left;border:none}
table.dt th.r{text-align:right}
table.dt td{padding:5pt 8pt;border-bottom:.5pt solid #D8D8D2}
table.dt td.r{text-align:right}
table.dt td.n{font-variant-numeric:tabular-nums}
table.dt tbody tr:nth-child(even){background:#F6F6F2}
`;
};

/* ---------- Word ---------- */
MTF.export.expWord = function () {
  const secs = MTF.renderDoc(MTF.state, MTF.lastResult);
  const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
    'xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
    '<head><meta charset="utf-8"><title>' + MTF.state.params.project.name + '</title>' +
    '<style>' + MTF.printCss() + '</style></head><body>' +
    MTF.docHtml(MTF.state, secs) + '</body></html>';
  download(new Blob(['\ufeff' + html], { type: 'application/msword' }), fname('doc'));
};

/* ---------- PDF через окно печати ---------- */
MTF.export.expPdf = function () {
  const secs = MTF.renderDoc(MTF.state, MTF.lastResult);
  const w = window.open('', '_blank');
  if (!w) { alert('Разрешите всплывающие окна, чтобы открыть предпросмотр печати.'); return; }
  w.document.write('<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>' +
    MTF.state.params.project.name + '</title><style>' + MTF.printCss() +
    '@media screen{body{max-width:800px;margin:0 auto;padding:40px 50px;background:#fff}}' +
    '</style></head><body>' + MTF.docHtml(MTF.state, secs) + '</body></html>');
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 400);
};

/* ---------- CSV ---------- */
MTF.export.expCsv = function () {
  const r = MTF.lastResult, rows = [], add = a => rows.push(a.join(';'));

  add(['ДВИЖЕНИЕ СТАДА']);
  add(['Год', 'Фуражные', 'Дойные', 'Сухостой', 'Телята', 'Молодняк', 'Бычки', 'Всего', 'Надой, л', 'Прод. телят', 'Выбраковка', 'Закуп нетелей']);
  r.herd.forEach(y => add([y.year, ...['cows', 'milking', 'dry', 'calves', 'heifers', 'bulls', 'total'].map(k => Math.round(y[k])),
    Math.round(y.milkLiters), Math.round(y.calvesSold), Math.round(y.cullSold), Math.round(y.heifersPurchased)]));

  add([]); add(['ФИНАНСОВЫЕ ПОКАЗАТЕЛИ, тыс. тенге']);
  add(['Год', 'Выручка', 'Субсидии', 'Затраты', 'Оператор', 'EBITDA', 'Маржа %', 'Себестоимость литра']);
  r.pnl.forEach(y => add([y.year, Math.round(y.revenue), Math.round(y.subsidy), Math.round(y.opex),
    Math.round(y.operatorFee), Math.round(y.ebitda), y.margin.toFixed(1), y.milkCost.toFixed(1)]));

  add([]); add(['ГРАФИК ПОГАШЕНИЯ']);
  add(['Год', 'Остаток на начало', 'Проценты', 'Основной долг', 'Платёж', 'Остаток на конец', 'Оборотный', 'DSCR']);
  r.debt.forEach((d, i) => add([d.year, Math.round(d.opening), Math.round(d.interest), Math.round(d.principal),
    Math.round(d.payment), Math.round(d.closing), Math.round(r.cf.rows[i].wcBalance),
    r.metrics.dscr[i].value !== null ? r.metrics.dscr[i].value.toFixed(2) : '']));

  add([]); add(['ДЕНЕЖНЫЕ ПОТОКИ']);
  add(['Год', 'Операционный', 'Инвестиционный', 'Финансовый', 'Чистый', 'Накопленный']);
  r.cf.rows.forEach(c => add([c.year, Math.round(c.operating), Math.round(c.invest),
    Math.round(c.financing), Math.round(c.net), Math.round(c.cumulative)]));

  add([]); add(['КАПИТАЛЬНЫЕ ЗАТРАТЫ']);
  add(['Статья', 'Группа', 'Валюта', 'Ставка', 'Сумма, тыс. тенге']);
  r.capex.rows.forEach(c => add([c.name, c.group, c.cur, c.native, Math.round(c.sum)]));
  add(['Резерв', '', '', '', Math.round(r.capex.reserve)]);
  add(['ИТОГО', '', '', '', Math.round(r.capex.total)]);

  add([]); add(['МЕТРИКИ']);
  add(['NPV', Math.round(r.metrics.npv)]);
  add(['IRR проекта, %', r.metrics.irr !== null ? (r.metrics.irr * 100).toFixed(1) : '']);
  add(['Окупаемость, лет', r.metrics.payback ? r.metrics.payback.toFixed(1) : '']);
  add(['Мин. DSCR', isFinite(r.metrics.minDscr) ? r.metrics.minDscr.toFixed(2) : '']);
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
  const t = prompt('Текст раздела «' + sec.title + '».\n' +
    'Разметка: **жирный**, дефис в начале строки — список.\n' +
    'Значения в фигурных скобках подставляются автоматически.', sec.body);
  if (t !== null) { sec.body = t; MTF.save(); MTF.render(); }
};

/* ---------- Проект ---------- */
MTF.export.saveJson = function () {
  const data = Object.assign({}, MTF.state, { scenarios: MTF.scenarios });
  download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), fname('json'));
};

MTF.export.loadJson = function () {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json';
  inp.onchange = () => {
    const file = inp.files[0]; if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const s = JSON.parse(rd.result);
        if (!s.params) throw new Error('нет параметров');
        /* Внутри одной мажорной версии формат совместим — открываем молча.
           Предупреждаем только при смене мажорной или неизвестной версии. */
        const fileMajor = majorVersion(s.version);
        if (fileMajor !== majorVersion(MTF.VERSION) && !confirm(
          'Файл сохранён в версии ' + (s.version || 'неизвестной') + ', текущая ' + MTF.VERSION +
          '. Часть параметров может не примениться. Открыть?')) return;
        MTF.scenarios = s.scenarios || [];
        delete s.scenarios;
        const base = MTF.initState();
        MTF.state = {
          params: Object.assign(base.params, s.params),
          capexItems: s.capexItems || base.capexItems,
          staff: s.staff || base.staff,
          opexItems: s.opexItems || base.opexItems,
          subsidies: s.subsidies || base.subsidies,
          docSections: s.docSections || base.docSections,
          version: MTF.VERSION
        };
        Object.keys(base.params).forEach(k => {
          MTF.state.params[k] = Object.assign({}, base.params[k], (s.params || {})[k] || {});
        });
        MTF.save(); MTF.render();
      } catch (e) {
        alert('Файл не читается как проект. Выберите файл, сохранённый этим инструментом.');
      }
    };
    rd.readAsText(file);
  };
  inp.click();
};
