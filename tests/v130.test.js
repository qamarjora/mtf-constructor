/* Проверка версии 1.3.0. Запуск из корня репозитория: node tests/v130.test.js
   Не зависит от пользовательского .json: берёт значения по умолчанию из config.js.
   Раздел 7 (круг «сохранить → открыть») требует jsdom; без него пропускается:
   npm i --no-save jsdom */
const vm = require('vm'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), dir = path.join(root, 'js');
const files = ['config.js', 'subsidies.js', 'calc-herd.js', 'calc-econ.js', 'calc-fin.js',
  'feedlot-config.js', 'calc-feedlot.js', 'feedlot-switch.js', 'prep.js'];
function load() {
  const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
  files.forEach(f => vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f }));
  return ctx.MTF;
}
const M = load();
const c = o => JSON.parse(JSON.stringify(o));
const fresh = () => ({ params: c(M.defaults), capexItems: c(M.capexItems), staff: c(M.staff),
  opexItems: c(M.opexItems), subsidies: c(M.subsidies) });
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✓ ' : '  ✗ ') + msg); if (!cond) fails++; };
const near = (a, b, tol) => Math.abs(a - b) <= (tol === undefined ? 1e-6 : tol);
const finite = arr => arr.every(o => Object.values(o).every(v => typeof v !== 'number' || isFinite(v)));

console.log('1. Версия и общая целостность');
ok(/^1\.3\./.test(M.VERSION), 'MTF.VERSION = ' + M.VERSION);
const base = fresh(), R0 = M.runModel(base);
ok(finite(R0.herd) && finite(R0.pnl), 'нет NaN/Infinity в стаде и P&L');
ok(isFinite(R0.metrics.npv) && isFinite(R0.metrics.minDscr) && isFinite(R0.metrics.minDscrY2), 'NPV и DSCR (весь срок / со 2-го года) конечны');
const P = base.params, C = P.capacity;
const sh = M.herdShares(P.production);
const targetExpected = Math.min(C.cowPlaces + C.dryPlaces, Math.round(C.cowPlaces / sh.milking),
  sh.dry + sh.pen > 0 ? Math.round(C.dryPlaces / (sh.dry + sh.pen)) : 1e9);
ok(R0.herd.meta.target === targetExpected, 'мощность = min(коровник/доля дойных, блок сухостоя/(сухостой+родилка)) = ' + targetExpected);

console.log('2. Выбраковка по годам (cullRateAt)');
const pr = c(P.production);
pr.cullRate = 26; pr.cullRateStart = 10;
pr.cullRateStartYears = 0;
ok(M.cullRateAt(pr, 0) === 26 && M.cullRateAt(pr, 5) === 26, 'по умолчанию (0 лет) — везде 26%');
pr.cullRateStartYears = 2;
ok(M.cullRateAt(pr, 0) === 10 && M.cullRateAt(pr, 1) === 10 && M.cullRateAt(pr, 2) === 26, '2 года по 10%, затем 26%');
ok(P.production.cullRate === 26, 'значение по умолчанию cullRate = 26 (было 10)');
ok(!P.production.cullRateStartYears, 'режим по годам выключен по умолчанию');
const s2 = fresh(); s2.params.production.cullRateStartYears = 2;
const R2 = M.runModel(s2);
ok(R2.herd[1].cows > R0.herd[1].cows, 'пониженная выбраковка поднимает поголовье 2-го года (' + Math.round(R0.herd[1].cows) + ' → ' + Math.round(R2.herd[1].cows) + ')');

console.log('3. График продажи тёлок (salePlanOf)');
const sp = M.salePlanOf({ calfSaleAgeMo: 2, salePlan: [{ age: 2, share: 50, price: 0 }, { age: 12, share: 25, price: 400 }, { age: 40, share: 25, price: 500 }] });
ok(near(sp.reduce((a, r) => a + r.frac, 0), 1), 'доли нормируются к 100%');
ok(sp.every(r => r.age >= 2 && r.age <= 29), 'возраст ограничен диапазоном 2…29 мес. (40 → ' + sp[sp.length - 1].age + ')');
ok(M.salePlanOf({ calfSaleAgeMo: 3, salePlan: [] }).length === 1 && M.salePlanOf({ calfSaleAgeMo: 3, salePlan: [] })[0].age === 3, 'пустой график → одна ступень в возрасте продажи телят');
ok(M.salePlanOf({ calfSaleAgeMo: 2, salePlan: [{ age: 6, share: 0, price: 1 }] })[0].age === 2, 'ступени с нулевой долей отбрасываются');
['early', 'steps', 'late'].forEach(k => {
  const s = fresh(); s.params.production.salePlan = c(M.salePlanPresets[k].plan);
  const r = M.runModel(s);
  ok(finite(r.herd) && isFinite(r.metrics.npv), 'пресет «' + k + '» считается, NPV = ' + Math.round(r.metrics.npv / 1000) + ' млн');
});

console.log('4. Цена сверхремонтной нетели (herd.surplusHeiferPct)');
ok(P.herd.surplusHeiferPct === 85, 'по умолчанию 85%');
const sa = fresh(), sb = fresh(); sa.params.herd.surplusHeiferPct = 85; sb.params.herd.surplusHeiferPct = 60;
const ra = M.runModel(sa), rb = M.runModel(sb);
const iy = ra.pnl.findIndex(y => y.revDetail && y.revDetail['Сверхремонтные нетели'] > 0);
if (iy < 0) console.log('  – в сценарии по умолчанию сверхремонтных нетелей нет, проверка пропущена');
else ok(near(rb.pnl[iy].revDetail['Сверхремонтные нетели'] / ra.pnl[iy].revDetail['Сверхремонтные нетели'], 60 / 85, 1e-9), 'выручка с нетелей пропорциональна 60/85 (год ' + (iy + 1) + ')');
const sc = fresh(); delete sc.params.herd.surplusHeiferPct;
ok(near(M.runModel(sc).metrics.npv, R0.metrics.npv, 1e-6), 'старый проект без поля считается как 85%');

console.log('5. ФОТ тремя блоками (calcPayroll)');
const sf = fresh();
sf.staff.forEach(x => { if (x.block === 'complex') { x.count = 1; x.salary = 1000; } if (x.block === 'land') { x.count = 2; x.salary = 300; } });
const farmsN = sf.params.project.farmsCount;
const cow = R0.herd.meta.target;
sf.params.staff.shareFarms = 0;
const p0 = M.calcPayroll(sf.params, sf.staff, cow);
ok(M.staffDivisor(sf.params) === farmsN, 'shareFarms = 0 → делитель = число ферм (' + farmsN + ')');
const bl = id => p0.blocks.find(b => b.id === id);
const cplx = sf.staff.filter(x => x.block === 'complex').reduce((a, x) => a + x.count * x.salary * 12, 0);
ok(near(bl('complex').net, cplx / farmsN, 1e-6), 'общий блок на ферму = сумма / ' + farmsN);
ok(near(bl('complex').netTotal, cplx, 1e-6), 'общий блок на проект не умножается на число ферм');
ok(near(p0.net, p0.blocks.reduce((a, b) => a + b.net, 0), 1e-6), 'итог на ферму = сумма блоков');
ok(near(p0.gross, p0.net * (1 + M.payrollTaxRate / 100), 1e-6), 'начисления ' + M.payrollTaxRate + '% применены к итогу');
sf.params.staff.shareFarms = 1;
ok(M.calcPayroll(sf.params, sf.staff, cow).net > p0.net, 'shareFarms = 1 нагружает одну ферму всем общим блоком (ФОТ вырос)');
sf.params.staff.shareFarms = 5;
ok(M.staffDivisor(sf.params) === 5, 'shareFarms = 5 → делитель 5');
const sl = fresh(); sl.params.staff.mode = 'lump'; sl.params.staff.lumpAnnual = 12345;
ok(M.calcPayroll(sl.params, sl.staff, cow).net === 12345, 'режим «одной суммой» не затронут');
ok(Array.isArray(M.staffBlockIds) && M.staffBlockIds.join() === 'complex,farm,land', 'три блока: complex, farm, land');

console.log('6. Обслуживание стада (careCostPerCow)');
const carr = c(M.careStandard);
const cc = M.careCostPerCow(P, R0, carr);
ok(cc.count === carr.length && cc.perCow > 0, 'статей: ' + cc.count + ', на корову: ' + Math.round(cc.perCow) + ' тыс. ₸ в год');
ok(M.careCostPerCow(P, R0, []).perCow === 0, 'пустой список → 0 (так в вашем проекте, если статьи удалены)');
ok(base.opexItems.length === M.careStandard.length, 'в новом проекте все статьи обслуживания на месте (' + base.opexItems.length + ')');

console.log('6а. Подготовительный этап: режимы учёта (prepShare.mode)');
const cap1 = M.runModel(fresh());
const pa = fresh(); pa.params.prepShare = Object.assign({}, M.prepShare);          // поля mode нет — старый проект
ok(M.prepModeOf(pa.params) === 'separate', 'без поля mode — «отдельный вклад»');
ok(near(M.runModel(pa).capex.total, cap1.capex.total) && near(M.runModel(pa).metrics.npv, cap1.metrics.npv, 1e-6), 'режим «отдельный вклад» не меняет стоимость и NPV');
const pb = fresh(); pb.params.prepShare = Object.assign({}, M.prepShare, { mode: 'in_project' });
const cap2 = M.runModel(pb), prc = M.calcPrep(pb.params);
ok(near(cap2.capex.total - cap1.capex.total, prc.perFarmK, 1e-6), 'в режиме «входит» стоимость растёт ровно на проект÷N = ' + Math.round(prc.perFarmK) + ' тыс. ₸ на ферму');
ok(near(prc.perFarmK * prc.farms, prc.grandK, 1e-6), 'проект = ферма × N (' + prc.farms + ' ферм)');
ok(near(cap2.funding.loanTotal, cap1.funding.loanTotal, 1e-6) && near(cap2.funding.equity - cap1.funding.equity, prc.perFarmK, 1e-6), 'кредит не меняется, вся подготовка ложится на собственные средства');
ok(cap2.metrics.npv < cap1.metrics.npv, 'NPV в режиме «входит» ниже (' + Math.round(cap1.metrics.npv / 1000) + ' → ' + Math.round(cap2.metrics.npv / 1000) + ' млн)');
const pc = fresh(); pc.params.prepShare = Object.assign({}, M.prepShare, { mode: 'in_share' });
ok(near(M.runModel(pc).capex.total, cap1.capex.total), 'зарезервированный режим «в долю» пока считается как «отдельный вклад»');
const pd = fresh(); pd.params.prepShare = Object.assign({}, M.prepShare, { mode: 'in_project' });
pd.subsidies.forEach(s => { if (s.type === 'capex_pct') s.base = 'all'; });
const pe = fresh(); pe.subsidies.forEach(s => { if (s.type === 'capex_pct') s.base = 'all'; });
ok(near(M.runModel(pd).pnl[1].subsidy, M.runModel(pe).pnl[1].subsidy, 1e-6), 'субсидия с базой «все затраты» не начисляется на подготовку');

console.log('7. Порядок скриптов в index.html');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const order = [...html.matchAll(/<script src="js\/([^"]+)"/g)].map(m => m[1]);
const at = n => order.indexOf(n);
ok(order.length === new Set(order).size, 'нет повторных подключений');
ok(at('config.js') === 0, 'config.js первым');
ok(at('feedlot-switch.js') > at('calc-fin.js') && at('feedlot-switch.js') < at('doc.js') && at('feedlot-switch.js') < at('ui.js'), 'feedlot-switch.js: после calc-fin, до doc и ui');
['machinery.js', 'prep.js', 'utilities.js', 'structure.js', 'renewal.js'].forEach(n => ok(at(n) > at('ui.js'), n + ' после ui.js'));
ok(at('doc-layout.js') > Math.max(...['machinery.js', 'prep.js', 'utilities.js', 'structure.js', 'renewal.js'].map(at)), 'doc-layout.js после всех модулей, добавляющих разделы');
ok(at('feedlot-ui.js') > at('doc-layout.js'), 'feedlot-ui.js после doc-layout.js');
ok(at('feedlot-doc.js') === order.length - 1, 'feedlot-doc.js последним');
const onDisk = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
ok(onDisk.every(f => order.indexOf(f) >= 0), 'каждый файл из js/ подключён в index.html' + (onDisk.filter(f => order.indexOf(f) < 0).length ? ': нет ' + onDisk.filter(f => order.indexOf(f) < 0) : ''));

console.log('8. Круг «сохранить → открыть» (нужен jsdom)');
let JSDOM = null; try { JSDOM = require('jsdom').JSDOM; } catch (e) { }
if (!JSDOM) console.log('  – jsdom не установлен, раздел пропущен (npm i --no-save jsdom)');
else {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/' }), w = dom.window;
  w.confirm = () => true; w.alert = () => { };
  order.forEach(f => w.eval(fs.readFileSync(path.join(dir, f), 'utf8')));
  const S0 = w.MTF.initState(), out = JSON.parse(JSON.stringify(S0));
  out.docMode = 'passport'; out.powerItems[0].name = 'ТЕСТ'; out.participants[0].role = 'ТЕСТ'; out.renewalEnabled = false;
  out.structureTexts.intro = 'ТЕСТ'; out.renewalCycles[0].name = 'ТЕСТ'; out.fundingExtra = [{ id: 'x' }];
  const raw = JSON.stringify(out);
  w.sessionStorage.setItem('mtf', raw);
  const L = w.MTF.load();
  ok(L.docMode === 'passport' && L.powerItems[0].name === 'ТЕСТ' && L.participants[0].role === 'ТЕСТ' && L.renewalEnabled === false &&
    L.structureTexts.intro === 'ТЕСТ' && L.renewalCycles[0].name === 'ТЕСТ' && L.fundingExtra.length === 1, 'MTF.load() (F5 в сессии) сохраняет данные всех модулей');
  const oc = w.document.createElement.bind(w.document);
  w.document.createElement = t => { const el = oc(t); if (String(t).toLowerCase() === 'input') el.click = () => {
    Object.defineProperty(el, 'files', { value: [new w.File([raw], 'p.json')] }); el.onchange(); }; return el; };
  w.MTF.export.loadJson();
  const rd = new Promise(r => setTimeout(r, 200)).then(() => {
    const S = w.MTF.state;
    ok(S.docMode === 'passport' && S.powerItems[0].name === 'ТЕСТ' && S.participants[0].role === 'ТЕСТ' && S.renewalEnabled === false &&
      S.structureTexts.intro === 'ТЕСТ' && S.renewalCycles[0].name === 'ТЕСТ' && S.fundingExtra.length === 1, '«Открыть проект» сохраняет данные всех модулей');

    console.log('9. Порядок, нумерация и приложения документа (doc-layout.js)');
    const LS = 'АБВГДЕ';
    const st = w.MTF.initState(); w.MTF.state = st;
    const heads = id => { w.MTF.applyDocMode(st, id); w.MTF.activeTab = 'doc'; w.MTF.render();
      return [...w.document.querySelectorAll('#main .doc-prev section')]; };
    const hh = secs => secs.map(s => s.querySelector('h2').textContent.trim());
    w.MTF.docModes.filter(m => m.sections).forEach(m => {
      const hs = hh(heads(m.id)), nums = hs.map(h => (h.match(/^(\d+)\./) || [])[1]).filter(Boolean).map(Number);
      ok(nums.every((n, i) => n === i + 1), m.id + ': основные разделы нумеруются подряд 1…' + nums.length);
      const apps = hs.filter(h => /^Приложение /.test(h));
      ok(apps.every((h, i) => h.indexOf('Приложение ' + LS[i] + '.') === 0), m.id + ': приложения А, Б, В… (' + apps.length + ')');
      ok(hs.length === 0 || hs.findIndex(h => /^Приложение /.test(h)) < 0 || hs.slice(hs.findIndex(h => /^Приложение /.test(h))).every(h => /^Приложение /.test(h)), m.id + ': приложения только в конце');
    });
    const inv = hh(heads('investment'));
    ok(/^1\. Резюме/.test(inv[0]), 'инвестпредложение начинается с резюме');
    ok(inv.findIndex(h => /Структура сделки/.test(h)) > inv.findIndex(h => /Стоимость проекта/.test(h)) && inv.findIndex(h => /Финансовая модель/.test(h)) > inv.findIndex(h => /Структура сделки/.test(h)), 'порядок: стоимость → сделка → финансовая модель');
    ok(inv.findIndex(h => /Риски/.test(h)) > inv.findIndex(h => /Финансовая модель/.test(h)), 'риски идут после финансовой модели');
    const secs = heads('investment');
    secs.forEach(s => {
      const h = s.querySelector('h2').textContent.trim(), lab = (h.match(/^(\d+)\./) || h.match(/^Приложение (.)\./) || [])[1];
      const subs = [...s.querySelectorAll('h3,h4,strong,b')].map(e => e.textContent.trim()).filter(x => /^[0-9А-Я]{1,2}\.\d+\./.test(x));
      if (lab && subs.length) ok(subs.every(x => x.split('.')[0] === lab), 'подпункты «' + h.slice(0, 30) + '» начинаются с «' + lab + '.»');
    });
    const sum = secs[0].textContent, Nf = st.params.project.farmsCount;
    ok(sum.indexOf('1 ферма') >= 0 && sum.indexOf(Nf + ' ферм') >= 0, 'резюме: колонки «1 ферма» и «' + Nf + ' ферм»');
    const cap = w.MTF.runModel(st).capex.total;
    ok(sum.replace(/\s/g, '').indexOf(String(Math.round(cap * Nf))) >= 0, 'резюме: стоимость на ' + Nf + ' ферм = стоимость фермы × ' + Nf);
    const allTxt = secs.map(s => s.textContent).join(' ');
    const rnTbl = [...w.document.querySelectorAll('#main .doc-prev table')].find(tb => /Группа обновления/.test(tb.querySelector('thead').textContent));
    const years = rnTbl ? [...rnTbl.querySelectorAll('tbody tr')].map(r => r.children[0].textContent.trim()) : [];
    const yr = years.filter(y => !/^Итого/.test(y));
    ok(yr.length > 0 && yr.every(y => /^\d{4}$/.test(y)), 'график обновления: годы без пробела (' + yr.slice(0, 3).join(', ') + ')');
    ok(!/NaN|undefined|Infinity|\{\{/.test(allTxt), 'в тексте документа нет NaN, undefined и нераскрытых {{}}');

    console.log('10. Инвестиционный документ: масштабы, дубли, «УТОЧНИТЬ», чувствительность');
    const N10 = st.params.project.farmsCount;
    w.MTF.applyDocMode(st, 'investment'); w.MTF.activeTab = 'doc'; w.MTF.render();
    const prev10 = w.document.querySelector('#main .doc-prev'), heads10 = [...prev10.querySelectorAll('h2')].map(h => h.textContent);
    ok(!heads10.some(h => /Консолидация|Участники проекта|^\d+\. Обновление/.test(h)), 'нет отдельных разделов «Консолидация», «Участники», «Обновление» (встроены в другие)');
    ok(![...prev10.querySelectorAll('h3')].some(h => /Стоимость проекта в целом/.test(h.textContent)), 'нет дублирующего блока «Стоимость проекта в целом»');
    ok(/Обновление основных средств/.test(prev10.textContent) && /Источники финансирования/.test(prev10.textContent) && /Что требуется от инвестора/.test(prev10.textContent), 'обновление ОС, источники финансирования и «Что требуется от инвестора» остались внутри разделов');
    const marks = prev10.querySelectorAll('mark.todo').length;
    ok(marks > 0 && /УТОЧНИТЬ/.test(w.document.querySelector('#main .note.warn').textContent) && w.MTF._todoCount === marks, 'места «УТОЧНИТЬ» подсвечены и посчитаны (' + marks + ')');
    const scopeRe = /(одн[аоуй]+\s+ферм|1 ферм|на проект|проект в целом|\d+ ферм|инвестор)/i;
    let noScope = [];
    [...prev10.querySelectorAll('section')].forEach(s => {
      const h = s.querySelector('h2').textContent.trim(); if (/^Приложение/.test(h)) return;
      const sectionWide = /на одну типовую ферму/.test(s.textContent);
      [...s.querySelectorAll('table')].forEach(tb => {
        const head = tb.querySelector('thead').textContent; let okk = sectionWide || scopeRe.test(head);
        for (let e = tb.previousElementSibling, i = 0; e && i < 3 && !okk; e = e.previousElementSibling, i++) okk = scopeRe.test(e.textContent);
        if (!okk) noScope.push(h.slice(0, 25) + ': ' + head.replace(/\s+/g, ' ').slice(0, 40));
      });
    });
    ok(noScope.length === 0, 'у каждой таблицы основных разделов подписан масштаб (1 ферма / проект / инвестор)' + (noScope.length ? ': ' + noScope.join('; ') : ''));
    const fin = [...prev10.querySelectorAll('section')].find(s => /Финансовая модель/.test(s.querySelector('h2').textContent));
    const r10 = w.MTF.runModel(st), eb = Math.round(r10.pnl[3].ebitda), ebN = String(Math.round(r10.pnl[3].ebitda * N10));
    ok(fin.textContent.replace(/\s/g, '').indexOf(ebN) >= 0, 'таблица «проект в целом»: EBITDA ' + (r10.pnl[3].year) + ' = ферма × ' + N10 + ' (' + ebN + ')');
    const metricsHead = fin.querySelector('table').querySelector('thead').textContent;
    ok(/1 ферма/.test(metricsHead) && new RegExp(N10 + ' ферм').test(metricsHead), 'метрики: колонки «1 ферма» и «' + N10 + ' ферм»');
    const riskSec = [...prev10.querySelectorAll('section')].find(s => /Риски/.test(s.querySelector('h2').textContent));
    const sens = [...riskSec.querySelectorAll('table')].pop(), srows = [...sens.querySelectorAll('tbody tr')];
    ok(srows.length === 5 && /Базовый/.test(srows[0].textContent), 'чувствительность: 5 сценариев, первый — базовый');
    ok(srows[0].children[1].textContent.replace(/\s/g, '') === String(Math.round(r10.metrics.npv)), 'базовый сценарий совпадает с NPV расчёта (' + Math.round(r10.metrics.npv) + ')');
    ok(/−/.test(srows[1].children[2].textContent), 'при падении цены молока NPV падает');
    const dealTxt = [...prev10.querySelectorAll('section')].find(s => /Структура сделки/.test(s.querySelector('h2').textContent)).textContent;
    ok(/не входит в стоимость проекта/.test(dealTxt), 'режим подготовки «отдельный вклад»: в сделке написано, что в стоимость не входит');
    st.params.prepShare.mode = 'in_project'; w.MTF.render();
    const dealTxt2 = [...w.document.querySelectorAll('#main .doc-prev section')].find(s => /Структура сделки/.test(s.querySelector('h2').textContent)).textContent;
    ok(/включён в стоимость проекта/.test(dealTxt2) && !/не входит в стоимость проекта/.test(dealTxt2), 'режим «входит в стоимость»: текст сделки меняется');
    st.params.prepShare.mode = 'separate';
    w.MTF.applyDocMode(st, 'estimate'); w.MTF.render();
    ok([...w.document.querySelectorAll('#main .doc-prev h3')].some(h => /Стоимость проекта в целом/.test(h.textContent)), 'в смете блок «Стоимость проекта в целом» остался');
    finish();
  });
}
function finish() { console.log(fails ? '\nОШИБОК: ' + fails : '\nВсе проверки пройдены'); process.exit(fails ? 1 : 0); }
if (!JSDOM) finish();
