/* ============================================================
   ПЕРЕКЛЮЧАТЕЛЬ ТИПА ПРОЕКТА
   params.project.type: 'mtf' (по умолчанию) | 'feedlot'
   Оборачивает функции ядра. Для МТФ вызывает оригиналы без
   изменений, для откорма — модуль calc-feedlot.js.
   Подключается ПОСЛЕДНИМ из расчётных: после calc-fin.js,
   feedlot-config.js и calc-feedlot.js, до doc.js и ui.js.
   ============================================================ */

(function () {
  const isFeedlot = p => !!(p && p.project && p.project.type === 'feedlot');

  const orig = {
    calcHerd: MTF.calcHerd,
    calcCapex: MTF.calcCapex,
    calcPnL: MTF.calcPnL,
    runModel: MTF.runModel
  };

  MTF.calcHerd = function (p) {
    return isFeedlot(p) ? MTF.feedlot.calcHerd(p) : orig.calcHerd.apply(this, arguments);
  };

  MTF.calcCapex = function (p, items) {
    return isFeedlot(p) ? MTF.feedlot.calcCapex(p, items) : orig.calcCapex.apply(this, arguments);
  };

  MTF.calcPnL = function (p) {
    return isFeedlot(p) ? MTF.feedlot.calcPnL.apply(this, arguments) : orig.calcPnL.apply(this, arguments);
  };

  /* Проверки ядра написаны под МТФ (сухостой, цена нетели).
     Для откорма оставляем только общие и добавляем свои. */
  const COMMON_CHECKS = ['Не заполнена цена', 'Распределение капзатрат'];

  MTF.runModel = function (state) {
    const res = orig.runModel.apply(this, arguments);
    if (!isFeedlot(state.params)) return res;

    const kpi = MTF.feedlot.kpi(state.params, res);
    res.feedlot = kpi;
    res.checks = res.checks
      .filter(c => COMMON_CHECKS.some(prefix => c.indexOf(prefix) === 0))
      .concat(MTF.feedlot.checks(state.params, res, kpi));
    return res;
  };

  MTF.isFeedlot = isFeedlot;
})();
