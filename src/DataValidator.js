export default class DataValidator {
  constructor() {
    this._24HOURS = 24;
  }

  validateRates(rates) {
    const validators = [
      this._haveRatesProperties,
      this._haveNumericValues,
      this._haveNonNegativeValues,
      this._areFromAndToWithin24Hours,
      this._doRatesSpanFor24Hours,
      this._haveRatePeriodsNonZeroLength,
      this._doRatesCrossMidnightNoMoreThanOnce,
      this._doRatePeriodsNotIntersect
    ];

    return 0 === validators.filter(validator => {
      return !validator.call(this, rates);
    }).length;
  }

  _haveRatesProperties(rates) {
    return 0 === rates.filter(rate => {
      return !(rate.hasOwnProperty('from')
              && rate.hasOwnProperty('to')
              && rate.hasOwnProperty('value'));
    }).length;
  }

  _haveNumericValues(rates) {
    function isNumber(n) {
      return typeof n === 'number' && !isNaN(n) && isFinite(n);
    }

    return 0 === rates.filter(rate => {
      return !(isNumber(rate.from) && isNumber(rate.to) && isNumber(rate.value));
    }).length;
  }

  _haveNonNegativeValues(rates) {
    return 0 === rates.filter(rate => {
      return rate.from < 0 || rate.to < 0 || rate.value < 0;
    }).length;
  }

  _areFromAndToWithin24Hours(rates) {
    return 0 === rates.filter(rate => {
      return rate.from >= 24 || rate.to >= 24;
    }).length;
  }

  _doRatesSpanFor24Hours(rates) {
    return this._24HOURS === rates.reduce((accum, rate) => {
      let rateSpan;
      if (rate.to > rate.from) {
        rateSpan = rate.to - rate.from;
      } else {
        rateSpan = this._24HOURS - rate.from + rate.to;
      }
      return accum += rateSpan;
    }, 0);
  }

  _haveRatePeriodsNonZeroLength(rates) {
    return 0 === rates.reduce((accum, rate) => {
      return rate.from === rate.to ? accum + 1 : accum;
    }, 0);
  }

  _doRatesCrossMidnightNoMoreThanOnce(rates) {
    return 1 >= rates.reduce((accum, rate) => {
      return rate.from < rate.to ? accum : accum + 1;
    }, 0);
  }

  _doRatePeriodsNotIntersect(rates) {
    let unique = {};
    for (const rate of rates) {
      if (rate.from < rate.to) {
        for (let i = rate.from; i < rate.to; i++) {
          if (unique[i] !== undefined) return false;
          unique[i] = i;
        }
      } else {
        for (let i = rate.from; i < this._24HOURS; i++) {
          if (unique[i] !== undefined) return false;
          unique[i] = i;
        }
        for (let i = 0; i < rate.to; i++) {
          if (unique[i] !== undefined) return false;
          unique[i] = i;          
        }
      }
    }

    return true;
  }
}